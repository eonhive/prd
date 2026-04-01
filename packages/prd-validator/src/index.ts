import { strFromU8 } from "fflate";
import {
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

  if (typeof typed.defaultLocale !== "string" || typed.defaultLocale.length === 0) {
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
      typed.availableLocales.some((value) => typeof value !== "string"))
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

  if (
    typed.minViewer !== undefined &&
    typeof typed.minViewer !== "string"
  ) {
    issues.push(
      makeIssue(
        "error",
        "compatibility-min-viewer",
        "`compatibility.minViewer` must be a string when present.",
        "compatibility.minViewer"
      )
    );
  }

  if (typed.capabilities !== undefined) {
    if (Array.isArray(typed.capabilities)) {
      if (typed.capabilities.some((value) => typeof value !== "string")) {
        issues.push(
          makeIssue(
            "error",
            "compatibility-capabilities-array",
            "`compatibility.capabilities` arrays must contain only strings.",
            "compatibility.capabilities"
          )
        );
      }
    } else if (isObject(typed.capabilities)) {
      const required = typed.capabilities.required;
      const optional = typed.capabilities.optional;

      if (
        required !== undefined &&
        (!Array.isArray(required) || required.some((value) => typeof value !== "string"))
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
        (!Array.isArray(optional) || optional.some((value) => typeof value !== "string"))
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
    } else {
      issues.push(
        makeIssue(
          "error",
          "compatibility-capabilities-shape",
          "`compatibility.capabilities` must be an array of strings or an object with `required`/`optional` arrays.",
          "compatibility.capabilities"
        )
      );
    }
  }

  return issues;
}

function validateOptionalObjectOrArray(
  fieldName: "assets" | "extensions",
  value: unknown
): PrdValidationIssue[] {
  if (Array.isArray(value) || isObject(value)) {
    return [];
  }

  return [
    makeIssue(
      "error",
      `${fieldName}-shape`,
      `\`${fieldName}\` must be an array or object when present.`,
      fieldName
    )
  ];
}

function validateManifestObjectInternal(
  manifest: unknown
): PrdPackageValidationResult {
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
    if (typeof candidate[field] !== "string") {
      errors.push(
        makeIssue(
          "error",
          `${field}-required`,
          `\`${field}\` must exist and be a string.`,
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

  for (const issue of validateEntryPath(manifestObject.entry)) {
    errors.push(issue);
  }

  if (
    manifestObject.profileVersion !== undefined &&
    typeof manifestObject.profileVersion !== "string"
  ) {
    errors.push(
      makeIssue(
        "error",
        "profile-version-shape",
        "`profileVersion` must be a string when present.",
        "profileVersion"
      )
    );
  }

  if (
    manifestObject.public !== undefined &&
    !isObject(manifestObject.public)
  ) {
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
    for (const issue of validateLocalization(manifestObject.localization)) {
      (issue.severity === "error" ? errors : warnings).push(issue);
    }
  }

  if (manifestObject.compatibility !== undefined) {
    for (const issue of validateCompatibility(manifestObject.compatibility)) {
      (issue.severity === "error" ? errors : warnings).push(issue);
    }
  }

  if (manifestObject.assets !== undefined) {
    errors.push(...validateOptionalObjectOrArray("assets", manifestObject.assets));
  }

  if (manifestObject.extensions !== undefined) {
    errors.push(
      ...validateOptionalObjectOrArray("extensions", manifestObject.extensions)
    );
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

  if (
    manifestObject.protected !== undefined &&
    !isObject(manifestObject.protected)
  ) {
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

export function validateManifestObject(
  manifest: unknown
): PrdPackageValidationResult {
  return validateManifestObjectInternal(manifest);
}

export function validatePackageFiles(
  files: PrdFileMap
): PrdPackageValidationResult {
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

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest: manifestResult.manifest,
    profileInfo: manifestResult.profileInfo
  };
}
