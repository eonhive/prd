/*
 * Company: EonHive Inc.
 * Title: PRD Release Package Versions
 * Purpose: Distinguish coordinated first-preview bootstrap from independently versioned releases.
 * Author: Stan Nesi
 * Created: October 27, 2026
 * Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

export const firstPreviewVersion = "0.1.0";
const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseStableVersion(version) {
  if (typeof version !== "string" || version.trim() !== version || !stableVersionPattern.test(version)) return null;
  const parts = version.split(".").map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

function isAfterPreview(parts) {
  const preview = [0, 1, 0];
  for (let index = 0; index < preview.length; index += 1) {
    if (parts[index] !== preview[index]) return parts[index] > preview[index];
  }
  return false;
}

export function getReleasePackageVersionMode(versions) {
  if (versions.length === 0) return null;
  const parsed = versions.map(parseStableVersion);
  if (parsed.some((parts) => parts === null)) return null;
  if (versions.every((version) => version === firstPreviewVersion)) return "bootstrap-preview";
  // Never route a partial first preview through normal Changesets publication.
  return parsed.every(isAfterPreview) ? "changesets-versioned" : null;
}
