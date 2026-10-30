/**
 * Company: EonHive Inc. | Title: CBZ Comic Import Adapter
 * Purpose: Read bounded image archives into canonical comic panels without disk extraction.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import type { PrdComicPanel } from "@eonhive/prd-types";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import type { ConversionWarning, ImportAdapter } from "../contracts.js";
import { archiveImageExtension, compareImageSequenceNames, titleFromArchiveImagePath } from "./imageSequenceShared.js";

const RASTER_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b &&
    ((bytes[2] === 3 && bytes[3] === 4) || (bytes[2] === 5 && bytes[3] === 6));
}

function isPageCandidate(path: string): boolean {
  if (path.split("/").some((part) => part.startsWith(".") || part === "__MACOSX")) return false;
  return RASTER_EXTENSIONS.has(archiveImageExtension(path));
}

function rejectOtherDocumentFormats(files: Record<string, Uint8Array>): void {
  if (Object.hasOwn(files, "[Content_Types].xml") || Object.hasOwn(files, "META-INF/container.xml")) {
    throw new Error("The renamed ZIP contains Office or EPUB structure, not a supported CBZ image sequence.");
  }
  const manifest = files["manifest.json"];
  if (!manifest) return;
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(manifest)); } catch { return; }
  if (parsed && typeof parsed === "object" && "prdVersion" in parsed && "entry" in parsed) {
    throw new Error("The renamed ZIP contains a PRD manifest, not a supported CBZ source.");
  }
}

export const cbzAdapter: ImportAdapter = {
  id: "cbz",
  async detect(source) {
    return /\.cbz$/iu.test(source.name) && isZip(source.bytes);
  },
  async import(source, context) {
    if (!isZip(source.bytes)) throw new Error("CBZ input must use ZIP transport.");
    if (!context.collectImage) throw new Error("CBZ import requires bounded archive-image collection.");
    const limits = context.limits;
    // Reuse the existing archive decoder and apply limits to all members, including ignored files.
    const files = readPrdArchive(source.bytes, {
      maxArchiveBytes: limits.maxInputBytes,
      maxExpandedBytes: limits.maxTotalResourceBytes,
      maxFileBytes: limits.maxResourceBytes,
      maxEntries: limits.maxResources
    });
    rejectOtherDocumentFormats(files);
    const paths = Object.keys(files).sort((left, right) =>
      compareImageSequenceNames(left, right) || (left < right ? -1 : left > right ? 1 : 0));
    const candidates = paths.filter(isPageCandidate);
    if (candidates.length > limits.maxNodes) throw new Error("Comic page count exceeds the conversion limit.");
    const warnings: ConversionWarning[] = [
      {
        code: "cbz-reading-order", stage: "extract",
        message: "Pages are inferred from natural archive-path order. Verify editorial order; ComicInfo, manga direction, spreads and panel geometry are not interpreted."
      },
      {
        code: "cbz-generated-alt", stage: "extract",
        message: "Page alternative text is generated from filenames. It does not describe image contents; authored descriptions, OCR and panel detection are not provided."
      }
    ];
    const ignoredCount = paths.length - candidates.length;
    if (ignoredCount > 0) {
      warnings.push({
        code: "cbz-members-omitted", stage: "extract",
        message: `${ignoredCount} non-page archive member${ignoredCount === 1 ? "" : "s"} omitted from the reading view, including unsupported formats, metadata or hidden files. They remain available only when source retention is enabled.`
      });
    }
    const panels: PrdComicPanel[] = [];
    for (const path of candidates) {
      const resource = await context.collectImage(path, files[path]!);
      if (!resource) continue;
      panels.push({ id: `page-${panels.length + 1}`, asset: resource.id, alt: `${titleFromArchiveImagePath(path)} comic page` });
    }
    if (panels.length === 0) throw new Error("No supported comic page images were imported from the CBZ archive.");
    return { title: titleFromArchiveImagePath(source.name), content: { profile: "comic", panels }, warnings };
  }
};
