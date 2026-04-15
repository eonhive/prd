import { strFromU8 } from "fflate";
import {
  type PrdAssetDeclaration,
  type PrdAttachmentDeclaration,
  type PrdComicRoot,
  type PrdComicPanelsRoot,
  type PrdCompatibility,
  type PrdIdentity,
  type PrdLocalizedContentIndexRoot,
  type PrdLocalizedDocumentOverridesRoot,
  type PrdLocalization,
  type PrdManifest,
  type PrdNormalizedProfileInfo,
  type PrdPublicMetadata,
  PRD_GENERAL_DOCUMENT_SECTION_ENTRY_PREFIX,
  type PrdStoryboardRoot,
  type PrdStoryboardFramesRoot,
  type PrdValidationIssue,
  type PrdValidationResult,
  PRD_LOCALIZED_ENTRIES_PATH,
  isHtmlEntryPath,
  isJsonEntryPath,
  normalizeProfileId
} from "@eonhive/prd-types";

export interface PrdPackageValidationResult extends PrdValidationResult {
  manifest?: PrdManifest;
  profileInfo?: PrdNormalizedProfileInfo;
}

export type PrdFileMap = Record<string, Uint8Array>;

type GeneralDocumentNode =
  | GeneralDocumentSectionNode
  | GeneralDocumentHeadingNode
  | GeneralDocumentParagraphNode
  | GeneralDocumentListNode
  | GeneralDocumentLinksNode
  | GeneralDocumentTableNode
  | GeneralDocumentChartNode
  | GeneralDocumentMediaNode
  | GeneralDocumentImageNode
  | GeneralDocumentQuoteNode;

interface GeneralDocumentRoot {
  $schema?: string;
  schemaVersion: string;
  profile: "general-document";
  type: "document";
  id: string;
  title: string;
  subtitle?: string;
  summary?: string;
  lang?: string;
  children: GeneralDocumentNode[];
}

interface GeneralDocumentSectionRoot {
  $schema?: string;
  schemaVersion: string;
  profile: "general-document";
  type: "document-section";
  id: string;
  title: string;
  children: GeneralDocumentNode[];
}

interface GeneralDocumentInlineSectionNode {
  type: "section";
  id: string;
  title: string;
  children: GeneralDocumentNode[];
  src?: never;
}

interface GeneralDocumentSegmentedSectionNode {
  type: "section";
  id: string;
  title: string;
  src: string;
  children?: never;
}

type GeneralDocumentSectionNode =
  | GeneralDocumentInlineSectionNode
  | GeneralDocumentSegmentedSectionNode;

interface GeneralDocumentHeadingNode {
  id?: string;
  type: "heading";
  level: number;
  text: string;
}

interface GeneralDocumentParagraphNode {
  id?: string;
  type: "paragraph";
  text: string;
}

interface GeneralDocumentListNode {
  id?: string;
  type: "list";
  style: "unordered" | "ordered";
  items: string[];
}

interface GeneralDocumentLinksItem {
  label: string;
  href: string;
}

interface GeneralDocumentLinksNode {
  id?: string;
  type: "links";
  style: "list" | "inline";
  items: GeneralDocumentLinksItem[];
}

interface GeneralDocumentTableColumn {
  id: string;
  label: string;
  align?: "left" | "center" | "right";
}

interface GeneralDocumentTableNode {
  id?: string;
  type: "table";
  caption?: string;
  columns: GeneralDocumentTableColumn[];
  rows: Array<Record<string, string>>;
}

interface GeneralDocumentChartSeries {
  name: string;
  values: number[];
}

interface GeneralDocumentChartNode {
  id?: string;
  type: "chart";
  chartType: "bar";
  title?: string;
  caption?: string;
  categories: string[];
  series: GeneralDocumentChartSeries[];
}

interface GeneralDocumentMediaNode {
  id?: string;
  type: "media";
  mediaType: "audio" | "video";
  asset: string;
  poster?: string;
  caption?: string;
}

interface GeneralDocumentImageNode {
  id?: string;
  type: "image";
  asset: string;
  alt: string;
  caption?: string;
}

interface GeneralDocumentQuoteNode {
  id?: string;
  type: "quote";
  text: string;
  attribution?: string;
}

interface GeneralDocumentNodeRecord {
  path: string;
  node: GeneralDocumentNode;
}

const COMIC_PANELS_PATH = "profiles/comic/panels.json";
const STORYBOARD_FRAMES_PATH = "profiles/storyboard/frames.json";
const SUPPORTED_IMAGE_ASSET_EXTENSIONS = [
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp"
] as const;

const STRUCTURED_CONTENT_ENTRY_PATTERN = /^content\/.+\.json$/;
const GENERAL_DOCUMENT_SECTION_ENTRY_PATTERN = /^content\/sections\/.+\.json$/;
const GENERAL_DOCUMENT_STRUCTURED_CAPABILITY = "general-document-structured-root";
const HTML_ENTRY_CAPABILITY = "base-entry-html";
const MANIFEST_REQUIRED_FIELD_ISSUE_CODES = {
  prdVersion: "prdVersion-required",
  manifestVersion: "manifestVersion-required",
  id: "id-required",
  profile: "profile-required",
  title: "title-required",
  entry: "entry-required"
} as const;
const PROFILE_ENTRY_FORMAT_ISSUE_CODES = {
  "general-document": "general-document-entry-format",
  comic: "comic-entry-format",
  storyboard: "storyboard-entry-format"
} as const;

function makeIssue(
  severity: "error" | "warning",
  code: string,
  message: string,
  path?: string
): PrdValidationIssue {
  return { severity, code, message, path };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function looksLikeUrl(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value);
}

function isPackageInternalPath(value: string): boolean {
  if (value.length === 0 || value.startsWith("/") || value.includes("\\")) {
    return false;
  }

  if (looksLikeUrl(value)) {
    return false;
  }

  return !value.split("/").some((segment) => segment === "..");
}

function isAllowedGeneralDocumentLinkHref(value: string): boolean {
  return /^(https?:\/\/\S+|mailto:\S+|tel:\S+|#\S+)$/.test(value);
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveIntegerNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function validateSeriesSequence(
  sequence: unknown,
  path: string,
  codePrefix: string
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (!isObject(sequence)) {
    issues.push(
      makeIssue(
        "error",
        `${codePrefix}-shape`,
        `\`${path}\` must be an object when present.`,
        path
      )
    );
    return issues;
  }

  let hasSequenceField = false;
  const sequenceFields = [
    "index",
    "volume",
    "issue",
    "chapter",
    "episode",
    "part"
  ] as const;

  for (const field of sequenceFields) {
    const value = sequence[field];
    if (value === undefined) {
      continue;
    }

    hasSequenceField = true;
    if (!isPositiveIntegerNumber(value)) {
      issues.push(
        makeIssue(
          "error",
          `${codePrefix}-${field}`,
          `\`${path}.${field}\` must be a positive integer when present.`,
          `${path}.${field}`
        )
      );
    }
  }

  if (!hasSequenceField) {
    issues.push(
      makeIssue(
        "error",
        `${codePrefix}-empty`,
        `\`${path}\` must include at least one sequence field when present.`,
        path
      )
    );
  }

  return issues;
}

function collectGeneralDocumentNodeRecords(
  node: unknown,
  path: string,
  records: Map<string, GeneralDocumentNodeRecord>,
  issues: PrdValidationIssue[]
): void {
  if (!isObject(node) || !isNonEmptyString(node.type)) {
    return;
  }

  if (isNonEmptyString(node.id)) {
    if (records.has(node.id)) {
      issues.push(
        makeIssue(
          "error",
          "content-node-id-duplicate",
          `Structured content node id \`${node.id}\` is duplicated.`,
          `${path}.id`
        )
      );
    } else {
      records.set(node.id, {
        path,
        node: node as unknown as GeneralDocumentNode
      });
    }
  }

  if (node.type === "section" && Array.isArray(node.children)) {
    node.children.forEach((child, index) => {
      collectGeneralDocumentNodeRecords(
        child,
        `${path}.children[${index}]`,
        records,
        issues
      );
    });
  }
}

function getStructuredGeneralDocumentSectionReferences(
  children: GeneralDocumentNode[]
): GeneralDocumentSegmentedSectionNode[] {
  return children.filter((child): child is GeneralDocumentSegmentedSectionNode => {
    return (
      child.type === "section" &&
      "src" in child &&
      isNonEmptyString(child.src)
    );
  });
}

function validateEntryPath(pathValue: string): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (pathValue.length === 0) {
    issues.push(makeIssue("error", "entry-empty", "`entry` must not be empty.", "entry"));
    return issues;
  }

  if (pathValue.startsWith("/")) {
    issues.push(
      makeIssue(
        "error",
        "entry-absolute",
        "`entry` must be a package-internal relative path, not an absolute path.",
        "entry"
      )
    );
  }

  if (pathValue.includes("\\")) {
    issues.push(
      makeIssue(
        "error",
        "entry-backslash",
        "`entry` must use forward-slash package paths.",
        "entry"
      )
    );
  }

  if (looksLikeUrl(pathValue)) {
    issues.push(
      makeIssue(
        "error",
        "entry-url",
        "`entry` must not be a network or scheme URL.",
        "entry"
      )
    );
  }

  if (pathValue.split("/").includes("..")) {
    issues.push(
      makeIssue(
        "error",
        "entry-traversal",
        "`entry` must not contain path traversal segments.",
        "entry"
      )
    );
  }

  if (pathValue.endsWith("/")) {
    issues.push(
      makeIssue(
        "error",
        "entry-directory",
        "`entry` must resolve to a file, not a directory path.",
        "entry"
      )
    );
  }

  return issues;
}

function validateLocalization(localization: unknown): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (!isObject(localization)) {
    issues.push(
      makeIssue(
        "error",
        "localization-shape",
        "`localization` must be an object when present.",
        "localization"
      )
    );
    return issues;
  }

  const typed = localization as Record<string, unknown> & Partial<PrdLocalization>;

  if (!isNonEmptyString(typed.defaultLocale)) {
    issues.push(
      makeIssue(
        "error",
        "localization-default-locale",
        "`localization.defaultLocale` must be a non-empty string.",
        "localization.defaultLocale"
      )
    );
  }

  if (
    typed.availableLocales !== undefined &&
    (!Array.isArray(typed.availableLocales) ||
      typed.availableLocales.some((value) => !isNonEmptyString(value)))
  ) {
    issues.push(
      makeIssue(
        "error",
        "localization-available-locales",
        "`localization.availableLocales` must be an array of strings.",
        "localization.availableLocales"
      )
    );
  }

  if (
    Array.isArray(typed.availableLocales) &&
    typeof typed.defaultLocale === "string" &&
    !typed.availableLocales.includes(typed.defaultLocale)
  ) {
    issues.push(
      makeIssue(
        "error",
        "localization-default-missing",
        "`localization.availableLocales` must include `defaultLocale`.",
        "localization.availableLocales"
      )
    );
  }

  if (
    typed.textDirection !== undefined &&
    typed.textDirection !== "ltr" &&
    typed.textDirection !== "rtl" &&
    typed.textDirection !== "auto"
  ) {
    issues.push(
      makeIssue(
        "error",
        "localization-text-direction",
        "`localization.textDirection` must be `ltr`, `rtl`, or `auto`.",
        "localization.textDirection"
      )
    );
  }

  return issues;
}

function validateIdentity(
  identity: unknown,
  manifestId: string
): {
  errors: PrdValidationIssue[];
  warnings: PrdValidationIssue[];
} {
  const errors: PrdValidationIssue[] = [];
  const warnings: PrdValidationIssue[] = [];

  if (!isObject(identity)) {
    errors.push(
      makeIssue(
        "error",
        "identity-shape",
        "`identity` must be an object when present.",
        "identity"
      )
    );
    return { errors, warnings };
  }

  const typed = identity as Record<string, unknown> & Partial<PrdIdentity>;
  const stringReferenceFields = [
    "revisionId",
    "parentId",
    "originId",
    "publisherRef",
    "ownerRef"
  ] as const;

  for (const field of stringReferenceFields) {
    if (typed[field] !== undefined && !isNonEmptyString(typed[field])) {
      errors.push(
        makeIssue(
          "error",
          `identity-${field.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`,
          `\`identity.${field}\` must be a non-empty string when present.`,
          `identity.${field}`
        )
      );
    }
  }

  if (
    typed.authorRefs !== undefined &&
    (!Array.isArray(typed.authorRefs) ||
      typed.authorRefs.some((value) => !isNonEmptyString(value)))
  ) {
    errors.push(
      makeIssue(
        "error",
        "identity-author-refs",
        "`identity.authorRefs` must be an array of non-empty strings when present.",
        "identity.authorRefs"
      )
    );
  }

  if (typed.series !== undefined) {
    if (!isObject(typed.series)) {
      errors.push(
        makeIssue(
          "error",
          "identity-series-shape",
          "`identity.series` must be an object when present.",
          "identity.series"
        )
      );
    } else {
      if (!isNonEmptyString(typed.series.ref)) {
        errors.push(
          makeIssue(
            "error",
            "identity-series-ref",
            "`identity.series.ref` must be a non-empty string.",
            "identity.series.ref"
          )
        );
      }

      if (typed.series.sequence !== undefined) {
        errors.push(
          ...validateSeriesSequence(
            typed.series.sequence,
            "identity.series.sequence",
            "identity-series-sequence"
          )
        );
      }
    }
  }

  if (typed.collections !== undefined) {
    if (!Array.isArray(typed.collections) || typed.collections.length === 0) {
      errors.push(
        makeIssue(
          "error",
          "identity-collections-shape",
          "`identity.collections` must be a non-empty array when present.",
          "identity.collections"
        )
      );
    } else {
      const collectionRefs = new Set<string>();

      typed.collections.forEach((value, index) => {
        if (!isObject(value)) {
          errors.push(
            makeIssue(
              "error",
              "identity-collection-shape",
              "`identity.collections` items must be objects with a non-empty `ref`.",
              `identity.collections.${index}`
            )
          );
          return;
        }

        if (!isNonEmptyString(value.ref)) {
          errors.push(
            makeIssue(
              "error",
              "identity-collection-ref",
              "`identity.collections` items must include a non-empty `ref`.",
              `identity.collections.${index}.ref`
            )
          );
          return;
        }

        if (collectionRefs.has(value.ref)) {
          errors.push(
            makeIssue(
              "error",
              "identity-collection-ref-duplicate",
              `Collection ref \`${value.ref}\` is duplicated in \`identity.collections\`.`,
              `identity.collections.${index}.ref`
            )
          );
          return;
        }

        collectionRefs.add(value.ref);
      });
    }
  }

  if (typed.id === manifestId) {
    warnings.push(
      makeIssue(
        "warning",
        "identity-duplicates-id",
        "`identity.id` duplicates the required top-level `id`; keep the canonical package identifier at the manifest top level and use `identity` only for supplemental references.",
        "identity.id"
      )
    );
  }

  return { errors, warnings };
}

function validateCompatibility(compatibility: unknown): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (!isObject(compatibility)) {
    issues.push(
      makeIssue(
        "error",
        "compatibility-shape",
        "`compatibility` must be an object when present.",
        "compatibility"
      )
    );
    return issues;
  }

  const typed = compatibility as Record<string, unknown> & Partial<PrdCompatibility>;

  if (typed.minViewer !== undefined && typeof typed.minViewer !== "string") {
    issues.push(
      makeIssue(
        "error",
        "compatibility-min-viewer",
        "`compatibility.minViewer` must be a string when present.",
        "compatibility.minViewer"
      )
    );
  }

  if (typed.capabilities === undefined) {
    return issues;
  }

  if (Array.isArray(typed.capabilities)) {
    if (typed.capabilities.some((value) => !isNonEmptyString(value))) {
      issues.push(
        makeIssue(
          "error",
          "compatibility-capabilities-array",
          "`compatibility.capabilities` arrays must contain only strings.",
          "compatibility.capabilities"
        )
      );
    }

    return issues;
  }

  if (!isObject(typed.capabilities)) {
    issues.push(
      makeIssue(
        "error",
        "compatibility-capabilities-shape",
        "`compatibility.capabilities` must be an array or an object with `required`/`optional` arrays.",
        "compatibility.capabilities"
      )
    );
    return issues;
  }

  const required = typed.capabilities.required;
  const optional = typed.capabilities.optional;

  if (
    required !== undefined &&
    (!Array.isArray(required) || required.some((value) => !isNonEmptyString(value)))
  ) {
    issues.push(
      makeIssue(
        "error",
        "compatibility-required-capabilities",
        "`compatibility.capabilities.required` must be an array of strings.",
        "compatibility.capabilities.required"
      )
    );
  }

  if (
    optional !== undefined &&
    (!Array.isArray(optional) || optional.some((value) => !isNonEmptyString(value)))
  ) {
    issues.push(
      makeIssue(
        "error",
        "compatibility-optional-capabilities",
        "`compatibility.capabilities.optional` must be an array of strings.",
        "compatibility.capabilities.optional"
      )
    );
  }

  return issues;
}

function getDeclaredRequiredCapabilities(
  compatibility: PrdCompatibility | undefined
): string[] {
  if (!compatibility?.capabilities) {
    return [];
  }

  if (Array.isArray(compatibility.capabilities)) {
    return compatibility.capabilities.filter(isNonEmptyString);
  }

  if (isObject(compatibility.capabilities) && Array.isArray(compatibility.capabilities.required)) {
    return compatibility.capabilities.required.filter(isNonEmptyString);
  }

  return [];
}

function validateAssetsDeclaration(assets: unknown): PrdValidationIssue[] {
  if (!Array.isArray(assets)) {
    return [
      makeIssue(
        "error",
        "assets-shape",
        "`assets` must be an array of asset declarations when present.",
        "assets"
      )
    ];
  }

  const issues: PrdValidationIssue[] = [];
  const assetIds = new Set<string>();

  for (const [index, value] of assets.entries()) {
    if (!isObject(value)) {
      issues.push(
        makeIssue(
          "error",
          "asset-declaration-shape",
          "Asset declarations must be objects.",
          `assets[${index}]`
        )
      );
      continue;
    }

    if (!isNonEmptyString(value.href)) {
      issues.push(
        makeIssue(
          "error",
          "asset-href-required",
          "Asset declarations must include a non-empty `href` string.",
          `assets[${index}].href`
        )
      );
    } else if (looksLikeUrl(value.href)) {
      issues.push(
        makeIssue(
          "error",
          "asset-href-url-format",
          "External asset URLs are not part of the current core PRD baseline. Asset `href` values must stay package-internal.",
          `assets[${index}].href`
        )
      );
    } else if (!isPackageInternalPath(value.href)) {
      issues.push(
        makeIssue(
          "error",
          "asset-href-path-format",
          "Asset `href` values must be package-internal relative paths.",
          `assets[${index}].href`
        )
      );
    } else if (!value.href.startsWith("assets/")) {
      issues.push(
        makeIssue(
          "error",
          "asset-href-prefix",
          "Asset `href` values must resolve under `assets/` in the current executable baseline.",
          `assets[${index}].href`
        )
      );
    }

    if (value.id !== undefined && !isNonEmptyString(value.id)) {
      issues.push(
        makeIssue(
          "error",
          "asset-id-shape",
          "Asset `id` values must be non-empty strings when present.",
          `assets[${index}].id`
        )
      );
    } else if (isNonEmptyString(value.id)) {
      if (assetIds.has(value.id)) {
        issues.push(
          makeIssue(
            "error",
            "asset-id-duplicate",
            `Asset id \`${value.id}\` is duplicated.`,
            `assets[${index}].id`
          )
        );
      } else {
        assetIds.add(value.id);
      }
    }

    if (value.type !== undefined && !isNonEmptyString(value.type)) {
      issues.push(
        makeIssue(
          "error",
          "asset-type-shape",
          "Asset `type` values must be non-empty strings when present.",
          `assets[${index}].type`
        )
      );
    }
  }

  return issues;
}

function validateAttachmentsDeclaration(attachments: unknown): PrdValidationIssue[] {
  if (!Array.isArray(attachments)) {
    return [
      makeIssue(
        "error",
        "attachments-shape",
        "`attachments` must be an array of objects when present.",
        "attachments"
      )
    ];
  }

  const issues: PrdValidationIssue[] = [];
  const attachmentIds = new Set<string>();

  for (const [index, value] of attachments.entries()) {
    if (!isObject(value)) {
      issues.push(
        makeIssue(
          "error",
          "attachment-declaration-shape",
          "Attachment declarations must be objects.",
          `attachments[${index}]`
        )
      );
      continue;
    }

    if (!isNonEmptyString(value.href)) {
      issues.push(
        makeIssue(
          "error",
          "attachment-href-required",
          "Attachment declarations must include a non-empty `href` string.",
          `attachments[${index}].href`
        )
      );
    } else if (looksLikeUrl(value.href)) {
      if (!isHttpUrl(value.href)) {
        issues.push(
          makeIssue(
            "error",
            "attachment-href-url-format",
            "Linked attachment `href` values must use `http` or `https` URLs.",
            `attachments[${index}].href`
          )
        );
      }
    } else if (!isPackageInternalPath(value.href)) {
      issues.push(
        makeIssue(
          "error",
          "attachment-href-path-format",
          "Bundled attachment `href` values must be package-internal relative paths.",
          `attachments[${index}].href`
        )
      );
    } else if (!value.href.startsWith("attachments/")) {
      issues.push(
        makeIssue(
          "error",
          "attachment-href-prefix",
          "Bundled attachment `href` values must resolve under `attachments/` in the current executable baseline.",
          `attachments[${index}].href`
        )
      );
    }

    if (value.id !== undefined && !isNonEmptyString(value.id)) {
      issues.push(
        makeIssue(
          "error",
          "attachment-id-shape",
          "Attachment `id` values must be non-empty strings when present.",
          `attachments[${index}].id`
        )
      );
    } else if (isNonEmptyString(value.id)) {
      if (attachmentIds.has(value.id)) {
        issues.push(
          makeIssue(
            "error",
            "attachment-id-duplicate",
            `Attachment id \`${value.id}\` is duplicated.`,
            `attachments[${index}].id`
          )
        );
      } else {
        attachmentIds.add(value.id);
      }
    }

    if (value.type !== undefined && !isNonEmptyString(value.type)) {
      issues.push(
        makeIssue(
          "error",
          "attachment-type-shape",
          "Attachment `type` values must be non-empty strings when present.",
          `attachments[${index}].type`
        )
      );
    }
  }

  return issues;
}

function validateExtensionsDeclaration(extensions: unknown): PrdValidationIssue[] {
  if (isObject(extensions)) {
    return [];
  }

  if (!Array.isArray(extensions)) {
    return [
      makeIssue(
        "error",
        "extensions-shape",
        "`extensions` must be an array or object when present.",
        "extensions"
      )
    ];
  }

  const issues: PrdValidationIssue[] = [];

  for (const [index, value] of extensions.entries()) {
    if (!isObject(value)) {
      issues.push(
        makeIssue(
          "error",
          "extension-declaration-shape",
          "Extension declarations must be objects.",
          `extensions[${index}]`
        )
      );
      continue;
    }

    if (!isNonEmptyString(value.id)) {
      issues.push(
        makeIssue(
          "error",
          "extension-id-required",
          "Extension declarations must include a non-empty `id` string.",
          `extensions[${index}].id`
        )
      );
    }
  }

  return issues;
}

function validatePublic(
  publicMetadata: unknown
): {
  errors: PrdValidationIssue[];
  warnings: PrdValidationIssue[];
} {
  const errors: PrdValidationIssue[] = [];
  const warnings: PrdValidationIssue[] = [];

  if (!isObject(publicMetadata)) {
    errors.push(
      makeIssue(
        "error",
        "public-shape",
        "`public` must be an object when present.",
        "public"
      )
    );
    return { errors, warnings };
  }

  const typed = publicMetadata as Record<string, unknown> & Partial<PrdPublicMetadata>;

  if (typed.cover !== undefined && !isNonEmptyString(typed.cover)) {
    errors.push(
      makeIssue(
        "error",
        "public-cover",
        "`public.cover` must be a non-empty string when present.",
        "public.cover"
      )
    );
  }

  if (typed.contributors !== undefined) {
    if (!Array.isArray(typed.contributors)) {
      errors.push(
        makeIssue(
          "error",
          "public-contributors-shape",
          "`public.contributors` must be an array when present.",
          "public.contributors"
        )
      );
    } else {
      typed.contributors.forEach((value, index) => {
        if (!isObject(value)) {
          errors.push(
            makeIssue(
              "error",
              "public-contributor-shape",
              "`public.contributors` items must be objects with `name` and `role`.",
              `public.contributors.${index}`
            )
          );
          return;
        }

        const contributor = value as Record<string, unknown>;
        if (!isNonEmptyString(contributor.name)) {
          errors.push(
            makeIssue(
              "error",
              "public-contributor-name",
              "`public.contributors` items must include a non-empty `name`.",
              `public.contributors.${index}.name`
            )
          );
        }

        if (!isNonEmptyString(contributor.role)) {
          errors.push(
            makeIssue(
              "error",
              "public-contributor-role",
              "`public.contributors` items must include a non-empty `role`.",
              `public.contributors.${index}.role`
            )
          );
        }

        if (
          contributor.displayName !== undefined &&
          !isNonEmptyString(contributor.displayName)
        ) {
          errors.push(
            makeIssue(
              "error",
              "public-contributor-display-name",
              "`public.contributors.displayName` must be a non-empty string when present.",
              `public.contributors.${index}.displayName`
            )
          );
        }
      });
    }
  }

  if (typed.series !== undefined) {
    if (!isObject(typed.series)) {
      errors.push(
        makeIssue(
          "error",
          "public-series-shape",
          "`public.series` must be an object when present.",
          "public.series"
        )
      );
    } else if (!isNonEmptyString(typed.series.title)) {
      errors.push(
        makeIssue(
          "error",
          "public-series-title",
          "`public.series.title` must be a non-empty string.",
          "public.series.title"
        )
      );
    }
  }

  if (typed.collections !== undefined) {
    if (!Array.isArray(typed.collections) || typed.collections.length === 0) {
      errors.push(
        makeIssue(
          "error",
          "public-collections-shape",
          "`public.collections` must be a non-empty array when present.",
          "public.collections"
        )
      );
    } else {
      typed.collections.forEach((value, index) => {
        if (!isObject(value) || !isNonEmptyString(value.title)) {
          errors.push(
            makeIssue(
              "error",
              "public-collection-title",
              "`public.collections` items must be objects with a non-empty `title`.",
              `public.collections.${index}.title`
            )
          );
        }
      });
    }
  }

  return { errors, warnings };
}

function validateCollectionSeriesMetadata(
  identity: unknown,
  publicMetadata: unknown
): PrdValidationIssue[] {
  if (!isObject(publicMetadata)) {
    return [];
  }

  const issues: PrdValidationIssue[] = [];
  const typedPublic = publicMetadata as Partial<PrdPublicMetadata>;
  const typedIdentity = isObject(identity)
    ? (identity as Partial<PrdIdentity>)
    : undefined;

  if (typedPublic.series !== undefined) {
    if (!typedIdentity || !isObject(typedIdentity.series) || !isNonEmptyString(typedIdentity.series.ref)) {
      issues.push(
        makeIssue(
          "error",
          "public-series-identity-series-required",
          "`public.series` requires a matching durable reference in `identity.series.ref`.",
          "public.series"
        )
      );
    }
  }

  if (typedPublic.collections !== undefined) {
    if (
      !typedIdentity ||
      !Array.isArray(typedIdentity.collections) ||
      typedIdentity.collections.length === 0
    ) {
      issues.push(
        makeIssue(
          "error",
          "public-collections-identity-collections-required",
          "`public.collections` requires matching durable references in `identity.collections`.",
          "public.collections"
        )
      );
    } else if (
      Array.isArray(typedPublic.collections) &&
      typedPublic.collections.length !== typedIdentity.collections.length
    ) {
      issues.push(
        makeIssue(
          "error",
          "public-collections-length",
          "`public.collections` must use the same item count as `identity.collections` when both are present.",
          "public.collections"
        )
      );
    }
  }

  return issues;
}

function validateManifestObjectInternal(manifest: unknown): PrdPackageValidationResult {
  const errors: PrdValidationIssue[] = [];
  const warnings: PrdValidationIssue[] = [];

  if (!isObject(manifest)) {
    errors.push(
      makeIssue(
        "error",
        "manifest-shape",
        "`manifest.json` must contain one JSON object at the root.",
        "manifest"
      )
    );

    return { valid: false, errors, warnings };
  }

  const candidate = manifest as Record<string, unknown>;
  const requiredFields = [
    "prdVersion",
    "manifestVersion",
    "id",
    "profile",
    "title",
    "entry"
  ] as const;

  for (const field of requiredFields) {
    if (!isNonEmptyString(candidate[field])) {
      errors.push(
        makeIssue(
          "error",
          MANIFEST_REQUIRED_FIELD_ISSUE_CODES[field],
          `\`${field}\` must exist and be a non-empty string.`,
          field
        )
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const manifestObject = candidate as unknown as PrdManifest;
  const profileInfo = normalizeProfileId(manifestObject.profile);

  if (manifestObject.profile === "resume") {
    warnings.push(
      makeIssue(
        "warning",
        "profile-resume-legacy",
        "Legacy bare `resume` profile usage is deprecated. Use `profile: \"general-document\"` and keep resume-specific authored data under `profiles/resume.json` instead.",
        "profile"
      )
    );
  }

  if (profileInfo.aliasUsed) {
    warnings.push(
      makeIssue(
        "warning",
        "profile-alias",
        `Legacy profile alias \`${profileInfo.input}\` was normalized to \`${profileInfo.normalized}\`.`,
        "profile"
      )
    );
  }

  if (profileInfo.supportClass === "unknown") {
    if (profileInfo.input !== "resume") {
      warnings.push(
        makeIssue(
          "warning",
          "profile-unknown",
          `Profile \`${profileInfo.input}\` is not recognized as canonical, implementation-supported, or namespaced custom.`,
          "profile"
        )
      );
    }
  }

  if (profileInfo.supportClass === "community-custom") {
    warnings.push(
      makeIssue(
        "warning",
        "profile-community-custom",
        `Profile \`${profileInfo.input}\` is treated as a community/custom profile.`,
        "profile"
      )
    );
  }

  errors.push(...validateEntryPath(manifestObject.entry));

  if (
    profileInfo.normalized === "general-document" &&
    !STRUCTURED_CONTENT_ENTRY_PATTERN.test(manifestObject.entry)
  ) {
    errors.push(
      makeIssue(
        "error",
        PROFILE_ENTRY_FORMAT_ISSUE_CODES["general-document"],
        "`general-document` packages must use a structured JSON entry under `content/`, such as `content/root.json`.",
        "entry"
      )
    );
  }

  if (
    profileInfo.normalized === "comic" ||
    profileInfo.normalized === "storyboard"
  ) {
    const profileLabel = profileInfo.normalized;
    const isStructuredEntry = STRUCTURED_CONTENT_ENTRY_PATTERN.test(
      manifestObject.entry
    );
    const isLegacyHtmlEntry = isHtmlEntryPath(manifestObject.entry);

    if (!isStructuredEntry && !isLegacyHtmlEntry) {
      errors.push(
        makeIssue(
          "error",
          PROFILE_ENTRY_FORMAT_ISSUE_CODES[profileLabel],
          `\`${profileLabel}\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`. HTML entries remain legacy fallback behavior.`,
          "entry"
        )
      );
    }

    if (isLegacyHtmlEntry) {
      warnings.push(
        makeIssue(
          "warning",
          `${profileLabel}-html-entry-legacy`,
          `HTML-first \`${profileLabel}\` entries are legacy fallback behavior. Use a structured JSON entry under \`content/\` for the canonical path.`,
          "entry"
        )
      );
    }
  }

  if (
    manifestObject.profileVersion !== undefined &&
    !isNonEmptyString(manifestObject.profileVersion)
  ) {
    errors.push(
      makeIssue(
        "error",
        "profile-version-shape",
        "`profileVersion` must be a non-empty string when present.",
        "profileVersion"
      )
    );
  }

  if (manifestObject.identity !== undefined) {
    const identityResult = validateIdentity(manifestObject.identity, manifestObject.id);
    errors.push(...identityResult.errors);
    warnings.push(...identityResult.warnings);
  }

  if (manifestObject.public !== undefined) {
    const publicResult = validatePublic(manifestObject.public);
    errors.push(...publicResult.errors);
    warnings.push(...publicResult.warnings);
  }

  if (manifestObject.identity !== undefined || manifestObject.public !== undefined) {
    errors.push(
      ...validateCollectionSeriesMetadata(
        manifestObject.identity,
        manifestObject.public
      )
    );
  }

  if (manifestObject.localization !== undefined) {
    errors.push(...validateLocalization(manifestObject.localization));
  }

  if (manifestObject.compatibility !== undefined) {
    errors.push(...validateCompatibility(manifestObject.compatibility));
  }

  if (manifestObject.assets !== undefined) {
    errors.push(...validateAssetsDeclaration(manifestObject.assets));
  }

  if (manifestObject.extensions !== undefined) {
    errors.push(...validateExtensionsDeclaration(manifestObject.extensions));
  }

  if (manifestObject.attachments !== undefined) {
    errors.push(...validateAttachmentsDeclaration(manifestObject.attachments));
  }

  if (manifestObject.protected !== undefined && !isObject(manifestObject.protected)) {
    errors.push(
      makeIssue(
        "error",
        "protected-shape",
        "`protected` must be an object when present.",
        "protected"
      )
    );
  }

  const normalizedManifest = {
    ...manifestObject,
    profile: profileInfo.normalized
  };

  if (profileInfo.normalized === "general-document") {
    const requiredCapabilities = getDeclaredRequiredCapabilities(
      normalizedManifest.compatibility
    );

    if (requiredCapabilities.includes(HTML_ENTRY_CAPABILITY)) {
      warnings.push(
        makeIssue(
          "warning",
          "general-document-html-capability-legacy",
          `\`general-document\` packages should not require \`${HTML_ENTRY_CAPABILITY}\`; use \`${GENERAL_DOCUMENT_STRUCTURED_CAPABILITY}\` for the structured entry path instead.`,
          "compatibility.capabilities.required"
        )
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest: normalizedManifest,
    profileInfo
  };
}

function getDeclaredAssets(manifest: PrdManifest): PrdAssetDeclaration[] {
  if (!Array.isArray(manifest.assets)) {
    return [];
  }

  return manifest.assets.filter((value): value is PrdAssetDeclaration => {
    return isObject(value) && isNonEmptyString(value.href);
  });
}

function getDeclaredAttachments(manifest: PrdManifest): PrdAttachmentDeclaration[] {
  if (!Array.isArray(manifest.attachments)) {
    return [];
  }

  return manifest.attachments.filter((value): value is PrdAttachmentDeclaration => {
    return isObject(value) && isNonEmptyString(value.href);
  });
}

function getDeclaredAssetMap(manifest: PrdManifest): Map<string, PrdAssetDeclaration> {
  const declaredAssetsById = new Map<string, PrdAssetDeclaration>();

  for (const asset of getDeclaredAssets(manifest)) {
    if (isNonEmptyString(asset.id)) {
      declaredAssetsById.set(asset.id, asset);
    }
  }

  return declaredAssetsById;
}

function getDeclaredAssetByReference(
  manifest: PrdManifest,
  reference: string
): PrdAssetDeclaration | undefined {
  for (const asset of getDeclaredAssets(manifest)) {
    if (asset.id === reference || asset.href === reference) {
      return asset;
    }
  }

  return undefined;
}

function isSupportedImageAsset(asset: PrdAssetDeclaration): boolean {
  if (isNonEmptyString(asset.type)) {
    return asset.type.toLowerCase().startsWith("image/");
  }

  const assetHref = asset.href.toLowerCase();
  return SUPPORTED_IMAGE_ASSET_EXTENSIONS.some((extension) =>
    assetHref.endsWith(extension)
  );
}

function validateDeclaredImageAssetReference(
  assetId: unknown,
  path: string,
  declaredAssetsById: Map<string, PrdAssetDeclaration>,
  itemLabel: string,
  requiredCode: string,
  missingCode: string,
  invalidCode: string
): PrdValidationIssue[] {
  if (!isNonEmptyString(assetId)) {
    return [
      makeIssue(
        "error",
        requiredCode,
        `${itemLabel} items must include a non-empty \`asset\` string.`,
        path
      )
    ];
  }

  const declaredAsset = declaredAssetsById.get(assetId);
  if (!declaredAsset) {
    return [
      makeIssue(
        "error",
        missingCode,
        `${itemLabel} references undeclared asset \`${assetId}\`.`,
        path
      )
    ];
  }

  if (!isSupportedImageAsset(declaredAsset)) {
    return [
      makeIssue(
        "error",
        invalidCode,
        `${itemLabel} asset \`${assetId}\` must resolve to a declared image asset.`,
        path
      )
    ];
  }

  return [];
}

function validateOptionalPublicCoverReference(
  coverReference: unknown,
  path: string,
  manifest: PrdManifest,
  missingCode: string,
  invalidCode: string
): PrdValidationIssue[] {
  if (coverReference === undefined) {
    return [];
  }

  if (!isNonEmptyString(coverReference)) {
    return [];
  }

  const declaredAsset = getDeclaredAssetByReference(manifest, coverReference);
  if (!declaredAsset) {
    return [
      makeIssue(
        "error",
        missingCode,
        `Public cover reference \`${coverReference}\` must resolve to a declared asset id or href.`,
        path
      )
    ];
  }

  if (!isSupportedImageAsset(declaredAsset)) {
    return [
      makeIssue(
        "error",
        invalidCode,
        `Public cover reference \`${coverReference}\` must resolve to a declared image asset.`,
        path
      )
    ];
  }

  return [];
}

function validateDeclaredAssetsPresent(
  files: PrdFileMap,
  manifest: PrdManifest
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  for (const [index, asset] of getDeclaredAssets(manifest).entries()) {
    if (!files[asset.href]) {
      issues.push(
        makeIssue(
          "error",
          "asset-file-missing",
          `Declared asset \`${asset.href}\` does not exist in the package.`,
          `assets[${index}].href`
        )
      );
    }
  }

  return issues;
}

function validateDeclaredAttachmentsPresent(
  files: PrdFileMap,
  manifest: PrdManifest
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  for (const [index, attachment] of getDeclaredAttachments(manifest).entries()) {
    if (looksLikeUrl(attachment.href)) {
      continue;
    }

    if (!files[attachment.href]) {
      issues.push(
        makeIssue(
          "error",
          "attachment-file-missing",
          `Declared attachment \`${attachment.href}\` does not exist in the package.`,
          `attachments[${index}].href`
        )
      );
    }
  }

  return issues;
}

function validateContentNode(
  node: unknown,
  path: string,
  assetIds: Set<string>,
  allowSegmentedSectionSrc = false
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (!isObject(node)) {
    issues.push(
      makeIssue(
        "error",
        "content-node-shape",
        "Content nodes must be objects.",
        path
      )
    );
    return issues;
  }

  const type = node.type;

  if (!isNonEmptyString(type)) {
    issues.push(
      makeIssue(
        "error",
        "content-node-type",
        "Each content node must declare a non-empty `type` string.",
        `${path}.type`
      )
    );
    return issues;
  }

  if (type !== "section" && node.id !== undefined && !isNonEmptyString(node.id)) {
    issues.push(
      makeIssue(
        "error",
        "content-node-id-shape",
        "Optional content node `id` values must be non-empty strings when present.",
        `${path}.id`
      )
    );
  }

  switch (type) {
    case "section": {
      if (!isNonEmptyString(node.id)) {
        issues.push(
          makeIssue(
            "error",
            "section-id-required",
            "Section nodes must include a non-empty `id` string.",
            `${path}.id`
          )
        );
      }

      if (!isNonEmptyString(node.title)) {
        issues.push(
          makeIssue(
            "error",
            "section-title-required",
            "Section nodes must include a non-empty `title` string.",
            `${path}.title`
          )
        );
      }

      const hasSrc = node.src !== undefined;

      if (hasSrc && !isNonEmptyString(node.src)) {
        issues.push(
          makeIssue(
            "error",
            "section-src-required",
            "Segmented section nodes must include a non-empty `src` string.",
            `${path}.src`
          )
        );
      }

      if (Array.isArray(node.children) && isNonEmptyString(node.src)) {
        issues.push(
          makeIssue(
            "error",
            "section-segmentation-mutually-exclusive",
            "Section nodes must use either `children` or `src`, not both.",
            path
          )
        );
      }

      if (isNonEmptyString(node.src)) {
        if (!allowSegmentedSectionSrc) {
          issues.push(
            makeIssue(
              "error",
              "section-segmentation-nested-unsupported",
              "Segmented section references are only allowed on top-level document sections in v0.1.",
              `${path}.src`
            )
          );
        } else if (
          !isJsonEntryPath(node.src) ||
          !GENERAL_DOCUMENT_SECTION_ENTRY_PATTERN.test(node.src)
        ) {
          issues.push(
            makeIssue(
              "error",
              "section-src-path-format",
              `Segmented section \`src\` paths must resolve to JSON files under \`${PRD_GENERAL_DOCUMENT_SECTION_ENTRY_PREFIX}\`.`,
              `${path}.src`
            )
          );
        }

        return issues;
      }

      if (!Array.isArray(node.children) || node.children.length === 0) {
        issues.push(
          makeIssue(
            "error",
            "section-children-required",
            "Section nodes must include a non-empty `children` array.",
            `${path}.children`
          )
        );
        return issues;
      }

      for (const [index, child] of node.children.entries()) {
        issues.push(
          ...validateContentNode(
            child,
            `${path}.children[${index}]`,
            assetIds,
            false
          )
        );
      }

      return issues;
    }

    case "heading":
      if (
        typeof node.level !== "number" ||
        !Number.isInteger(node.level) ||
        node.level < 1 ||
        node.level > 6
      ) {
        issues.push(
          makeIssue(
            "error",
            "heading-level-invalid",
            "Heading nodes must include an integer `level` from 1 to 6.",
            `${path}.level`
          )
        );
      }

      if (!isNonEmptyString(node.text)) {
        issues.push(
          makeIssue(
            "error",
            "heading-text-required",
            "Heading nodes must include a non-empty `text` string.",
            `${path}.text`
          )
        );
      }

      return issues;

    case "paragraph":
      if (!isNonEmptyString(node.text)) {
        issues.push(
          makeIssue(
            "error",
            "paragraph-text-required",
            "Paragraph nodes must include a non-empty `text` string.",
            `${path}.text`
          )
        );
      }

      return issues;

    case "list":
      if (node.style !== "unordered" && node.style !== "ordered") {
        issues.push(
          makeIssue(
            "error",
            "list-style-invalid",
            "List nodes must include a `style` of `unordered` or `ordered`.",
            `${path}.style`
          )
        );
      }

      if (
        !Array.isArray(node.items) ||
        node.items.length === 0 ||
        node.items.some((value) => !isNonEmptyString(value))
      ) {
        issues.push(
          makeIssue(
            "error",
            "list-items-invalid",
            "List nodes must include a non-empty `items` array of strings.",
            `${path}.items`
          )
        );
      }

      return issues;

    case "links":
      if (node.style !== "list" && node.style !== "inline") {
        issues.push(
          makeIssue(
            "error",
            "links-style-invalid",
            "Links nodes must include a `style` of `list` or `inline`.",
            `${path}.style`
          )
        );
      }

      if (!Array.isArray(node.items) || node.items.length === 0) {
        issues.push(
          makeIssue(
            "error",
            "links-items-required",
            "Links nodes must include a non-empty `items` array.",
            `${path}.items`
          )
        );
        return issues;
      }

      node.items.forEach((item, index) => {
        if (!isObject(item)) {
          issues.push(
            makeIssue(
              "error",
              "links-item-shape",
              "Links node items must be objects with `label` and `href`.",
              `${path}.items[${index}]`
            )
          );
          return;
        }

        if (!isNonEmptyString(item.label)) {
          issues.push(
            makeIssue(
              "error",
              "links-item-label",
              "Links node items must include a non-empty `label` string.",
              `${path}.items[${index}].label`
            )
          );
        }

        if (!isNonEmptyString(item.href)) {
          issues.push(
            makeIssue(
              "error",
              "links-item-href",
              "Links node items must include a non-empty `href` string.",
              `${path}.items[${index}].href`
            )
          );
        } else if (!isAllowedGeneralDocumentLinkHref(item.href)) {
          issues.push(
            makeIssue(
              "error",
              "links-item-href-format",
              "Links node `href` values must be `http`, `https`, `mailto`, `tel`, or same-document `#fragment` links.",
              `${path}.items[${index}].href`
            )
          );
        }
      });

      return issues;

    case "table": {
      if (node.caption !== undefined && !isNonEmptyString(node.caption)) {
        issues.push(
          makeIssue(
            "error",
            "table-caption-shape",
            "Table `caption` values must be non-empty strings when present.",
            `${path}.caption`
          )
        );
      }

      if (!Array.isArray(node.columns) || node.columns.length === 0) {
        issues.push(
          makeIssue(
            "error",
            "table-columns-required",
            "Table nodes must include a non-empty `columns` array.",
            `${path}.columns`
          )
        );
      }

      const declaredColumnIds = new Set<string>();
      if (Array.isArray(node.columns)) {
        node.columns.forEach((column, index) => {
          if (!isObject(column)) {
            issues.push(
              makeIssue(
                "error",
                "table-column-shape",
                "Table `columns` items must be objects with `id` and `label`.",
                `${path}.columns[${index}]`
              )
            );
            return;
          }

          if (!isNonEmptyString(column.id)) {
            issues.push(
              makeIssue(
                "error",
                "table-column-id-required",
                "Table columns must include a non-empty `id` string.",
                `${path}.columns[${index}].id`
              )
            );
          } else if (declaredColumnIds.has(column.id)) {
            issues.push(
              makeIssue(
                "error",
                "table-column-id-duplicate",
                `Table column id \`${column.id}\` is duplicated.`,
                `${path}.columns[${index}].id`
              )
            );
          } else {
            declaredColumnIds.add(column.id);
          }

          if (!isNonEmptyString(column.label)) {
            issues.push(
              makeIssue(
                "error",
                "table-column-label-required",
                "Table columns must include a non-empty `label` string.",
                `${path}.columns[${index}].label`
              )
            );
          }

          if (
            column.align !== undefined &&
            column.align !== "left" &&
            column.align !== "center" &&
            column.align !== "right"
          ) {
            issues.push(
              makeIssue(
                "error",
                "table-column-align-invalid",
                "Table column `align` values must be `left`, `center`, or `right` when present.",
                `${path}.columns[${index}].align`
              )
            );
          }
        });
      }

      if (!Array.isArray(node.rows)) {
        issues.push(
          makeIssue(
            "error",
            "table-rows-shape",
            "Table nodes must include a `rows` array.",
            `${path}.rows`
          )
        );
        return issues;
      }

      node.rows.forEach((row, rowIndex) => {
        if (!isObject(row)) {
          issues.push(
            makeIssue(
              "error",
              "table-row-shape",
              "Table `rows` items must be objects keyed by declared column ids.",
              `${path}.rows[${rowIndex}]`
            )
          );
          return;
        }

        Object.entries(row).forEach(([columnId, value]) => {
          if (!declaredColumnIds.has(columnId)) {
            issues.push(
              makeIssue(
                "error",
                "table-row-column-unknown",
                `Table rows must not include undeclared column id \`${columnId}\`.`,
                `${path}.rows[${rowIndex}].${columnId}`
              )
            );
          }

          if (typeof value !== "string") {
            issues.push(
              makeIssue(
                "error",
                "table-row-value-shape",
                "Table row values must be strings.",
                `${path}.rows[${rowIndex}].${columnId}`
              )
            );
          }
        });
      });

      return issues;
    }

    case "chart": {
      if (node.chartType !== "bar") {
        issues.push(
          makeIssue(
            "error",
            "chart-type-invalid",
            "Chart nodes must currently declare `chartType: \"bar\"`.",
            `${path}.chartType`
          )
        );
      }

      if (node.title !== undefined && !isNonEmptyString(node.title)) {
        issues.push(
          makeIssue(
            "error",
            "chart-title-shape",
            "Chart `title` values must be non-empty strings when present.",
            `${path}.title`
          )
        );
      }

      if (node.caption !== undefined && !isNonEmptyString(node.caption)) {
        issues.push(
          makeIssue(
            "error",
            "chart-caption-shape",
            "Chart `caption` values must be non-empty strings when present.",
            `${path}.caption`
          )
        );
      }

      if (
        !Array.isArray(node.categories) ||
        node.categories.length === 0 ||
        node.categories.some((value) => !isNonEmptyString(value))
      ) {
        issues.push(
          makeIssue(
            "error",
            "chart-categories-required",
            "Chart nodes must include a non-empty `categories` array of strings.",
            `${path}.categories`
          )
        );
      }

      if (!Array.isArray(node.series) || node.series.length === 0) {
        issues.push(
          makeIssue(
            "error",
            "chart-series-required",
            "Chart nodes must include a non-empty `series` array.",
            `${path}.series`
          )
        );
        return issues;
      }

      const categoryCount = Array.isArray(node.categories) ? node.categories.length : 0;
      node.series.forEach((series, index) => {
        if (!isObject(series)) {
          issues.push(
            makeIssue(
              "error",
              "chart-series-shape",
              "Chart series items must be objects with `name` and `values`.",
              `${path}.series[${index}]`
            )
          );
          return;
        }

        if (!isNonEmptyString(series.name)) {
          issues.push(
            makeIssue(
              "error",
              "chart-series-name",
              "Chart series items must include a non-empty `name` string.",
              `${path}.series[${index}].name`
            )
          );
        }

        if (
          !Array.isArray(series.values) ||
          series.values.length === 0 ||
          series.values.some((value) => !isFiniteNonNegativeNumber(value))
        ) {
          issues.push(
            makeIssue(
              "error",
              "chart-series-values",
              "Chart series `values` must be non-empty arrays of non-negative numbers.",
              `${path}.series[${index}].values`
            )
          );
        } else if (categoryCount > 0 && series.values.length !== categoryCount) {
          issues.push(
            makeIssue(
              "error",
              "chart-series-length",
              "Each chart series must have one value for every declared category.",
              `${path}.series[${index}].values`
            )
          );
        }
      });

      return issues;
    }

    case "media":
      if (node.mediaType !== "audio" && node.mediaType !== "video") {
        issues.push(
          makeIssue(
            "error",
            "media-type-invalid",
            "Media nodes must include a `mediaType` of `audio` or `video`.",
            `${path}.mediaType`
          )
        );
      }

      if (!isNonEmptyString(node.asset)) {
        issues.push(
          makeIssue(
            "error",
            "media-asset-required",
            "Media nodes must include a non-empty `asset` string.",
            `${path}.asset`
          )
        );
      } else if (!assetIds.has(node.asset)) {
        issues.push(
          makeIssue(
            "error",
            "media-asset-missing",
            `Media node references undeclared asset \`${node.asset}\`.`,
            `${path}.asset`
          )
        );
      }

      if (node.caption !== undefined && !isNonEmptyString(node.caption)) {
        issues.push(
          makeIssue(
            "error",
            "media-caption-shape",
            "Media `caption` values must be non-empty strings when present.",
            `${path}.caption`
          )
        );
      }

      if (node.poster !== undefined && !isNonEmptyString(node.poster)) {
        issues.push(
          makeIssue(
            "error",
            "media-poster-shape",
            "Media `poster` values must be non-empty strings when present.",
            `${path}.poster`
          )
        );
      } else if (node.poster !== undefined && node.mediaType === "audio") {
        issues.push(
          makeIssue(
            "error",
            "media-poster-audio-invalid",
            "Media `poster` is only valid for `video` nodes.",
            `${path}.poster`
          )
        );
      } else if (
        isNonEmptyString(node.poster) &&
        node.mediaType === "video" &&
        !assetIds.has(node.poster)
      ) {
        issues.push(
          makeIssue(
            "error",
            "media-poster-missing",
            `Media poster references undeclared asset \`${node.poster}\`.`,
            `${path}.poster`
          )
        );
      }

      return issues;

    case "image":
      if (!isNonEmptyString(node.asset)) {
        issues.push(
          makeIssue(
            "error",
            "image-asset-required",
            "Image nodes must include a non-empty `asset` string.",
            `${path}.asset`
          )
        );
      } else if (!assetIds.has(node.asset)) {
        issues.push(
          makeIssue(
            "error",
            "image-asset-missing",
            `Image node references undeclared asset \`${node.asset}\`.`,
            `${path}.asset`
          )
        );
      }

      if (!isNonEmptyString(node.alt)) {
        issues.push(
          makeIssue(
            "error",
            "image-alt-required",
            "Image nodes must include a non-empty `alt` string.",
            `${path}.alt`
          )
        );
      }

      if (node.caption !== undefined && !isNonEmptyString(node.caption)) {
        issues.push(
          makeIssue(
            "error",
            "image-caption-shape",
            "Image `caption` values must be non-empty strings when present.",
            `${path}.caption`
          )
        );
      }

      return issues;

    case "quote":
      if (!isNonEmptyString(node.text)) {
        issues.push(
          makeIssue(
            "error",
            "quote-text-required",
            "Quote nodes must include a non-empty `text` string.",
            `${path}.text`
          )
        );
      }

      if (node.attribution !== undefined && !isNonEmptyString(node.attribution)) {
        issues.push(
          makeIssue(
            "error",
            "quote-attribution-shape",
            "Quote `attribution` values must be non-empty strings when present.",
            `${path}.attribution`
          )
        );
      }

      return issues;

    default:
      issues.push(
        makeIssue(
          "error",
          "content-node-unknown",
          `Unsupported content node type \`${type}\`.`,
          `${path}.type`
        )
      );
      return issues;
  }
}

function validateGeneralDocumentContent(
  content: unknown,
  manifest: PrdManifest,
  files?: PrdFileMap,
  nodeRecords?: Map<string, GeneralDocumentNodeRecord>
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (!isObject(content)) {
    issues.push(
      makeIssue(
        "error",
        "content-root-shape",
        "The general-document entry must contain one JSON object at the root.",
        manifest.entry
      )
    );
    return issues;
  }

  const typed = content as Record<string, unknown> & Partial<GeneralDocumentRoot>;

  if (!isNonEmptyString(typed.schemaVersion)) {
    issues.push(
      makeIssue(
        "error",
        "content-schema-version-required",
        "Structured content roots must include a non-empty `schemaVersion` string.",
        `${manifest.entry}.schemaVersion`
      )
    );
  }

  if (typed.profile !== "general-document") {
    issues.push(
      makeIssue(
        "error",
        "content-profile-mismatch",
        "Structured content roots for the base document profile must declare `profile: \"general-document\"`.",
        `${manifest.entry}.profile`
      )
    );
  }

  if (typed.type !== "document") {
    issues.push(
      makeIssue(
        "error",
        "content-type-invalid",
        "Structured content roots must declare `type: \"document\"`.",
        `${manifest.entry}.type`
      )
    );
  }

  if (!isNonEmptyString(typed.id)) {
    issues.push(
      makeIssue(
        "error",
        "content-id-required",
        "Structured content roots must include a non-empty `id` string.",
        `${manifest.entry}.id`
      )
    );
  }

  if (!isNonEmptyString(typed.title)) {
    issues.push(
      makeIssue(
        "error",
        "content-title-required",
        "Structured content roots must include a non-empty `title` string.",
        `${manifest.entry}.title`
      )
    );
  }

  if (typed.title && typed.title !== manifest.title) {
    issues.push(
      makeIssue(
        "warning",
        "content-title-mismatch",
        "The structured content title should match the manifest title for the base document path.",
        `${manifest.entry}.title`
      )
    );
  }

  if (
    typed.subtitle !== undefined &&
    !isNonEmptyString(typed.subtitle)
  ) {
    issues.push(
      makeIssue(
        "error",
        "content-subtitle-shape",
        "Structured content `subtitle` values must be non-empty strings when present.",
        `${manifest.entry}.subtitle`
      )
    );
  }

  if (
    typed.summary !== undefined &&
    !isNonEmptyString(typed.summary)
  ) {
    issues.push(
      makeIssue(
        "error",
        "content-summary-shape",
        "Structured content `summary` values must be non-empty strings when present.",
        `${manifest.entry}.summary`
      )
    );
  }

  if (typed.lang !== undefined && !isNonEmptyString(typed.lang)) {
    issues.push(
      makeIssue(
        "error",
        "content-lang-shape",
        "Structured content `lang` values must be non-empty strings when present.",
        `${manifest.entry}.lang`
      )
    );
  }

  if (!Array.isArray(typed.children) || typed.children.length === 0) {
    issues.push(
      makeIssue(
        "error",
        "content-children-required",
        "Structured content roots must include a non-empty `children` array.",
        `${manifest.entry}.children`
      )
    );
    return issues;
  }

  const assetIds = new Set(
    getDeclaredAssets(manifest)
      .map((asset) => asset.id)
      .filter((value): value is string => isNonEmptyString(value))
  );

  for (const [index, child] of typed.children.entries()) {
    issues.push(
      ...validateContentNode(
        child,
        `${manifest.entry}.children[${index}]`,
        assetIds,
        true
      )
    );
  }

  const collectedNodeRecords = new Map<string, GeneralDocumentNodeRecord>();
  typed.children.forEach((child, index) => {
    collectGeneralDocumentNodeRecords(
      child,
      `${manifest.entry}.children[${index}]`,
      collectedNodeRecords,
      issues
    );
  });

  if (nodeRecords) {
    for (const [id, record] of collectedNodeRecords.entries()) {
      nodeRecords.set(id, record);
    }
  }

  if (files) {
    issues.push(
      ...validateSegmentedGeneralDocumentSections(
        typed.children,
        manifest,
        files,
        nodeRecords
      )
    );
  }

  return issues;
}

function validateGeneralDocumentSectionContent(
  content: unknown,
  manifest: PrdManifest,
  sectionPath: string,
  expectedSection: {
    id: string;
    title: string;
  },
  nodeRecords?: Map<string, GeneralDocumentNodeRecord>
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (!isObject(content)) {
    issues.push(
      makeIssue(
        "error",
        "section-content-root-shape",
        "Structured document section files must contain one JSON object at the root.",
        sectionPath
      )
    );
    return issues;
  }

  const typed = content as Partial<GeneralDocumentSectionRoot>;

  if (!isNonEmptyString(typed.schemaVersion)) {
    issues.push(
      makeIssue(
        "error",
        "section-content-schema-version-required",
        "Structured document section files must include a non-empty `schemaVersion` string.",
        `${sectionPath}.schemaVersion`
      )
    );
  }

  if (typed.profile !== "general-document") {
    issues.push(
      makeIssue(
        "error",
        "section-content-profile-mismatch",
        "Structured document section files must declare `profile: \"general-document\"`.",
        `${sectionPath}.profile`
      )
    );
  }

  if (typed.type !== "document-section") {
    issues.push(
      makeIssue(
        "error",
        "section-content-type-invalid",
        "Structured document section files must declare `type: \"document-section\"`.",
        `${sectionPath}.type`
      )
    );
  }

  if (!isNonEmptyString(typed.id)) {
    issues.push(
      makeIssue(
        "error",
        "section-content-id-required",
        "Structured document section files must include a non-empty `id` string.",
        `${sectionPath}.id`
      )
    );
  } else if (typed.id !== expectedSection.id) {
    issues.push(
      makeIssue(
        "error",
        "section-content-id-mismatch",
        `Structured document section file id \`${typed.id}\` must match the parent section id \`${expectedSection.id}\`.`,
        `${sectionPath}.id`
      )
    );
  }

  if (!isNonEmptyString(typed.title)) {
    issues.push(
      makeIssue(
        "error",
        "section-content-title-required",
        "Structured document section files must include a non-empty `title` string.",
        `${sectionPath}.title`
      )
    );
  } else if (typed.title !== expectedSection.title) {
    issues.push(
      makeIssue(
        "error",
        "section-content-title-mismatch",
        `Structured document section file title \`${typed.title}\` must match the parent section title \`${expectedSection.title}\`.`,
        `${sectionPath}.title`
      )
    );
  }

  if (!Array.isArray(typed.children) || typed.children.length === 0) {
    issues.push(
      makeIssue(
        "error",
        "section-content-children-required",
        "Structured document section files must include a non-empty `children` array.",
        `${sectionPath}.children`
      )
    );
    return issues;
  }

  const assetIds = new Set(
    getDeclaredAssets(manifest)
      .map((asset) => asset.id)
      .filter((value): value is string => isNonEmptyString(value))
  );

  for (const [index, child] of typed.children.entries()) {
    issues.push(
      ...validateContentNode(
        child,
        `${sectionPath}.children[${index}]`,
        assetIds,
        false
      )
    );
  }

  if (nodeRecords) {
    typed.children.forEach((child, index) => {
      collectGeneralDocumentNodeRecords(
        child,
        `${sectionPath}.children[${index}]`,
        nodeRecords,
        issues
      );
    });
  }

  return issues;
}

function validateSegmentedGeneralDocumentSections(
  children: GeneralDocumentNode[],
  manifest: PrdManifest,
  files: PrdFileMap,
  nodeRecords?: Map<string, GeneralDocumentNodeRecord>
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];
  const seenSectionPaths = new Set<string>();

  for (const section of getStructuredGeneralDocumentSectionReferences(children)) {
    if (seenSectionPaths.has(section.src)) {
      issues.push(
        makeIssue(
          "error",
          "section-src-duplicate",
          `Segmented section path \`${section.src}\` must not be reused by multiple top-level sections in v0.1.`,
          `${manifest.entry}.children`
        )
      );
      continue;
    }

    seenSectionPaths.add(section.src);

    const sectionFile = files[section.src];
    if (!sectionFile) {
      issues.push(
        makeIssue(
          "error",
          "section-src-missing",
          `Segmented section path \`${section.src}\` does not exist in the package.`,
          `${manifest.entry}.children`
        )
      );
      continue;
    }

    let sectionContent: unknown;
    try {
      sectionContent = JSON.parse(strFromU8(sectionFile));
    } catch {
      issues.push(
        makeIssue(
          "error",
          "section-src-json-invalid",
          "Segmented section files must parse as valid JSON.",
          section.src
        )
      );
      continue;
    }

    issues.push(
      ...validateGeneralDocumentSectionContent(
        sectionContent,
        manifest,
        section.src,
        {
          id: section.id,
          title: section.title
        },
        nodeRecords
      )
    );
  }

  return issues;
}

function validateComicPanels(
  content: unknown,
  manifest: PrdManifest,
  panelsPath = COMIC_PANELS_PATH
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (!isObject(content)) {
    issues.push(
      makeIssue(
        "error",
        "comic-panels-root-shape",
        "Comic panel metadata must contain one JSON object at the root.",
        panelsPath
      )
    );
    return issues;
  }

  const typed = content as unknown as PrdComicPanelsRoot;

  if (typed.profile !== "comic") {
    issues.push(
      makeIssue(
        "error",
        "comic-panels-profile-mismatch",
        "Comic panel metadata must declare `profile: \"comic\"`.",
        `${panelsPath}.profile`
      )
    );
  }

  if (!Array.isArray(typed.panels) || typed.panels.length === 0) {
    issues.push(
      makeIssue(
        "error",
        "comic-panels-required",
        "Comic panel metadata must include a non-empty `panels` array.",
        `${panelsPath}.panels`
      )
    );
    return issues;
  }

  const panelIds = new Set<string>();
  const declaredAssetsById = getDeclaredAssetMap(manifest);
  typed.panels.forEach((panel, index) => {
    if (!isObject(panel)) {
      issues.push(
        makeIssue(
          "error",
          "comic-panel-shape",
          "Comic panel items must be objects with at least `id`, `asset`, and `alt` fields.",
          `${panelsPath}.panels[${index}]`
        )
      );
      return;
    }

    if (!isNonEmptyString(panel.id)) {
      issues.push(
        makeIssue(
          "error",
          "comic-panel-id-required",
          "Comic panel items must include a non-empty `id` string.",
          `${panelsPath}.panels[${index}].id`
        )
      );
    } else if (panelIds.has(panel.id)) {
      issues.push(
        makeIssue(
          "error",
          "comic-panel-id-duplicate",
          `Comic panel id \`${panel.id}\` must be unique within the panel list.`,
          `${panelsPath}.panels[${index}].id`
        )
      );
    } else {
      panelIds.add(panel.id);
    }

    issues.push(
      ...validateDeclaredImageAssetReference(
        panel.asset,
        `${panelsPath}.panels[${index}].asset`,
        declaredAssetsById,
        "Comic panel",
        "comic-panel-asset-required",
        "comic-panel-asset-missing",
        "comic-panel-asset-image-required"
      )
    );

    if (!isNonEmptyString(panel.alt)) {
      issues.push(
        makeIssue(
          "error",
          "comic-panel-alt-required",
          "Comic panel items must include a non-empty `alt` string.",
          `${panelsPath}.panels[${index}].alt`
        )
      );
    }

    if (panel.caption !== undefined && !isNonEmptyString(panel.caption)) {
      issues.push(
        makeIssue(
          "error",
          "comic-panel-caption-shape",
          "Comic panel `caption` values must be non-empty strings when present.",
          `${panelsPath}.panels[${index}].caption`
        )
      );
    }
  });

  return issues;
}

function validateComicRoot(
  content: unknown,
  manifest: PrdManifest
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (!isObject(content)) {
    issues.push(
      makeIssue(
        "error",
        "comic-content-root-shape",
        "Structured comic roots must contain one JSON object at the root.",
        manifest.entry
      )
    );
    return issues;
  }

  const typed = content as unknown as PrdComicRoot;

  if (!isNonEmptyString(typed.schemaVersion)) {
    issues.push(
      makeIssue(
        "error",
        "comic-content-schema-version",
        "Structured comic roots must include a non-empty `schemaVersion` string.",
        `${manifest.entry}.schemaVersion`
      )
    );
  }

  if (typed.profile !== "comic") {
    issues.push(
      makeIssue(
        "error",
        "comic-content-profile-mismatch",
        "Structured comic roots must declare `profile: \"comic\"`.",
        `${manifest.entry}.profile`
      )
    );
  }

  if (typed.type !== "comic") {
    issues.push(
      makeIssue(
        "error",
        "comic-content-type-invalid",
        "Structured comic roots must declare `type: \"comic\"`.",
        `${manifest.entry}.type`
      )
    );
  }

  if (!isNonEmptyString(typed.id)) {
    issues.push(
      makeIssue(
        "error",
        "comic-content-id-required",
        "Structured comic roots must include a non-empty `id` string.",
        `${manifest.entry}.id`
      )
    );
  }

  if (!isNonEmptyString(typed.title)) {
    issues.push(
      makeIssue(
        "error",
        "comic-content-title-required",
        "Structured comic roots must include a non-empty `title` string.",
        `${manifest.entry}.title`
      )
    );
  }

  if (!Array.isArray(typed.panels) || typed.panels.length === 0) {
    issues.push(
      makeIssue(
        "error",
        "comic-content-panels-required",
        "Structured comic roots must include a non-empty `panels` array.",
        `${manifest.entry}.panels`
      )
    );
    return issues;
  }

  issues.push(
    ...validateComicPanels(
      {
        profile: "comic",
        panels: typed.panels
      },
      manifest,
      manifest.entry
    )
  );

  return issues;
}

function validateStoryboardFrames(
  content: unknown,
  manifest: PrdManifest,
  framesPath = STORYBOARD_FRAMES_PATH
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (!isObject(content)) {
    issues.push(
      makeIssue(
        "error",
        "storyboard-frames-root-shape",
        "Storyboard frame metadata must contain one JSON object at the root.",
        framesPath
      )
    );
    return issues;
  }

  const typed = content as unknown as PrdStoryboardFramesRoot;

  if (typed.profile !== "storyboard") {
    issues.push(
      makeIssue(
        "error",
        "storyboard-frames-profile-mismatch",
        "Storyboard frame metadata must declare `profile: \"storyboard\"`.",
        `${framesPath}.profile`
      )
    );
  }

  if (!Array.isArray(typed.frames) || typed.frames.length === 0) {
    issues.push(
      makeIssue(
        "error",
        "storyboard-frames-required",
        "Storyboard frame metadata must include a non-empty `frames` array.",
        `${framesPath}.frames`
      )
    );
    return issues;
  }

  const frameIds = new Set<string>();
  const declaredAssetsById = getDeclaredAssetMap(manifest);
  typed.frames.forEach((frame, index) => {
    if (!isObject(frame)) {
      issues.push(
        makeIssue(
          "error",
          "storyboard-frame-shape",
          "Storyboard frame items must be objects with at least `id`, `asset`, and `alt` fields.",
          `${framesPath}.frames[${index}]`
        )
      );
      return;
    }

    if (!isNonEmptyString(frame.id)) {
      issues.push(
        makeIssue(
          "error",
          "storyboard-frame-id-required",
          "Storyboard frame items must include a non-empty `id` string.",
          `${framesPath}.frames[${index}].id`
        )
      );
    } else if (frameIds.has(frame.id)) {
      issues.push(
        makeIssue(
          "error",
          "storyboard-frame-id-duplicate",
          `Storyboard frame id \`${frame.id}\` must be unique within the frame list.`,
          `${framesPath}.frames[${index}].id`
        )
      );
    } else {
      frameIds.add(frame.id);
    }

    issues.push(
      ...validateDeclaredImageAssetReference(
        frame.asset,
        `${framesPath}.frames[${index}].asset`,
        declaredAssetsById,
        "Storyboard frame",
        "storyboard-frame-asset-required",
        "storyboard-frame-asset-missing",
        "storyboard-frame-asset-image-required"
      )
    );

    if (!isNonEmptyString(frame.alt)) {
      issues.push(
        makeIssue(
          "error",
          "storyboard-frame-alt-required",
          "Storyboard frame items must include a non-empty `alt` string.",
          `${framesPath}.frames[${index}].alt`
        )
      );
    }

    if (frame.notes !== undefined && !isNonEmptyString(frame.notes)) {
      issues.push(
        makeIssue(
          "error",
          "storyboard-frame-notes-shape",
          "Storyboard frame `notes` values must be non-empty strings when present.",
          `${framesPath}.frames[${index}].notes`
        )
      );
    }
  });

  return issues;
}

function validateStoryboardRoot(
  content: unknown,
  manifest: PrdManifest
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (!isObject(content)) {
    issues.push(
      makeIssue(
        "error",
        "storyboard-content-root-shape",
        "Structured storyboard roots must contain one JSON object at the root.",
        manifest.entry
      )
    );
    return issues;
  }

  const typed = content as unknown as PrdStoryboardRoot;

  if (!isNonEmptyString(typed.schemaVersion)) {
    issues.push(
      makeIssue(
        "error",
        "storyboard-content-schema-version",
        "Structured storyboard roots must include a non-empty `schemaVersion` string.",
        `${manifest.entry}.schemaVersion`
      )
    );
  }

  if (typed.profile !== "storyboard") {
    issues.push(
      makeIssue(
        "error",
        "storyboard-content-profile-mismatch",
        "Structured storyboard roots must declare `profile: \"storyboard\"`.",
        `${manifest.entry}.profile`
      )
    );
  }

  if (typed.type !== "storyboard") {
    issues.push(
      makeIssue(
        "error",
        "storyboard-content-type-invalid",
        "Structured storyboard roots must declare `type: \"storyboard\"`.",
        `${manifest.entry}.type`
      )
    );
  }

  if (!isNonEmptyString(typed.id)) {
    issues.push(
      makeIssue(
        "error",
        "storyboard-content-id-required",
        "Structured storyboard roots must include a non-empty `id` string.",
        `${manifest.entry}.id`
      )
    );
  }

  if (!isNonEmptyString(typed.title)) {
    issues.push(
      makeIssue(
        "error",
        "storyboard-content-title-required",
        "Structured storyboard roots must include a non-empty `title` string.",
        `${manifest.entry}.title`
      )
    );
  }

  if (!Array.isArray(typed.frames) || typed.frames.length === 0) {
    issues.push(
      makeIssue(
        "error",
        "storyboard-content-frames-required",
        "Structured storyboard roots must include a non-empty `frames` array.",
        `${manifest.entry}.frames`
      )
    );
    return issues;
  }

  issues.push(
    ...validateStoryboardFrames(
      {
        profile: "storyboard",
        frames: typed.frames
      },
      manifest,
      manifest.entry
    )
  );

  return issues;
}

function validateLocalizedEntryContent(
  content: unknown,
  manifest: PrdManifest,
  normalizedProfile: string,
  entryPath: string,
  files: PrdFileMap,
  nodeRecords?: Map<string, GeneralDocumentNodeRecord>
): PrdValidationIssue[] {
  const localizedManifest: PrdManifest = {
    ...manifest,
    entry: entryPath
  };

  if (isObject(content) && isNonEmptyString(content.title)) {
    localizedManifest.title = content.title;
  }

  switch (normalizedProfile) {
    case "general-document":
      return validateGeneralDocumentContent(
        content,
        localizedManifest,
        files,
        nodeRecords
      );
    case "comic":
      return validateComicRoot(content, localizedManifest);
    case "storyboard":
      return validateStoryboardRoot(content, localizedManifest);
    default:
      return [];
  }
}

function validateLocalizedDocumentOverridesRoot(
  content: unknown,
  locale: string,
  resourcePath: string,
  baseNodeRecords: Map<string, GeneralDocumentNodeRecord>,
  manifest: PrdManifest
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];
  const declaredAssetsById = getDeclaredAssetMap(manifest);

  if (!isObject(content)) {
    issues.push(
      makeIssue(
        "error",
        "localized-document-overrides-root-shape",
        "Localized document override resources must contain one JSON object at the root.",
        resourcePath
      )
    );
    return issues;
  }

  const typed =
    content as Record<string, unknown> & Partial<PrdLocalizedDocumentOverridesRoot>;

  if (typed.type !== "localized-document-overrides") {
    issues.push(
      makeIssue(
        "error",
        "localized-document-overrides-type-invalid",
        "Localized document override resources must declare `type: \"localized-document-overrides\"`.",
        `${resourcePath}.type`
      )
    );
  }

  if (typed.locale !== locale) {
    issues.push(
      makeIssue(
        "error",
        "localized-document-overrides-locale-mismatch",
        `Localized document override resources must declare the same locale key as their descriptor (\`${locale}\`).`,
        `${resourcePath}.locale`
      )
    );
  }

  let hasLocalizedContent = false;

  if (typed.document !== undefined) {
    const documentPath = `${resourcePath}.document`;

    if (!isObject(typed.document)) {
      issues.push(
        makeIssue(
          "error",
          "localized-document-overrides-document-shape",
          "Localized document override `document` values must be objects when present.",
          documentPath
        )
      );
    } else {
      let hasDocumentField = false;
      const documentFields = [
        ["title", typed.document.title],
        ["subtitle", typed.document.subtitle],
        ["summary", typed.document.summary],
        ["lang", typed.document.lang]
      ] as const;

      for (const [field, value] of documentFields) {
        if (value === undefined) {
          continue;
        }

        hasDocumentField = true;
        if (!isNonEmptyString(value)) {
          issues.push(
            makeIssue(
              "error",
              `localized-document-overrides-document-${field}`,
              `Localized document override \`document.${field}\` values must be non-empty strings when present.`,
              `${documentPath}.${field}`
            )
          );
        }
      }

      if (!hasDocumentField) {
        issues.push(
          makeIssue(
            "error",
            "localized-document-overrides-document-empty",
            "Localized document override `document` objects must include at least one localized field.",
            documentPath
          )
        );
      } else {
        hasLocalizedContent = true;
      }
    }
  }

  if (typed.public !== undefined) {
    const publicPath = `${resourcePath}.public`;

    if (!isObject(typed.public)) {
      issues.push(
        makeIssue(
          "error",
          "localized-document-overrides-public-shape",
          "Localized document override `public` values must be objects when present.",
          publicPath
        )
      );
    } else {
      let hasPublicField = false;
      const publicFields = [
        ["subtitle", typed.public.subtitle],
        ["summary", typed.public.summary],
        ["byline", typed.public.byline],
        ["publisher", typed.public.publisher],
        ["cover", typed.public.cover]
      ] as const;

      for (const [field, value] of publicFields) {
        if (value === undefined) {
          continue;
        }

        hasPublicField = true;
        if (!isNonEmptyString(value)) {
          issues.push(
            makeIssue(
              "error",
              `localized-document-overrides-public-${field}`,
              `Localized document override \`public.${field}\` values must be non-empty strings when present.`,
              `${publicPath}.${field}`
            )
          );
        }
      }

      if (typed.public.series !== undefined) {
        hasPublicField = true;
        if (!isObject(typed.public.series) || !isNonEmptyString(typed.public.series.title)) {
          issues.push(
            makeIssue(
              "error",
              "localized-document-overrides-public-series-title",
              "Localized document override `public.series` must be an object with a non-empty `title`.",
              `${publicPath}.series.title`
            )
          );
        }
      }

      if (typed.public.collections !== undefined) {
        hasPublicField = true;

        if (
          !Array.isArray(typed.public.collections) ||
          typed.public.collections.length === 0
        ) {
          issues.push(
            makeIssue(
              "error",
              "localized-document-overrides-public-collections-shape",
              "Localized document override `public.collections` must be a non-empty array when present.",
              `${publicPath}.collections`
            )
          );
        } else {
          typed.public.collections.forEach((value, index) => {
            if (!isObject(value) || !isNonEmptyString(value.title)) {
              issues.push(
                makeIssue(
                  "error",
                  "localized-document-overrides-public-collection-title",
                  "Localized document override `public.collections` items must be objects with non-empty `title` strings.",
                  `${publicPath}.collections[${index}].title`
                )
              );
            }
          });
        }
      }

      if (isNonEmptyString(typed.public.cover)) {
        issues.push(
          ...validateOptionalPublicCoverReference(
            typed.public.cover,
            `${publicPath}.cover`,
            manifest,
            "localized-document-overrides-public-cover-asset-missing",
            "localized-document-overrides-public-cover-asset-image-required"
          )
        );
      }

      if (!hasPublicField) {
        issues.push(
          makeIssue(
            "error",
            "localized-document-overrides-public-empty",
            "Localized document override `public` objects must include at least one localized reader-facing metadata field.",
            publicPath
          )
        );
      } else {
        hasLocalizedContent = true;
      }
    }
  }

  if (typed.nodes !== undefined) {
    const nodesPath = `${resourcePath}.nodes`;

    if (!isObject(typed.nodes) || Object.keys(typed.nodes).length === 0) {
      issues.push(
        makeIssue(
          "error",
          "localized-document-overrides-nodes-shape",
          "Localized document override `nodes` values must be a non-empty object keyed by base node ids.",
          nodesPath
        )
      );
    } else {
      for (const [nodeId, value] of Object.entries(typed.nodes)) {
        const nodePath = `${nodesPath}.${nodeId}`;
        const baseRecord = baseNodeRecords.get(nodeId);

        if (!baseRecord) {
          issues.push(
            makeIssue(
              "error",
              "localized-document-overrides-node-missing",
              `Localized document override id \`${nodeId}\` does not exist in the base structured document.`,
              nodePath
            )
          );
          continue;
        }

        if (!isObject(value)) {
          issues.push(
            makeIssue(
              "error",
              "localized-document-overrides-node-shape",
              "Localized document node overrides must be objects with a matching `type` field.",
              nodePath
            )
          );
          continue;
        }

        if (value.type !== baseRecord.node.type) {
          issues.push(
            makeIssue(
              "error",
              "localized-document-overrides-node-type-mismatch",
              `Localized document node override \`${nodeId}\` must use type \`${baseRecord.node.type}\` to match the base node.`,
              `${nodePath}.type`
            )
          );
          continue;
        }

        let overrideFieldCount = 0;

        switch (baseRecord.node.type) {
          case "section":
            if (value.title !== undefined) {
              overrideFieldCount += 1;
              if (!isNonEmptyString(value.title)) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-section-title",
                    "Localized section `title` values must be non-empty strings when present.",
                    `${nodePath}.title`
                  )
                );
              }
            }
            break;

          case "heading":
          case "paragraph":
          case "quote":
            if (value.text !== undefined) {
              overrideFieldCount += 1;
              if (!isNonEmptyString(value.text)) {
                issues.push(
                  makeIssue(
                    "error",
                    `localized-document-overrides-${baseRecord.node.type}-text`,
                    `Localized ${baseRecord.node.type} \`text\` values must be non-empty strings when present.`,
                    `${nodePath}.text`
                  )
                );
              }
            }

            if (baseRecord.node.type === "quote" && value.attribution !== undefined) {
              overrideFieldCount += 1;
              if (!isNonEmptyString(value.attribution)) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-quote-attribution",
                    "Localized quote `attribution` values must be non-empty strings when present.",
                    `${nodePath}.attribution`
                  )
                );
              }
            }
            break;

          case "list":
            if (value.items !== undefined) {
              overrideFieldCount += 1;
              if (
                !Array.isArray(value.items) ||
                value.items.length !== baseRecord.node.items.length ||
                value.items.some((item) => !isNonEmptyString(item))
              ) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-list-items",
                    "Localized list `items` must be arrays of non-empty strings with the same length as the base list.",
                    `${nodePath}.items`
                  )
                );
              }
            }
            break;

          case "links":
            if (value.items !== undefined) {
              overrideFieldCount += 1;
              if (
                !Array.isArray(value.items) ||
                value.items.length !== baseRecord.node.items.length
              ) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-links-items-length",
                    "Localized link labels must preserve the same item count as the base links node.",
                    `${nodePath}.items`
                  )
                );
              } else {
                value.items.forEach((item, index) => {
                  if (!isObject(item) || !isNonEmptyString(item.label)) {
                    issues.push(
                      makeIssue(
                        "error",
                        "localized-document-overrides-links-item-label",
                        "Localized link override items must be objects with a non-empty `label` string.",
                        `${nodePath}.items[${index}].label`
                      )
                    );
                  }
                });
              }
            }
            break;

          case "table": {
            const baseColumnIds = new Set(baseRecord.node.columns.map((column) => column.id));

            if (value.caption !== undefined) {
              overrideFieldCount += 1;
              if (!isNonEmptyString(value.caption)) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-table-caption",
                    "Localized table `caption` values must be non-empty strings when present.",
                    `${nodePath}.caption`
                  )
                );
              }
            }

            if (value.columns !== undefined) {
              overrideFieldCount += 1;
              if (
                !Array.isArray(value.columns) ||
                value.columns.length !== baseRecord.node.columns.length
              ) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-table-columns",
                    "Localized table `columns` must preserve the same column count as the base table.",
                    `${nodePath}.columns`
                  )
                );
              } else {
                value.columns.forEach((column, index) => {
                  if (!isObject(column) || !isNonEmptyString(column.label)) {
                    issues.push(
                      makeIssue(
                        "error",
                        "localized-document-overrides-table-column-label",
                        "Localized table column overrides must be objects with non-empty `label` strings.",
                        `${nodePath}.columns[${index}].label`
                      )
                    );
                  }
                });
              }
            }

            if (value.rows !== undefined) {
              overrideFieldCount += 1;
              if (
                !Array.isArray(value.rows) ||
                value.rows.length !== baseRecord.node.rows.length
              ) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-table-rows-length",
                    "Localized table `rows` must preserve the same row count as the base table.",
                    `${nodePath}.rows`
                  )
                );
              } else {
                value.rows.forEach((row, rowIndex) => {
                  if (!isObject(row)) {
                    issues.push(
                      makeIssue(
                        "error",
                        "localized-document-overrides-table-row-shape",
                        "Localized table row overrides must be objects keyed by base column ids.",
                        `${nodePath}.rows[${rowIndex}]`
                      )
                    );
                    return;
                  }

                  for (const [columnId, cellValue] of Object.entries(row)) {
                    if (!baseColumnIds.has(columnId)) {
                      issues.push(
                        makeIssue(
                          "error",
                          "localized-document-overrides-table-row-column-unknown",
                          `Localized table row overrides must not introduce undeclared column id \`${columnId}\`.`,
                          `${nodePath}.rows[${rowIndex}].${columnId}`
                        )
                      );
                    }

                    if (typeof cellValue !== "string") {
                      issues.push(
                        makeIssue(
                          "error",
                          "localized-document-overrides-table-row-value",
                          "Localized table row values must be strings.",
                          `${nodePath}.rows[${rowIndex}].${columnId}`
                        )
                      );
                    }
                  }
                });
              }
            }

            break;
          }

          case "chart":
            if (value.title !== undefined) {
              overrideFieldCount += 1;
              if (!isNonEmptyString(value.title)) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-chart-title",
                    "Localized chart `title` values must be non-empty strings when present.",
                    `${nodePath}.title`
                  )
                );
              }
            }

            if (value.caption !== undefined) {
              overrideFieldCount += 1;
              if (!isNonEmptyString(value.caption)) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-chart-caption",
                    "Localized chart `caption` values must be non-empty strings when present.",
                    `${nodePath}.caption`
                  )
                );
              }
            }

            if (value.categories !== undefined) {
              overrideFieldCount += 1;
              if (
                !Array.isArray(value.categories) ||
                value.categories.length !== baseRecord.node.categories.length ||
                value.categories.some((category) => !isNonEmptyString(category))
              ) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-chart-categories",
                    "Localized chart `categories` must preserve the same length as the base chart and use non-empty strings.",
                    `${nodePath}.categories`
                  )
                );
              }
            }

            if (value.series !== undefined) {
              overrideFieldCount += 1;
              if (
                !Array.isArray(value.series) ||
                value.series.length !== baseRecord.node.series.length
              ) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-chart-series-length",
                    "Localized chart `series` must preserve the same series count as the base chart.",
                    `${nodePath}.series`
                  )
                );
              } else {
                value.series.forEach((series, index) => {
                  if (!isObject(series) || !isNonEmptyString(series.name)) {
                    issues.push(
                      makeIssue(
                        "error",
                        "localized-document-overrides-chart-series-name",
                        "Localized chart series overrides must be objects with non-empty `name` strings.",
                        `${nodePath}.series[${index}].name`
                      )
                    );
                  }
                });
              }
            }
            break;

          case "media":
            if (value.caption !== undefined) {
              overrideFieldCount += 1;
              if (!isNonEmptyString(value.caption)) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-media-caption",
                    "Localized media `caption` values must be non-empty strings when present.",
                    `${nodePath}.caption`
                  )
                );
              }
            }
            break;

          case "image":
            if (value.asset !== undefined) {
              overrideFieldCount += 1;
              if (!isNonEmptyString(value.asset)) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-image-asset",
                    "Localized image `asset` values must be non-empty declared asset ids when present.",
                    `${nodePath}.asset`
                  )
                );
              } else {
                const declaredAsset = declaredAssetsById.get(value.asset);
                if (!declaredAsset) {
                  issues.push(
                    makeIssue(
                      "error",
                      "localized-document-overrides-image-asset-missing",
                      `Localized image asset override references undeclared asset \`${value.asset}\`.`,
                      `${nodePath}.asset`
                    )
                  );
                } else if (!isSupportedImageAsset(declaredAsset)) {
                  issues.push(
                    makeIssue(
                      "error",
                      "localized-document-overrides-image-asset-image-required",
                      `Localized image asset override \`${value.asset}\` must resolve to a declared image asset.`,
                      `${nodePath}.asset`
                    )
                  );
                }
              }
            }

            if (value.alt !== undefined) {
              overrideFieldCount += 1;
              if (!isNonEmptyString(value.alt)) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-image-alt",
                    "Localized image `alt` values must be non-empty strings when present.",
                    `${nodePath}.alt`
                  )
                );
              }
            }

            if (value.caption !== undefined) {
              overrideFieldCount += 1;
              if (!isNonEmptyString(value.caption)) {
                issues.push(
                  makeIssue(
                    "error",
                    "localized-document-overrides-image-caption",
                    "Localized image `caption` values must be non-empty strings when present.",
                    `${nodePath}.caption`
                  )
                );
              }
            }
            break;
        }

        if (overrideFieldCount === 0) {
          issues.push(
            makeIssue(
              "error",
              "localized-document-overrides-node-empty",
              "Localized document node overrides must include at least one localized field for the matching node type.",
              nodePath
            )
          );
        } else {
          hasLocalizedContent = true;
        }
      }
    }
  }

  if (!hasLocalizedContent) {
    issues.push(
      makeIssue(
        "error",
        "localized-document-overrides-empty",
        "Localized document override resources must include localized `document` fields, localized `public` fields, localized `nodes`, or some combination of those surfaces.",
        resourcePath
      )
    );
  }

  return issues;
}

function validateLocalizedContentIndexRoot(
  content: unknown,
  manifest: PrdManifest,
  files: PrdFileMap,
  normalizedProfile: string,
  baseNodeRecords?: Map<string, GeneralDocumentNodeRecord>
): PrdValidationIssue[] {
  const issues: PrdValidationIssue[] = [];

  if (!manifest.localization) {
    issues.push(
      makeIssue(
        "error",
        "localized-content-index-without-localization",
        `\`${PRD_LOCALIZED_ENTRIES_PATH}\` requires a manifest \`localization\` declaration.`,
        PRD_LOCALIZED_ENTRIES_PATH
      )
    );
    return issues;
  }

  if (!isObject(content)) {
    issues.push(
      makeIssue(
        "error",
        "localized-content-index-root-shape",
        "Localized content indexes must contain one JSON object at the root.",
        PRD_LOCALIZED_ENTRIES_PATH
      )
    );
    return issues;
  }

  const typed = content as unknown as PrdLocalizedContentIndexRoot;
  if (typed.type !== "localized-content-index") {
    issues.push(
      makeIssue(
        "error",
        "localized-content-index-type-invalid",
        "Localized content indexes must declare `type: \"localized-content-index\"`.",
        `${PRD_LOCALIZED_ENTRIES_PATH}.type`
      )
    );
  }

  if (!isObject(typed.locales) || Object.keys(typed.locales).length === 0) {
    issues.push(
      makeIssue(
        "error",
        "localized-content-index-locales-required",
        "Localized content indexes must include a non-empty `locales` object.",
        `${PRD_LOCALIZED_ENTRIES_PATH}.locales`
      )
    );
    return issues;
  }

  const defaultLocale = manifest.localization.defaultLocale;
  const declaredLocales = new Set(
    manifest.localization.availableLocales?.filter(isNonEmptyString) ?? []
  );
  const mappedLocales = new Set<string>();

  for (const [locale, value] of Object.entries(typed.locales)) {
    const localePath = `${PRD_LOCALIZED_ENTRIES_PATH}.locales.${locale}`;

    if (!isNonEmptyString(locale)) {
      issues.push(
        makeIssue(
          "error",
          "localized-content-locale-key-invalid",
          "Localized content index keys must be non-empty locale strings.",
          localePath
        )
      );
      continue;
    }

    if (locale === defaultLocale) {
      issues.push(
        makeIssue(
          "error",
          "localized-content-default-locale-duplicate",
          "Localized content indexes must not redefine the manifest `defaultLocale`; use the manifest `entry` path for the default locale.",
          localePath
        )
      );
    }

    if (declaredLocales.size > 0 && !declaredLocales.has(locale)) {
      issues.push(
        makeIssue(
          "error",
          "localized-content-locale-undeclared",
          `Localized content locale \`${locale}\` must also appear in \`localization.availableLocales\`.`,
          localePath
        )
      );
    }

    mappedLocales.add(locale);

    if (!isObject(value)) {
      issues.push(
        makeIssue(
          "error",
          "localized-content-descriptor-shape",
          "Localized content descriptors must be objects with either a `resource` or `entry` field.",
          localePath
        )
      );
      continue;
    }

    const hasEntry = isNonEmptyString(value.entry);
    const hasResource = isNonEmptyString(value.resource);
    const entryPath =
      hasEntry && typeof value.entry === "string" ? value.entry.trim() : undefined;
    const resourcePath =
      hasResource && typeof value.resource === "string"
        ? value.resource.trim()
        : undefined;

    if (value.label !== undefined && !isNonEmptyString(value.label)) {
      issues.push(
        makeIssue(
          "error",
          "localized-content-label-shape",
          "Localized content `label` values must be non-empty strings when present.",
          `${localePath}.label`
        )
      );
    }

    if (value.entry !== undefined && !isNonEmptyString(value.entry)) {
      issues.push(
        makeIssue(
          "error",
          "localized-content-entry-path-required",
          "Localized content `entry` values must be non-empty strings when present.",
          `${localePath}.entry`
        )
      );
    }

    if (value.resource !== undefined && !isNonEmptyString(value.resource)) {
      issues.push(
        makeIssue(
          "error",
          "localized-content-resource-path-required",
          "Localized content `resource` values must be non-empty strings when present.",
          `${localePath}.resource`
        )
      );
    }

    if (!hasEntry && !hasResource) {
      issues.push(
        makeIssue(
          "error",
          "localized-content-target-required",
          "Localized content descriptors must include either a `resource` or `entry` path.",
          localePath
        )
      );
      continue;
    }

    let localizedEntryNodeRecords:
      | Map<string, GeneralDocumentNodeRecord>
      | undefined;

    if (entryPath) {
      if (!isJsonEntryPath(entryPath) || !STRUCTURED_CONTENT_ENTRY_PATTERN.test(entryPath)) {
        issues.push(
          makeIssue(
            "error",
            "localized-content-entry-path-format",
            "Localized content `entry` paths must resolve to structured JSON content under `content/`.",
            `${localePath}.entry`
          )
        );
        continue;
      }

      if (entryPath === manifest.entry) {
        issues.push(
          makeIssue(
            "error",
            "localized-content-entry-duplicates-default-path",
            "Localized content `entry` paths must not duplicate the manifest `entry` path.",
            `${localePath}.entry`
          )
        );
      }

      const localizedEntryFile = files[entryPath];
      if (!localizedEntryFile) {
        issues.push(
          makeIssue(
            "error",
            "localized-content-entry-missing",
            `Localized content entry path \`${entryPath}\` does not exist in the package.`,
            `${localePath}.entry`
          )
        );
        continue;
      }

      let localizedContent: unknown;
      try {
        localizedContent = JSON.parse(strFromU8(localizedEntryFile));
      } catch {
        issues.push(
          makeIssue(
            "error",
            "localized-content-entry-json-invalid",
            "Localized content entry paths must parse as valid JSON structured content.",
            entryPath
          )
        );
        continue;
      }

      if (normalizedProfile === "general-document") {
        localizedEntryNodeRecords = new Map<string, GeneralDocumentNodeRecord>();
      }

      issues.push(
        ...validateLocalizedEntryContent(
          localizedContent,
          manifest,
          normalizedProfile,
          entryPath,
          files,
          localizedEntryNodeRecords
        )
      );
    }

    if (resourcePath) {
      if (normalizedProfile !== "general-document") {
        issues.push(
          makeIssue(
            "error",
            "localized-content-resource-profile-unsupported",
            "Localized content `resource` paths are currently only supported for `general-document` packages.",
            `${localePath}.resource`
          )
        );
        continue;
      }

      if (
        !isJsonEntryPath(resourcePath) ||
        !STRUCTURED_CONTENT_ENTRY_PATTERN.test(resourcePath)
      ) {
        issues.push(
          makeIssue(
            "error",
            "localized-content-resource-path-format",
            "Localized content `resource` paths must resolve to JSON files under `content/`.",
            `${localePath}.resource`
          )
        );
        continue;
      }

      if (resourcePath === manifest.entry) {
        issues.push(
          makeIssue(
            "error",
            "localized-content-resource-duplicates-default-path",
            "Localized content `resource` paths must not duplicate the manifest `entry` path.",
            `${localePath}.resource`
          )
        );
      }

      const localizedResourceFile = files[resourcePath];
      if (!localizedResourceFile) {
        issues.push(
          makeIssue(
            "error",
            "localized-content-resource-missing",
            `Localized content resource path \`${resourcePath}\` does not exist in the package.`,
            `${localePath}.resource`
          )
        );
        continue;
      }

      let localizedResourceContent: unknown;
      try {
        localizedResourceContent = JSON.parse(strFromU8(localizedResourceFile));
      } catch {
        issues.push(
          makeIssue(
            "error",
            "localized-content-resource-json-invalid",
            "Localized content resource paths must parse as valid JSON.",
            resourcePath
          )
        );
        continue;
      }

      if (baseNodeRecords) {
        const localizedBaseNodeRecords =
          entryPath && localizedEntryNodeRecords !== undefined
            ? localizedEntryNodeRecords
            : baseNodeRecords;

        issues.push(
          ...validateLocalizedDocumentOverridesRoot(
            localizedResourceContent,
            locale,
            resourcePath,
            localizedBaseNodeRecords,
            manifest
          )
        );
      }
    }
  }

  for (const locale of declaredLocales) {
    if (locale !== defaultLocale && !mappedLocales.has(locale)) {
      issues.push(
        makeIssue(
          "warning",
          "localized-content-locale-unmapped",
          `Declared locale \`${locale}\` does not have a corresponding localized content mapping in \`${PRD_LOCALIZED_ENTRIES_PATH}\`.`,
          `${PRD_LOCALIZED_ENTRIES_PATH}.locales`
        )
      );
    }
  }

  return issues;
}

export function validateManifestObject(manifest: unknown): PrdPackageValidationResult {
  return validateManifestObjectInternal(manifest);
}

export function validatePackage(files: PrdFileMap): PrdPackageValidationResult {
  const errors: PrdValidationIssue[] = [];
  const warnings: PrdValidationIssue[] = [];
  const manifestBytes = files["manifest.json"];

  if (!manifestBytes) {
    errors.push(
      makeIssue(
        "error",
        "manifest-missing",
        "`manifest.json` must exist at the archive or package root.",
        "manifest.json"
      )
    );
    return { valid: false, errors, warnings };
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(strFromU8(manifestBytes));
  } catch {
    errors.push(
      makeIssue(
        "error",
        "manifest-json-invalid",
        "`manifest.json` must parse as valid JSON.",
        "manifest.json"
      )
    );
    return { valid: false, errors, warnings };
  }

  const manifestResult = validateManifestObjectInternal(manifest);
  errors.push(...manifestResult.errors);
  warnings.push(...manifestResult.warnings);

  if (!manifestResult.manifest || !manifestResult.profileInfo) {
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  const manifestObject = manifestResult.manifest;
  const profileInfo = manifestResult.profileInfo;

  const entryPath = manifestObject.entry;
  const entryFile = files[entryPath];
  let baseGeneralDocumentNodeRecords:
    | Map<string, GeneralDocumentNodeRecord>
    | undefined;

  if (!entryFile) {
    errors.push(
      makeIssue(
        "error",
        "entry-missing",
        `The manifest entry path \`${entryPath}\` does not exist in the package.`,
        "entry"
      )
    );
  }

  errors.push(...validateDeclaredAssetsPresent(files, manifestObject));
  errors.push(...validateDeclaredAttachmentsPresent(files, manifestObject));

  if (manifestObject.public?.cover !== undefined) {
    errors.push(
      ...validateOptionalPublicCoverReference(
        manifestObject.public.cover,
        "public.cover",
        manifestObject,
        "public-cover-asset-missing",
        "public-cover-asset-image-required"
      )
    );
  }

  if (entryFile && profileInfo.normalized === "general-document") {
    let content: unknown;

    try {
      content = JSON.parse(strFromU8(entryFile));
    } catch {
      errors.push(
        makeIssue(
          "error",
          "content-json-invalid",
          "The `general-document` entry must parse as valid JSON structured content.",
          entryPath
        )
      );
      return {
        valid: false,
        errors,
        warnings,
        manifest: manifestObject,
        profileInfo
      };
    }

    baseGeneralDocumentNodeRecords = new Map<string, GeneralDocumentNodeRecord>();

    for (const issue of validateGeneralDocumentContent(
      content,
      manifestObject,
      files,
      baseGeneralDocumentNodeRecords
    )) {
      (issue.severity === "error" ? errors : warnings).push(issue);
    }
  }

  if (
    entryFile &&
    profileInfo.normalized === "comic" &&
    isJsonEntryPath(entryPath)
  ) {
    let content: unknown;

    try {
      content = JSON.parse(strFromU8(entryFile));
    } catch {
      errors.push(
        makeIssue(
          "error",
          "comic-content-json-invalid",
          "The canonical `comic` entry must parse as valid JSON structured content.",
          entryPath
        )
      );
      return {
        valid: false,
        errors,
        warnings,
        manifest: manifestObject,
        profileInfo
      };
    }

    errors.push(...validateComicRoot(content, manifestObject));
  }

  if (
    entryFile &&
    profileInfo.normalized === "storyboard" &&
    isJsonEntryPath(entryPath)
  ) {
    let content: unknown;

    try {
      content = JSON.parse(strFromU8(entryFile));
    } catch {
      errors.push(
        makeIssue(
          "error",
          "storyboard-content-json-invalid",
          "The canonical `storyboard` entry must parse as valid JSON structured content.",
          entryPath
        )
      );
      return {
        valid: false,
        errors,
        warnings,
        manifest: manifestObject,
        profileInfo
      };
    }

    errors.push(...validateStoryboardRoot(content, manifestObject));
  }

  const localizedEntriesFile = files[PRD_LOCALIZED_ENTRIES_PATH];
  const hasDeclaredAlternateLocales =
    manifestObject.localization !== undefined &&
    Array.isArray(manifestObject.localization.availableLocales) &&
    manifestObject.localization.availableLocales.some(
      (locale) => locale !== manifestObject.localization?.defaultLocale
    );

  if (localizedEntriesFile) {
    let localizedEntriesContent: unknown;

    try {
      localizedEntriesContent = JSON.parse(strFromU8(localizedEntriesFile));
    } catch {
      errors.push(
        makeIssue(
          "error",
          "localized-content-index-json-invalid",
          `\`${PRD_LOCALIZED_ENTRIES_PATH}\` must parse as valid JSON.`,
          PRD_LOCALIZED_ENTRIES_PATH
        )
      );
      return {
        valid: false,
        errors,
        warnings,
        manifest: manifestObject,
        profileInfo
      };
    }

    for (const issue of validateLocalizedContentIndexRoot(
      localizedEntriesContent,
      manifestObject,
      files,
      profileInfo.normalized,
      baseGeneralDocumentNodeRecords
    )) {
      (issue.severity === "error" ? errors : warnings).push(issue);
    }
  } else if (hasDeclaredAlternateLocales) {
    warnings.push(
      makeIssue(
        "warning",
        "localized-content-index-missing",
        `\`localization.availableLocales\` declares alternate locales, but \`${PRD_LOCALIZED_ENTRIES_PATH}\` was not found. Viewers may only be able to open the default locale path.`,
        PRD_LOCALIZED_ENTRIES_PATH
      )
    );
  }

  if (
    profileInfo.normalized === "comic" &&
    isHtmlEntryPath(entryPath)
  ) {
    const comicPanelsFile = files[COMIC_PANELS_PATH];

    if (comicPanelsFile) {
      let panelsContent: unknown;

      try {
        panelsContent = JSON.parse(strFromU8(comicPanelsFile));
      } catch {
        errors.push(
          makeIssue(
            "error",
            "comic-panels-json-invalid",
            "Comic panel metadata must parse as valid JSON.",
            COMIC_PANELS_PATH
          )
        );
        return {
          valid: false,
          errors,
          warnings,
          manifest: manifestObject,
          profileInfo
        };
      }

      errors.push(
        ...validateComicPanels(
          panelsContent,
          manifestObject,
          COMIC_PANELS_PATH
        )
      );
    }
  }

  if (
    profileInfo.normalized === "storyboard" &&
    isHtmlEntryPath(entryPath)
  ) {
    const storyboardFramesFile = files[STORYBOARD_FRAMES_PATH];

    if (storyboardFramesFile) {
      let framesContent: unknown;

      try {
        framesContent = JSON.parse(strFromU8(storyboardFramesFile));
      } catch {
        errors.push(
          makeIssue(
            "error",
            "storyboard-frames-json-invalid",
            "Storyboard frame metadata must parse as valid JSON.",
            STORYBOARD_FRAMES_PATH
          )
        );
        return {
          valid: false,
          errors,
          warnings,
          manifest: manifestObject,
          profileInfo
        };
      }

      errors.push(
        ...validateStoryboardFrames(
          framesContent,
          manifestObject,
          STORYBOARD_FRAMES_PATH
        )
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest: manifestObject,
    profileInfo
  };
}

export function validatePackageFiles(files: PrdFileMap): PrdPackageValidationResult {
  return validatePackage(files);
}
