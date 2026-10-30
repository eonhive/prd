/**
 * Company: EonHive Inc. | Title: PRD Convert Pipeline
 * Purpose: Normalize imports, validate canonical PRD files and package a private snapshot.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { createHash } from "node:crypto";
import { link, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { packDirectoryToBuffer } from "@eonhive/prd-packager";
import type { PrdContainerKind } from "@eonhive/prd-validator/container";
import type {
  ConversionLimits, PrdNormalizedContent
} from "./contracts.js";
import { assembleConversion, snapshotComicPageDescriptions, snapshotComicPageIds, type ConversionResult, type ConversionSettings, type PreparedConversion } from "./assembly.js";
export type { ComicPageDescription, ConversionResult, PreparedConversion } from "./assembly.js";
export { MAX_COMIC_PAGE_DESCRIPTION_LENGTH } from "./assembly.js";
import { ImportAdapterRegistry } from "./registry.js";
import { markdownAdapter } from "./adapters/markdown.js";
import { htmlAdapter } from "./adapters/html.js";
import { cbzAdapter } from "./adapters/cbz.js";
import { epubAdapter } from "./adapters/epub.js";
import { docxAdapter } from "./adapters/docx.js";
import { pdfAdapter } from "./adapters/pdf.js";
import { readBoundedFile, resolveConversionLimits, ResourceCollector } from "./resources.js";

export type * from "./contracts.js";
export { ImportAdapterRegistry } from "./registry.js";
export { markdownAdapter } from "./adapters/markdown.js";
export { htmlAdapter } from "./adapters/html.js";
export { cbzAdapter } from "./adapters/cbz.js";
export { epubAdapter } from "./adapters/epub.js";
export { docxAdapter } from "./adapters/docx.js";
export { pdfAdapter } from "./adapters/pdf.js";
export { DEFAULT_CONVERSION_LIMITS } from "./resources.js";

export interface ConvertOptions {
  sourcePath: string;
  title?: string;
  id?: string;
  profile?: PrdNormalizedContent["profile"] | "auto";
  strategy?: "adaptive";
  preserveSource?: boolean;
  comicPageOrder?: "natural" | "reverse";
  comicPageIds?: readonly string[];
  comicPageDescriptions?: ConversionSettings["comicPageDescriptions"];
  container?: PrdContainerKind;
  limits?: Partial<ConversionLimits>;
  registry?: ImportAdapterRegistry;
}

export function createDefaultImportRegistry(): ImportAdapterRegistry {
  return new ImportAdapterRegistry().register(markdownAdapter).register(htmlAdapter).register(cbzAdapter).register(epubAdapter).register(docxAdapter).register(pdfAdapter);
}

export async function prepareConversion(options: ConvertOptions): Promise<PreparedConversion> {
  if (options.strategy !== undefined && options.strategy !== "adaptive") {
    throw new Error("Only adaptive conversion is implemented in Phase 1.");
  }
  const limits = resolveConversionLimits(options.limits);
  const settings = { ...options,
    comicPageIds: snapshotComicPageIds(options.comicPageIds, limits.maxNodes),
    comicPageDescriptions: snapshotComicPageDescriptions(options.comicPageDescriptions, limits.maxNodes)
  };
  const sourcePath = await realpath(options.sourcePath);
  const bytes = await readBoundedFile(sourcePath, limits.maxInputBytes);
  const source = { name: basename(options.sourcePath), bytes };
  const registry = options.registry ?? createDefaultImportRegistry();
  const adapter = await registry.detect(source);
  const resources = new ResourceCollector(dirname(sourcePath), limits);
  const extracted = await adapter.import(source, {
    limits: Object.freeze({ ...limits }),
    resolveImage: (reference) => resources.resolveImage(reference),
    collectImage: (reference, data) => resources.collectImage(reference, data)
  });
  return assembleConversion(source, adapter, extracted, resources, limits, settings,
    `urn:prd:import:${createHash("sha256").update(bytes).digest("hex")}`);
}

export async function convertDocument(options: ConvertOptions): Promise<ConversionResult> {
  const { files, document, report } = await prepareConversion(options);
  const stage = await mkdtemp(join(tmpdir(), "prd-convert-"));
  try {
    // Only generated, declared paths enter this private stage. Adapters never write package files.
    for (const [path, data] of Object.entries(files)) {
      await mkdir(dirname(join(stage, path)), { recursive: true });
      await writeFile(join(stage, path), data, { flag: "wx" });
    }
    const archive = await packDirectoryToBuffer(stage, { container: options.container });
    return { archive, document, report };
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

export async function convertFileToPrd(options: ConvertOptions & { outputPath: string }): Promise<ConversionResult> {
  if (!options.outputPath.toLowerCase().endsWith(".prd")) throw new Error("Conversion output must use the .prd extension.");
  const result = await convertDocument(options);
  const outputStage = await mkdtemp(join(dirname(options.outputPath), ".prd-convert-"));
  try {
    const stagedFile = join(outputStage, "document.prd");
    await writeFile(stagedFile, result.archive, { flag: "wx" });
    // A same-filesystem hard link publishes complete bytes and fails if the destination exists.
    await link(stagedFile, options.outputPath);
    return result;
  } finally {
    await rm(outputStage, { recursive: true, force: true });
  }
}
