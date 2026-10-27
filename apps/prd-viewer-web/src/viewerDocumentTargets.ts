/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Document Targets
 * Purpose: Keep authored content anchors separate from the viewer shell's DOM IDs.
 * Author: Stan Nesi
 * Created: October 26, 2026
 * Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

type ViewerContentTargetScope = "document" | "node" | "panel" | "frame";

export function getViewerContentTargetId(
  scope: ViewerContentTargetScope,
  authoredId: string
): string {
  // Encode without loss so whitespace, fragment syntax, and even lone surrogates
  // cannot collide with shell IDs or a different authored content target.
  const encodedId = Array.from(authoredId, (character) =>
    character.codePointAt(0)!.toString(16)
  ).join("-");
  return `prd-content-${scope}-${encodedId}`;
}

export function getViewerContentLinkHref(href: string, documentId: string): string {
  if (!href.startsWith("#") || href === "#") {
    return href;
  }

  let authoredId = href.slice(1);
  try {
    authoredId = decodeURIComponent(authoredId);
  } catch {
    // Treat malformed percent escapes as literal authored text, not shell links.
  }

  const scope = authoredId === documentId ? "document" : "node";
  return `#${getViewerContentTargetId(scope, authoredId)}`;
}
