import { strFromU8 } from "fflate";
import {
  type PrdAssetDeclaration,
  type PrdCompatibility,
  type PrdLocalization,
  type PrdManifest,
  type PrdNormalizedProfileInfo,
  type PrdValidationIssue,
  type PrdValidationResult,
  normalizeProfileId
} from "@prd/types";

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

interface GeneralDocumentSectionNode {
  type: "section";
  id: string;
  title: string;
  children: GeneralDocumentNode[];
}

interface GeneralDocumentHeadingNode {
  type: "heading";
  level: number;
  text: string;
}

interface GeneralDocumentParagraphNode {
  type: "paragraph";
  text: string;
}

interface GeneralDocumentListNode {
  type: "list";
  style: "unordered" | "ordered";
  items: string[];
}

interface GeneralDocumentImageNode {
  type: "image";
  asset: string;
  alt: string;
  caption?: string;
}

interface GeneralDocumentQuoteNode {
  type: "quote";
  text: string;
  attribution?: string;
}

const GENERAL_DOCUMENT_ENTRY_PATTERN = /^content\/.+\.json$/;

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

function validateAssetsDeclaration(assets: unknown): PrdValidationIssue[] {
  if (isObject(assets)) {
    return [];
  }

  if (!Array.isArray(assets)) {
    return [
      makeIssue(
        "error",
        "assets-shape",
        "`assets` must be an array or object when present.",
        "assets"
      )
    ];
  }

  const issues: PrdValidationIssue[] = [];

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
          `${field}-required`,
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
    warnings.push(
      makeIssue(
        "warning",
        "profile-unknown",
        `Profile \`${profileInfo.input}\` is not recognized as canonical, implementation-supported, or namespaced custom.`,
        "profile"
      )
    );
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
    !GENERAL_DOCUMENT_ENTRY_PATTERN.test(manifestObject.entry)
  ) {
    errors.push(
      makeIssue(
        "error",
        "general-document-entry-format",
        "`general-document` packages must use a structured JSON entry under `content/`, such as `content/root.json`.",
        "entry"
      )
    );
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

  if (manifestObject.public !== undefined && !isObject(manifestObject.public)) {
    errors.push(
      makeIssue(
        "error",
        "public-shape",
        "`public` must be an object when present.",
        "public"
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

  if (
    manifestObject.attachments !== undefined &&
    (!Array.isArray(manifestObject.attachments) ||
      manifestObject.attachments.some((value) => !isObject(value)))
  ) {
    errors.push(
      makeIssue(
        "error",
        "attachments-shape",
        "`attachments` must be an array of objects when present.",
        "attachments"
      )
    );
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

function validateContentNode(
  node: unknown,
  path: string,
  assetIds: Set<string>
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
        issues.push(...validateContentNode(child, `${path}.children[${index}]`, assetIds));
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
  manifest: PrdManifest
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
    issues.push(...validateContentNode(child, `${manifest.entry}.children[${index}]`, assetIds));
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

  const entryPath = manifestResult.manifest.entry;
  const entryFile = files[entryPath];

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

  errors.push(...validateDeclaredAssetsPresent(files, manifestResult.manifest));

  if (entryFile && manifestResult.profileInfo.normalized === "general-document") {
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
        manifest: manifestResult.manifest,
        profileInfo: manifestResult.profileInfo
      };
    }

    for (const issue of validateGeneralDocumentContent(content, manifestResult.manifest)) {
      (issue.severity === "error" ? errors : warnings).push(issue);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest: manifestResult.manifest,
    profileInfo: manifestResult.profileInfo
  };
}

export function validatePackageFiles(files: PrdFileMap): PrdPackageValidationResult {
  return validatePackage(files);
}
