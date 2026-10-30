/**
 * Company: EonHive Inc. | Title: Reference Viewer Version Compatibility
 * Purpose: Check declared contracts and minimum viewer requirements before exposing content for rendering.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */

import {
  PRD_GENERAL_DOCUMENT_SECTION_ENTRY_PREFIX, PRD_LOCALIZED_ENTRIES_PATH,
  type PrdManifest, type PrdPackageReader, isCanonicalCoreProfileId, isJsonEntryPath
} from "@eonhive/prd-types";

type NumericVersion = [number, number, number];

function parseNumericVersion(value: unknown): NumericVersion | undefined {
  if (typeof value !== "string" || value.length > 50 || value.trim() !== value) return undefined;
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/u.test(value)) return undefined;
  const parts = value.split(".").map(Number);
  if (parts.some((part) => !Number.isSafeInteger(part))) return undefined;
  return [parts[0]!, parts[1]!, parts[2] ?? 0];
}

function compareVersions(left: NumericVersion, right: NumericVersion): number {
  for (let index = 0; index < 3; index += 1) {
    const difference = left[index]! - right[index]!;
    if (difference !== 0) return difference;
  }
  return 0;
}

function describeDeclaration(value: unknown): string {
  if (typeof value !== "string") return value === undefined ? "(missing)" : "(unrecognized value)";
  // Version declarations and paths come from untrusted packages; keep feedback bounded.
  return JSON.stringify(value.length > 80 ? value.slice(0, 80) + "…" : value);
}

function unsupportedContract(value: unknown, field: string): string | undefined {
  const version = parseNumericVersion(value);
  if (version?.[0] === 1 && version[1] === 0 && version[2] === 0) return undefined;
  return `${field} ${describeDeclaration(value)} (supported: 1.0 or 1.0.0)`;
}

export function getUnsupportedManifestVersions(manifest: PrdManifest, viewerVersion: string): string[] {
  const issues = [
    unsupportedContract(manifest.prdVersion, "prdVersion"),
    unsupportedContract(manifest.manifestVersion, "manifestVersion"),
    ...(manifest.profileVersion !== undefined && isCanonicalCoreProfileId(manifest.profile)
      ? [unsupportedContract(manifest.profileVersion, "profileVersion")] : [])
  ].filter((issue): issue is string => issue !== undefined);

  const minimum = manifest.compatibility?.minViewer;
  if (minimum === undefined) return issues;
  const required = parseNumericVersion(minimum);
  const current = parseNumericVersion(viewerVersion);
  if (!required) {
    issues.push(`minViewer ${describeDeclaration(minimum)} (expected numeric major.minor or major.minor.patch)`);
  } else if (!current || compareVersions(current, required) < 0) {
    issues.push(`minViewer ${describeDeclaration(minimum)} (current viewer: ${viewerVersion})`);
  }
  return issues;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The caller validates structure first. Control indexes/overlays have no schemaVersion contract. */
export async function getUnsupportedContentVersion(
  reader: PrdPackageReader,
  manifest: PrdManifest,
  entryContent?: unknown
): Promise<string | undefined> {
  const checked = new Set<string>();

  async function checkRoot(path: string, suppliedContent?: unknown): Promise<string | undefined> {
    if (checked.has(path)) return undefined;
    checked.add(path);
    const content: unknown = suppliedContent !== undefined ? suppliedContent : JSON.parse(await reader.readText(path));
    const issue = unsupportedContract(isObject(content) ? content.schemaVersion : undefined, `${describeDeclaration(path)} schemaVersion`);
    if (issue) return issue;

    if (manifest.profile !== "general-document" || !isObject(content) || !Array.isArray(content.children)) return undefined;
    // Segmentation is top-level only. Do not walk unrelated JSON or invent recursive loading.
    for (const child of content.children) {
      if (!isObject(child) || child.type !== "section" || typeof child.src !== "string") continue;
      const path = child.src;
      if (!path.startsWith(PRD_GENERAL_DOCUMENT_SECTION_ENTRY_PREFIX) || !isJsonEntryPath(path)) continue;
      if (checked.has(path)) continue;
      checked.add(path);
      const section: unknown = JSON.parse(await reader.readText(path));
      const issue = unsupportedContract(isObject(section) ? section.schemaVersion : undefined, `${describeDeclaration(path)} schemaVersion`);
      if (issue) return issue;
    }
    return undefined;
  }

  if (entryContent !== undefined) {
    const issue = await checkRoot(manifest.entry, entryContent);
    if (issue) return issue;
  }
  if (!manifest.localization?.defaultLocale || !await reader.has(PRD_LOCALIZED_ENTRIES_PATH)) return undefined;
  const index: unknown = JSON.parse(await reader.readText(PRD_LOCALIZED_ENTRIES_PATH));
  if (!isObject(index) || index.type !== "localized-content-index" || !isObject(index.locales)) return undefined;

  // The reference host prepares every declared alternate, so every such root must be compatible.
  for (const [locale, descriptor] of Object.entries(index.locales)) {
    if (locale === manifest.localization.defaultLocale || !isObject(descriptor) || typeof descriptor.entry !== "string") continue;
    const path = descriptor.entry.trim();
    if (!path.startsWith("content/") || !isJsonEntryPath(path)) continue;
    const issue = await checkRoot(path);
    if (issue) return issue;
  }
  return undefined;
}
