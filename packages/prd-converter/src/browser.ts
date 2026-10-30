/**
 * Company: EonHive Inc. | Title: Browser Markdown Conversion
 * Purpose: Convert explicit byte selections through shared semantic assembly and packaging.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import { packPackageFiles } from "@eonhive/prd-packager/browser";
import type { PrdContainerKind } from "@eonhive/prd-validator/container";
import { assembleConversion, snapshotComicPageDescriptions, snapshotComicPageIds, type ConversionResources, type ConversionResult, type ConversionSettings } from "./assembly.js";
import type { ConversionLimits, ImportSource } from "./contracts.js";
import { DEFAULT_CONVERSION_LIMITS, resolveConversionLimits } from "./limits.js";
import { markdownAdapter } from "./adapters/markdown.js";
import { ImportAdapterRegistry } from "./registry.js";
import { rasterType } from "./raster.js";
export { DEFAULT_CONVERSION_LIMITS } from "./limits.js";
export { MAX_COMIC_PAGE_DESCRIPTION_LENGTH } from "./assembly.js";
export type { ComicPageDescription, ConversionResult, ConversionSettings } from "./assembly.js";
export type { ConversionQualityReport, ConversionWarning, ImportSource } from "./contracts.js";

export interface BrowserConvertOptions extends ConversionSettings {
  source: ImportSource;
  resources?: readonly ImportSource[];
  container?: PrdContainerKind;
  /** Browser callers may tighten the reference budgets, not increase them. */
  limits?: Partial<ConversionLimits>;
}

function safePath(name: string): string {
  if (!name || name.length > 1024 || /[\\:\u0000-\u001f\u007f?#]/u.test(name) || name.startsWith("/")) throw new Error("Only selected relative resource paths are supported.");
  const parts = name.split("/");
  if (parts.includes("..")) throw new Error("Resource traversal is unsupported.");
  return parts.filter((part) => part && part !== ".").join("/");
}

function snapshot(input: ImportSource, limit: number): ImportSource {
  if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength > limit) throw new Error("Selected file exceeds its conversion byte limit.");
  return { name: input.name, bytes: new Uint8Array(input.bytes) };
}

/** Retains the original Markdown-only browser API and detection behavior. */
export function convertMarkdownInBrowser(options: BrowserConvertOptions): Promise<ConversionResult> {
  return convertSelectedSource(options, false);
}

/** Detect and convert the supported browser formats without loading Node adapters. */
export function convertInBrowser(options: BrowserConvertOptions): Promise<ConversionResult> {
  return convertSelectedSource(options, true);
}

async function convertSelectedSource(options: BrowserConvertOptions, allowAdditionalFormats: boolean): Promise<ConversionResult> {
  if (options.strategy !== undefined && options.strategy !== "adaptive") throw new Error("Only adaptive conversion is implemented.");
  const limits = resolveConversionLimits(options.limits);
  const settings = { ...options,
    comicPageIds: snapshotComicPageIds(options.comicPageIds, limits.maxNodes),
    comicPageDescriptions: snapshotComicPageDescriptions(options.comicPageDescriptions, limits.maxNodes)
  };
  for (const key of Object.keys(limits) as Array<keyof ConversionLimits>) {
    if (limits[key] > DEFAULT_CONVERSION_LIMITS[key]) throw new Error("Browser conversion limits may only be tightened.");
  }
  if (!options.source.name || options.source.name.length > 255 || /[\\/\u0000-\u001f\u007f]/u.test(options.source.name)) throw new Error("Source must have a plain filename of at most 255 characters.");
  const source = snapshot(options.source, limits.maxInputBytes);
  const supplied = options.resources ?? [];
  if (supplied.length > limits.maxResources) throw new Error("Selected resource count exceeds the conversion limit.");
  const selected = new Map<string, ImportSource>();
  let total = 0;
  for (const input of supplied) {
    const name = safePath(input.name);
    if (!name || selected.has(name)) throw new Error("Resource names must be unique and nonempty.");
    total += input.bytes.byteLength;
    if (total > limits.maxTotalResourceBytes) throw new Error("Selected resource bytes exceed the conversion limit.");
    selected.set(name, snapshot(input, limits.maxResourceBytes));
  }
  const resources: ConversionResources = { assets: [], references: [], warnings: [] };
  const used = new Map<string, { id: string; href: string }>();
  let attempts = 0;
  let collectedBytes = 0;
  function countAttempt(): void {
    if (++attempts > limits.maxNodes) throw new Error("Resource reference count exceeds the conversion limit.");
  }
  function registerImage(reference: string, key: string, bytes: Uint8Array, path = reference): { id: string } {
    let resource = used.get(key);
    if (!resource) {
      if (resources.assets.length >= limits.maxResources) throw new Error("Resource count exceeds the conversion limit.");
      if (bytes.byteLength > limits.maxResourceBytes) throw new Error(`File exceeds the ${limits.maxResourceBytes}-byte conversion limit.`);
      const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
      const type = rasterType(bytes, extension);
      if (!type) throw new Error("Expected a PNG, JPEG, GIF or WebP signature matching its extension; SVG is deferred.");
      if (collectedBytes + bytes.byteLength > limits.maxTotalResourceBytes) throw new Error("Total resource bytes exceed the conversion limit.");
      const id = `import-image-${resources.assets.length + 1}`;
      const href = `assets/images/${id}${extension}`;
      resources.assets.push({ id, href, type, bytes });
      resource = { id, href };
      used.set(key, resource);
      collectedBytes += bytes.byteLength;
    }
    resources.references.push({ source: reference, asset: resource.id, href: resource.href });
    return { id: resource.id };
  }
  function warn(reference: string, error: unknown): undefined {
    resources.warnings.push({ code: "resource-omitted", stage: "extract", reference, message: `Image omitted: ${error instanceof Error ? error.message : "Resource unavailable."}` });
    return undefined;
  }
  const registry = new ImportAdapterRegistry().register(markdownAdapter);
  if (allowAdditionalFormats && /\.html?$/iu.test(source.name)) {
    registry.register((await import("./adapters/html.js")).htmlAdapter);
  } else if (allowAdditionalFormats && /\.cbz$/iu.test(source.name)) {
    registry.register((await import("./adapters/cbz.js")).cbzAdapter);
  }
  const adapter = await registry.detect(source);
  if (adapter.id === "cbz" && selected.size > 0) throw new Error("CBZ pages are read from the archive; do not select supporting images.");
  const extracted = await adapter.import(source, {
    limits,
    async collectImage(reference, bytes) {
      countAttempt();
      // Archive paths are already screened by the bounded reader. Keep literal percent names.
      try { return registerImage(reference, `archive:${reference}`, bytes); }
      catch (error) { return warn(reference, error); }
    },
    async resolveImage(reference) {
      countAttempt();
      try {
        const key = safePath(decodeURIComponent(reference));
        const input = selected.get(key);
        if (!input) throw new Error(`Select this local image alongside the ${adapter.id === "html" ? "HTML" : "Markdown"} source; no files or URLs are fetched automatically.`);
        return registerImage(reference, `selected:${key}`, input.bytes, key);
      } catch (error) {
        return warn(reference, error);
      }
    }
  });
  for (const name of selected.keys()) {
    if (!used.has(`selected:${name}`)) resources.warnings.push({ code: "resource-unreferenced", stage: "extract", reference: name, message: "Selected resource was not collected into the output; review source references and supported image formats." });
  }
  if (!globalThis.crypto?.subtle) throw new Error("Local conversion requires Web Crypto. Use HTTPS or localhost in a supported browser.");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", source.bytes as Uint8Array<ArrayBuffer>));
  const hash = Array.from(digest, (value) => value.toString(16).padStart(2, "0")).join("");
  const prepared = assembleConversion(source, adapter, extracted, resources, limits, settings, `urn:prd:import:${hash}`);
  return { archive: packPackageFiles(prepared.files, { container: options.container }), document: prepared.document, report: prepared.report };
}
