/**
 * Company: EonHive Inc. | Title: Shared Conversion Assembly
 * Purpose: Normalize adapters and validate one canonical package snapshot across execution environments.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import type { PrdManifest } from "@eonhive/prd-types";
import { validatePackageFiles, type PrdFileMap, type PrdPackageValidationResult } from "@eonhive/prd-validator";
import type { ConversionLimits, ConversionQualityReport, ConversionWarning, ImportResult, ImportSource, PrdNormalizedContent } from "./contracts.js";

export interface ComicPageDescription {
  readonly pageId: string;
  readonly text: string;
}

export const MAX_COMIC_PAGE_DESCRIPTION_LENGTH = 2048;

export interface ConversionSettings {
  title?: string;
  id?: string;
  profile?: PrdNormalizedContent["profile"] | "auto";
  strategy?: "adaptive";
  preserveSource?: boolean;
  /** Applies only to comic sources; changes panel sequence, not reading direction. */
  comicPageOrder?: "natural" | "reverse";
  /** Complete source-page ID permutation, mutually exclusive with comicPageOrder. */
  comicPageIds?: readonly string[];
  /** Plain-text replacements for selected source-page descriptions. */
  comicPageDescriptions?: readonly ComicPageDescription[];
}
export interface ConversionResult {
  archive: Uint8Array;
  document: PrdNormalizedContent;
  report: ConversionQualityReport;
}
export interface PreparedConversion {
  files: PrdFileMap;
  manifest: PrdManifest;
  document: PrdNormalizedContent;
  report: ConversionQualityReport;
  validation: PrdPackageValidationResult;
}
export interface ConversionResources {
  assets: Array<{ id: string; href: string; type: string; bytes: Uint8Array }>;
  references: Array<{ source: string; asset: string; href: string }>;
  warnings: ConversionWarning[];
}

function json(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
}

export function snapshotComicPageIds(ids: readonly string[] | undefined, maxNodes: number): readonly string[] | undefined {
  if (ids === undefined) return undefined;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > maxNodes || ids.some(id => typeof id !== "string" || id.length === 0 || id.length > 255)) {
    throw new Error("Comic page IDs must be a nonempty bounded array of source page IDs.");
  }
  return [...ids];
}

export function snapshotComicPageDescriptions(values: readonly ComicPageDescription[] | undefined, maxNodes: number): readonly ComicPageDescription[] | undefined {
  if (values === undefined) return undefined;
  if (!Array.isArray(values) || values.length > maxNodes) throw new Error("Comic descriptions must be a bounded array of page ID/text records.");
  const seen = new Set<string>();
  return Array.from(values, value => {
    if (!value || typeof value.pageId !== "string" || !value.pageId || value.pageId.length > 255 || typeof value.text !== "string" || !value.text.trim() || value.text.length > MAX_COMIC_PAGE_DESCRIPTION_LENGTH || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value.text)) {
      throw new Error("Comic descriptions require a source page ID and nonblank plain text of at most 2048 characters, without unsafe control characters.");
    }
    if (seen.has(value.pageId)) throw new Error("Comic descriptions must identify each page at most once.");
    seen.add(value.pageId);
    return { pageId: value.pageId, text: value.text };
  });
}

function normalizeContent(
  extracted: ImportResult, title: string, limits: ConversionLimits, options: ConversionSettings
): { document: PrdNormalizedContent; nodeCount: number } {
  const common = { schemaVersion: "1.0", id: "document", title };
  let nodeCount = 0;
  // Work on a clone: adding stable reading-order IDs must not mutate an adapter's result.
  const content = structuredClone(extracted.content);
  function identify(nodes: Array<{ id?: string; type?: string; children?: unknown }>, depth = 0): void {
    if (depth > 64) throw new Error("Content nesting exceeds the conversion limit.");
    for (const node of nodes) {
      nodeCount += 1;
      if (nodeCount > limits.maxNodes) throw new Error("Content node count exceeds the conversion limit.");
      node.id ??= `node-${nodeCount}`;
      if (node.type === "section" && Array.isArray(node.children)) identify(node.children, depth + 1);
    }
  }
  switch (content.profile) {
    case "general-document":
      if (content.children.length === 0) throw new Error("No supported readable content was extracted.");
      identify(content.children);
      return { document: { ...common, ...content, type: "document" }, nodeCount };
    case "comic": {
      const byId = new Map(content.panels.map(panel => [panel.id, panel]));
      const comicPageIds = options.comicPageIds;
      if (comicPageIds) {
        if (comicPageIds.length !== content.panels.length || new Set(comicPageIds).size !== comicPageIds.length || byId.size !== content.panels.length || comicPageIds.some(id => !byId.has(id))) {
          throw new Error("Comic page IDs must include every imported page exactly once.");
        }
        content.panels = comicPageIds.map(id => byId.get(id)!);
      } else if (options.comicPageOrder === "reverse") content.panels.reverse();
      for (const description of options.comicPageDescriptions ?? []) {
        const page = byId.get(description.pageId);
        if (!page) throw new Error("Comic descriptions must reference an imported source page.");
        page.alt = description.text;
      }
      identify(content.panels);
      return { document: { ...common, ...content, type: "comic" }, nodeCount };
    }
    case "storyboard":
      identify(content.frames);
      return { document: { ...common, ...content, type: "storyboard" }, nodeCount };
    default:
      throw new Error("Adapter returned a noncanonical profile.");
  }
}

export function assembleConversion(
  source: ImportSource, adapter: { id: string }, extracted: ImportResult,
  resources: ConversionResources, limits: ConversionLimits, options: ConversionSettings, sourceId: string
): PreparedConversion {
  const bytes = source.bytes;
  const comicPageIds = snapshotComicPageIds(options.comicPageIds, limits.maxNodes);
  const comicPageDescriptions = snapshotComicPageDescriptions(options.comicPageDescriptions, limits.maxNodes);
  if (comicPageDescriptions?.length && extracted.content.profile !== "comic") throw new Error("Comic descriptions apply only to comic sources.");
  if (comicPageIds !== undefined) {
    if (extracted.content.profile !== "comic") throw new Error("Comic page IDs apply only to comic sources.");
    if (options.comicPageOrder !== undefined) throw new Error("Choose explicit comic page IDs or filename order, not both.");
  }
  if (options.comicPageOrder !== undefined) {
    if (options.comicPageOrder !== "natural" && options.comicPageOrder !== "reverse") throw new Error("Comic page order must be natural or reverse.");
    if (extracted.content.profile !== "comic") throw new Error("Comic page order applies only to comic sources.");
  }
  if (options.profile && options.profile !== "auto" && options.profile !== extracted.content.profile) {
    throw new Error(`Source adapter ${adapter.id} supports profile ${extracted.content.profile}; requested ${options.profile}.`);
  }
  const dotIndex = source.name.lastIndexOf(".");
  const title = options.title ?? extracted.title ?? (dotIndex > 0 ? source.name.slice(0, dotIndex) : source.name);
  const { document, nodeCount } = normalizeContent(extracted, title, limits, { ...options, comicPageIds, comicPageDescriptions });
  const sourcePreserved = options.preserveSource !== false;
  const warnings: ConversionWarning[] = [...extracted.warnings, ...resources.warnings];
  if (options.comicPageOrder === "reverse") {
    warnings.push({ code: "comic-page-order-reversed", stage: "adapt", message: "Comic panel sequence was reversed by request. Resource IDs still identify the same source pages; this does not specify manga direction or panel geometry." });
  }
  if (comicPageIds !== undefined) {
    warnings.push({ code: "comic-page-order-reviewed", stage: "adapt", message: comicPageDescriptions?.length
      ? "Comic page sequence was explicitly selected during conversion review. Source page IDs and image assets are retained; supplied descriptions are applied separately. Verify the resulting order in Viewer."
      : "Comic page sequence was explicitly selected during conversion review. Source page IDs, image assets and descriptions are retained. Verify the resulting order in Viewer." });
  }
  if (comicPageDescriptions?.length) {
    const count = comicPageDescriptions.length;
    const generated = warnings.findIndex(issue => issue.code === "cbz-generated-alt");
    if (generated >= 0) {
      warnings[generated] = { ...warnings[generated]!, message: `Extraction initially generated descriptions from filenames. ${count} of ${nodeCount} pages now have explicitly supplied descriptions; ${nodeCount - count} retain filename-derived text. Description accuracy and completeness are not assessed; OCR and panel detection are not provided.` };
    }
    warnings.push({ code: "comic-page-descriptions-reviewed", stage: "adapt", message: `Descriptions were explicitly supplied for ${count} imported page${count === 1 ? "" : "s"}. Text is preserved as plain content; accuracy and completeness are not assessed. Source page IDs and image assets are retained.` });
  }
  if (!sourcePreserved) {
    warnings.push({ code: "source-not-preserved", stage: "adapt", message: "Source retention was disabled. Original syntax and omitted content are not included in this package." });
  }
  const report: ConversionQualityReport = {
    reportVersion: "1.0", sourceFormat: adapter.id, profile: document.profile, strategy: "adaptive",
    semanticFidelity: "partial", visualFidelity: "not-preserved", sourcePreserved,
    nodeCount, resourceCount: resources.assets.length, resourceMap: resources.references,
    warnings, validationWarnings: []
  };
  const dot = source.name.lastIndexOf(".");
  const extension = dot > 0 ? source.name.slice(dot).toLowerCase() : "";
  const sourceAttachment = `attachments/source${/^\.[a-z0-9]{1,12}$/u.test(extension) ? extension : ".bin"}`;
  const manifest: PrdManifest = {
    prdVersion: "1.0", manifestVersion: "1.0",
    id: options.id ?? sourceId,
    profile: document.profile, title, entry: "content/root.json",
    assets: resources.assets.map(({ id, href, type }) => ({ id, href, type })),
    attachments: [
      { id: "conversion-quality", href: "attachments/conversion-quality.json", type: "application/json" },
      ...(sourcePreserved ? [{ id: "conversion-source", href: sourceAttachment, type: adapter.id === "markdown" ? "text/markdown" : "application/octet-stream" }] : [])
    ]
  };
  const files: PrdFileMap = {
    "manifest.json": json(manifest), "content/root.json": json(document),
    "attachments/conversion-quality.json": json(report)
  };
  if (sourcePreserved) files[sourceAttachment] = bytes;
  for (const asset of resources.assets) files[asset.href] = asset.bytes;
  const validation = validatePackageFiles(files);
  if (!validation.valid) throw new Error(`Conversion produced invalid PRD content: ${validation.errors.map((issue) => issue.message).join("; ")}`);
  report.validationWarnings = validation.warnings;
  files["attachments/conversion-quality.json"] = json(report);
  return { files, manifest, document, report, validation };
}
