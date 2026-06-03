/*
 * Company: EonHive Inc.
 * Title: PRD CLI Image Folder Importer
 * Purpose: Convert ordered image folders into validator-valid comic or storyboard PRD packages.
 * Author: Stan Nesi
 * Created: May 31, 2026
 * Updated: May 31, 2026
 * Notes: Vibe coded with Codex.
 */

import {
  copyFile,
  mkdir,
  readdir,
  stat,
  writeFile
} from "node:fs/promises";
import { basename, extname, join, parse, resolve } from "node:path";
import type { PrdAssetDeclaration } from "@eonhive/prd-types";

const ENTRY_PATH = "content/root.json";
const SUPPORTED_IMAGE_EXTENSIONS = new Map([
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);
const SUPPORTED_IMAGE_IMPORT_PROFILES = ["comic", "storyboard"] as const;
const naturalFileNameCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base"
});

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

  await assertTargetIsWritable(options.targetDir);

  const files = buildPackageFiles({
    id,
    title,
    profile,
    assets: collected.assets
  });

  const directories = new Set([
    ...files.map((file) => file.path.split("/").slice(0, -1).join("/")),
    ...collected.assets.map((asset) => asset.href.split("/").slice(0, -1).join("/"))
  ]);

  for (const directory of directories) {
    if (directory.length === 0) {
      continue;
    }

    await mkdir(join(options.targetDir, directory), { recursive: true });
  }

  for (const asset of collected.assets) {
    await copyFile(asset.sourcePath, join(options.targetDir, asset.href));
  }

  for (const file of files) {
    await writeFile(join(options.targetDir, file.path), file.contents, "utf8");
  }

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

async function assertTargetIsWritable(targetDir: string): Promise<void> {
  try {
    const targetStat = await stat(targetDir);
    if (!targetStat.isDirectory()) {
      throw new Error(`Target path is not a directory: ${targetDir}`);
    }

    const entries = await readdir(targetDir);
    if (entries.length > 0) {
      throw new Error(`Target directory is not empty: ${targetDir}`);
    }
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      await mkdir(targetDir, { recursive: true });
      return;
    }

    throw error;
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
    naturalFileNameCollator.compare(left.name, right.name)
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
}): Array<{ path: string; contents: string }> {
  const manifestAssets: PrdAssetDeclaration[] = assets.map((asset) => ({
    id: asset.id,
    href: asset.href,
    type: asset.type
  }));

  return [
    {
      path: "manifest.json",
      contents: json({
        prdVersion: "1.0",
        manifestVersion: "1.0",
        id,
        profile,
        title,
        entry: ENTRY_PATH,
        assets: manifestAssets
      })
    },
    {
      path: ENTRY_PATH,
      contents:
        profile === "comic"
          ? json({
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
            })
          : json({
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
            })
    }
  ];
}

function titleFromPath(path: string): string {
  const parsedName = parse(basename(path)).name;
  const title = parsedName
    .split(/[-_\s]+/u)
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

  return title.length > 0 ? title : "Untitled PRD";
}

function slugFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

  return slug.length > 0 ? slug : "untitled-prd";
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
