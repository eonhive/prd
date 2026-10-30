/*
 * Company: EonHive Inc.
 * Title: PRD CLI Image Folder Importer
 * Purpose: Convert ordered image folders into validator-valid comic or storyboard PRD packages.
 * Author: Stan Nesi
 * Created: May 31, 2026
 * Updated: May 31, 2026
 * Notes: Vibe coded with Codex.
 */

import { readdir, stat } from "node:fs/promises";
import { createImportPackageFiles, IMPORT_ENTRY_PATH, writeImportPackage } from "./importPackage.js";
import { compareImageSequenceNames, titleFromImagePath as titleFromPath } from "@eonhive/prd-converter/image-sequence";
import { extname, join, parse, resolve } from "node:path";
import type { PrdAssetDeclaration } from "@eonhive/prd-types";

const ENTRY_PATH = IMPORT_ENTRY_PATH;
const SUPPORTED_IMAGE_EXTENSIONS = new Map([
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);
const SUPPORTED_IMAGE_IMPORT_PROFILES = ["comic", "storyboard"] as const;

export type PrdImageImportProfile = (typeof SUPPORTED_IMAGE_IMPORT_PROFILES)[number];

export type PrdImageImportOptions = {
  sourceDir: string;
  targetDir: string;
  profile?: string;
  title?: string;
  id?: string;
};

export type PrdImageImportResult = {
  imported: true;
  sourceDir: string;
  targetDir: string;
  profile: PrdImageImportProfile;
  title: string;
  id: string;
  entry: typeof ENTRY_PATH;
  files: string[];
  imageCount: number;
  assetCount: number;
  skippedFiles: string[];
  warnings: string[];
};

type PendingImageAsset = {
  id: string;
  href: string;
  type: string;
  sourcePath: string;
  label: string;
};

export function isSupportedImageImportProfile(
  profile: string
): profile is PrdImageImportProfile {
  return SUPPORTED_IMAGE_IMPORT_PROFILES.includes(profile as PrdImageImportProfile);
}

export async function importImagesToPrdPackage(
  options: PrdImageImportOptions
): Promise<PrdImageImportResult> {
  const profile = options.profile;
  if (!profile) {
    throw new Error("Missing required image import profile. Use --profile <comic|storyboard>.");
  }

  if (!isSupportedImageImportProfile(profile)) {
    throw new Error(
      `Unsupported image import profile "${profile}". Supported profiles: ${SUPPORTED_IMAGE_IMPORT_PROFILES.join(", ")}.`
    );
  }

  const sourceDir = resolve(options.sourceDir);
  await assertSourceIsReadableDirectory(sourceDir);

  const collected = await collectImageAssets({
    sourceDir,
    profile
  });
  if (collected.assets.length === 0) {
    throw new Error(`No supported image files found in source directory: ${options.sourceDir}`);
  }

  const title = options.title ?? titleFromPath(options.sourceDir);
  const id = options.id ?? `urn:prd:local:${slugFromTitle(title)}`;

  const files = buildPackageFiles({
    id,
    title,
    profile,
    assets: collected.assets
  });

  await writeImportPackage(options.targetDir, files, collected.assets);

  return {
    imported: true,
    sourceDir: options.sourceDir,
    targetDir: options.targetDir,
    profile,
    title,
    id,
    entry: ENTRY_PATH,
    files: [
      ...files.map((file) => file.path),
      ...collected.assets.map((asset) => asset.href)
    ],
    imageCount: collected.assets.length,
    assetCount: collected.assets.length,
    skippedFiles: collected.skippedFiles,
    warnings: collected.warnings
  };
}

async function assertSourceIsReadableDirectory(sourceDir: string): Promise<void> {
  const sourceStat = await stat(sourceDir);
  if (!sourceStat.isDirectory()) {
    throw new Error(`Source path is not a directory: ${sourceDir}`);
  }
}

async function collectImageAssets({
  sourceDir,
  profile
}: {
  sourceDir: string;
  profile: PrdImageImportProfile;
}): Promise<{
  assets: PendingImageAsset[];
  skippedFiles: string[];
  warnings: string[];
}> {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const skippedFiles: string[] = [];
  const warnings: string[] = [];
  const usedAssetNames = new Set<string>();
  const assets: PendingImageAsset[] = [];
  const assetDirectory = profile === "comic" ? "assets/panels" : "assets/frames";

  const sortedEntries = entries.sort((left, right) =>
    compareImageSequenceNames(left.name, right.name)
  );

  for (const entry of sortedEntries) {
    if (!entry.isFile()) {
      skippedFiles.push(entry.name);
      warnings.push(`Skipped \`${entry.name}\`; only top-level image files are imported.`);
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    const mimeType = SUPPORTED_IMAGE_EXTENSIONS.get(extension);
    if (!mimeType) {
      skippedFiles.push(entry.name);
      warnings.push(`Skipped \`${entry.name}\`; unsupported image extension.`);
      continue;
    }

    const fileName = createUniqueAssetFileName(entry.name, usedAssetNames);
    const assetIndex = assets.length + 1;
    const assetPrefix = profile === "comic" ? "panel" : "frame";
    assets.push({
      id: `${assetPrefix}-${assetIndex}-art`,
      href: `${assetDirectory}/${fileName}`,
      type: mimeType,
      sourcePath: join(sourceDir, entry.name),
      label: titleFromPath(entry.name)
    });
  }

  return {
    assets,
    skippedFiles,
    warnings
  };
}

function createUniqueAssetFileName(
  sourceFileName: string,
  usedAssetNames: Set<string>
): string {
  const parsed = parse(sourceFileName);
  const extension = parsed.ext.toLowerCase();
  const baseName = slugFromTitle(parsed.name) || "image";
  let candidate = `${baseName}${extension}`;
  let suffix = 2;

  while (usedAssetNames.has(candidate)) {
    candidate = `${baseName}-${suffix}${extension}`;
    suffix += 1;
  }

  usedAssetNames.add(candidate);
  return candidate;
}

function buildPackageFiles({
  id,
  title,
  profile,
  assets
}: {
  id: string;
  title: string;
  profile: PrdImageImportProfile;
  assets: PendingImageAsset[];
}) {
  const manifestAssets: PrdAssetDeclaration[] = assets.map((asset) => ({
    id: asset.id,
    href: asset.href,
    type: asset.type
  }));

  return createImportPackageFiles({
    id,
    title,
    assets: manifestAssets,
    content: profile === "comic"
      ? {
          schemaVersion: "1.0",
          profile,
          type: "comic",
          id: slugFromTitle(title),
          title,
          panels: assets.map((asset, index) => ({
            id: `panel-${index + 1}`,
            asset: asset.id,
            alt: `${asset.label} comic panel`
          }))
        }
      : {
          schemaVersion: "1.0",
          profile,
          type: "storyboard",
          id: slugFromTitle(title),
          title,
          frames: assets.map((asset, index) => ({
            id: `frame-${index + 1}`,
            asset: asset.id,
            alt: `${asset.label} storyboard frame`,
            notes: "Add storyboard notes for this imported frame."
          }))
        }
  });
}

function slugFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

  return slug.length > 0 ? slug : "untitled-prd";
}
