import { strFromU8 } from "fflate";
import { assertPrdArchiveSize, readPrdArchive } from "@eonhive/prd-validator/container";
import type { PrdSignatureResult } from "@eonhive/prd-validator/signature";
import { openViewerPackage } from "./viewerPackageVerification.js";
import { ViewerSignaturePanel } from "./ViewerSignaturePanel.js";
import { HtmlFallbackFrame } from "./HtmlFallbackFrame.js";
import { createHtmlFallbackRenderer, type HtmlFallbackRenderer } from "./htmlFallback.js";
import { createAssetBlob } from "./assetBlob.js";
import { LivingHomepage } from "./LivingHomepage.js";
import { ConvertWeb } from "./ConvertWeb.js";
import type { WebConversion } from "./convertJob.js";
import { ViewerReadingView } from "./ViewerReadingView.js";
import {
  livingViewerExitFocusMessage,
  livingViewerLocalFileMessage,
  livingViewerReadyMessage,
  livingViewerSampleSelectedMessage,
  livingViewerSelectSampleMessage,
  readLivingViewerMessage,
  type LivingViewerMessage,
} from "./livingViewerMessages.js";
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
  PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR
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
  inferViewerRenderMode,
  selectViewerPresentation
} from "./viewerRenderMode.js";
import {
  type ViewerDemoExampleArchive,
  viewerAuthoringAvailabilityNote,
  viewerDemoExampleArchives,
  viewerDemoFlowSteps,
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
  getViewerOutlineTargetId,
  resolveViewerVisualOutlineSelection,
  type ViewerDocumentOutlineItem
} from "./viewerDocumentOutline.js";
import { getViewerContentLinkHref, getViewerContentTargetId } from "./viewerDocumentTargets.js";
import {
  getViewerAppRouteFromPath,
  getViewerAppRoutePath,
  type ViewerAppRoute
} from "./viewerRoutes.js";
import {
  ViewerSiteNavigation,
  ViewerDocumentOutline,
  ViewerWorkspaceHeader,
  ViewerWorkspaceToolbar,
  ViewerSidePanel,
  ViewerIcon,
  PrdBrandMark,
  PrdSiteFooter,
  ViewerStageStatus,
  type ViewerTheme
} from "./viewerChrome.js";

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

function createObjectUrl(
  file: Uint8Array,
  mimeType: string,
  objectUrls: string[]
): string {
  const url = URL.createObjectURL(
    createAssetBlob(file, mimeType)
  );
  objectUrls.push(url);
  return url;
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

  try {
    const storedTheme = window.localStorage.getItem(viewerThemeStorageKey);
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
  } catch {
    return "dark";
  }
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

async function createLocalizedViewerVariantFromEntry(
  entryPath: string,
  normalizedProfile: string,
  files: PrdFileMap,
  renderHtmlFallback: HtmlFallbackRenderer
): Promise<LocalizedViewerVariant | undefined> {
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
      renderedHtml: await renderHtmlFallback(strFromU8(entryFile), entryPath)
    };
  }

  return undefined;
}

async function createLocalizedViewerVariants(
  files: PrdFileMap,
  opened: PrdOpenedDocument,
  renderHtmlFallback: HtmlFallbackRenderer
): Promise<Record<string, LocalizedViewerVariant>> {
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
        variant = await createLocalizedViewerVariantFromEntry(
          entry,
          opened.profileInfo.normalized,
          files,
          renderHtmlFallback
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

function getStructuredLinkAnchorProps(href: string, documentId: string): {
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

  return { href: getViewerContentLinkHref(href, documentId) };
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
  key: string,
  documentId: string
): ReactNode {
  const targetId = node.id ? getViewerContentTargetId("node", node.id) : undefined;
  switch (node.type) {
    case "section":
      return (
        <section key={key} id={targetId} className="structured-section">
          <h2 className="structured-section-title">{node.title}</h2>
          <div className="structured-section-body">
            {hasInlineSectionChildren(node)
              ? node.children.map((child, index) =>
                  renderGeneralDocumentNode(child, assetUrls, `${key}-${index}`, documentId)
                )
              : null}
          </div>
        </section>
      );

    case "heading":
      return renderHeading(node.level, node.text, key, targetId);

    case "paragraph":
      return (
        <p key={key} id={targetId} className="structured-paragraph">
          {node.text}
        </p>
      );

    case "list":
      return node.style === "ordered" ? (
        <ol key={key} id={targetId} className="structured-list">
          {node.items.map((item, index) => (
            <li key={`${key}-${index}`}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul key={key} id={targetId} className="structured-list">
          {node.items.map((item, index) => (
            <li key={`${key}-${index}`}>{item}</li>
          ))}
        </ul>
      );

    case "links":
      return node.style === "list" ? (
        <ul key={key} id={targetId} className="structured-links structured-links-list">
          {node.items.map((item, index) => (
            <li key={`${key}-${index}`}>
              <a
                className="structured-link"
                {...getStructuredLinkAnchorProps(item.href, documentId)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p key={key} id={targetId} className="structured-links structured-links-inline">
          {node.items.map((item, index) => (
            <a
              key={`${key}-${index}`}
              className="structured-link"
              {...getStructuredLinkAnchorProps(item.href, documentId)}
            >
              {item.label}
            </a>
          ))}
        </p>
      );

    case "table":
      return (
        <div key={key} id={targetId} className="structured-table-wrap">
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
        <figure key={key} id={targetId} className="structured-chart">
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
        <figure key={key} id={targetId} className="structured-media">
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
        <figure key={key} id={targetId} className="structured-figure">
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
        <blockquote key={key} id={targetId} className="structured-quote">
          <p>{node.text}</p>
          {node.attribution && <footer>{node.attribution}</footer>}
        </blockquote>
      );
  }
}

export function StructuredDocumentView({
  document,
  assetUrls
}: {
  document: PrdGeneralDocumentRoot;
  assetUrls: AssetUrlMap;
}) {
  return (
    <article id={getViewerContentTargetId("document", document.id)} className="structured-document" lang={document.lang}>
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
          renderGeneralDocumentNode(node, assetUrls, `root-${index}`, document.id)
        )}
      </div>
    </article>
  );
}

export function ResumeDocumentView({
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
    <article id={getViewerContentTargetId("document", document.id)} className="structured-document resume-document" lang={document.lang}>
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
                `${document.id}-resume-lead-visual`,
                document.id
              )}
            <div className="resume-overview-body">
              {resumeProfile.notes && (
                <p className="resume-profile-note">{resumeProfile.notes}</p>
              )}
              {leadParagraph &&
                renderGeneralDocumentNode(
                  leadParagraph,
                  assetUrls,
                  `${document.id}-resume-lead-paragraph`,
                  document.id
                )}
            </div>
          </aside>
        )}

        {sectionEntries.length > 0 && (
          <div className="resume-section-grid">
            {sectionEntries.map(({ node, index }) => (
              <section key={`${document.id}-resume-section-${index}`} id={getViewerContentTargetId("node", node.id)} className="resume-section-card">
                <h2 className="resume-section-title">{node.title}</h2>
                <div className="structured-section-body">
                  {node.children.map((child, childIndex) =>
                    renderGeneralDocumentNode(
                      child,
                      assetUrls,
                      `${document.id}-resume-section-${index}-${childIndex}`,
                      document.id
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
              `${document.id}-resume-support-${index}`,
              document.id
            )
          )}
        </div>
      )}
    </article>
  );
}

export function ComicPanelStripView({
  comicDocument,
  assetUrls
}: {
  comicDocument: PrdComicRoot;
  assetUrls: AssetUrlMap;
}) {
  return (
    <section id={getViewerContentTargetId("document", comicDocument.id)} className="comic-panel-strip" aria-label="Comic panel strip">
      <div className="comic-panel-strip-header">
        <p className="structured-kicker">Comic</p>
        <h3>Panel strip</h3>
        <p>Read the story in order. Scroll to explore each panel.</p>
      </div>

      <ol className="comic-panel-strip-list">
        {comicDocument.panels.map((panel) => (
          <li key={panel.id} id={getViewerContentTargetId("panel", panel.id)} className="comic-panel-card">
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

export function ComicPanelNavigationView({
  comicDocument,
  assetUrls,
  activePanelIndex,
  onPanelChange,
  stageRef
}: {
  comicDocument: PrdComicRoot;
  assetUrls: AssetUrlMap;
  activePanelIndex: number;
  onPanelChange: (index: number) => void;
  stageRef: RefObject<HTMLDivElement | null>;
}) {
  const swipeStartX = useRef<number | null>(null);
  const swipePointerId = useRef<number | null>(null);
  const lastPanelIndex = comicDocument.panels.length - 1;

  const currentPanel =
    comicDocument.panels[Math.min(activePanelIndex, lastPanelIndex)] ??
    comicDocument.panels[0];

  if (!currentPanel) {
    return null;
  }

  function moveToPanel(nextIndex: number) {
    onPanelChange(Math.min(Math.max(nextIndex, 0), lastPanelIndex));
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
      id={getViewerContentTargetId("document", comicDocument.id)}
      className="comic-panel-strip comic-panel-navigation"
      aria-label="Comic panel navigation"
    >
      <div className="comic-panel-strip-header">
        <p className="structured-kicker">Comic</p>
        <h3>Panel view</h3>
        <p>Move through the story one panel at a time. Use the arrows or swipe to continue.</p>
      </div>

      <div
        id={getViewerContentTargetId("panel", currentPanel.id)}
        ref={stageRef}
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

export function StoryboardFrameGridView({
  storyboardDocument,
  assetUrls
}: {
  storyboardDocument: PrdStoryboardRoot;
  assetUrls: AssetUrlMap;
}) {
  return (
    <section id={getViewerContentTargetId("document", storyboardDocument.id)} className="storyboard-frame-grid" aria-label="Storyboard frame grid">
      <div className="storyboard-frame-grid-header">
        <p className="structured-kicker">Storyboard</p>
        <h3>Frame grid</h3>
        <p>Explore the sequence, frame by frame.</p>
      </div>

      <ol className="storyboard-frame-grid-list">
        {storyboardDocument.frames.map((frame) => (
          <li key={frame.id} id={getViewerContentTargetId("frame", frame.id)} className="storyboard-frame-card">
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

export function StoryboardReviewGridView({
  storyboardDocument,
  assetUrls,
  activeFrameIndex,
  onFrameChange,
  stageRef
}: {
  storyboardDocument: PrdStoryboardRoot;
  assetUrls: AssetUrlMap;
  activeFrameIndex: number;
  onFrameChange: (index: number) => void;
  stageRef: RefObject<HTMLDivElement | null>;
}) {
  const lastFrameIndex = storyboardDocument.frames.length - 1;
  const currentFrame =
    storyboardDocument.frames[Math.min(activeFrameIndex, lastFrameIndex)] ??
    storyboardDocument.frames[0];

  if (!currentFrame) {
    return null;
  }

  function moveToFrame(nextIndex: number) {
    onFrameChange(Math.min(Math.max(nextIndex, 0), lastFrameIndex));
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
    <section id={getViewerContentTargetId("document", storyboardDocument.id)} className="storyboard-frame-grid" aria-label="Storyboard review grid">
      <div className="storyboard-frame-grid-header">
        <p className="structured-kicker">Storyboard</p>
        <h3>Frame review</h3>
        <p>Select a frame below or use the arrow keys to move through the sequence.</p>
      </div>

      <div
        id={getViewerContentTargetId("frame", currentFrame.id)}
        ref={stageRef}
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
      <p className="cli-availability-note">
        {viewerAuthoringAvailabilityNote}{" "}
        <a href={getPublicDocsLinkHref("packages/prd-cli/README.md")} target="_blank" rel="noreferrer">
          Repository CLI guide
        </a>
      </p>
    </section>
  );
}

function PublicDocsSurface({
  onNavigate
}: {
  onNavigate: (route: ViewerAppRoute, hash?: string) => void;
}) {
  const sectionIcons = {
    home: "book",
    "getting-started": "focus",
    cli: "wide",
    format: "file",
    profiles: "image",
    examples: "folder",
    viewer: "book",
    conformance: "check"
  } as const;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-surface"
      aria-label="PRD public docs"
    >
      <section className="docs-hero">
        <div>
          <p className="eyebrow">
            <ViewerIcon name="book" />
            {viewerPublicDocsIntro.eyebrow}
          </p>
          <h1>{viewerPublicDocsIntro.title}</h1>
          <p className="subhead">{viewerPublicDocsIntro.description}</p>
          <div className="landing-actions">
            <button
              type="button"
              className="secondary-action"
              onClick={() => onNavigate("home")}
            >
              Back to Home
            </button>
            <button
              type="button"
              className="primary-action"
              onClick={() => onNavigate("viewer")}
            >
              Open Viewer
            </button>
          </div>
        </div>
        <aside className="docs-start-card" aria-label="First steps">
          <p className="eyebrow">New to PRD?</p>
          <h2>Start with a real document.</h2>
          <p>
            Open a sample in the Viewer. Explore its content, package facts, and
            validation result before creating your own.
          </p>
          <button
            type="button"
            className="secondary-action"
            onClick={() => onNavigate("viewer")}
          >
            Try the Viewer
          </button>
          <DocsLink
            link={{
              label: "Read the authoring guide",
              href: "docs/product/PRD_AUTHORING_WORKFLOW.md"
            }}
            onNavigate={onNavigate}
          />
        </aside>
      </section>

      <div className="docs-section-heading">
        <p className="eyebrow">The PRD guidebook</p>
        <h2>Find your next chapter.</h2>
        <p>
          Read the essentials, work with a package, or go deeper into the
          format.
        </p>
      </div>
      <nav className="docs-section-nav" aria-label="Documentation sections">
        {viewerPublicDocsSections.map((section) => (
          <a key={section.id} href={`#docs-${section.id}`}>
            {section.title}
          </a>
        ))}
      </nav>

      <section className="docs-grid" aria-label="Public docs navigation">
        {viewerPublicDocsSections.map((section) => (
          <article
            key={section.id}
            id={`docs-${section.id}`}
            tabIndex={-1}
            className="docs-card"
          >
            <span className="docs-card-icon">
              <ViewerIcon
                name={
                  sectionIcons[section.id as keyof typeof sectionIcons] ??
                  "info"
                }
              />
            </span>
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

      <details className="docs-hosting-card">
        <summary>Hosting and operator notes</summary>
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
        <p>
          The guides above open canonical repository sources. Release and
          deployment instructions are grouped under Release/Operator Notes.
        </p>
      </details>
      <PrdSiteFooter basePath={viewerAppBasePath} />
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
  const internalRoute =
    link.href === "/"
      ? "home"
      : link.href === "/viewer/"
        ? "viewer"
        : undefined;
  if (internalRoute) {
    return (
      <a
        className={className}
        href={getViewerAppRoutePath(internalRoute, viewerAppBasePath)}
        onClick={(event) => {
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          event.preventDefault();
          onNavigate(internalRoute);
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

function UploadDropzoneView({
  fileInputRef,
  dragActive,
  onArchiveFiles,
  onDrop,
  onDragEnter,
  onDragOver,
  onDragLeave
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  dragActive: boolean;
  onArchiveFiles: (files: FileList | File[] | null) => void;
  onDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragEnter: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`upload-card upload-dropzone${dragActive ? " upload-dropzone-active" : ""}`}
      role="region"
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      aria-label="Choose or drop a PRD archive"
    >
      <p className="upload-kicker"><ViewerIcon name="folder" /> Open document</p>
      <strong>
        Choose or drag a <code>.prd</code> archive
      </strong>
      <span>
        Your file stays in this browser. Drop a packed <code>.prd</code> file to begin.
      </span>
      <button type="button" className="secondary-action upload-open-button"
        onClick={() => fileInputRef.current?.click()}>
        Choose .prd file
      </button>
      <input
        ref={fileInputRef}
        hidden
        aria-label="Open PRD archive"
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
  onDragEnter,
  onDragOver,
  onDragLeave,
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
  onDragEnter: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  onLoadSample: (example: ViewerDemoExampleArchive) => void;
  onLocaleChange: (locale: string) => void;
}) {
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [wideReading, setWideReading] = useState(false);
  const [navigationView, setNavigationView] = useState<"outline" | "examples">(
    "outline"
  );
  const [detailsView, setDetailsView] = useState<"info" | "files">("info");
  const visualStageRef = useRef<HTMLDivElement | null>(null);
  const navigationButtonRef = useRef<HTMLButtonElement | null>(null);
  const detailsButtonRef = useRef<HTMLButtonElement | null>(null);
  const pendingOutlineTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (navigationOpen || !pendingOutlineTargetRef.current) return;
    const target = document.getElementById(pendingOutlineTargetRef.current);
    // Authored sections can be fragment targets without being keyboard-focusable.
    if (target && !target.hasAttribute("tabindex")) target.tabIndex = -1;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start", behavior: "instant" });
    pendingOutlineTargetRef.current = null;
  }, [navigationOpen]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1000px)");
    function updatePanels() {
      setMobile(media.matches);
      setNavigationOpen(!media.matches);
      setDetailsOpen(!media.matches);
    }
    updatePanels();
    media.addEventListener("change", updatePanels);
    return () => media.removeEventListener("change", updatePanels);
  }, []);

  useEffect(() => {
    if (!focusMode) return;
    function exitFocus(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setFocusMode(false);
    }
    // Handle Escape before the embedded-viewer handoff sees it.
    window.addEventListener("keydown", exitFocus, true);
    return () => window.removeEventListener("keydown", exitFocus, true);
  }, [focusMode]);

  function toggleNavigation() {
    setFocusMode(false);
    setNavigationOpen(focusMode || !navigationOpen);
    if (mobile) setDetailsOpen(false);
  }

  function closeNavigation() {
    setNavigationOpen(false);
    // Focus must leave the desktop panel before it is hidden. Native dialogs restore their opener.
    if (!mobile) navigationButtonRef.current?.focus({ preventScroll: true });
  }

  function closeDetails() {
    setDetailsOpen(false);
    if (!mobile) detailsButtonRef.current?.focus({ preventScroll: true });
  }

  function toggleDetails() {
    setFocusMode(false);
    setDetailsOpen(focusMode || !detailsOpen);
    if (mobile) setNavigationOpen(false);
  }

  function openDetails() {
    setFocusMode(false);
    setDetailsView("info");
    setDetailsOpen(true);
    if (mobile) setNavigationOpen(false);
  }

  useEffect(() => {
    setActivePanelIndex(0);
    setActiveFrameIndex(0);
  }, [
    viewerState,
    activeComicDocument?.id,
    activeComicDocument?.panels.length,
    activeStoryboardDocument?.id,
    activeStoryboardDocument?.frames.length
  ]);

  function selectVisualOutlineItem(item: ViewerDocumentOutlineItem) {
    const selection = resolveViewerVisualOutlineSelection(item, {
      comicDocument: activeComicDocument,
      storyboardDocument: activeStoryboardDocument
    });
    if (!selection) {
      return;
    }

    if (selection.kind === "panel") {
      setActivePanelIndex(selection.index);
    } else {
      setActiveFrameIndex(selection.index);
    }

    // Continue keyboard navigation on the active visual stage, not the sidebar.
    if (mobile) {
      pendingOutlineTargetRef.current = getViewerOutlineTargetId(item);
      setNavigationOpen(false);
      return;
    }
    visualStageRef.current?.focus({ preventScroll: true });
    document.getElementById("document-stage")?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth"
    });
  }

  let workspaceStatus = "Ready when you are";
  if (loading || sampleLoadingId !== null) workspaceStatus = "Opening document";
  else if (error || viewerState?.validation.valid === false || viewerState?.signature?.status === "invalid")
    workspaceStatus = "Could not open document";
  else if (viewerState?.opened) workspaceStatus = "Package open";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`viewer-route${focusMode ? " is-reading-focus" : ""}${wideReading ? " is-wide-reading" : ""}`}
      aria-label="PRD web viewer workspace"
    >
      <section
        className={`viewer-dashboard${viewerState ? " has-package" : ""}`}
        aria-busy={loading || sampleLoadingId !== null}
      >
        <ViewerWorkspaceHeader
          validation={viewerState?.validation ?? null}
          packageTitle={
            activeEntryDocument?.title ??
            activeComicDocument?.title ??
            activeStoryboardDocument?.title ??
            viewerState?.opened?.manifest.title
          }
          loading={loading || sampleLoadingId !== null}
          loadMode={formatReferenceLoadMode(referenceViewerLoadMode)}
          profileLabel={profileLabel}
        />

        <ViewerWorkspaceToolbar
          navigationButtonRef={navigationButtonRef}
          detailsButtonRef={detailsButtonRef}
          navigationOpen={navigationOpen && !focusMode}
          detailsOpen={detailsOpen && !focusMode}
          focusMode={focusMode}
          wideReading={wideReading}
          onToggleNavigation={toggleNavigation}
          onToggleDetails={toggleDetails}
          onToggleFocus={() => {
            setFocusMode(!focusMode);
            if (mobile) {
              setNavigationOpen(false);
              setDetailsOpen(false);
            }
          }}
          onToggleWidth={() => setWideReading(!wideReading)}
          onOpenArchive={() => fileInputRef.current?.click()}
        />

        <div
          className="viewer-shell-grid"
          data-navigation-open={navigationOpen && !focusMode}
          data-details-open={detailsOpen && !focusMode}
        >
          <ViewerSidePanel
            id="viewer-navigation"
            side="left"
            title="Document navigation"
            open={navigationOpen && !focusMode}
            mobile={mobile}
            onClose={closeNavigation}
          >
            <div
              className="viewer-panel-switcher"
              role="group"
              aria-label="Navigation view"
            >
              <button
                type="button"
                aria-pressed={navigationView === "outline"}
                onClick={() => setNavigationView("outline")}
              >
                <ViewerIcon name="outline" />
                Outline
              </button>
              <button
                type="button"
                aria-pressed={navigationView === "examples"}
                onClick={() => setNavigationView("examples")}
              >
                <ViewerIcon name="folder" />
                Examples
              </button>
            </div>
            <div
              className="viewer-navigation-content"
              hidden={navigationView !== "outline"}
              onClick={(event) => {
                const link = (
                  event.target as Element
                ).closest<HTMLAnchorElement>("a[href^='#']");
                if (mobile && link) {
                  pendingOutlineTargetRef.current = decodeURIComponent(
                    link.hash.slice(1)
                  );
                  setNavigationOpen(false);
                }
              }}
            >
              <ViewerDocumentOutline
                key={`${viewerState?.opened?.manifest.id ?? "empty"}-${activeLocale ?? "default"}`}
                items={documentOutline}
                visualSelectionKind={
                  comicPanelNavigationEnabled
                    ? "panel"
                    : storyboardReviewGridEnabled
                      ? "frame"
                      : undefined
                }
                activeItemId={
                  comicPanelNavigationEnabled
                    ? activeComicDocument?.panels[activePanelIndex]?.id
                    : storyboardReviewGridEnabled
                      ? activeStoryboardDocument?.frames[activeFrameIndex]?.id
                      : undefined
                }
                onSelectVisualItem={selectVisualOutlineItem}
              />
            </div>
            <div
              className="viewer-navigation-content"
              hidden={navigationView !== "examples"}
            >
              <p className="viewer-panel-caption">
                Explore a real PRD package.
              </p>
              <div className="viewer-example-shortcuts">
                {viewerDemoExampleArchives.map((example) => (
                  <button
                    key={example.id}
                    type="button"
                    disabled={sampleLoadingId !== null}
                    onClick={() => {
                      onLoadSample(example);
                      setNavigationView("outline");
                      if (mobile) setNavigationOpen(false);
                    }}
                  >
                    <ViewerIcon
                      name={
                        example.profile === "general-document"
                          ? "file"
                          : "image"
                      }
                    />
                    <span>
                      <strong>{example.label}</strong>
                      <small>{getProfileDisplayLabel(example.profile)}</small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </div>
            <UploadDropzoneView
              fileInputRef={fileInputRef}
              dragActive={dragActive}
              onArchiveFiles={onArchiveFiles}
              onDrop={onDrop}
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            />
          </ViewerSidePanel>

          <section
            id="document-stage"
            tabIndex={-1}
            className="viewer-stage-column"
            aria-label="Viewer stage"
          >
            {loading && (
              <p className="status" role="status">
                Loading package...
              </p>
            )}
            {error && (
              <p className="status error" role="alert">
                {error}
              </p>
            )}

            {!viewerState && !loading && (
              <section
                className="empty-viewer-state"
                aria-label="No package loaded"
              >
                <div className="viewer-welcome-illustration" aria-hidden="true">
                  <span className="viewer-welcome-sheet" />
                  <PrdBrandMark />
                  <span className="viewer-welcome-spark">✦</span>
                </div>
                <p className="eyebrow">Portable. Responsive. Yours.</p>
                <h2>Documents, brought to life.</h2>
                <p>
                  Room to read. Structure to explore. Open a PRD document and
                  experience content that adapts to you.
                </p>
                <button
                  type="button"
                  className="viewer-primary-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ViewerIcon name="folder" />
                  Open a PRD document
                </button>
                <span className="viewer-welcome-privacy">
                  Your files stay in your browser.
                </span>
                <div className="viewer-welcome-examples">
                  <div className="viewer-welcome-example-heading">
                    <span>Or explore an example</span>
                    <span>FOUR WAYS TO BEGIN</span>
                  </div>
                  <div className="viewer-sample-grid">
                    {viewerDemoExampleArchives.map((example) => (
                      <button
                        key={example.id}
                        type="button"
                        className={`viewer-sample-card sample-${example.profile}`}
                        disabled={sampleLoadingId !== null}
                        onClick={() => onLoadSample(example)}
                      >
                        <span className="viewer-sample-art" aria-hidden="true">
                          <ViewerIcon
                            name={
                              example.profile === "general-document"
                                ? "file"
                                : "image"
                            }
                          />
                          <i />
                          <i />
                          <i />
                        </span>
                        <strong>
                          {sampleLoadingId === example.id
                            ? "Opening…"
                            : example.label}
                        </strong>
                        <span>{getProfileDisplayLabel(example.profile)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {viewerState && (
              <section
                className="panel viewer-panel"
                onClick={(event) => {
                  if (
                    (event.target as HTMLElement).closest(
                      'a[href="#package-details"]'
                    )
                  ) {
                    event.preventDefault();
                    openDetails();
                  }
                }}
              >
                {viewerState.signature?.status === "invalid" ? (
                  <p className="status error" role="alert">
                    Signature check failed. This document was not opened. {viewerState.signature.message}
                  </p>
                ) : (
                  <ViewerStageStatus
                    valid={viewerState.validation.valid}
                    renderModeMessage={getViewerRenderModeMessage(viewerRenderMode)}
                    readingLabel={
                      activeEntryDocument
                        ? "Responsive document"
                        : activeComicDocument
                          ? "Comic"
                          : activeStoryboardDocument
                            ? "Storyboard"
                            : activeRenderedHtml
                              ? "HTML preview"
                              : undefined
                    }
                  />
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
                      activePanelIndex={activePanelIndex}
                      onPanelChange={setActivePanelIndex}
                      stageRef={visualStageRef}
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
                      activeFrameIndex={activeFrameIndex}
                      onFrameChange={setActiveFrameIndex}
                      stageRef={visualStageRef}
                    />
                  ) : (
                    <StoryboardFrameGridView
                      storyboardDocument={activeStoryboardDocument}
                      assetUrls={viewerState.assetUrls ?? {}}
                    />
                  ))}

                {viewerState.opened?.supportState !== "reserved-profile" &&
                  activeRenderedHtml && (
                    <HtmlFallbackFrame html={activeRenderedHtml} />
                  )}

                {activeEntryDocument && (
                  <ViewerReadingView
                    packageIdentity={viewerState}
                    contentIdentity={activeEntryDocument}
                  >
                    {resumePresentationEnabled ? (
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
                    )}
                  </ViewerReadingView>
                )}
              </section>
            )}
          </section>

          <ViewerSidePanel
            id="package-details"
            side="right"
            title="Package details"
            open={detailsOpen && !focusMode}
            mobile={mobile}
            onClose={closeDetails}
          >
            <div
              className="viewer-panel-switcher"
              role="group"
              aria-label="Details view"
            >
              <button
                type="button"
                aria-pressed={detailsView === "info"}
                onClick={() => setDetailsView("info")}
              >
                <ViewerIcon name="info" />
                Info
              </button>
              <button
                type="button"
                aria-pressed={detailsView === "files"}
                onClick={() => setDetailsView("files")}
              >
                <ViewerIcon name="folder" />
                Files
              </button>
            </div>
            <div
              className="viewer-details-content"
              hidden={detailsView !== "info"}
            >
              {viewerState ? (
                <>
                  <PackageStatusPanel
                    viewerState={viewerState}
                    profileLabel={profileLabel}
                    activeLocale={activeLocale}
                    activeEntryPath={activeEntryPath}
                  />

                  {viewerState.signature && (
                    <ViewerSignaturePanel result={viewerState.signature} />
                  )}

                  {viewerState.opened && (
                    <PublicMetadataView
                      title={
                        activeEntryDocument?.title ??
                        viewerState.opened.manifest.title
                      }
                      identity={viewerState.opened.manifest.identity}
                      publicMetadata={activePublicMetadata}
                      coverUrl={
                        !activeRenderedHtml && activePublicMetadata?.cover
                          ? viewerState.assetUrls?.[activePublicMetadata.cover]
                          : undefined
                      }
                      document={activeEntryDocument}
                    />
                  )}

                  {viewerState.opened?.localization &&
                    localeOptions.length > 1 && (
                      <section
                        className="viewer-locale-card"
                        aria-label="Localized content selection"
                      >
                        <div className="viewer-locale-card-body">
                          <p className="structured-kicker">Localized content</p>
                          <label
                            className="viewer-locale-label"
                            htmlFor="viewer-locale-select"
                          >
                            Active locale
                          </label>
                          <select
                            id="viewer-locale-select"
                            className="viewer-locale-select"
                            value={
                              activeLocale ??
                              viewerState.opened.localization.defaultLocale
                            }
                            onChange={(event) =>
                              onLocaleChange(event.target.value)
                            }
                          >
                            {localeOptions.map((locale) => (
                              <option key={locale} value={locale}>
                                {viewerState.localizedVariants?.[locale]
                                  ?.label ?? locale}
                              </option>
                            ))}
                          </select>
                          <p className="viewer-locale-hint">
                            Applies localized document resources when available.
                            This is still packaged content, not a network fetch
                            contract.
                          </p>
                        </div>
                      </section>
                    )}
                </>
              ) : (
                <section className="panel viewer-truth-panel">
                  <span className="viewer-empty-detail-icon">
                    <ViewerIcon name="info" />
                  </span>
                  <h2>A little more context.</h2>
                  <p>
                    Open a document to see its profile, metadata, languages, and
                    packaged files.
                  </p>
                </section>
              )}
            </div>
            <div
              className="viewer-details-content"
              hidden={detailsView !== "files"}
            >
              {viewerState?.opened ? (
                <>
                  <section
                    className="viewer-assets-card"
                    aria-label="Packaged assets"
                  >
                    <p className="structured-kicker">
                      Assets · {viewerState.opened.manifest.assets?.length ?? 0}
                    </p>
                    <div className="viewer-asset-grid">
                      {(viewerState.opened.manifest.assets ?? []).map(
                        (asset) => {
                          const url =
                            (asset.id
                              ? viewerState.assetUrls?.[asset.id]
                              : undefined) ??
                            viewerState.assetUrls?.[asset.href];
                          return (
                            <figure key={asset.href}>
                              {url && !activeRenderedHtml && asset.type?.startsWith("image/") ? (
                                <img src={url} alt="" loading="lazy" />
                              ) : (
                                <span>
                                  <ViewerIcon name="file" />
                                </span>
                              )}
                              <figcaption title={asset.href}>
                                {asset.href.split("/").pop()}
                              </figcaption>
                            </figure>
                          );
                        }
                      )}
                    </div>
                    {!viewerState.opened.manifest.assets?.length && (
                      <p className="viewer-panel-empty">
                        This package has no declared assets.
                      </p>
                    )}
                  </section>
                  <AttachmentListView
                    attachments={viewerState.opened.manifest.attachments}
                    attachmentUrls={viewerState.attachmentUrls ?? {}}
                  />
                  {viewerState.packageFacts && (
                    <details className="viewer-technical-details">
                      <summary>Technical package facts</summary>
                      <PackageFactsView facts={viewerState.packageFacts} />
                    </details>
                  )}
                </>
              ) : (
                <p className="viewer-panel-empty">
                  Packaged assets and attachments will appear here.
                </p>
              )}
            </div>
          </ViewerSidePanel>
        </div>
        <footer
          className="viewer-workspace-footer"
          data-error={Boolean(error) || viewerState?.validation.valid === false}
        >
          <span>
            <span className="viewer-status-dot" /> {workspaceStatus}
          </span>
          <span>PRD · Portable Responsive Document</span>
        </footer>
      </section>
    </main>
  );
}

interface ViewerState {
  validation: PrdPackageValidationResult;
  signature?: PrdSignatureResult;
  opened?: PrdOpenedDocument;
  renderedHtml?: string;
  assetUrls?: AssetUrlMap;
  attachmentUrls?: AttachmentUrlMap;
  resumeProfile?: ResumeProfileData;
  localizedVariants?: Record<string, LocalizedViewerVariant>;
  packageFacts?: PackageFacts;
}

export function App() {
  const query = new URLSearchParams(window.location.search);
  const embeddedViewer = query.get("embed") === "1";
  const requestedSample = query.get("sample");
  const initialSampleLoaded = useRef(false);
  // File reads and hosted fetches can overlap; only the newest selection may commit.
  const sampleFetchRef = useRef<AbortController | undefined>(undefined);
  const loadGenerationRef = useRef(0);
  const currentSampleRef = useRef<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileDragDepthRef = useRef(0);
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
  const [conversion, setConversion] = useState<WebConversion | null>(null);

  function notifyHomepage(message: LivingViewerMessage) {
    if (!embeddedViewer || window.parent === window) return;
    window.parent.postMessage(message, window.location.origin);
  }

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      window.localStorage.setItem(viewerThemeStorageKey, nextTheme);
    } catch {
      // The theme remains usable for this session when browser storage is blocked.
    }
  }

  useEffect(() => {
    function syncTheme(event: StorageEvent) {
      if (event.key !== viewerThemeStorageKey) return;
      if (event.newValue === "light" || event.newValue === "dark") {
        setTheme(event.newValue);
      }
    }
    // Keep already-open tabs and the persistent embedded Viewer in the same theme.
    // Only user actions persist a value, so receiving a change cannot echo it back.
    window.addEventListener("storage", syncTheme);
    setTheme(getInitialViewerTheme());
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  useEffect(() => {
    if (!embeddedViewer || window.parent === window) return;
    function handleEmbeddedEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented || document.querySelector("dialog[open]")) return;
      window.parent.postMessage({ type: livingViewerExitFocusMessage }, window.location.origin);
    }
    function handleHomepageMessage(event: MessageEvent<unknown>) {
      const message = readLivingViewerMessage(event, window.parent, window.location.origin);
      if (message?.type !== livingViewerSelectSampleMessage) return;
      if (message.sampleId === currentSampleRef.current) return;
      const example = viewerDemoExampleArchives.find((item) => item.id === message.sampleId);
      if (example) void handleSampleArchive(example);
    }
    window.addEventListener("keydown", handleEmbeddedEscape);
    window.addEventListener("message", handleHomepageMessage);
    notifyHomepage({ type: livingViewerReadyMessage });
    return () => {
      window.removeEventListener("keydown", handleEmbeddedEscape);
      window.removeEventListener("message", handleHomepageMessage);
    };
  }, [embeddedViewer]);

  useEffect(() => {
    return () => {
      loadGenerationRef.current++;
      sampleFetchRef.current?.abort();
      currentSampleRef.current = null;
      initialSampleLoaded.current = false;
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current = [];
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#0b0d1f" : "#f7f8fd"
    );
  }, [theme]);

  useEffect(() => {
    const pageTitles = {
      home: "PRD — A new way to experience documents.",
      viewer: "PRD Viewer — Open. Read. Explore.",
      docs: "PRD Docs — Start your next chapter.",
      convert: "PRD Convert — A new chapter for your documents."
    };
    document.title = pageTitles[route];
  }, [route]);

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
  const activePresentation = selectViewerPresentation({
    renderedHtml: viewerState?.renderedHtml,
    entryDocument: viewerState?.opened?.entryDocument,
    comicDocument: viewerState?.opened?.comicDocument,
    storyboardDocument: viewerState?.opened?.storyboardDocument
  }, activeLocalizedVariant);
  const activeRenderedHtml = activePresentation.renderedHtml;
  const activeEntryDocument = activePresentation.entryDocument;
  const activeComicDocument = activePresentation.comicDocument;
  const activeStoryboardDocument = activePresentation.storyboardDocument;
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
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
      const target = document.getElementById(hash ?? "main-content");
      // Put keyboard and screen-reader navigation in the newly selected content.
      target?.focus({ preventScroll: true });
      if (hash) {
        target?.scrollIntoView({
          behavior,
          block: "start"
        });
        return;
      }

      window.scrollTo({ top: 0, behavior });
    }, 0);
  }

  async function handleFile(file: File, generation = ++loadGenerationRef.current) {
    setLoading(true);
    setError(null);
    setSelectedLocale(undefined);
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current = [];
    const objectUrls: string[] = [];

    try {
      assertPrdArchiveSize(file.size);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (generation !== loadGenerationRef.current) return;
      const files = readPrdArchive(bytes);
      const validation = validatePackageFiles(files);

      if (!validation.valid || !validation.manifest) {
        currentSampleRef.current = null;
        setViewerState({ validation });
        setLoading(false);
        return;
      }

      const { signature, opened } = await openViewerPackage(files);
      if (generation !== loadGenerationRef.current) return;
      if (!opened) {
        currentSampleRef.current = null;
        setViewerState({ validation, signature });
        return;
      }
      const packageFacts = createPackageFacts(files, opened);
      if (opened.supportState === "unsupported-required-capability") {
        // Localized entries must not bypass the runtime's capability decision.
        setViewerState({ validation, signature, opened, packageFacts });
        return;
      }

      const normalizedOpened =
        opened.entryDocument !== undefined
          ? {
              ...opened,
              entryDocument: resolveSegmentedGeneralDocument(opened.entryDocument, files)
            }
          : opened;
      const renderHtmlFallback = createHtmlFallbackRenderer(files, normalizedOpened.manifest.assets, {
        create: (file, mime) => createObjectUrl(file, mime, objectUrls),
        revoke: (url) => URL.revokeObjectURL(url)
      });
      const renderedHtml =
        normalizedOpened.entryHtml !== undefined
          ? await renderHtmlFallback(
              normalizedOpened.entryHtml,
              normalizedOpened.entryPath
            )
          : undefined;
      if (generation !== loadGenerationRef.current) return;
      const assetUrls = createAssetUrlMap(
        normalizedOpened.manifest.assets,
        files,
        objectUrls
      );
      const attachmentUrls = createAttachmentUrlMap(
        normalizedOpened.manifest.attachments,
        files,
        objectUrls
      );
      resolveAssetReferenceUrl(
        normalizedOpened.manifest.public?.cover,
        assetUrls,
        files,
        objectUrls
      );
      const resumeProfile = parseResumeProfileData(
        files,
        normalizedOpened.manifest.profile
      );
      const localizedVariants = await createLocalizedViewerVariants(
        files,
        normalizedOpened,
        renderHtmlFallback
      );
      if (generation !== loadGenerationRef.current) return;
      objectUrlsRef.current = objectUrls;
      setSelectedLocale(normalizedOpened.localization?.defaultLocale);

      setViewerState({
        validation,
        signature,
        opened: normalizedOpened,
        renderedHtml,
        assetUrls,
        attachmentUrls,
        resumeProfile,
        localizedVariants,
        packageFacts
      });
    } catch (caught) {
      if (generation !== loadGenerationRef.current) return;
      currentSampleRef.current = null;
      setError(caught instanceof Error ? caught.message : "Failed to open PRD file.");
      setViewerState(null);
      setSelectedLocale(undefined);
    } finally {
      if (objectUrlsRef.current !== objectUrls) {
        for (const url of objectUrls) URL.revokeObjectURL(url);
      }
      if (generation === loadGenerationRef.current) setLoading(false);
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
      sampleFetchRef.current?.abort();
      currentSampleRef.current = null;
      setSampleLoadingId(null);
      notifyHomepage({ type: livingViewerLocalFileMessage });
      void handleFile(archive);
    }
  }

  async function handleSampleArchive(example: ViewerDemoExampleArchive, userSelected = false) {
    if (!embeddedViewer) navigateToRoute("viewer");
    const generation = ++loadGenerationRef.current;
    sampleFetchRef.current?.abort();
    const controller = new AbortController();
    sampleFetchRef.current = controller;
    currentSampleRef.current = example.id;
    if (userSelected) {
      notifyHomepage({ type: livingViewerSampleSelectedMessage, sampleId: example.id });
    }
    setLoading(false);
    setSampleLoadingId(example.id);
    setError(null);

    try {
      const demoBaseUrl = new URL(viewerAppBasePath, window.location.origin).toString();
      const url = getViewerDemoSampleArchiveUrl(example.hostedPath, demoBaseUrl);
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(
          `Could not load hosted sample ${example.hostedPath}. Run \`pnpm viewer:demo:assets\` locally or check the deployed demo assets.`
        );
      }

      const archiveName = example.hostedPath.split("/").pop() ?? `${example.id}.prd`;
      const archive = new File([await response.arrayBuffer()], archiveName, {
        type: "application/zip"
      });
      if (generation !== loadGenerationRef.current) return;
      await handleFile(archive, generation);
    } catch (caught) {
      if (generation !== loadGenerationRef.current) return;
      currentSampleRef.current = null;
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to load the hosted sample PRD archive."
      );
    } finally {
      if (generation === loadGenerationRef.current) {
        sampleFetchRef.current = undefined;
        setSampleLoadingId(null);
      }
    }
  }

  useEffect(() => {
    if (route !== "viewer" || !requestedSample || initialSampleLoaded.current) {
      return;
    }
    const example = viewerDemoExampleArchives.find((item) => item.id === requestedSample);
    if (!example) return;
    initialSampleLoaded.current = true;
    void handleSampleArchive(example);
  }, [route, requestedSample]);

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    const { files, types } = event.dataTransfer;
    if (files.length === 0 && !Array.from(types).includes("Files")) return;
    event.preventDefault();
    fileDragDepthRef.current = 0;
    setDragActive(false);
    handleArchiveFiles(files);
  }

  function handleDragEnter(event: ReactDragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    fileDragDepthRef.current += 1;
    setDragActive(true);
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    // File lists are protected during dragover; use the Files type until drop.
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragActive(true);
  }

  function handleDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    // The next descendant enters before the previous one leaves, even without relatedTarget.
    fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1);
    if (fileDragDepthRef.current === 0) setDragActive(false);
  }

  return (
    <div
      className={`app-shell app-route-${route}${embeddedViewer ? " is-embedded" : ""}`}
      data-route={route}
    >
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {route !== "home" && !embeddedViewer && (
        <ViewerSiteNavigation
          route={route}
          basePath={viewerAppBasePath}
          theme={theme}
          onNavigate={navigateToRoute}
          onToggleTheme={toggleTheme}
          onOpenArchive={() => fileInputRef.current?.click()}
        />
      )}

      {route === "home" ? (
        <LivingHomepage
          basePath={viewerAppBasePath}
          theme={theme}
          onToggleTheme={toggleTheme}
        >
          <ViewerDemoFlowView />
        </LivingHomepage>
      ) : route === "docs" ? (
        <PublicDocsSurface onNavigate={navigateToRoute} />
      ) : route === "convert" ? (
        <ConvertWeb completed={conversion} onComplete={setConversion} onPreview={(result) => {
          void handleFile(new File([result.result.archive as Uint8Array<ArrayBuffer>], "converted.prd")).then(() => navigateToRoute("viewer"));
        }} />
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
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onLoadSample={(example) => void handleSampleArchive(example, true)}
          onLocaleChange={setSelectedLocale}
        />
      )}
    </div>
  );
}
