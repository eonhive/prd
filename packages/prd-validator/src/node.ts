import { readFile, stat } from "node:fs/promises";
import { strFromU8 } from "fflate";
import { assertPrdArchiveSize, PrdContainerError, readPrdArchive, type PrdArchiveLimits } from "./container.js";
import { PrdDirectoryError, readPackageDirectory, type PrdDirectoryLimits } from "./directory.js";
import {
  PRD_LOCALIZED_ENTRIES_PATH,
  type PrdReferenceLoadMode,
  isHtmlEntryPath,
  isJsonEntryPath
} from "@eonhive/prd-types";
import {
  validatePackage as validatePackageFiles,
  type PrdFileMap,
  type PrdPackageValidationResult
} from "./index.js";

export { PRD_DEFAULT_DIRECTORY_LIMITS, PrdDirectoryError, readPackageDirectory, type PrdDirectoryLimits } from "./directory.js";

export type PrdInspectionSourceKind = "directory" | "archive";
export type PrdInspectionEntryKind =
  | "structured-json"
  | "html-fallback"
  | "unsupported";
export type PrdInspectionSegmentation = "none" | "general-document-sections";

export interface PrdPackageInspectionResult extends PrdPackageValidationResult {
  sourceKind: PrdInspectionSourceKind;
  fileCount: number;
  totalBytes: number;
  assetCount: number;
  attachmentCount: number;
  localeCount: number;
  hasSeriesMembership: boolean;
  collectionCount: number;
  entryKind: PrdInspectionEntryKind;
  segmentation: PrdInspectionSegmentation;
  localizedResources: boolean;
  localizedAlternateEntries: boolean;
  referenceLoadMode: PrdReferenceLoadMode;
}

function invalidResult(code: string, message: string, path: string): PrdPackageValidationResult {
  return {
    valid: false,
    errors: [{ code, message, path, severity: "error" }],
    warnings: []
  };
}

function inferSourceKind(targetPath: string): PrdInspectionSourceKind {
  return targetPath.endsWith(".prd") ? "archive" : "directory";
}

function parseLocalizedContentIndex(
  files: PrdFileMap
): Pick<
  PrdPackageInspectionResult,
  "localizedResources" | "localizedAlternateEntries"
> {
  const localizedIndexBytes = files[PRD_LOCALIZED_ENTRIES_PATH];
  if (!localizedIndexBytes) {
    return {
      localizedResources: false,
      localizedAlternateEntries: false
    };
  }

  try {
    const parsed = JSON.parse(strFromU8(localizedIndexBytes)) as {
      locales?: Record<string, { entry?: unknown; resource?: unknown }>;
    };
    const descriptors =
      parsed && typeof parsed === "object" && parsed.locales && typeof parsed.locales === "object"
        ? Object.values(parsed.locales)
        : [];

    return {
      localizedResources: descriptors.some(
        (descriptor) =>
          descriptor !== null &&
          typeof descriptor === "object" &&
          typeof descriptor.resource === "string" &&
          descriptor.resource.length > 0
      ),
      localizedAlternateEntries: descriptors.some(
        (descriptor) =>
          descriptor !== null &&
          typeof descriptor === "object" &&
          typeof descriptor.entry === "string" &&
          descriptor.entry.length > 0
      )
    };
  } catch {
    return {
      localizedResources: false,
      localizedAlternateEntries: false
    };
  }
}

function inferEntryKind(entryPath: string | undefined): PrdInspectionEntryKind {
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

function inferSegmentation(
  files: PrdFileMap,
  validation: PrdPackageValidationResult
): PrdInspectionSegmentation {
  if (
    validation.manifest?.profile !== "general-document" ||
    !validation.manifest.entry ||
    !isJsonEntryPath(validation.manifest.entry)
  ) {
    return "none";
  }

  const entryBytes = files[validation.manifest.entry];
  if (!entryBytes) {
    return "none";
  }

  try {
    const parsed = JSON.parse(strFromU8(entryBytes)) as {
      children?: unknown[];
    };

    if (!Array.isArray(parsed.children)) {
      return "none";
    }

    return parsed.children.some(
      (child) =>
        child !== null &&
        typeof child === "object" &&
        "type" in child &&
        child.type === "section" &&
        "src" in child &&
        typeof child.src === "string" &&
        child.src.length > 0
    )
      ? "general-document-sections"
      : "none";
  } catch {
    return "none";
  }
}

function buildInspectionResult(
  validation: PrdPackageValidationResult,
  files: PrdFileMap,
  sourceKind: PrdInspectionSourceKind
): PrdPackageInspectionResult {
  const fileEntries = Object.entries(files);
  const localeValues = new Set<string>();
  const localization = validation.manifest?.localization;

  if (localization?.defaultLocale) {
    localeValues.add(localization.defaultLocale);
  }

  for (const locale of localization?.availableLocales ?? []) {
    localeValues.add(locale);
  }

  return {
    ...validation,
    sourceKind,
    fileCount: fileEntries.length,
    totalBytes: fileEntries.reduce((total, [, value]) => total + value.byteLength, 0),
    assetCount: validation.manifest?.assets?.length ?? 0,
    attachmentCount: validation.manifest?.attachments?.length ?? 0,
    localeCount: localeValues.size,
    hasSeriesMembership:
      typeof validation.manifest?.identity?.series?.ref === "string" &&
      validation.manifest.identity.series.ref.length > 0,
    collectionCount: Array.isArray(validation.manifest?.identity?.collections)
      ? validation.manifest.identity.collections.length
      : 0,
    entryKind: inferEntryKind(validation.manifest?.entry),
    segmentation: inferSegmentation(files, validation),
    ...parseLocalizedContentIndex(files),
    referenceLoadMode: "eager-whole-package"
  };
}

function buildInvalidInspectionResult(
  sourceKind: PrdInspectionSourceKind,
  code: string,
  message: string,
  path: string
): PrdPackageInspectionResult {
  return buildInspectionResult(invalidResult(code, message, path), {}, sourceKind);
}

export async function validatePackageDirectory(
  directoryPath: string,
  limits: Partial<PrdDirectoryLimits> = {}
): Promise<PrdPackageValidationResult> {
  try {
    return validatePackageFiles(await readPackageDirectory(directoryPath, limits));
  } catch (error) {
    if (!(error instanceof PrdDirectoryError)) throw error;
    return invalidResult(error.code, error.message, directoryPath);
  }
}

export async function inspectPackageDirectory(
  directoryPath: string,
  limits: Partial<PrdDirectoryLimits> = {}
): Promise<PrdPackageInspectionResult> {
  try {
    const files = await readPackageDirectory(directoryPath, limits);
    return buildInspectionResult(validatePackageFiles(files), files, "directory");
  } catch (error) {
    if (!(error instanceof PrdDirectoryError)) throw error;
    return buildInvalidInspectionResult("directory", error.code, error.message, directoryPath);
  }
}

export async function validatePrdArchive(
  archivePath: string,
  limits: Partial<PrdArchiveLimits> = {}
): Promise<PrdPackageValidationResult> {
  if (!archivePath.endsWith(".prd")) {
    return invalidResult(
      "archive-extension-invalid",
      "PRD transport files must use the `.prd` extension.",
      archivePath
    );
  }

  let archiveEntries: PrdFileMap;

  try {
    assertPrdArchiveSize((await stat(archivePath)).size, limits);
    const bytes = new Uint8Array(await readFile(archivePath));
    archiveEntries = readPrdArchive(bytes, limits);
  } catch (error) {
    return invalidResult(
      error instanceof PrdContainerError ? error.code : "archive-read-invalid",
      error instanceof PrdContainerError ? error.message : "The `.prd` archive could not be opened as a valid ZIP package.",
      archivePath
    );
  }

  return validatePackageFiles(archiveEntries);
}

export async function inspectPrdArchive(
  archivePath: string,
  limits: Partial<PrdArchiveLimits> = {}
): Promise<PrdPackageInspectionResult> {
  if (!archivePath.endsWith(".prd")) {
    return buildInvalidInspectionResult(
      "archive",
      "archive-extension-invalid",
      "PRD transport files must use the `.prd` extension.",
      archivePath
    );
  }

  let archiveEntries: PrdFileMap;

  try {
    assertPrdArchiveSize((await stat(archivePath)).size, limits);
    const bytes = new Uint8Array(await readFile(archivePath));
    archiveEntries = readPrdArchive(bytes, limits);
  } catch (error) {
    return buildInvalidInspectionResult(
      "archive",
      error instanceof PrdContainerError ? error.code : "archive-read-invalid",
      error instanceof PrdContainerError ? error.message : "The `.prd` archive could not be opened as a valid ZIP package.",
      archivePath
    );
  }

  return buildInspectionResult(
    validatePackageFiles(archiveEntries),
    archiveEntries,
    "archive"
  );
}

export async function validatePackage(
  targetPath: string,
  limits: Partial<PrdArchiveLimits> = {}
): Promise<PrdPackageValidationResult> {
  let targetStats;

  try {
    targetStats = await stat(targetPath);
  } catch {
    return invalidResult(
      "package-path-missing",
      `Package path \`${targetPath}\` does not exist.`,
      targetPath
    );
  }

  if (targetStats.isDirectory()) {
    return validatePackageDirectory(targetPath, limits);
  }

  return validatePrdArchive(targetPath, limits);
}

export async function inspectPackage(
  targetPath: string,
  limits: Partial<PrdArchiveLimits> = {}
): Promise<PrdPackageInspectionResult> {
  let targetStats;

  try {
    targetStats = await stat(targetPath);
  } catch {
    return buildInvalidInspectionResult(
      inferSourceKind(targetPath),
      "package-path-missing",
      `Package path \`${targetPath}\` does not exist.`,
      targetPath
    );
  }

  if (targetStats.isDirectory()) {
    return inspectPackageDirectory(targetPath, limits);
  }

  return inspectPrdArchive(targetPath, limits);
}
