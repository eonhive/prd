import { unzipSync, strFromU8 } from "fflate";
import {
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
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
import {
  type ViewerDemoExampleArchive,
  viewerDemoExampleArchives,
  viewerDemoFlowSteps,
  viewerDemoPreparationCommands,
  viewerFutureLanes,
  viewerLandingCapabilities,
  viewerLandingHero,
  viewerLandingProfiles,
  viewerPublicDocsIntro,
  viewerPublicDocsSections,
  viewerPublicHostingNotes
} from "./viewerDemoContent.js";
import {
  findFirstPrdArchive,
  getPrdArchiveSelectionError,
  getViewerDemoSampleArchiveUrl
} from "./viewerArchiveFiles.js";
import {
  createViewerDocumentOutline,
  type ViewerDocumentOutlineItem
} from "./viewerDocumentOutline.js";
import {
  getViewerAppRouteFromPath,
  getViewerAppRoutePath,
  type ViewerAppRoute
} from "./viewerRoutes.js";

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
type ViewerTheme = "dark" | "light";

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
const viewerThemeStorageKey = "prd-viewer-theme";
const viewerAppBasePath =
  ((import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ??
    "/");
const canonicalDocsRepositoryUrl = "https://github.com/eonhive/prd/blob/main/";

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

function getPublicDocsLinkHref(href: string): string {
  if (href === "/" || href === "/viewer/") {
    return href;
  }

  if (href === "examples/") {
    return "https://github.com/eonhive/prd/tree/main/examples";
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  return `${canonicalDocsRepositoryUrl}${href}`;
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

function getInitialViewerTheme(): ViewerTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(viewerThemeStorageKey);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
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

function ThemeToggle({
  theme,
  onToggle
}: {
  theme: ViewerTheme;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="theme-toggle" onClick={onToggle}>
      <span aria-hidden="true">{theme === "dark" ? "Dark" : "Light"}</span>
      <strong>{theme === "dark" ? "Switch to light" : "Switch to dark"}</strong>
    </button>
  );
}

function AppNavigation({
  route,
  theme,
  onNavigate,
  onToggleTheme,
  onOpenArchive
}: {
  route: ViewerAppRoute;
  theme: ViewerTheme;
  onNavigate: (route: ViewerAppRoute, hash?: string) => void;
  onToggleTheme: () => void;
  onOpenArchive: () => void;
}) {
  return (
    <header className="site-nav">
      <button
        type="button"
        className="brand-lockup"
        onClick={() => onNavigate("home")}
        aria-label="PRD Home"
      >
        <span className="brand-mark">P</span>
        <span>
          <strong>PRD</strong>
          <small>Portable Responsive Document</small>
        </span>
      </button>
      <nav className="site-nav-links" aria-label="Demo navigation">
        <button
          type="button"
          className={route === "home" ? "is-active" : undefined}
          onClick={() => onNavigate("home")}
        >
          Home
        </button>
        <button
          type="button"
          className={route === "viewer" ? "is-active" : undefined}
          onClick={() => onNavigate("viewer")}
        >
          Viewer
        </button>
        <button
          type="button"
          className={route === "docs" ? "is-active" : undefined}
          onClick={() => onNavigate("docs")}
        >
          Docs
        </button>
        <button type="button" onClick={() => onNavigate("home", "cli-flow")}>
          CLI Flow
        </button>
      </nav>
      <div className="site-nav-actions">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button type="button" className="nav-open-button" onClick={onOpenArchive}>
          Open .prd
        </button>
      </div>
    </header>
  );
}

function HomeSurface({
  onOpenViewer,
  onLoadSample,
  sampleLoadingId,
  onLoadArchive
}: {
  onOpenViewer: () => void;
  onLoadSample: () => void;
  sampleLoadingId: string | null;
  onLoadArchive: (example: ViewerDemoExampleArchive) => void;
}) {
  return (
    <main className="landing-surface" aria-label="PRD Home">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="release-pill">0.1.1 public preview</span>
          <p className="eyebrow">{viewerLandingHero.eyebrow}</p>
          <h1>{viewerLandingHero.title}</h1>
          <p className="subhead">{viewerLandingHero.description}</p>
          <div className="landing-actions">
            <button type="button" className="primary-action" onClick={onOpenViewer}>
              {viewerLandingHero.primaryAction}
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={onLoadSample}
              disabled={sampleLoadingId !== null}
            >
              {sampleLoadingId ? "Loading sample..." : viewerLandingHero.secondaryAction}
            </button>
            <a className="text-action" href="#cli-flow">
              {viewerLandingHero.tertiaryAction}
            </a>
          </div>
          <div className="hero-badges" aria-label="Current public truths">
            <span>No account required</span>
            <span>Packaged-first</span>
            <span>Offline-first core</span>
          </div>
        </div>

        <div className="landing-preview-card" aria-label="Reference viewer preview">
          <div className="preview-window-bar">
            <span />
            <span />
            <span />
            <strong>PRD Web Viewer</strong>
          </div>
          <div className="preview-reader">
            <div className="preview-sidebar">
              <span className="is-active">Table of contents</span>
              <span>Manifest</span>
              <span>Package facts</span>
              <span>Assets</span>
              <span>Localization</span>
            </div>
            <div className="preview-document">
              <p className="preview-kicker">Reference package</p>
              <h2>Responsive document, packed and portable.</h2>
              <p>
                Validates first. Opens locally. Reports the actual loading profile.
              </p>
              <div className="preview-status-row">
                <span>Valid</span>
                <span>Structured JSON</span>
                <span>Offline package</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-capabilities" aria-label="Current PRD capabilities">
        {viewerLandingCapabilities.map((capability) => (
          <article key={capability.title} className="landing-card">
            <p className="card-proof">{capability.proof}</p>
            <h2>{capability.title}</h2>
            <p>{capability.description}</p>
          </article>
        ))}
      </section>

      <ViewerDemoFlowView />

      <section className="landing-profile-grid" aria-label="First-class PRD profiles">
        {viewerLandingProfiles.map((profile) => (
          <article key={profile.id} className="profile-card">
            <span className="profile-orb" aria-hidden="true" />
            <p className="card-proof">{profile.id}</p>
            <h2>{profile.title}</h2>
            <p>{profile.description}</p>
            <code>{profile.command}</code>
          </article>
        ))}
      </section>

      <ViewerExampleGuideView
        onLoadSample={onLoadArchive}
        sampleLoadingId={sampleLoadingId}
        compact={false}
      />

      <div className="future-lanes-note">
        <strong>Future lanes stay future:</strong>{" "}
        {viewerFutureLanes.join(", ")} are not shipped by this demo and do not
        change what counts as a valid PRD package.
      </div>
    </main>
  );
}

function ViewerDemoFlowView() {
  return (
    <section id="cli-flow" className="demo-flow" aria-label="PRD public product flow">
      <div className="demo-section-header">
        <p className="eyebrow">Public product path</p>
        <h2>Create or import, verify, package, then open.</h2>
        <p>
          PRD is now usable without hand-building every package. The CLI creates
          or imports source material, the validator locks package truth, and this
          reference viewer shows the current browser open path.
        </p>
      </div>
      <ol className="demo-flow-grid">
        {viewerDemoFlowSteps.map((step) => (
          <li key={step.label} className="demo-flow-card">
            <span className="demo-step-label">{step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <div className="demo-command-stack" aria-label={`${step.title} commands`}>
              {step.commands.map((command) => (
                <code key={command}>{command}</code>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ViewerExampleGuideView({
  onLoadSample,
  sampleLoadingId,
  compact = false
}: {
  onLoadSample: (example: ViewerDemoExampleArchive) => void;
  sampleLoadingId: string | null;
  compact?: boolean;
}) {
  return (
    <section
      id="samples"
      className={compact ? "example-guide compact" : "example-guide"}
      aria-label="Reference example archives"
    >
      <div className="demo-section-header">
        <p className="eyebrow">Try hosted examples</p>
        <h2>Load a sample archive or pack one locally.</h2>
        <p>
          Hosted samples are generated from canonical examples for this demo
          build. They use the same eager whole-package in-memory open path as
          user-selected archives; this is not a new PRD network-loading contract.
        </p>
      </div>
      <div className="example-guide-body">
        <div className="example-command-card">
          <p>Prepare demo archives</p>
          {viewerDemoPreparationCommands.map((command) => (
            <code key={command}>{command}</code>
          ))}
        </div>
        <ul className="example-archive-list">
          {viewerDemoExampleArchives.map((example) => (
            <li key={example.id}>
              <div>
                <strong>{example.label}</strong>
                <span>{example.profile}</span>
              </div>
              <code>{example.path}</code>
              <p>{example.description}</p>
              <button
                type="button"
                className="sample-load-button"
                onClick={() => onLoadSample(example)}
                disabled={sampleLoadingId !== null}
              >
                {sampleLoadingId === example.id ? "Loading..." : "Load hosted sample"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PublicDocsSurface({
  onNavigate
}: {
  onNavigate: (route: ViewerAppRoute, hash?: string) => void;
}) {
  return (
    <main className="docs-surface" aria-label="PRD public docs">
      <section className="docs-hero">
        <div>
          <p className="eyebrow">{viewerPublicDocsIntro.eyebrow}</p>
          <h1>{viewerPublicDocsIntro.title}</h1>
          <p className="subhead">{viewerPublicDocsIntro.description}</p>
          <div className="landing-actions">
            <button
              type="button"
              className="primary-action"
              onClick={() => onNavigate("home")}
            >
              Back to Home
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={() => onNavigate("viewer")}
            >
              Open Viewer
            </button>
          </div>
        </div>
        <aside className="docs-hosting-card" aria-label="Hosting direction">
          <p className="eyebrow">Hosting path</p>
          <h2>Cloudflare production, GitHub Pages staging.</h2>
          <dl>
            {viewerPublicHostingNotes.map((note) => (
              <div key={note.label}>
                <dt>{note.label}</dt>
                <dd>
                  <strong>{note.value}</strong>
                  <span>{note.description}</span>
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>

      <section className="docs-grid" aria-label="Public docs navigation">
        {viewerPublicDocsSections.map((section) => (
          <article key={section.id} className="docs-card">
            <p className="card-proof">{section.id}</p>
            <h2>{section.title}</h2>
            <p>{section.summary}</p>
            <DocsLink
              link={section.primaryLink}
              className="docs-primary-link"
              onNavigate={onNavigate}
            />
            <ul className="docs-link-list">
              {section.links.map((link) => (
                <li key={`${section.id}-${link.href}`}>
                  <DocsLink link={link} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="docs-operator-note" aria-label="Public documentation boundary">
        <p>
          Canonical docs remain in the repository under <code>docs/</code>. This
          page is the public docs index for users and implementers; Codex
          planning and session handoff files stay tracked for workflow
          continuity, but they are not linked from public navigation.
        </p>
      </section>
    </main>
  );
}

function DocsLink({
  link,
  className,
  onNavigate
}: {
  link: { label: string; href: string };
  className?: string;
  onNavigate: (route: ViewerAppRoute, hash?: string) => void;
}) {
  if (link.href === "/") {
    return (
      <a
        className={className}
        href={getViewerAppRoutePath("home", viewerAppBasePath)}
        onClick={(event) => {
          event.preventDefault();
          onNavigate("home");
        }}
      >
        {link.label}
      </a>
    );
  }

  if (link.href === "/viewer/") {
    return (
      <a
        className={className}
        href={getViewerAppRoutePath("viewer", viewerAppBasePath)}
        onClick={(event) => {
          event.preventDefault();
          onNavigate("viewer");
        }}
      >
        {link.label}
      </a>
    );
  }

  return (
    <a
      className={className}
      href={getPublicDocsLinkHref(link.href)}
      target="_blank"
      rel="noreferrer"
    >
      {link.label}
    </a>
  );
}

function ViewerDocumentOutlineView({
  items
}: {
  items: ViewerDocumentOutlineItem[];
}) {
  return (
    <section className="viewer-outline-card" aria-label="Document outline">
      <div className="panel-heading-row">
        <p className="eyebrow">Outline</p>
        <span>{items.length > 0 ? `${items.length} items` : "empty"}</span>
      </div>
      {items.length > 0 ? (
        <ol className="viewer-outline-list">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <a
                href={`#${item.id}`}
                className="viewer-outline-link"
                style={{ "--outline-depth": item.depth } as React.CSSProperties}
              >
                <span>{item.kind}</span>
                <strong>{item.label}</strong>
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="viewer-panel-empty">
          Load a structured package to show document sections, comic panels, or
          storyboard frames.
        </p>
      )}
    </section>
  );
}

function UploadDropzoneView({
  fileInputRef,
  dragActive,
  onArchiveFiles,
  onDrop,
  onDragOver,
  onDragLeave,
  onKeyDown
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  dragActive: boolean;
  onArchiveFiles: (files: FileList | File[] | null) => void;
  onDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`upload-card upload-dropzone${dragActive ? " upload-dropzone-active" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={onKeyDown}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      aria-label="Choose or drop a PRD archive"
    >
      <p className="upload-kicker">Open package</p>
      <strong>
        Choose or drag a <code>.prd</code> archive
      </strong>
      <span>
        Source folders must be packed first. If you drop multiple files, the
        first <code>.prd</code> archive is opened.
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept=".prd"
        onChange={(event) => {
          onArchiveFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}

function PackageStatusPanel({
  viewerState,
  profileLabel,
  activeLocale,
  activeEntryPath
}: {
  viewerState: ViewerState;
  profileLabel: string | null;
  activeLocale: string | undefined;
  activeEntryPath: string | undefined;
}) {
  return (
    <section className="panel package-status-panel">
      <div className="panel-heading-row">
        <h2>Package Status</h2>
        <span className={viewerState.validation.valid ? "status-pill valid" : "status-pill"}>
          {viewerState.validation.valid ? "Valid" : "Invalid"}
        </span>
      </div>
      <dl className="meta-grid">
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
          <dt>Entry</dt>
          <dd>{activeEntryPath ?? "n/a"}</dd>
        </div>
        <div>
          <dt>Default locale</dt>
          <dd>{viewerState.opened?.localization?.defaultLocale ?? "none"}</dd>
        </div>
        <div>
          <dt>Active locale</dt>
          <dd>{activeLocale ?? "none"}</dd>
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
  );
}

function ViewerWorkspaceView({
  fileInputRef,
  dragActive,
  loading,
  error,
  sampleLoadingId,
  viewerState,
  profileLabel,
  viewerRenderMode,
  activeLocale,
  activeEntryPath,
  activeEntryDocument,
  activeComicDocument,
  activeStoryboardDocument,
  activeRenderedHtml,
  activePublicMetadata,
  documentOutline,
  localeOptions,
  comicPanelNavigationEnabled,
  storyboardReviewGridEnabled,
  resumePresentationEnabled,
  onArchiveFiles,
  onDrop,
  onDragOver,
  onDragLeave,
  onUploadKeyDown,
  onLoadSample,
  onLocaleChange
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  dragActive: boolean;
  loading: boolean;
  error: string | null;
  sampleLoadingId: string | null;
  viewerState: ViewerState | null;
  profileLabel: string | null;
  viewerRenderMode: ViewerRenderMode;
  activeLocale: string | undefined;
  activeEntryPath: string | undefined;
  activeEntryDocument: PrdGeneralDocumentRoot | undefined;
  activeComicDocument: PrdComicRoot | undefined;
  activeStoryboardDocument: PrdStoryboardRoot | undefined;
  activeRenderedHtml: string | undefined;
  activePublicMetadata: PrdPublicMetadata | undefined;
  documentOutline: ViewerDocumentOutlineItem[];
  localeOptions: string[];
  comicPanelNavigationEnabled: boolean;
  storyboardReviewGridEnabled: boolean;
  resumePresentationEnabled: boolean;
  onArchiveFiles: (files: FileList | File[] | null) => void;
  onDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  onUploadKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  onLoadSample: (example: ViewerDemoExampleArchive) => void;
  onLocaleChange: (locale: string) => void;
}) {
  return (
    <main className="viewer-route" aria-label="PRD web viewer workspace">
      <section className="viewer-dashboard">
        <div className="viewer-dashboard-topbar">
          <div>
            <p className="eyebrow">PRD Web Viewer</p>
            <h1>Open, validate, and inspect portable documents.</h1>
          </div>
          <div className="viewer-dashboard-status">
            <span className={viewerState?.validation.valid ? "status-pill valid" : "status-pill"}>
              {viewerState?.validation.valid ? "Valid package" : "No package loaded"}
            </span>
            <span className="status-pill muted">
              {formatReferenceLoadMode(referenceViewerLoadMode)}
            </span>
          </div>
        </div>

        <div className="viewer-shell-grid">
          <aside className="viewer-left-rail">
            <UploadDropzoneView
              fileInputRef={fileInputRef}
              dragActive={dragActive}
              onArchiveFiles={onArchiveFiles}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onKeyDown={onUploadKeyDown}
            />
            <ViewerDocumentOutlineView items={documentOutline} />
            <ViewerExampleGuideView
              onLoadSample={onLoadSample}
              sampleLoadingId={sampleLoadingId}
              compact
            />
          </aside>

          <section className="viewer-stage-column" aria-label="Viewer stage">
            {loading && <p className="status">Loading package...</p>}
            {error && <p className="status error">{error}</p>}

            {!viewerState && !loading && (
              <section className="empty-viewer-state" aria-label="No package loaded">
                <p className="eyebrow">Ready for a package</p>
                <h2>Load a hosted sample or open your own `.prd` archive.</h2>
                <p>
                  The viewer validates the package first, then reports package
                  status, manifest metadata, runtime support state, and the
                  current reference render mode.
                </p>
              </section>
            )}

            {viewerState && (
              <section className="panel viewer-panel">
                <div className="panel-heading-row">
                  <h2>Render Stage</h2>
                  <span>{getViewerRenderModeMessage(viewerRenderMode)}</span>
                </div>

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
            )}
          </section>

          <aside className="viewer-right-rail">
            {viewerState ? (
              <>
                <PackageStatusPanel
                  viewerState={viewerState}
                  profileLabel={profileLabel}
                  activeLocale={activeLocale}
                  activeEntryPath={activeEntryPath}
                />

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
                        onChange={(event) => onLocaleChange(event.target.value)}
                      >
                        {localeOptions.map((locale) => (
                          <option key={locale} value={locale}>
                            {viewerState.localizedVariants?.[locale]?.label ?? locale}
                          </option>
                        ))}
                      </select>
                      <p className="viewer-locale-hint">
                        Applies localized document resources when available. This
                        is still packaged content, not a network fetch contract.
                      </p>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <section className="panel viewer-truth-panel">
                <p className="eyebrow">Reference truth</p>
                <h2>Viewer behavior stays format-honest.</h2>
                <p>
                  Current loading is eager whole-package in-memory. Hosted
                  samples are demo assets only; PRD core remains packaged-first
                  and offline-first.
                </p>
              </section>
            )}
          </aside>
        </div>
      </section>
    </main>
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [route, setRoute] = useState<ViewerAppRoute>(() =>
    getViewerAppRouteFromPath(window.location.pathname, viewerAppBasePath)
  );
  const [theme, setTheme] = useState<ViewerTheme>(getInitialViewerTheme);
  const [viewerState, setViewerState] = useState<ViewerState | null>(null);
  const [selectedLocale, setSelectedLocale] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [sampleLoadingId, setSampleLoadingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  useEffect(() => {
    function handlePopState() {
      setRoute(getViewerAppRouteFromPath(window.location.pathname, viewerAppBasePath));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(viewerThemeStorageKey, theme);
  }, [theme]);

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
  const documentOutline = useMemo(() => {
    return createViewerDocumentOutline({
      entryDocument: activeEntryDocument,
      comicDocument: activeComicDocument,
      storyboardDocument: activeStoryboardDocument
    });
  }, [activeComicDocument, activeEntryDocument, activeStoryboardDocument]);

  function navigateToRoute(nextRoute: ViewerAppRoute, hash?: string) {
    const routePath = getViewerAppRoutePath(nextRoute, viewerAppBasePath);
    const nextPath = hash ? `${routePath}#${hash}` : routePath;
    const currentPath = `${window.location.pathname}${window.location.hash}`;

    if (currentPath !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }

    setRoute(nextRoute);

    window.setTimeout(() => {
      if (hash) {
        document.getElementById(hash)?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        return;
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }

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

  function handleArchiveFiles(files: FileList | File[] | null) {
    const selectionError = getPrdArchiveSelectionError(files);
    if (selectionError) {
      setError(selectionError);
      return;
    }

    const archive = findFirstPrdArchive(files ?? []);
    if (archive) {
      void handleFile(archive);
    }
  }

  async function handleSampleArchive(example: ViewerDemoExampleArchive) {
    navigateToRoute("viewer");
    setSampleLoadingId(example.id);
    setError(null);

    try {
      const demoBaseUrl = new URL(viewerAppBasePath, window.location.origin).toString();
      const url = getViewerDemoSampleArchiveUrl(example.hostedPath, demoBaseUrl);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Could not load hosted sample ${example.hostedPath}. Run \`pnpm viewer:demo:assets\` locally or check the deployed demo assets.`
        );
      }

      const archiveName = example.hostedPath.split("/").pop() ?? `${example.id}.prd`;
      const archive = new File([await response.arrayBuffer()], archiveName, {
        type: "application/zip"
      });
      await handleFile(archive);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to load the hosted sample PRD archive."
      );
    } finally {
      setSampleLoadingId(null);
    }
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    handleArchiveFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
  }

  function handleUploadKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    fileInputRef.current?.click();
  }

  return (
    <div className={`app-shell app-route-${route}`} data-route={route}>
      <AppNavigation
        route={route}
        theme={theme}
        onNavigate={navigateToRoute}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        onOpenArchive={() => {
          navigateToRoute("viewer");
          window.setTimeout(() => fileInputRef.current?.click(), 0);
        }}
      />

      {route === "home" ? (
        <HomeSurface
          onOpenViewer={() => navigateToRoute("viewer")}
          onLoadSample={() => {
            const firstSample = viewerDemoExampleArchives[0];
            if (firstSample) {
              void handleSampleArchive(firstSample);
            }
          }}
          onLoadArchive={(example) => void handleSampleArchive(example)}
          sampleLoadingId={sampleLoadingId}
        />
      ) : route === "docs" ? (
        <PublicDocsSurface onNavigate={navigateToRoute} />
      ) : (
        <ViewerWorkspaceView
          fileInputRef={fileInputRef}
          dragActive={dragActive}
          loading={loading}
          error={error}
          sampleLoadingId={sampleLoadingId}
          viewerState={viewerState}
          profileLabel={profileLabel}
          viewerRenderMode={viewerRenderMode}
          activeLocale={activeLocale}
          activeEntryPath={activeEntryPath}
          activeEntryDocument={activeEntryDocument}
          activeComicDocument={activeComicDocument}
          activeStoryboardDocument={activeStoryboardDocument}
          activeRenderedHtml={activeRenderedHtml}
          activePublicMetadata={activePublicMetadata}
          documentOutline={documentOutline}
          localeOptions={localeOptions}
          comicPanelNavigationEnabled={comicPanelNavigationEnabled}
          storyboardReviewGridEnabled={storyboardReviewGridEnabled}
          resumePresentationEnabled={resumePresentationEnabled}
          onArchiveFiles={handleArchiveFiles}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onUploadKeyDown={handleUploadKeyDown}
          onLoadSample={(example) => void handleSampleArchive(example)}
          onLocaleChange={setSelectedLocale}
        />
      )}
    </div>
  );
}
