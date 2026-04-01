export const PRD_CANONICAL_DIRECTORIES = [
  "content",
  "assets",
  "profiles",
  "extensions",
  "protected"
] as const;

export const PRD_CANONICAL_CORE_PROFILE_IDS = [
  "general-document",
  "comic",
  "storyboard"
] as const;

export const PRD_IMPLEMENTATION_SUPPORTED_PROFILE_IDS = ["resume"] as const;

export const PRD_LEGACY_PROFILE_ALIASES = {
  "responsive-document": "general-document"
} as const;

export type PrdCanonicalDirectory = (typeof PRD_CANONICAL_DIRECTORIES)[number];
export type PrdCanonicalCoreProfileId =
  (typeof PRD_CANONICAL_CORE_PROFILE_IDS)[number];
export type PrdImplementationSupportedProfileId =
  (typeof PRD_IMPLEMENTATION_SUPPORTED_PROFILE_IDS)[number];
export type PrdKnownProfileId =
  | PrdCanonicalCoreProfileId
  | PrdImplementationSupportedProfileId;
export type PrdTextDirection = "ltr" | "rtl" | "auto";
export type MaybePromise<T> = T | Promise<T>;

export type PrdProfileSupportClass =
  | "canonical-core"
  | "implementation-supported"
  | "legacy-alias"
  | "community-custom"
  | "unknown";

export type PrdViewerSupportState =
  | "fully-supported"
  | "partially-supported"
  | "safe-mode"
  | "static-fallback"
  | "protected-unavailable"
  | "unsupported-extension-ignored"
  | "unsupported-required-capability"
  | "reserved-profile";

export interface PrdLocalization {
  defaultLocale: string;
  availableLocales?: string[];
  textDirection?: PrdTextDirection;
}

export interface PrdCapabilityLists {
  required?: string[];
  optional?: string[];
}

export interface PrdCompatibility {
  minViewer?: string;
  capabilities?: string[] | PrdCapabilityLists;
  [key: string]: unknown;
}

export interface PrdExtensionDeclaration {
  id: string;
  version?: string;
  required?: boolean;
  ref?: string;
  [key: string]: unknown;
}

export interface PrdAssetDeclaration {
  id?: string;
  href: string;
  type?: string;
  [key: string]: unknown;
}

export interface PrdAttachmentDeclaration {
  href: string;
  id?: string;
  type?: string;
  [key: string]: unknown;
}

export interface PrdProtectedDeclaration {
  present?: boolean;
  ref?: string;
  [key: string]: unknown;
}

export interface PrdManifest {
  prdVersion: string;
  manifestVersion: string;
  id: string;
  profile: string;
  title: string;
  entry: string;
  profileVersion?: string;
  public?: Record<string, unknown>;
  compatibility?: PrdCompatibility;
  assets?: PrdAssetDeclaration[] | Record<string, unknown>;
  attachments?: PrdAttachmentDeclaration[];
  localization?: PrdLocalization;
  extensions?: PrdExtensionDeclaration[] | Record<string, unknown>;
  protected?: PrdProtectedDeclaration;
  [key: string]: unknown;
}

export interface PrdValidationIssue {
  code: string;
  message: string;
  path?: string;
  severity: "error" | "warning";
}

export interface PrdValidationResult {
  valid: boolean;
  errors: PrdValidationIssue[];
  warnings: PrdValidationIssue[];
}

export interface PrdNormalizedProfileInfo {
  input: string;
  normalized: string;
  supportClass: PrdProfileSupportClass;
  canonical: boolean;
  supportedByReference: boolean;
  aliasUsed: boolean;
}

export interface PrdPackageReader {
  has(path: string): MaybePromise<boolean>;
  readText(path: string): MaybePromise<string>;
  readBinary(path: string): MaybePromise<Uint8Array>;
}

export interface PrdOpenedDocument {
  manifest: PrdManifest;
  profileInfo: PrdNormalizedProfileInfo;
  supportState: PrdViewerSupportState;
  entryPath: string;
  entryHtml?: string;
  localization?: PrdLocalization;
  message?: string;
}

export function isCanonicalCoreProfileId(
  profile: string
): profile is PrdCanonicalCoreProfileId {
  return PRD_CANONICAL_CORE_PROFILE_IDS.includes(
    profile as PrdCanonicalCoreProfileId
  );
}

export function isImplementationSupportedProfileId(
  profile: string
): profile is PrdImplementationSupportedProfileId {
  return PRD_IMPLEMENTATION_SUPPORTED_PROFILE_IDS.includes(
    profile as PrdImplementationSupportedProfileId
  );
}

export function isKnownProfileId(profile: string): profile is PrdKnownProfileId {
  return (
    isCanonicalCoreProfileId(profile) ||
    isImplementationSupportedProfileId(profile)
  );
}

export function isNamespacedCustomProfile(profile: string): boolean {
  return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(profile);
}

export function normalizeProfileId(profile: string): PrdNormalizedProfileInfo {
  const aliasTarget =
    PRD_LEGACY_PROFILE_ALIASES[
      profile as keyof typeof PRD_LEGACY_PROFILE_ALIASES
    ];

  if (aliasTarget) {
    return {
      input: profile,
      normalized: aliasTarget,
      supportClass: "legacy-alias",
      canonical: true,
      supportedByReference: true,
      aliasUsed: true
    };
  }

  if (isCanonicalCoreProfileId(profile)) {
    return {
      input: profile,
      normalized: profile,
      supportClass: "canonical-core",
      canonical: true,
      supportedByReference: true,
      aliasUsed: false
    };
  }

  if (isImplementationSupportedProfileId(profile)) {
    return {
      input: profile,
      normalized: profile,
      supportClass: "implementation-supported",
      canonical: false,
      supportedByReference: true,
      aliasUsed: false
    };
  }

  if (isNamespacedCustomProfile(profile)) {
    return {
      input: profile,
      normalized: profile,
      supportClass: "community-custom",
      canonical: false,
      supportedByReference: false,
      aliasUsed: false
    };
  }

  return {
    input: profile,
    normalized: profile,
    supportClass: "unknown",
    canonical: false,
    supportedByReference: false,
    aliasUsed: false
  };
}

export function getProfileDisplayLabel(profile: string): string {
  const normalized = normalizeProfileId(profile).normalized;
  switch (normalized) {
    case "general-document":
      return "Document";
    case "resume":
      return "Resume";
    case "comic":
      return "Comic";
    case "storyboard":
      return "Storyboard";
    default:
      return normalized;
  }
}

export function isHtmlEntryPath(path: string): boolean {
  return path.endsWith(".html") || path.endsWith(".htm");
}
