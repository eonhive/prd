/**
 * Company: EonHive Inc. | Title: Portable Image Sequence Helpers
 * Purpose: Share ordering and filename labels without importing a host filesystem API.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */
const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

export function compareImageSequenceNames(left: string, right: string): number {
  return collator.compare(left, right);
}

export function titleFromImageStem(stem: string): string {
  const title = stem
    .split(/[-_\s]+/u)
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
  return title.length > 0 ? title : "Untitled PRD";
}

export function archiveImageExtension(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

export function titleFromArchiveImagePath(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return titleFromImageStem(
    name.slice(0, name.length - archiveImageExtension(path).length)
  );
}
