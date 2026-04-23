import { unzipSync, strFromU8 } from "fflate";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { PrdFileMap, PrdPackageValidationResult } from "@eonhive/prd-validator";
import { validatePackageFiles } from "@eonhive/prd-validator";
import {
  PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR,
  openPrdDocument
} from "@eonhive/prd-viewer-core";
import {
  type PrdAssetDeclaration,
  type PrdAttachmentDeclaration,
  type PrdCompatibility,
  type PrdComicRoot,
  type PrdGeneralDocumentNode,
  type PrdGeneralDocumentRoot,
  type PrdGeneralDocumentSectionNode,
  type PrdGeneralDocumentSectionRoot,
  type PrdIdentity,
  type PrdLocalizedContentIndexRoot,
  type PrdLocalizedDocumentOverridesRoot,
  type PrdOpenedDocument,
  type PrdPackageReader,
  type PrdPublicMetadata,
  type PrdReferenceLoadMode,
  PRD_GENERAL_DOCUMENT_SECTION_ENTRY_PREFIX,
  type PrdStoryboardRoot,
  PRD_LOCALIZED_ENTRIES_PATH,
  getProfileDisplayLabel,
  isHtmlEntryPath,
  isJsonEntryPath
} from "@eonhive/prd-types";
import {
  getViewerRenderModeMessage,
  inferViewerRenderMode
} from "./viewerRenderMode.js";

type AssetUrlMap = Record<string, string>;
type AttachmentUrlMap = Record<string, string>;

interface ResumeProfileData {
  id: "resume";
  label?: string;
  notes?: string;
  presentation?: "scan";
}

interface LocalizedViewerVariant {
  entryPath: string;
  label?: string;
  publicMetadata?: PrdPublicMetadata;
  renderedHtml?: string;
  entryDocument?: PrdGeneralDocumentRoot;
  comicDocument?: PrdComicRoot;
  storyboardDocument?: PrdStoryboardRoot;
}

type ViewerInspectionEntryKind =
  | "structured-json"
  | "html-fallback"
  | "unsupported";
type ViewerInspectionSegmentation = "none" | "general-document-sections";
type ViewerRenderMode =
  | "structured-json-rendered"
  | "html-fallback-rendered"
  | "unsupported-entry-mode";

interface PackageFacts {
  fileCount: number;
  totalBytes: number;
  assetCount: number;
  attachmentCount: number;
  localeCount: number;
  hasSeriesMembership: boolean;
  collectionCount: number;
  entryKind: ViewerInspectionEntryKind;
  segmentation: ViewerInspectionSegmentation;
  localizedResources: boolean;
  localizedAlternateEntries: boolean;
  referenceLoadMode: PrdReferenceLoadMode;
}

const referenceViewerRuntimeDescriptor = PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR;
const referenceViewerLoadMode =
  referenceViewerRuntimeDescriptor.referenceLoadMode ?? "eager-whole-package";

function formatReferenceLoadMode(loadMode: PrdReferenceLoadMode): string {
  if (loadMode === "eager-whole-package") {
    return "eager whole-package in-memory";
  }

  return loadMode;
}

function formatReferenceViewerProfileSummary(): string {
  const supportedProfiles = referenceViewerRuntimeDescriptor.supportedProfiles ?? [];

  if (supportedProfiles.length === 0) {
    return "none declared";
  }

  return supportedProfiles.map((profile) => getProfileDisplayLabel(profile)).join(", ");
}

function formatReferenceViewerSupportStateSummary(): string {
  return referenceViewerRuntimeDescriptor.supportStates.join(", ");
}

function createPackageReader(files: PrdFileMap): PrdPackageReader {
  return {
    has(path) {
      return path in files;
    },
    readText(path) {
      const file = files[path];
      if (!file) {
        throw new Error(`Missing package file: ${path}`);
      }
      return strFromU8(file);
    },
    readBinary(path) {
      const file = files[path];
      if (!file) {
        throw new Error(`Missing package file: ${path}`);
      }
      return file;
    }
  };
}

function resolvePath(basePath: string, target: string): string {
  if (target.startsWith("/") || target.startsWith("#") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) {
    return target;
  }

  const segments = basePath.split("/");
  segments.pop();
  const stack = [...segments];

  for (const part of target.split("/")) {
    if (part === "." || part.length === 0) {
      continue;
    }
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }

  return stack.join("/");
}

function guessMimeType(path: string): string {
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".txt")) return "text/plain";
  if (path.endsWith(".pdf")) return "application/pdf";
  if (path.endsWith(".wav")) return "audio/wav";
  if (path.endsWith(".mp3")) return "audio/mpeg";
  if (path.endsWith(".ogg")) return "audio/ogg";
  if (path.endsWith(".mp4")) return "video/mp4";
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".html") || path.endsWith(".htm")) return "text/html";
  return "application/octet-stream";
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function createObjectUrl(
  file: Uint8Array,
  mimeType: string,
  objectUrls: string[]
): string {
  const url = URL.createObjectURL(
    new Blob([toArrayBuffer(file)], { type: mimeType })
  );
  objectUrls.push(url);
  return url;
}

function rewriteHtmlDocument(
  html: string,
  entryPath: string,
  files: PrdFileMap,
  objectUrls: string[]
): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const selectors: Array<[string, "href" | "src" | "poster"]> = [
    ["link[href]", "href"],
    ["img[src]", "src"],
    ["source[src]", "src"],
    ["script[src]", "src"],
    ["video[poster]", "poster"]
  ];

  for (const [selector, attribute] of selectors) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const original = element.getAttribute(attribute);
      if (!original) {
        continue;
      }

      const resolved = resolvePath(entryPath, original);
      const file = files[resolved];
      if (!file) {
        continue;
      }

      const url = createObjectUrl(file, guessMimeType(resolved), objectUrls);
      element.setAttribute(attribute, url);
    }
  }

  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}

function createAssetUrlMap(
  assets: PrdAssetDeclaration[] | undefined,
  files: PrdFileMap,
  objectUrls: string[]
): AssetUrlMap {
  const assetUrls: AssetUrlMap = {};

  if (!Array.isArray(assets)) {
    return assetUrls;
  }

  for (const asset of assets) {
    const file = files[asset.href];
    if (!file) {
      continue;
    }

    const url = createObjectUrl(
      file,
      asset.type ?? guessMimeType(asset.href),
      objectUrls
    );

    if (asset.id) {
      assetUrls[asset.id] = url;
    }

    assetUrls[asset.href] = url;
  }

  return assetUrls;
}

function createAttachmentUrlMap(
  attachments: PrdAttachmentDeclaration[] | undefined,
  files: PrdFileMap,
  objectUrls: string[]
): AttachmentUrlMap {
  const attachmentUrls: AttachmentUrlMap = {};

  if (!Array.isArray(attachments)) {
    return attachmentUrls;
  }

  for (const attachment of attachments) {
    if (attachment.href.startsWith("http://") || attachment.href.startsWith("https://")) {
      attachmentUrls[attachment.href] = attachment.href;
      if (attachment.id) {
        attachmentUrls[attachment.id] = attachment.href;
      }
      continue;
    }

    const file = files[attachment.href];
    if (!file) {
      continue;
    }

    const url = createObjectUrl(
      file,
      attachment.type ?? guessMimeType(attachment.href),
      objectUrls
    );

    attachmentUrls[attachment.href] = url;
    if (attachment.id) {
      attachmentUrls[attachment.id] = url;
    }
  }

  return attachmentUrls;
}

function resolveAssetReferenceUrl(
  reference: string | undefined,
  assetUrls: AssetUrlMap,
  files: PrdFileMap,
  objectUrls: string[]
): string | undefined {
  if (!reference) {
    return undefined;
  }

  const knownUrl = assetUrls[reference];
  if (knownUrl) {
    return knownUrl;
  }

  const file = files[reference];
  if (!file) {
    return undefined;
  }

  const url = createObjectUrl(file, guessMimeType(reference), objectUrls);
  assetUrls[reference] = url;
  return url;
}

function getAttachmentDisplayLabel(attachment: PrdAttachmentDeclaration): string {
  if (typeof attachment.id === "string" && attachment.id.trim().length > 0) {
    return attachment.id.trim();
  }

  try {
    if (attachment.href.startsWith("http://") || attachment.href.startsWith("https://")) {
      const url = new URL(attachment.href);
      const lastPathSegment = url.pathname.split("/").filter(Boolean).pop();
      return lastPathSegment ?? attachment.href;
    }
  } catch {
    return attachment.href;
  }

  const lastPathSegment = attachment.href.split("/").filter(Boolean).pop();
  return lastPathSegment ?? attachment.href;
}

function getOptionalCapabilities(compatibility: PrdCompatibility | undefined): string[] {
  if (!compatibility?.capabilities || Array.isArray(compatibility.capabilities)) {
    return [];
  }

  const optionalCapabilities = compatibility.capabilities.optional;
  if (!Array.isArray(optionalCapabilities)) {
    return [];
  }

  return optionalCapabilities.filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );
}

function parseResumeProfileData(
  files: PrdFileMap,
  normalizedProfile: string
): ResumeProfileData | undefined {
  if (normalizedProfile !== "general-document") {
    return undefined;
  }

  const raw = files["profiles/resume.json"];
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(strFromU8(raw)) as Record<string, unknown>;
    if (parsed.id !== "resume") {
      return undefined;
    }

    return {
      id: "resume",
      label:
        typeof parsed.label === "string" && parsed.label.trim().length > 0
          ? parsed.label.trim()
          : undefined,
      notes:
        typeof parsed.notes === "string" && parsed.notes.trim().length > 0
          ? parsed.notes.trim()
          : undefined,
      presentation: parsed.presentation === "scan" ? "scan" : undefined
    };
  } catch {
    return undefined;
  }
}

function parseLocalizedContentIndexRoot(
  files: PrdFileMap
): PrdLocalizedContentIndexRoot | undefined {
  const raw = files[PRD_LOCALIZED_ENTRIES_PATH];
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(strFromU8(raw)) as Record<string, unknown>;
    if (
      parsed.type !== "localized-content-index" ||
      typeof parsed.locales !== "object"
    ) {
      return undefined;
    }

    return parsed as unknown as PrdLocalizedContentIndexRoot;
  } catch {
    return undefined;
  }
}

function summarizeLocalizedContentIndex(
  files: PrdFileMap
): Pick<PackageFacts, "localizedResources" | "localizedAlternateEntries"> {
  const localizedIndexRoot = parseLocalizedContentIndexRoot(files);
  if (!localizedIndexRoot || typeof localizedIndexRoot.locales !== "object") {
    return {
      localizedResources: false,
      localizedAlternateEntries: false
    };
  }

  const descriptors = Object.values(localizedIndexRoot.locales);
  return {
    localizedResources: descriptors.some(
      (descriptor) =>
        descriptor !== null &&
        typeof descriptor === "object" &&
        typeof descriptor.resource === "string" &&
        descriptor.resource.trim().length > 0
    ),
    localizedAlternateEntries: descriptors.some(
      (descriptor) =>
        descriptor !== null &&
        typeof descriptor === "object" &&
        typeof descriptor.entry === "string" &&
        descriptor.entry.trim().length > 0
    )
  };
}

function inferViewerEntryKind(entryPath: string | undefined): ViewerInspectionEntryKind {
  if (!entryPath) {
    return "unsupported";
  }

  if (isJsonEntryPath(entryPath)) {
    return "structured-json";
  }

  if (isHtmlEntryPath(entryPath)) {
    return "html-fallback";
  }

  return "unsupported";
}

function inferViewerSegmentation(
  opened: PrdOpenedDocument
): ViewerInspectionSegmentation {
  if (opened.profileInfo.normalized !== "general-document" || !opened.entryDocument) {
    return "none";
  }

  return opened.entryDocument.children.some(
    (child) =>
      child.type === "section" &&
      "src" in child &&
      typeof child.src === "string" &&
      child.src.trim().length > 0
  )
    ? "general-document-sections"
    : "none";
}

function createPackageFacts(
  files: PrdFileMap,
  opened: PrdOpenedDocument
): PackageFacts {
  const localeValues = new Set<string>();
  if (opened.localization?.defaultLocale) {
    localeValues.add(opened.localization.defaultLocale);
  }

  for (const locale of opened.localization?.availableLocales ?? []) {
    localeValues.add(locale);
  }

  return {
    fileCount: Object.keys(files).length,
    totalBytes: Object.values(files).reduce(
      (total, fileBytes) => total + fileBytes.byteLength,
      0
    ),
    assetCount: opened.manifest.assets?.length ?? 0,
    attachmentCount: opened.manifest.attachments?.length ?? 0,
    localeCount: localeValues.size,
    hasSeriesMembership:
      typeof opened.manifest.identity?.series?.ref === "string" &&
      opened.manifest.identity.series.ref.trim().length > 0,
    collectionCount: opened.manifest.identity?.collections?.length ?? 0,
    entryKind: inferViewerEntryKind(opened.entryPath),
    segmentation: inferViewerSegmentation(opened),
    ...summarizeLocalizedContentIndex(files),
    referenceLoadMode: referenceViewerLoadMode
  };
}

function formatBytes(byteCount: number): string {
  return new Intl.NumberFormat("en-US").format(byteCount);
}

function parseLocalizedDocumentOverridesRoot(
  files: PrdFileMap,
  resourcePath: string,
  locale: string
): PrdLocalizedDocumentOverridesRoot | undefined {
  const raw = files[resourcePath];
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(strFromU8(raw)) as Record<string, unknown>;
    if (
      parsed.type !== "localized-document-overrides" ||
      parsed.locale !== locale
    ) {
      return undefined;
    }

    return parsed as unknown as PrdLocalizedDocumentOverridesRoot;
  } catch {
    return undefined;
  }
}

function applyLocalizedDocumentOverrides(
  document: PrdGeneralDocumentRoot,
  overrides: PrdLocalizedDocumentOverridesRoot
): PrdGeneralDocumentRoot {
  const nodeOverrides = overrides.nodes ?? {};

  function applyNode(node: PrdGeneralDocumentNode): PrdGeneralDocumentNode {
    const override =
      node.id !== undefined ? nodeOverrides[node.id] : undefined;

    switch (node.type) {
      case "section":
        return {
          type: "section",
          id: node.id,
          title:
            override?.type === "section" && override.title !== undefined
              ? override.title
              : node.title,
          children: hasInlineSectionChildren(node)
            ? node.children.map((child) => applyNode(child))
            : []
        };

      case "heading":
        return {
          ...node,
          text:
            override?.type === "heading" && override.text !== undefined
              ? override.text
              : node.text
        };

      case "paragraph":
        return {
          ...node,
          text:
            override?.type === "paragraph" && override.text !== undefined
              ? override.text
              : node.text
        };

      case "list":
        return {
          ...node,
          items:
            override?.type === "list" && override.items !== undefined
              ? override.items
              : node.items
        };

      case "links":
        return {
          ...node,
          items:
            override?.type === "links" && override.items !== undefined
              ? node.items.map((item, index) => ({
                  ...item,
                  label: override.items?.[index]?.label ?? item.label
                }))
              : node.items
        };

      case "table":
        return {
          ...node,
          caption:
            override?.type === "table" && override.caption !== undefined
              ? override.caption
              : node.caption,
          columns:
            override?.type === "table" && override.columns !== undefined
              ? node.columns.map((column, index) => ({
                  ...column,
                  label: override.columns?.[index]?.label ?? column.label
                }))
              : node.columns,
          rows:
            override?.type === "table" && override.rows !== undefined
              ? node.rows.map((row, rowIndex) => ({
                  ...row,
                  ...(override.rows?.[rowIndex] ?? {})
                }))
              : node.rows
        };

      case "chart":
        return {
          ...node,
          title:
            override?.type === "chart" && override.title !== undefined
              ? override.title
              : node.title,
          caption:
            override?.type === "chart" && override.caption !== undefined
              ? override.caption
              : node.caption,
          categories:
            override?.type === "chart" && override.categories !== undefined
              ? override.categories
              : node.categories,
          series:
            override?.type === "chart" && override.series !== undefined
              ? node.series.map((series, index) => ({
                  ...series,
                  name: override.series?.[index]?.name ?? series.name
                }))
              : node.series
        };

      case "media":
        return {
          ...node,
          caption:
            override?.type === "media" && override.caption !== undefined
              ? override.caption
              : node.caption
        };

      case "image":
        return {
          ...node,
          asset:
            override?.type === "image" && override.asset !== undefined
              ? override.asset
              : node.asset,
          alt:
            override?.type === "image" && override.alt !== undefined
              ? override.alt
              : node.alt,
          caption:
            override?.type === "image" && override.caption !== undefined
              ? override.caption
              : node.caption
        };

      case "quote":
        return {
          ...node,
          text:
            override?.type === "quote" && override.text !== undefined
              ? override.text
              : node.text,
          attribution:
            override?.type === "quote" && override.attribution !== undefined
              ? override.attribution
              : node.attribution
        };
    }
  }

  return {
    ...document,
    title: overrides.document?.title ?? document.title,
    subtitle: overrides.document?.subtitle ?? document.subtitle,
    summary: overrides.document?.summary ?? document.summary,
    lang: overrides.document?.lang ?? document.lang,
    children: document.children.map((child) => applyNode(child))
  };
}

function applyLocalizedPublicMetadataOverrides(
  publicMetadata: PrdPublicMetadata | undefined,
  overrides: PrdLocalizedDocumentOverridesRoot
): PrdPublicMetadata | undefined {
  if (!overrides.public) {
    return publicMetadata;
  }

  return {
    ...(publicMetadata ?? {}),
    ...(overrides.public.subtitle !== undefined
      ? { subtitle: overrides.public.subtitle }
      : {}),
    ...(overrides.public.summary !== undefined
      ? { summary: overrides.public.summary }
      : {}),
    ...(overrides.public.byline !== undefined
      ? { byline: overrides.public.byline }
      : {}),
    ...(overrides.public.publisher !== undefined
      ? { publisher: overrides.public.publisher }
      : {}),
    ...(overrides.public.cover !== undefined
      ? { cover: overrides.public.cover }
      : {}),
    ...(overrides.public.series?.title !== undefined
      ? {
          series: {
            ...(publicMetadata?.series ?? {}),
            title: overrides.public.series.title
          }
        }
      : {}),
    ...(overrides.public.collections !== undefined
      ? { collections: overrides.public.collections }
      : {})
  };
}

function hasInlineSectionChildren(
  node: PrdGeneralDocumentSectionNode
): node is PrdGeneralDocumentSectionNode & {
  children: PrdGeneralDocumentNode[];
} {
  return "children" in node && Array.isArray(node.children);
}

function resolveSegmentedSectionNode(
  node: PrdGeneralDocumentSectionNode,
  files: PrdFileMap,
  allowSegmentedSrc: boolean
): PrdGeneralDocumentSectionNode {
  if (hasInlineSectionChildren(node)) {
    return {
      ...node,
      children: node.children.map((child) =>
        resolveSegmentedGeneralDocumentNode(child, files, false)
      )
    };
  }

  if (!allowSegmentedSrc || !("src" in node) || typeof node.src !== "string") {
    throw new Error(
      `Segmented section resolution expected an inline section or a top-level \`src\` under \`${PRD_GENERAL_DOCUMENT_SECTION_ENTRY_PREFIX}\`.`
    );
  }

  const sectionFile = files[node.src];
  if (!sectionFile) {
    throw new Error(`Missing segmented section file: ${node.src}`);
  }

  const sectionRoot = JSON.parse(strFromU8(sectionFile)) as PrdGeneralDocumentSectionRoot;

  return {
    type: "section",
    id: node.id,
    title: node.title,
    children: sectionRoot.children.map((child) =>
      resolveSegmentedGeneralDocumentNode(child, files, false)
    )
  };
}

function resolveSegmentedGeneralDocumentNode(
  node: PrdGeneralDocumentNode,
  files: PrdFileMap,
  allowSegmentedSectionSrc: boolean
): PrdGeneralDocumentNode {
  if (node.type !== "section") {
    return node;
  }

  return resolveSegmentedSectionNode(node, files, allowSegmentedSectionSrc);
}

function resolveSegmentedGeneralDocument(
  document: PrdGeneralDocumentRoot,
  files: PrdFileMap
): PrdGeneralDocumentRoot {
  return {
    ...document,
    children: document.children.map((child) =>
      resolveSegmentedGeneralDocumentNode(child, files, true)
    )
  };
}

function createLocalizedViewerVariantFromEntry(
  entryPath: string,
  normalizedProfile: string,
  files: PrdFileMap,
  objectUrls: string[]
): LocalizedViewerVariant | undefined {
  const entryFile = files[entryPath];
  if (!entryFile) {
    return undefined;
  }

  if (isJsonEntryPath(entryPath)) {
    const entryText = strFromU8(entryFile);

    switch (normalizedProfile) {
      case "general-document":
        {
          const entryDocument = JSON.parse(entryText) as PrdGeneralDocumentRoot;
        return {
          entryPath,
          entryDocument: resolveSegmentedGeneralDocument(entryDocument, files)
        };
        }
      case "comic":
        return {
          entryPath,
          comicDocument: JSON.parse(entryText) as PrdComicRoot
        };
      case "storyboard":
        return {
          entryPath,
          storyboardDocument: JSON.parse(entryText) as PrdStoryboardRoot
        };
      default:
        return undefined;
    }
  }

  if (isHtmlEntryPath(entryPath)) {
    return {
      entryPath,
      renderedHtml: rewriteHtmlDocument(
        strFromU8(entryFile),
        entryPath,
        files,
        objectUrls
      )
    };
  }

  return undefined;
}

function createLocalizedViewerVariants(
  files: PrdFileMap,
  opened: PrdOpenedDocument,
  objectUrls: string[]
): Record<string, LocalizedViewerVariant> {
  const localizedEntriesRoot = parseLocalizedContentIndexRoot(files);
  if (
    !localizedEntriesRoot ||
    !opened.localization?.defaultLocale ||
    typeof localizedEntriesRoot.locales !== "object" ||
    Array.isArray(localizedEntriesRoot.locales)
  ) {
    return {};
  }

  const variants: Record<string, LocalizedViewerVariant> = {};
  for (const [locale, value] of Object.entries(localizedEntriesRoot.locales)) {
    if (
      locale === opened.localization.defaultLocale ||
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value)
    ) {
      continue;
    }

    const label =
      typeof value.label === "string" && value.label.trim().length > 0
        ? value.label.trim()
        : undefined;
    const entry =
      typeof value.entry === "string" && value.entry.trim().length > 0
        ? value.entry
        : undefined;
    const resource =
      typeof value.resource === "string" && value.resource.trim().length > 0
        ? value.resource
        : undefined;

    try {
      let variant: LocalizedViewerVariant | undefined;

      if (entry) {
        variant = createLocalizedViewerVariantFromEntry(
          entry,
          opened.profileInfo.normalized,
          files,
          objectUrls
        );

        if (!variant) {
          continue;
        }
      }

      if (
        resource &&
        opened.profileInfo.normalized === "general-document" &&
        (variant?.entryDocument ?? opened.entryDocument)
      ) {
        const overrides = parseLocalizedDocumentOverridesRoot(files, resource, locale);
        if (!overrides) {
          continue;
        }

        const baseDocument = variant?.entryDocument ?? opened.entryDocument;
        variant = {
          ...(variant ?? { entryPath: opened.entryPath }),
          entryPath: `${variant?.entryPath ?? opened.entryPath} + ${resource}`,
          entryDocument: applyLocalizedDocumentOverrides(baseDocument!, overrides),
          publicMetadata: applyLocalizedPublicMetadataOverrides(
            opened.manifest.public,
            overrides
          )
        };
      }

      if (!variant) {
        continue;
      }

      variants[locale] = {
        ...variant,
        label
      };
    } catch {
      continue;
    }
  }

  return variants;
}

function formatContributorCredit(
  contributor: NonNullable<PrdPublicMetadata["contributors"]>[number]
): string {
  return `${contributor.displayName ?? contributor.name} · ${contributor.role}`;
}

function formatSeriesSequence(identity: PrdIdentity | undefined): string | undefined {
  const sequence = identity?.series?.sequence;
  if (!sequence) {
    return undefined;
  }

  const parts = [
    sequence.index !== undefined ? `#${sequence.index}` : undefined,
    sequence.volume !== undefined ? `Volume ${sequence.volume}` : undefined,
    sequence.issue !== undefined ? `Issue ${sequence.issue}` : undefined,
    sequence.chapter !== undefined ? `Chapter ${sequence.chapter}` : undefined,
    sequence.episode !== undefined ? `Episode ${sequence.episode}` : undefined,
    sequence.part !== undefined ? `Part ${sequence.part}` : undefined
  ].filter((value): value is string => value !== undefined);

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function getStructuredLinkAnchorProps(href: string): {
  href: string;
  target?: "_blank";
  rel?: "noreferrer";
} {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return {
      href,
      target: "_blank",
      rel: "noreferrer"
    };
  }

  return { href };
}

function getTableAlignClass(align?: "left" | "center" | "right"): string {
  return `structured-table-align-${align ?? "left"}`;
}

function formatChartValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function renderHeading(
  level: number,
  text: string,
  key: string,
  id?: string
): ReactNode {
  switch (Math.min(Math.max(level, 1), 6)) {
    case 1:
      return (
        <h1 key={key} id={id} className="structured-heading structured-heading-1">
          {text}
        </h1>
      );
    case 2:
      return (
        <h2 key={key} id={id} className="structured-heading structured-heading-2">
          {text}
        </h2>
      );
    case 3:
      return (
        <h3 key={key} id={id} className="structured-heading structured-heading-3">
          {text}
        </h3>
      );
    case 4:
      return (
        <h4 key={key} id={id} className="structured-heading structured-heading-4">
          {text}
        </h4>
      );
    case 5:
      return (
        <h5 key={key} id={id} className="structured-heading structured-heading-5">
          {text}
        </h5>
      );
    default:
      return (
        <h6 key={key} id={id} className="structured-heading structured-heading-6">
          {text}
        </h6>
      );
  }
}

function renderGeneralDocumentNode(
  node: PrdGeneralDocumentNode,
  assetUrls: AssetUrlMap,
  key: string
): ReactNode {
  switch (node.type) {
    case "section":
      return (
        <section key={key} id={node.id} className="structured-section">
          <h2 className="structured-section-title">{node.title}</h2>
          <div className="structured-section-body">
            {hasInlineSectionChildren(node)
              ? node.children.map((child, index) =>
                  renderGeneralDocumentNode(child, assetUrls, `${key}-${index}`)
                )
              : null}
          </div>
        </section>
      );

    case "heading":
      return renderHeading(node.level, node.text, key, node.id);

    case "paragraph":
      return (
        <p key={key} id={node.id} className="structured-paragraph">
          {node.text}
        </p>
      );

    case "list":
      return node.style === "ordered" ? (
        <ol key={key} id={node.id} className="structured-list">
          {node.items.map((item, index) => (
            <li key={`${key}-${index}`}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul key={key} id={node.id} className="structured-list">
          {node.items.map((item, index) => (
            <li key={`${key}-${index}`}>{item}</li>
          ))}
        </ul>
      );

    case "links":
      return node.style === "list" ? (
        <ul key={key} id={node.id} className="structured-links structured-links-list">
          {node.items.map((item, index) => (
            <li key={`${key}-${index}`}>
              <a
                className="structured-link"
                {...getStructuredLinkAnchorProps(item.href)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p key={key} id={node.id} className="structured-links structured-links-inline">
          {node.items.map((item, index) => (
            <a
              key={`${key}-${index}`}
              className="structured-link"
              {...getStructuredLinkAnchorProps(item.href)}
            >
              {item.label}
            </a>
          ))}
        </p>
      );

    case "table":
      return (
        <div key={key} id={node.id} className="structured-table-wrap">
          <table className="structured-table">
            {node.caption && <caption>{node.caption}</caption>}
            <thead>
              <tr>
                {node.columns.map((column) => (
                  <th
                    key={`${key}-${column.id}`}
                    className={getTableAlignClass(column.align)}
                    scope="col"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {node.rows.map((row, rowIndex) => (
                <tr key={`${key}-row-${rowIndex}`}>
                  {node.columns.map((column) => (
                    <td
                      key={`${key}-row-${rowIndex}-${column.id}`}
                      className={getTableAlignClass(column.align)}
                    >
                      {row[column.id] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "chart": {
      const maxValue =
        Math.max(0, ...node.series.flatMap((series) => series.values)) || 1;

      return (
        <figure key={key} id={node.id} className="structured-chart">
          {(node.title || node.caption) && (
            <figcaption className="structured-chart-header">
              {node.title && <strong>{node.title}</strong>}
              {node.caption && <span>{node.caption}</span>}
            </figcaption>
          )}

          <div className="structured-chart-legend" aria-label="Chart series">
            {node.series.map((series, seriesIndex) => (
              <span key={`${key}-legend-${seriesIndex}`} className="structured-chart-legend-item">
                <span className="structured-chart-swatch" data-series={seriesIndex} />
                {series.name}
              </span>
            ))}
          </div>

          <div className="structured-chart-body">
            {node.categories.map((category, categoryIndex) => (
              <div key={`${key}-category-${categoryIndex}`} className="structured-chart-row">
                <div className="structured-chart-category">{category}</div>
                <div className="structured-chart-bars">
                  {node.series.map((series, seriesIndex) => {
                    const value = series.values[categoryIndex] ?? 0;
                    const width = `${(value / maxValue) * 100}%`;

                    return (
                      <div
                        key={`${key}-series-${seriesIndex}-value-${categoryIndex}`}
                        className="structured-chart-bar-group"
                      >
                        <div className="structured-chart-bar-track">
                          <span
                            className="structured-chart-bar"
                            data-series={seriesIndex}
                            style={{ width }}
                          />
                        </div>
                        <span className="structured-chart-value">
                          {formatChartValue(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </figure>
      );
    }

    case "media": {
      const src = assetUrls[node.asset];
      const posterUrl = node.poster ? assetUrls[node.poster] : undefined;

      return (
        <figure key={key} id={node.id} className="structured-media">
          {src ? (
            node.mediaType === "audio" ? (
              <audio className="structured-media-player" controls preload="metadata" src={src} />
            ) : (
              <video
                className="structured-media-player structured-media-video"
                controls
                preload="metadata"
                src={src}
                poster={posterUrl}
              />
            )
          ) : (
            <div className="structured-missing-asset">
              Missing declared asset: <code>{node.asset}</code>
            </div>
          )}
          {node.caption && <figcaption>{node.caption}</figcaption>}
        </figure>
      );
    }

    case "image": {
      const src = assetUrls[node.asset];
      return (
        <figure key={key} id={node.id} className="structured-figure">
          {src ? (
            <img src={src} alt={node.alt} />
          ) : (
            <div className="structured-missing-asset">
              Missing declared asset: <code>{node.asset}</code>
            </div>
          )}
          {node.caption && <figcaption>{node.caption}</figcaption>}
        </figure>
      );
    }

    case "quote":
      return (
        <blockquote key={key} id={node.id} className="structured-quote">
          <p>{node.text}</p>
          {node.attribution && <footer>{node.attribution}</footer>}
        </blockquote>
      );
  }
}

function StructuredDocumentView({
  document,
  assetUrls
}: {
  document: PrdGeneralDocumentRoot;
  assetUrls: AssetUrlMap;
}) {
  return (
    <article className="structured-document" lang={document.lang}>
      <header className="structured-document-header">
        <p className="structured-kicker">Structured {getProfileDisplayLabel(document.profile)}</p>
        <h1 className="structured-document-title">{document.title}</h1>
        {document.subtitle && (
          <p className="structured-document-subtitle">{document.subtitle}</p>
        )}
        {document.summary && (
          <p className="structured-document-summary">{document.summary}</p>
        )}
      </header>

      <div className="structured-document-body">
        {document.children.map((node, index) =>
          renderGeneralDocumentNode(node, assetUrls, `root-${index}`)
        )}
      </div>
    </article>
  );
}

function ResumeDocumentView({
  document,
  assetUrls,
  resumeProfile
}: {
  document: PrdGeneralDocumentRoot;
  assetUrls: AssetUrlMap;
  resumeProfile: ResumeProfileData;
}) {
  const leadVisualIndex = document.children.findIndex((node) => node.type === "image");
  const leadParagraphIndex = document.children.findIndex(
    (node, index) => node.type === "paragraph" && index !== leadVisualIndex
  );
  const consumedIndexes = new Set<number>();

  if (leadVisualIndex >= 0) {
    consumedIndexes.add(leadVisualIndex);
  }

  if (leadParagraphIndex >= 0) {
    consumedIndexes.add(leadParagraphIndex);
  }

  const sectionEntries = document.children.flatMap((node, index) => {
    if (node.type !== "section" || !hasInlineSectionChildren(node)) {
      return [];
    }

    consumedIndexes.add(index);
    return [{ node, index }] as const;
  });

  const leadVisual =
    leadVisualIndex >= 0 && document.children[leadVisualIndex]?.type === "image"
      ? document.children[leadVisualIndex]
      : undefined;
  const leadParagraph =
    leadParagraphIndex >= 0 && document.children[leadParagraphIndex]?.type === "paragraph"
      ? document.children[leadParagraphIndex]
      : undefined;
  const supportingNodes = document.children.filter(
    (_node, index) => !consumedIndexes.has(index)
  );
  const hasOverview = leadVisual || leadParagraph || resumeProfile.notes;

  return (
    <article className="structured-document resume-document" lang={document.lang}>
      <header className="structured-document-header resume-document-header">
        <p className="structured-kicker">{resumeProfile.label ?? "Resume variant"}</p>
        <h1 className="structured-document-title">{document.title}</h1>
        {document.subtitle && (
          <p className="structured-document-subtitle">{document.subtitle}</p>
        )}
        {document.summary && (
          <p className="structured-document-summary">{document.summary}</p>
        )}
      </header>

      <div className="resume-document-layout">
        {hasOverview && (
          <aside className="resume-overview-card" aria-label="Resume overview">
            {leadVisual &&
              renderGeneralDocumentNode(
                leadVisual,
                assetUrls,
                `${document.id}-resume-lead-visual`
              )}
            <div className="resume-overview-body">
              {resumeProfile.notes && (
                <p className="resume-profile-note">{resumeProfile.notes}</p>
              )}
              {leadParagraph &&
                renderGeneralDocumentNode(
                  leadParagraph,
                  assetUrls,
                  `${document.id}-resume-lead-paragraph`
                )}
            </div>
          </aside>
        )}

        {sectionEntries.length > 0 && (
          <div className="resume-section-grid">
            {sectionEntries.map(({ node, index }) => (
              <section key={`${document.id}-resume-section-${index}`} id={node.id} className="resume-section-card">
                <h2 className="resume-section-title">{node.title}</h2>
                <div className="structured-section-body">
                  {node.children.map((child, childIndex) =>
                    renderGeneralDocumentNode(
                      child,
                      assetUrls,
                      `${document.id}-resume-section-${index}-${childIndex}`
                    )
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {supportingNodes.length > 0 && (
        <div className="resume-supporting-flow">
          {supportingNodes.map((node, index) =>
            renderGeneralDocumentNode(
              node,
              assetUrls,
              `${document.id}-resume-support-${index}`
            )
          )}
        </div>
      )}
    </article>
  );
}

function ComicPanelStripView({
  comicDocument,
  assetUrls
}: {
  comicDocument: PrdComicRoot;
  assetUrls: AssetUrlMap;
}) {
  return (
    <section className="comic-panel-strip" aria-label="Comic panel strip">
      <div className="comic-panel-strip-header">
        <p className="structured-kicker">Structured comic root</p>
        <h3>Panel Strip</h3>
        <p>
          This comic opened through the canonical structured JSON entry path. The
          current reference viewer renders static image-backed panel cards while
          richer comic presentation remains a later slice.
        </p>
      </div>

      <ol className="comic-panel-strip-list">
        {comicDocument.panels.map((panel) => (
          <li key={panel.id} className="comic-panel-card">
            {assetUrls[panel.asset] ? (
              <img
                src={assetUrls[panel.asset]}
                alt={panel.alt}
                className="visual-card-image"
                loading="lazy"
              />
            ) : (
              <div className="structured-missing-asset">
                Missing declared asset: <code>{panel.asset}</code>
              </div>
            )}
            <div className="visual-card-body">
              <p className="visual-card-id">{panel.id}</p>
              {panel.caption && <p className="visual-card-copy">{panel.caption}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const COMIC_SWIPE_THRESHOLD_PX = 48;

function ComicPanelNavigationView({
  comicDocument,
  assetUrls
}: {
  comicDocument: PrdComicRoot;
  assetUrls: AssetUrlMap;
}) {
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  const swipePointerId = useRef<number | null>(null);
  const lastPanelIndex = comicDocument.panels.length - 1;

  useEffect(() => {
    setActivePanelIndex(0);
  }, [comicDocument.id, comicDocument.panels.length]);

  const currentPanel =
    comicDocument.panels[Math.min(activePanelIndex, lastPanelIndex)] ??
    comicDocument.panels[0];

  if (!currentPanel) {
    return null;
  }

  function moveToPanel(nextIndex: number) {
    setActivePanelIndex(Math.min(Math.max(nextIndex, 0), lastPanelIndex));
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveToPanel(activePanelIndex - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveToPanel(activePanelIndex + 1);
    }
  }

  function resetSwipeTracking() {
    swipeStartX.current = null;
    swipePointerId.current = null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    swipeStartX.current = event.clientX;
    swipePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (swipePointerId.current !== event.pointerId || swipeStartX.current === null) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* capture may already be released */
    }

    const dx = event.clientX - swipeStartX.current;
    resetSwipeTracking();

    if (dx < -COMIC_SWIPE_THRESHOLD_PX) {
      moveToPanel(activePanelIndex + 1);
    } else if (dx > COMIC_SWIPE_THRESHOLD_PX) {
      moveToPanel(activePanelIndex - 1);
    }
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLElement>) {
    if (swipePointerId.current === event.pointerId) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      resetSwipeTracking();
    }
  }

  return (
    <section
      className="comic-panel-strip comic-panel-navigation"
      aria-label="Comic panel navigation"
    >
      <div className="comic-panel-strip-header">
        <p className="structured-kicker">Structured comic root</p>
        <h3>Panel Navigation</h3>
        <p>
          This comic declares optional <code>panel-navigation</code>, so the
          reference viewer exposes a single active panel with keyboard,
          buttons, and swipe on the panel area.
        </p>
      </div>

      <div
        className="comic-panel-stage comic-panel-stage--swipeable"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label="Active comic panel. Swipe left for next, right for previous."
      >
        <span className="visually-hidden" aria-live="polite" aria-atomic="true">
          Panel {activePanelIndex + 1} of {comicDocument.panels.length}
        </span>
        {assetUrls[currentPanel.asset] ? (
          <img
            src={assetUrls[currentPanel.asset]}
            alt={currentPanel.alt}
            className="comic-panel-stage-image"
            draggable={false}
          />
        ) : (
          <div className="structured-missing-asset">
            Missing declared asset: <code>{currentPanel.asset}</code>
          </div>
        )}

        <div className="comic-panel-stage-body">
          <div className="comic-panel-stage-meta">
            <p className="visual-card-id">{currentPanel.id}</p>
            <p className="comic-panel-stage-status" aria-hidden="true">
              Panel {activePanelIndex + 1} of {comicDocument.panels.length}
            </p>
          </div>
          {currentPanel.caption && (
            <p className="visual-card-copy">{currentPanel.caption}</p>
          )}
        </div>
      </div>

      <div className="comic-panel-controls" aria-label="Comic panel controls">
        <button
          type="button"
          className="comic-panel-control"
          onClick={() => moveToPanel(activePanelIndex - 1)}
          disabled={activePanelIndex === 0}
        >
          Previous
        </button>
        <p className="comic-panel-controls-hint">
          <span className="comic-panel-controls-hint-desktop">
            Use Left/Right arrows or jump directly.
          </span>
          <span className="comic-panel-controls-hint-touch">
            Swipe on the panel, or use the buttons below.
          </span>
        </p>
        <button
          type="button"
          className="comic-panel-control"
          onClick={() => moveToPanel(activePanelIndex + 1)}
          disabled={activePanelIndex === lastPanelIndex}
        >
          Next
        </button>
      </div>

      <ol className="comic-panel-jump-list">
        {comicDocument.panels.map((panel, index) => (
          <li key={panel.id}>
            <button
              type="button"
              className={
                index === activePanelIndex
                  ? "comic-panel-jump is-active"
                  : "comic-panel-jump"
              }
              onClick={() => moveToPanel(index)}
              aria-current={index === activePanelIndex ? "true" : undefined}
            >
              <span className="comic-panel-jump-index">{index + 1}</span>
              <span className="comic-panel-jump-label">{panel.id}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StoryboardFrameGridView({
  storyboardDocument,
  assetUrls
}: {
  storyboardDocument: PrdStoryboardRoot;
  assetUrls: AssetUrlMap;
}) {
  return (
    <section className="storyboard-frame-grid" aria-label="Storyboard frame grid">
      <div className="storyboard-frame-grid-header">
        <p className="structured-kicker">Structured storyboard root</p>
        <h3>Frame Grid</h3>
        <p>
          This storyboard opened through the canonical structured JSON entry path.
          Without optional <code>review-grid</code>, the current reference viewer
          renders static image-backed frame cards.
        </p>
      </div>

      <ol className="storyboard-frame-grid-list">
        {storyboardDocument.frames.map((frame) => (
          <li key={frame.id} className="storyboard-frame-card">
            {assetUrls[frame.asset] ? (
              <img
                src={assetUrls[frame.asset]}
                alt={frame.alt}
                className="visual-card-image"
                loading="lazy"
              />
            ) : (
              <div className="structured-missing-asset">
                Missing declared asset: <code>{frame.asset}</code>
              </div>
            )}
            <div className="visual-card-body">
              <p className="visual-card-id">{frame.id}</p>
              {frame.notes && <p className="visual-card-copy">{frame.notes}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StoryboardReviewGridView({
  storyboardDocument,
  assetUrls
}: {
  storyboardDocument: PrdStoryboardRoot;
  assetUrls: AssetUrlMap;
}) {
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const lastFrameIndex = storyboardDocument.frames.length - 1;
  const currentFrame =
    storyboardDocument.frames[Math.min(activeFrameIndex, lastFrameIndex)] ??
    storyboardDocument.frames[0];

  useEffect(() => {
    setActiveFrameIndex(0);
  }, [storyboardDocument.id, storyboardDocument.frames.length]);

  if (!currentFrame) {
    return null;
  }

  function moveToFrame(nextIndex: number) {
    setActiveFrameIndex(Math.min(Math.max(nextIndex, 0), lastFrameIndex));
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveToFrame(activeFrameIndex - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveToFrame(activeFrameIndex + 1);
    }
  }

  return (
    <section className="storyboard-frame-grid" aria-label="Storyboard review grid">
      <div className="storyboard-frame-grid-header">
        <p className="structured-kicker">Structured storyboard root</p>
        <h3>Review Grid</h3>
        <p>
          This storyboard declares optional <code>review-grid</code>, so the
          reference viewer exposes one active frame with keyboard, button-based,
          and direct-grid review controls.
        </p>
      </div>

      <div
        className="storyboard-review-stage"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Active storyboard frame"
      >
        {assetUrls[currentFrame.asset] ? (
          <img
            src={assetUrls[currentFrame.asset]}
            alt={currentFrame.alt}
            className="storyboard-review-stage-image"
          />
        ) : (
          <div className="structured-missing-asset">
            Missing declared asset: <code>{currentFrame.asset}</code>
          </div>
        )}

        <div className="storyboard-review-stage-body">
          <div className="storyboard-review-stage-meta">
            <p className="visual-card-id">{currentFrame.id}</p>
            <p className="storyboard-review-stage-status">
              Frame {activeFrameIndex + 1} of {storyboardDocument.frames.length}
            </p>
          </div>
          <p className="storyboard-review-alt">{currentFrame.alt}</p>
          {currentFrame.notes && (
            <p className="visual-card-copy">{currentFrame.notes}</p>
          )}
        </div>
      </div>

      <div className="storyboard-review-controls" aria-label="Storyboard review controls">
        <button
          type="button"
          className="storyboard-review-control"
          onClick={() => moveToFrame(activeFrameIndex - 1)}
          disabled={activeFrameIndex === 0}
        >
          Previous
        </button>
        <p className="storyboard-review-controls-hint">
          Use Left/Right arrows or select a frame directly.
        </p>
        <button
          type="button"
          className="storyboard-review-control"
          onClick={() => moveToFrame(activeFrameIndex + 1)}
          disabled={activeFrameIndex === lastFrameIndex}
        >
          Next
        </button>
      </div>

      <ol className="storyboard-review-grid-list">
        {storyboardDocument.frames.map((frame, index) => (
          <li key={frame.id}>
            <button
              type="button"
              className={
                index === activeFrameIndex
                  ? "storyboard-review-grid-button is-active"
                  : "storyboard-review-grid-button"
              }
              onClick={() => moveToFrame(index)}
              aria-current={index === activeFrameIndex ? "true" : undefined}
            >
              {assetUrls[frame.asset] ? (
                <img
                  src={assetUrls[frame.asset]}
                  alt=""
                  className="storyboard-review-grid-image"
                  loading="lazy"
                />
              ) : (
                <div className="structured-missing-asset">
                  Missing declared asset: <code>{frame.asset}</code>
                </div>
              )}

              <span className="storyboard-review-grid-body">
                <span className="storyboard-review-grid-index">{index + 1}</span>
                <span className="visual-card-id">{frame.id}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PublicMetadataView({
  title,
  identity,
  publicMetadata,
  coverUrl,
  document
}: {
  title: string;
  identity: PrdIdentity | undefined;
  publicMetadata: PrdPublicMetadata | undefined;
  coverUrl: string | undefined;
  document?: PrdGeneralDocumentRoot;
}) {
  if (!publicMetadata) {
    return null;
  }

  const subtitle =
    publicMetadata.subtitle !== document?.subtitle
      ? publicMetadata.subtitle
      : undefined;
  const summary =
    publicMetadata.summary !== document?.summary ? publicMetadata.summary : undefined;
  const contributors = publicMetadata.contributors ?? [];
  const seriesTitle = publicMetadata.series?.title;
  const collections = publicMetadata.collections ?? [];
  const seriesSequence = formatSeriesSequence(identity);
  const hasMetadata =
    coverUrl !== undefined ||
    subtitle !== undefined ||
    publicMetadata.byline !== undefined ||
    publicMetadata.publisher !== undefined ||
    summary !== undefined ||
    contributors.length > 0 ||
    seriesTitle !== undefined ||
    seriesSequence !== undefined ||
    collections.length > 0;

  if (!hasMetadata) {
    return null;
  }

  return (
    <section className="manifest-public-card" aria-label="Manifest public metadata">
      {coverUrl && (
        <div className="manifest-public-cover">
          <img src={coverUrl} alt={`Cover for ${title}`} />
        </div>
      )}

      <div className="manifest-public-body">
        <p className="manifest-public-kicker">Manifest metadata</p>
        {subtitle && <p className="manifest-public-subtitle">{subtitle}</p>}
        {publicMetadata.byline && (
          <p className="manifest-public-byline">{publicMetadata.byline}</p>
        )}

        {(publicMetadata.publisher ||
          seriesTitle ||
          seriesSequence ||
          collections.length > 0 ||
          contributors.length > 0) && (
          <dl className="manifest-public-details">
            {publicMetadata.publisher && (
              <div>
                <dt>Publisher</dt>
                <dd>{publicMetadata.publisher}</dd>
              </div>
            )}
            {seriesTitle && (
              <div>
                <dt>Series</dt>
                <dd>{seriesTitle}</dd>
              </div>
            )}
            {seriesSequence && (
              <div>
                <dt>Sequence</dt>
                <dd>{seriesSequence}</dd>
              </div>
            )}
            {collections.length > 0 && (
              <div>
                <dt>Collections</dt>
                <dd>
                  <ul className="manifest-public-collections">
                    {collections.map((collection, index) => (
                      <li key={`${collection.title}-${index}`}>{collection.title}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {contributors.length > 0 && (
              <div>
                <dt>Contributors</dt>
                <dd>
                  <ul className="manifest-public-contributors">
                    {contributors.map((contributor, index) => (
                      <li
                        key={`${contributor.name}-${contributor.role}-${index}`}
                      >
                        {formatContributorCredit(contributor)}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        )}

        {summary && <p className="manifest-public-summary">{summary}</p>}
      </div>
    </section>
  );
}

function AttachmentListView({
  attachments,
  attachmentUrls
}: {
  attachments: PrdAttachmentDeclaration[] | undefined;
  attachmentUrls: AttachmentUrlMap;
}) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return null;
  }

  return (
    <section className="attachment-card" aria-label="Declared attachments">
      <div className="attachment-card-body">
        <p className="structured-kicker">Attachments</p>
        <ul className="attachment-list">
          {attachments.map((attachment, index) => {
            const attachmentUrl =
              (attachment.id ? attachmentUrls[attachment.id] : undefined) ??
              attachmentUrls[attachment.href];

            return (
              <li key={`${attachment.id ?? attachment.href}-${index}`} className="attachment-item">
                {attachmentUrl ? (
                  <a
                    className="attachment-link"
                    href={attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {getAttachmentDisplayLabel(attachment)}
                  </a>
                ) : (
                  <span className="attachment-missing">
                    Missing declared attachment: <code>{attachment.href}</code>
                  </span>
                )}
                <span className="attachment-meta">
                  {attachment.type ?? attachment.href}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function PackageFactsView({
  facts
}: {
  facts: PackageFacts;
}) {
  const hasLocalization = facts.localeCount > 0;
  const loadModeLabel = formatReferenceLoadMode(facts.referenceLoadMode);
  const supportedProfilesLabel = formatReferenceViewerProfileSummary();
  const supportStatesLabel = formatReferenceViewerSupportStateSummary();

  return (
    <section className="package-facts-card" aria-label="Package facts and loading profile">
      <div className="package-facts-body">
        <p className="structured-kicker">Package facts</p>
        <dl className="package-facts-grid">
          <div>
            <dt>Files</dt>
            <dd>{facts.fileCount}</dd>
          </div>
          <div>
            <dt>Total bytes</dt>
            <dd>{formatBytes(facts.totalBytes)}</dd>
          </div>
          <div>
            <dt>Assets</dt>
            <dd>{facts.assetCount}</dd>
          </div>
          <div>
            <dt>Attachments</dt>
            <dd>{facts.attachmentCount > 0 ? `yes (${facts.attachmentCount})` : "no"}</dd>
          </div>
          <div>
            <dt>Entry mode</dt>
            <dd>{facts.entryKind}</dd>
          </div>
          <div>
            <dt>Segmentation</dt>
            <dd>{facts.segmentation}</dd>
          </div>
          <div>
            <dt>Localization</dt>
            <dd>{hasLocalization ? `yes (${facts.localeCount})` : "no"}</dd>
          </div>
          <div>
            <dt>Localized resources</dt>
            <dd>{facts.localizedResources ? "yes" : "no"}</dd>
          </div>
          <div>
            <dt>Localized alternate entries</dt>
            <dd>{facts.localizedAlternateEntries ? "yes" : "no"}</dd>
          </div>
          <div>
            <dt>Series membership</dt>
            <dd>{facts.hasSeriesMembership ? "yes" : "no"}</dd>
          </div>
          <div>
            <dt>Collections</dt>
            <dd>{facts.collectionCount > 0 ? `yes (${facts.collectionCount})` : "no"}</dd>
          </div>
          <div>
            <dt>Reference load mode</dt>
            <dd>{loadModeLabel}</dd>
          </div>
        </dl>
        <p className="package-facts-note">
          Reference viewer descriptor: profiles {supportedProfilesLabel}; runtime
          states {supportStatesLabel}; load mode {loadModeLabel}. Any media-level
          lazy presentation remains an implementation detail, not a format
          guarantee.
        </p>
      </div>
    </section>
  );
}

interface ViewerState {
  validation: PrdPackageValidationResult;
  opened?: PrdOpenedDocument;
  renderedHtml?: string;
  assetUrls?: AssetUrlMap;
  attachmentUrls?: AttachmentUrlMap;
  resumeProfile?: ResumeProfileData;
  localizedVariants?: Record<string, LocalizedViewerVariant>;
  packageFacts?: PackageFacts;
}

export function App() {
  const objectUrlsRef = useRef<string[]>([]);
  const [viewerState, setViewerState] = useState<ViewerState | null>(null);
  const [selectedLocale, setSelectedLocale] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const profileLabel = useMemo(() => {
    if (!viewerState?.opened) {
      return null;
    }
    return getProfileDisplayLabel(viewerState.opened.profileInfo.normalized);
  }, [viewerState]);

  const comicPanelNavigationEnabled = useMemo(() => {
    if (!viewerState?.opened?.comicDocument) {
      return false;
    }

    return getOptionalCapabilities(viewerState.opened.manifest.compatibility).includes(
      "panel-navigation"
    );
  }, [viewerState]);

  const storyboardReviewGridEnabled = useMemo(() => {
    if (!viewerState?.opened?.storyboardDocument) {
      return false;
    }

    return getOptionalCapabilities(viewerState.opened.manifest.compatibility).includes(
      "review-grid"
    );
  }, [viewerState]);

  const resumePresentationEnabled = useMemo(() => {
    return (
      (viewerState?.opened?.entryDocument !== undefined ||
        viewerState?.localizedVariants !== undefined) &&
      viewerState.resumeProfile?.id === "resume" &&
      viewerState.resumeProfile.presentation === "scan"
    );
  }, [viewerState]);

  const localeOptions = useMemo(() => {
    if (!viewerState?.opened?.localization?.defaultLocale) {
      return [];
    }

    const defaultLocale = viewerState.opened.localization.defaultLocale;
    const orderedLocales: string[] = [defaultLocale];
    const seen = new Set<string>(orderedLocales);

    for (const locale of viewerState.opened.localization.availableLocales ?? []) {
      if (!seen.has(locale)) {
        orderedLocales.push(locale);
        seen.add(locale);
      }
    }

    for (const locale of Object.keys(viewerState.localizedVariants ?? {})) {
      if (!seen.has(locale)) {
        orderedLocales.push(locale);
        seen.add(locale);
      }
    }

    return orderedLocales.filter((locale) => {
      return (
        locale === defaultLocale || viewerState.localizedVariants?.[locale] !== undefined
      );
    });
  }, [viewerState]);

  const activeLocale = useMemo(() => {
    return selectedLocale ?? viewerState?.opened?.localization?.defaultLocale;
  }, [selectedLocale, viewerState]);

  const activeLocalizedVariant = useMemo(() => {
    if (
      !viewerState?.opened?.localization?.defaultLocale ||
      !activeLocale ||
      activeLocale === viewerState.opened.localization.defaultLocale
    ) {
      return undefined;
    }

    return viewerState.localizedVariants?.[activeLocale];
  }, [activeLocale, viewerState]);

  const activeEntryPath = activeLocalizedVariant?.entryPath ?? viewerState?.opened?.entryPath;
  const activeRenderedHtml =
    activeLocalizedVariant?.renderedHtml ?? viewerState?.renderedHtml;
  const activeEntryDocument =
    activeLocalizedVariant?.entryDocument ?? viewerState?.opened?.entryDocument;
  const activeComicDocument =
    activeLocalizedVariant?.comicDocument ?? viewerState?.opened?.comicDocument;
  const activeStoryboardDocument =
    activeLocalizedVariant?.storyboardDocument ??
    viewerState?.opened?.storyboardDocument;
  const activePublicMetadata =
    activeLocalizedVariant?.publicMetadata ?? viewerState?.opened?.manifest.public;
  const viewerRenderMode = useMemo(() => {
    return inferViewerRenderMode(
      viewerState?.opened,
      activeEntryDocument,
      activeComicDocument,
      activeStoryboardDocument,
      activeRenderedHtml
    );
  }, [
    activeComicDocument,
    activeEntryDocument,
    activeRenderedHtml,
    activeStoryboardDocument,
    viewerState?.opened
  ]);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setSelectedLocale(undefined);
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current = [];

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const files = unzipSync(bytes) as PrdFileMap;
      const validation = validatePackageFiles(files);

      if (!validation.valid || !validation.manifest) {
        setViewerState({ validation });
        setLoading(false);
        return;
      }

      const opened = await openPrdDocument(createPackageReader(files));
      const packageFacts = createPackageFacts(files, opened);
      const normalizedOpened =
        opened.entryDocument !== undefined
          ? {
              ...opened,
              entryDocument: resolveSegmentedGeneralDocument(opened.entryDocument, files)
            }
          : opened;
      const renderedHtml =
        normalizedOpened.entryHtml !== undefined
          ? rewriteHtmlDocument(
              normalizedOpened.entryHtml,
              normalizedOpened.entryPath,
              files,
              objectUrlsRef.current
            )
          : undefined;
      const assetUrls = createAssetUrlMap(
        normalizedOpened.manifest.assets,
        files,
        objectUrlsRef.current
      );
      const attachmentUrls = createAttachmentUrlMap(
        normalizedOpened.manifest.attachments,
        files,
        objectUrlsRef.current
      );
      resolveAssetReferenceUrl(
        normalizedOpened.manifest.public?.cover,
        assetUrls,
        files,
        objectUrlsRef.current
      );
      const resumeProfile = parseResumeProfileData(
        files,
        normalizedOpened.manifest.profile
      );
      const localizedVariants = createLocalizedViewerVariants(
        files,
        normalizedOpened,
        objectUrlsRef.current
      );
      setSelectedLocale(normalizedOpened.localization?.defaultLocale);

      setViewerState({
        validation,
        opened: normalizedOpened,
        renderedHtml,
        assetUrls,
        attachmentUrls,
        resumeProfile,
        localizedVariants,
        packageFacts
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to open PRD file.");
      setViewerState(null);
      setSelectedLocale(undefined);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">PRD Reference Viewer</p>
          <h1>Open packaged Portable Responsive Documents in the browser.</h1>
          <p className="subhead">
            This app validates the uploaded package first, then hands it to the
            viewer core. Structured `general-document`, `comic`, and `storyboard`
            packages now have canonical JSON entry paths. Structured
            `general-document` packages may also segment large works into
            packaged section files under `content/sections/`. The current
            reference viewer renders image-backed comic and storyboard content
            directly, including optional `panel-navigation` and `review-grid`
            behaviors when declared, while legacy HTML visual-profile packages
            still open in `safe-mode` as fallback behavior.
          </p>
        </div>
        <label className="upload-card">
          <span>Choose a `.prd` archive</span>
          <input
            type="file"
            accept=".prd"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
        </label>
      </header>

      {loading && <p className="status">Loading package…</p>}
      {error && <p className="status error">{error}</p>}

      {viewerState && (
        <main className="workspace">
          <section className="panel">
            <h2>Package Status</h2>
            <dl className="meta-grid">
              <div>
                <dt>Valid</dt>
                <dd>{viewerState.validation.valid ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt>Profile</dt>
                <dd>{profileLabel ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Profile ID</dt>
                <dd>{viewerState.opened?.manifest.profile ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Support state</dt>
                <dd>{viewerState.opened?.supportState ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Localization</dt>
                <dd>
                  {viewerState.opened?.localization
                    ? viewerState.opened.localization.defaultLocale
                    : "none"}
                </dd>
              </div>
              {viewerState.opened?.localization && (
                <div>
                  <dt>Active locale</dt>
                  <dd>{activeLocale ?? viewerState.opened.localization.defaultLocale}</dd>
                </div>
              )}
              <div>
                <dt>Entry</dt>
                <dd>{activeEntryPath ?? "n/a"}</dd>
              </div>
            </dl>

            {viewerState.validation.errors.length > 0 && (
              <>
                <h3>Errors</h3>
                <ul className="issues">
                  {viewerState.validation.errors.map((issue) => (
                    <li key={`${issue.code}-${issue.path ?? issue.message}`}>
                      <code>{issue.code}</code> {issue.message}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {viewerState.validation.warnings.length > 0 && (
              <>
                <h3>Warnings</h3>
                <ul className="issues warning">
                  {viewerState.validation.warnings.map((issue) => (
                    <li key={`${issue.code}-${issue.path ?? issue.message}`}>
                      <code>{issue.code}</code> {issue.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="panel viewer-panel">
            <h2>Viewer</h2>
            <div className="viewer-message">
              <p>{getViewerRenderModeMessage(viewerRenderMode)}</p>
            </div>

            {viewerState.opened && (
              <PublicMetadataView
                title={activeEntryDocument?.title ?? viewerState.opened.manifest.title}
                identity={viewerState.opened.manifest.identity}
                publicMetadata={activePublicMetadata}
                coverUrl={
                  activePublicMetadata?.cover
                    ? viewerState.assetUrls?.[activePublicMetadata.cover]
                    : undefined
                }
                document={activeEntryDocument}
              />
            )}

            {viewerState.opened && viewerState.packageFacts && (
              <PackageFactsView facts={viewerState.packageFacts} />
            )}

            {viewerState.opened && (
              <AttachmentListView
                attachments={viewerState.opened.manifest.attachments}
                attachmentUrls={viewerState.attachmentUrls ?? {}}
              />
            )}

            {viewerState.opened?.localization && localeOptions.length > 1 && (
              <section className="viewer-locale-card" aria-label="Localized content selection">
                <div className="viewer-locale-card-body">
                  <p className="structured-kicker">Localized content</p>
                  <label className="viewer-locale-label" htmlFor="viewer-locale-select">
                    Active locale
                  </label>
                  <select
                    id="viewer-locale-select"
                    className="viewer-locale-select"
                    value={activeLocale ?? viewerState.opened.localization.defaultLocale}
                    onChange={(event) => setSelectedLocale(event.target.value)}
                  >
                    {localeOptions.map((locale) => (
                      <option key={locale} value={locale}>
                        {viewerState.localizedVariants?.[locale]?.label ?? locale}
                      </option>
                    ))}
                  </select>
                  <p className="viewer-locale-hint">
                    Applies localized document resources when available, including
                    reader-facing summary, cover, and collection/series labels. A
                    locale may also map a full alternate structured entry and a
                    small localized resource together when it needs both.
                  </p>
                </div>
              </section>
            )}

            {viewerState.opened?.supportState === "reserved-profile" && (
              <div className="reserved">
                <strong>{profileLabel}</strong>
                <p>{viewerState.opened.message}</p>
              </div>
            )}

            {viewerState.opened?.message &&
              viewerState.opened.supportState !== "reserved-profile" && (
                <div className="viewer-message">
                  <p>{viewerState.opened.message}</p>
                </div>
              )}

            {activeComicDocument &&
              (comicPanelNavigationEnabled ? (
                <ComicPanelNavigationView
                  comicDocument={activeComicDocument}
                  assetUrls={viewerState.assetUrls ?? {}}
                />
              ) : (
                <ComicPanelStripView
                  comicDocument={activeComicDocument}
                  assetUrls={viewerState.assetUrls ?? {}}
                />
              ))}

            {activeStoryboardDocument &&
              (storyboardReviewGridEnabled ? (
                <StoryboardReviewGridView
                  storyboardDocument={activeStoryboardDocument}
                  assetUrls={viewerState.assetUrls ?? {}}
                />
              ) : (
                <StoryboardFrameGridView
                  storyboardDocument={activeStoryboardDocument}
                  assetUrls={viewerState.assetUrls ?? {}}
                />
              ))}

            {viewerState.opened?.supportState !== "reserved-profile" &&
              activeRenderedHtml && (
                <iframe
                  className="viewer-surface"
                  title="PRD content frame"
                  sandbox=""
                  srcDoc={activeRenderedHtml}
                />
              )}

            {activeEntryDocument && (
              resumePresentationEnabled ? (
                <ResumeDocumentView
                  document={activeEntryDocument}
                  assetUrls={viewerState.assetUrls ?? {}}
                  resumeProfile={viewerState.resumeProfile!}
                />
              ) : (
                <StructuredDocumentView
                  document={activeEntryDocument}
                  assetUrls={viewerState.assetUrls ?? {}}
                />
              )
            )}
          </section>
        </main>
      )}
    </div>
  );
}
