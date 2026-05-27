/*
 * Company: EonHive Inc.
 * Title: PRD CLI Markdown Importer
 * Purpose: Convert a small Markdown subset into validator-valid PRD packages.
 * Author: Stan Nesi
 * Created: May 27, 2026
 * Updated: May 27, 2026
 * Notes: Vibe coded with Codex.
 */

import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile
} from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  join,
  parse,
  resolve,
  sep
} from "node:path";
import type {
  PrdAssetDeclaration,
  PrdGeneralDocumentNode
} from "@eonhive/prd-types";

const ENTRY_PATH = "content/root.json";
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

type ParsedMarkdown = {
  title?: string;
  nodes: PrdGeneralDocumentNode[];
  assets: PendingImageAsset[];
  warnings: string[];
};

export async function importMarkdownToPrdPackage(
  options: PrdMarkdownImportOptions
): Promise<PrdMarkdownImportResult> {
  const sourcePath = resolve(options.sourcePath);
  const markdown = await readFile(sourcePath, "utf8");
  const sourceDir = dirname(sourcePath);
  const parsed = await parseMarkdown(markdown, sourceDir);
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

  await assertTargetIsWritable(options.targetDir);

  const files = buildPackageFiles({
    id,
    title,
    nodes,
    assets: parsed.assets
  });

  const directories = new Set([
    ...files.map((file) => file.path.split("/").slice(0, -1).join("/")),
    ...parsed.assets.map((asset) => asset.href.split("/").slice(0, -1).join("/"))
  ]);

  for (const directory of directories) {
    if (directory.length === 0) {
      continue;
    }

    await mkdir(join(options.targetDir, directory), { recursive: true });
  }

  for (const asset of parsed.assets) {
    await copyFile(asset.sourcePath, join(options.targetDir, asset.href));
  }

  for (const file of files) {
    await writeFile(join(options.targetDir, file.path), file.contents, "utf8");
  }

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

async function parseMarkdown(
  markdown: string,
  sourceDir: string
): Promise<ParsedMarkdown> {
  const state: ParsedMarkdown = {
    nodes: [],
    assets: [],
    warnings: []
  };
  const usedAssetNames = new Set<string>();
  const lines = markdown.replace(/\r\n?/gu, "\n").split("\n");
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listStyle: "ordered" | "unordered" | undefined;
  let quoteLines: string[] = [];
  let inFence = false;

  function flushParagraph(): void {
    if (paragraphLines.length === 0) {
      return;
    }

    state.nodes.push({
      type: "paragraph",
      text: paragraphLines.join(" ").trim()
    });
    paragraphLines = [];
  }

  function flushList(): void {
    if (!listStyle || listItems.length === 0) {
      return;
    }

    state.nodes.push({
      type: "list",
      style: listStyle,
      items: listItems
    });
    listItems = [];
    listStyle = undefined;
  }

  function flushQuote(): void {
    if (quoteLines.length === 0) {
      return;
    }

    state.nodes.push({
      type: "quote",
      text: quoteLines.join(" ").trim()
    });
    quoteLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      flushParagraph();
      flushList();
      flushQuote();
      if (!inFence) {
        state.warnings.push(
          "Skipped fenced code block; code nodes are not supported by markdown import v0.1."
        );
      }
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    if (trimmed.length === 0) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const heading = parseHeading(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();
      if (!state.title && heading.level === 1) {
        state.title = heading.text;
      }
      state.nodes.push({
        type: "heading",
        level: heading.level,
        text: heading.text
      });
      continue;
    }

    const listItem = parseListItem(trimmed);
    if (listItem) {
      flushParagraph();
      flushQuote();
      if (listStyle && listStyle !== listItem.style) {
        flushList();
      }
      listStyle = listItem.style;
      listItems.push(listItem.text);
      continue;
    }

    const quote = parseQuote(trimmed);
    if (quote) {
      flushParagraph();
      flushList();
      quoteLines.push(quote);
      continue;
    }

    const image = parseStandaloneImage(trimmed);
    if (image) {
      flushParagraph();
      flushList();
      flushQuote();
      const asset = await resolveImageAsset({
        imageHref: image.href,
        sourceDir,
        usedAssetNames,
        assetIndex: state.assets.length + 1,
        warnings: state.warnings
      });
      if (!asset) {
        continue;
      }

      state.assets.push(asset);
      state.nodes.push({
        type: "image",
        asset: asset.id,
        alt: image.alt,
        caption: image.title
      });
      continue;
    }

    if (looksLikeRawHtml(trimmed)) {
      flushParagraph();
      flushList();
      flushQuote();
      state.warnings.push("Skipped raw HTML; HTML import is not supported by markdown import v0.1.");
      continue;
    }

    flushList();
    flushQuote();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushQuote();

  return state;
}

function parseHeading(line: string): { level: number; text: string } | undefined {
  const match = /^(#{1,6})\s+(.+?)\s*#*$/u.exec(line);
  const marker = match?.[1];
  const text = match?.[2];
  if (!marker || !text) {
    return undefined;
  }

  const cleanedText = cleanInlineText(text);
  if (cleanedText.length === 0) {
    return undefined;
  }

  return {
    level: marker.length,
    text: cleanedText
  };
}

function parseListItem(
  line: string
): { style: "ordered" | "unordered"; text: string } | undefined {
  const unordered = /^[-*+]\s+(.+)$/u.exec(line);
  const unorderedText = unordered?.[1];
  if (unorderedText) {
    const cleanedText = cleanInlineText(unorderedText);
    if (cleanedText.length === 0) {
      return undefined;
    }

    return {
      style: "unordered",
      text: cleanedText
    };
  }

  const ordered = /^\d+[.)]\s+(.+)$/u.exec(line);
  const orderedText = ordered?.[1];
  if (orderedText) {
    const cleanedText = cleanInlineText(orderedText);
    if (cleanedText.length === 0) {
      return undefined;
    }

    return {
      style: "ordered",
      text: cleanedText
    };
  }

  return undefined;
}

function parseQuote(line: string): string | undefined {
  const match = /^>\s?(.+)$/u.exec(line);
  const text = match?.[1];
  const cleanedText = text ? cleanInlineText(text) : "";
  return cleanedText.length > 0 ? cleanedText : undefined;
}

function parseStandaloneImage(
  line: string
): { alt: string; href: string; title?: string } | undefined {
  const match = /^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]+)")?\)$/u.exec(line);
  const alt = match?.[1];
  const href = match?.[2];
  const title = match?.[3];
  if (alt === undefined || !href) {
    return undefined;
  }

  const parsed = {
    alt: cleanInlineText(alt) || "Imported Markdown image",
    href
  };

  return title
    ? {
        ...parsed,
        title: cleanInlineText(title)
      }
    : parsed;
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
        profile: "general-document",
        title,
        entry: ENTRY_PATH,
        ...(manifestAssets.length > 0 ? { assets: manifestAssets } : {})
      })
    },
    {
      path: ENTRY_PATH,
      contents: json({
        schemaVersion: "1.0",
        profile: "general-document",
        type: "document",
        id: slugFromTitle(title),
        title,
        children: nodes
      })
    }
  ];
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

function cleanInlineText(value: string): string {
  return value
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\*\*([^*]+)\*\*/gu, "$1")
    .replace(/__([^_]+)__/gu, "$1")
    .replace(/\*([^*]+)\*/gu, "$1")
    .replace(/_([^_]+)_/gu, "$1")
    .trim();
}

function looksLikeRawHtml(line: string): boolean {
  return /^<\/?[a-z][\s\S]*>$/iu.test(line);
}

function isRemoteReference(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/u.test(value) || value.startsWith("//");
}

function isPathInsideDirectory(path: string, directory: string): boolean {
  const resolvedDirectory = resolve(directory);
  return path === resolvedDirectory || path.startsWith(`${resolvedDirectory}${sep}`);
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
