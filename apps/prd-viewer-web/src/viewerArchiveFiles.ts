/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Archive File Helpers
 * Purpose: Keep PRD archive selection and hosted sample URL behavior testable.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: June 5, 2026
 * Notes: Vibe coded with Codex.
 */

export interface ViewerArchiveCandidate {
  name: string;
}

export function isPrdArchiveName(name: string): boolean {
  return name.trim().toLowerCase().endsWith(".prd");
}

export function isPrdArchiveFile(file: ViewerArchiveCandidate): boolean {
  return isPrdArchiveName(file.name);
}

export function findFirstPrdArchive<T extends ViewerArchiveCandidate>(
  files: ArrayLike<T> | Iterable<T>
): T | undefined {
  return Array.from(files).find((file) => isPrdArchiveFile(file));
}

export function getPrdArchiveSelectionError(
  files: ArrayLike<ViewerArchiveCandidate> | Iterable<ViewerArchiveCandidate> | null
): string | undefined {
  const candidates = files ? Array.from(files) : [];

  if (candidates.length === 0) {
    return "Choose or drop a .prd archive to open in the reference viewer.";
  }

  if (!findFirstPrdArchive(candidates)) {
    return "No .prd archive found. Package source directories first with `prd pack`, then choose or drop the generated archive.";
  }

  return undefined;
}

export function getViewerDemoSampleArchiveUrl(
  hostedPath: string,
  baseHref: string
): string {
  const normalizedPath = hostedPath.replace(/^\/+/, "");
  const normalizedBase = baseHref.endsWith("/") ? baseHref : `${baseHref}/`;

  return new URL(normalizedPath, normalizedBase).toString();
}
