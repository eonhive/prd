/*
 * Company: EonHive Inc.
 * Title: PRD CLI Markdown Importer
 * Purpose: Convert a small Markdown subset into validator-valid PRD packages.
 * Author: Stan Nesi
 * Created: May 27, 2026
 * Updated: May 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { parseMarkdown } from "@eonhive/prd-converter/markdown";
import { readFile, stat } from "node:fs/promises";
import { createImportPackageFiles, IMPORT_ENTRY_PATH, writeImportPackage } from "./importPackage.js";
import {
  basename,
  dirname,
  extname,
  parse,
  resolve,
  sep
} from "node:path";
import type {
  PrdAssetDeclaration,
  PrdGeneralDocumentNode
} from "@eonhive/prd-types";

const ENTRY_PATH = IMPORT_ENTRY_PATH;
const SUPPORTED_IMAGE_EXTENSIONS = new Map([
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

export type PrdMarkdownImportOptions = {
  sourcePath: string;
  targetDir: string;
  title?: string;
  id?: string;
};

export type PrdMarkdownImportResult = {
  imported: true;
  sourcePath: string;
  targetDir: string;
  profile: "general-document";
  title: string;
  id: string;
  entry: typeof ENTRY_PATH;
  files: string[];
  nodeCount: number;
  assetCount: number;
  warnings: string[];
};

type PendingImageAsset = {
  id: string;
  href: string;
  type: string;
  sourcePath: string;
};

export async function importMarkdownToPrdPackage(
  options: PrdMarkdownImportOptions
): Promise<PrdMarkdownImportResult> {
  const sourcePath = resolve(options.sourcePath);
  const markdown = await readFile(sourcePath, "utf8");
  const sourceDir = dirname(sourcePath);
  const assets: PendingImageAsset[] = [];
  const usedAssetNames = new Set<string>();
  const extracted = await parseMarkdown(markdown, async (imageHref, warnings) => {
    const asset = await resolveImageAsset({
      imageHref, sourceDir, usedAssetNames, assetIndex: assets.length + 1, warnings
    });
    if (asset) assets.push(asset);
    return asset;
  });
  const parsed = { ...extracted, assets };
  const title = options.title ?? parsed.title ?? titleFromSourcePath(sourcePath);
  const id = options.id ?? `urn:prd:local:${slugFromTitle(title)}`;
  const fallbackNodes: PrdGeneralDocumentNode[] = [
    {
      type: "heading",
      level: 1,
      text: title
    }
  ];
  const nodes: PrdGeneralDocumentNode[] =
    parsed.nodes.length > 0
      ? parsed.nodes
      : fallbackNodes;

  if (parsed.nodes.length === 0) {
    parsed.warnings.push(
      "No supported Markdown content was found; generated a title-only document."
    );
  }

  const files = buildPackageFiles({
    id,
    title,
    nodes,
    assets: parsed.assets
  });

  await writeImportPackage(options.targetDir, files, parsed.assets);

  return {
    imported: true,
    sourcePath: options.sourcePath,
    targetDir: options.targetDir,
    profile: "general-document",
    title,
    id,
    entry: ENTRY_PATH,
    files: [
      ...files.map((file) => file.path),
      ...parsed.assets.map((asset) => asset.href)
    ],
    nodeCount: nodes.length,
    assetCount: parsed.assets.length,
    warnings: parsed.warnings
  };
}

async function resolveImageAsset({
  imageHref,
  sourceDir,
  usedAssetNames,
  assetIndex,
  warnings
}: {
  imageHref: string;
  sourceDir: string;
  usedAssetNames: Set<string>;
  assetIndex: number;
  warnings: string[];
}): Promise<PendingImageAsset | undefined> {
  if (isRemoteReference(imageHref) || imageHref.startsWith("/") || imageHref.startsWith("#")) {
    warnings.push(
      `Skipped image \`${imageHref}\`; only local relative image paths are supported.`
    );
    return undefined;
  }

  const sourcePath = resolve(sourceDir, imageHref);
  if (!isPathInsideDirectory(sourcePath, sourceDir)) {
    warnings.push(`Skipped image \`${imageHref}\`; image paths must stay inside the source directory.`);
    return undefined;
  }

  const extension = extname(sourcePath).toLowerCase();
  const mimeType = SUPPORTED_IMAGE_EXTENSIONS.get(extension);
  if (!mimeType) {
    warnings.push(`Skipped image \`${imageHref}\`; unsupported image extension.`);
    return undefined;
  }

  try {
    const imageStat = await stat(sourcePath);
    if (!imageStat.isFile()) {
      warnings.push(`Skipped image \`${imageHref}\`; image path is not a file.`);
      return undefined;
    }
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      warnings.push(`Skipped image \`${imageHref}\`; source image was not found.`);
      return undefined;
    }

    throw error;
  }

  const fileName = createUniqueAssetFileName(imageHref, usedAssetNames);
  const id = `markdown-image-${assetIndex}`;

  return {
    id,
    href: `assets/images/${fileName}`,
    type: mimeType,
    sourcePath
  };
}

function createUniqueAssetFileName(
  imageHref: string,
  usedAssetNames: Set<string>
): string {
  const parsed = parse(basename(imageHref));
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
  nodes,
  assets
}: {
  id: string;
  title: string;
  nodes: PrdGeneralDocumentNode[];
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
    content: {
      schemaVersion: "1.0",
      profile: "general-document",
      type: "document",
      id: slugFromTitle(title),
      title,
      children: nodes
    }
  });
}

function titleFromSourcePath(sourcePath: string): string {
  return titleFromText(parse(sourcePath).name);
}

function titleFromText(value: string): string {
  const title = value
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

function isRemoteReference(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/u.test(value) || value.startsWith("//");
}

function isPathInsideDirectory(path: string, directory: string): boolean {
  const resolvedDirectory = resolve(directory);
  return path === resolvedDirectory || path.startsWith(`${resolvedDirectory}${sep}`);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
