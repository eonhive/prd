/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Document Outline
 * Purpose: Derive real viewer navigation rows from opened structured PRD content.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: June 5, 2026
 * Notes: Vibe coded with Codex.
 */

import type {
  PrdComicRoot,
  PrdGeneralDocumentNode,
  PrdGeneralDocumentRoot,
  PrdStoryboardRoot
} from "@eonhive/prd-types";

export interface ViewerDocumentOutlineItem {
  id: string;
  label: string;
  kind: "document" | "section" | "heading" | "panel" | "frame";
  depth: number;
}

export interface ViewerDocumentOutlineInput {
  entryDocument?: PrdGeneralDocumentRoot;
  comicDocument?: PrdComicRoot;
  storyboardDocument?: PrdStoryboardRoot;
}

function pushGeneralDocumentNodeOutline(
  node: PrdGeneralDocumentNode,
  depth: number,
  items: ViewerDocumentOutlineItem[]
): void {
  if (node.type === "section") {
    items.push({
      id: node.id,
      label: node.title,
      kind: "section",
      depth
    });

    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        pushGeneralDocumentNodeOutline(child, depth + 1, items);
      }
    }
    return;
  }

  if (node.type === "heading") {
    items.push({
      id: node.id ?? `heading-${items.length + 1}`,
      label: node.text,
      kind: "heading",
      depth: Math.max(depth, node.level - 1)
    });
  }
}

export function createViewerDocumentOutline({
  entryDocument,
  comicDocument,
  storyboardDocument
}: ViewerDocumentOutlineInput): ViewerDocumentOutlineItem[] {
  if (entryDocument) {
    const items: ViewerDocumentOutlineItem[] = [
      {
        id: entryDocument.id,
        label: entryDocument.title,
        kind: "document",
        depth: 0
      }
    ];

    for (const child of entryDocument.children) {
      pushGeneralDocumentNodeOutline(child, 1, items);
    }

    return items;
  }

  if (comicDocument) {
    return [
      {
        id: comicDocument.id,
        label: comicDocument.title,
        kind: "document",
        depth: 0
      },
      ...comicDocument.panels.map((panel, index) => ({
        id: panel.id,
        label: panel.caption ?? panel.alt ?? `Panel ${index + 1}`,
        kind: "panel" as const,
        depth: 1
      }))
    ];
  }

  if (storyboardDocument) {
    return [
      {
        id: storyboardDocument.id,
        label: storyboardDocument.title,
        kind: "document",
        depth: 0
      },
      ...storyboardDocument.frames.map((frame, index) => ({
        id: frame.id,
        label: frame.notes ?? frame.alt ?? `Frame ${index + 1}`,
        kind: "frame" as const,
        depth: 1
      }))
    ];
  }

  return [];
}
