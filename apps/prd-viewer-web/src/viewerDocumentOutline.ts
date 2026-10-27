/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Document Outline
 * Purpose: Derive real viewer navigation rows from opened structured PRD content.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import type {
  PrdComicRoot,
  PrdGeneralDocumentNode,
  PrdGeneralDocumentRoot,
  PrdStoryboardRoot
} from "@eonhive/prd-types";
import { getViewerContentTargetId } from "./viewerDocumentTargets.js";

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

export function getViewerOutlineTargetId(item: ViewerDocumentOutlineItem): string {
  const scope = item.kind === "section" || item.kind === "heading" ? "node" : item.kind;
  return getViewerContentTargetId(scope, item.id);
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

  if (node.type === "heading" && node.id) {
    items.push({
      id: node.id,
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

export function resolveViewerVisualOutlineSelection(
  item: ViewerDocumentOutlineItem,
  { comicDocument, storyboardDocument }: ViewerDocumentOutlineInput
): { kind: "panel" | "frame"; index: number } | undefined {
  if (item.kind !== "panel" && item.kind !== "frame") {
    return undefined;
  }

  const items = item.kind === "panel" ? comicDocument?.panels : storyboardDocument?.frames;
  const index = items?.findIndex((candidate) => candidate.id === item.id);
  if (index === undefined || index < 0) {
    return undefined;
  }

  return { kind: item.kind, index };
}
