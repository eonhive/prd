/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Document Outline Tests
 * Purpose: Verify real package-derived outline rows for supported structured profiles.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: October 25, 2026
 * Notes: Vibe coded with Codex.
 */

import { describe, expect, it } from "vitest";
import type {
  PrdComicRoot,
  PrdGeneralDocumentRoot,
  PrdStoryboardRoot
} from "@eonhive/prd-types";
import {
  createViewerDocumentOutline,
  resolveViewerVisualOutlineSelection,
  type ViewerDocumentOutlineItem
} from "./viewerDocumentOutline.js";

describe("viewer document outline", () => {
  it("does not invent anchors for headings without rendered IDs", () => {
    const document: PrdGeneralDocumentRoot = {
      schemaVersion: "1.0.0", profile: "general-document", type: "document",
      id: "document", title: "Document",
      children: [
        { type: "heading", level: 1, text: "No ID" },
        { type: "heading", id: "with-id", level: 2, text: "With ID" }
      ]
    };
    expect(createViewerDocumentOutline({ entryDocument: document }).map((item) => item.id))
      .toEqual(["document", "with-id"]);
  });

  it("derives outline rows from a structured general document", () => {
    const document: PrdGeneralDocumentRoot = {
      schemaVersion: "1.0.0",
      profile: "general-document",
      type: "document",
      id: "doc",
      title: "Document",
      children: [
        {
          type: "section",
          id: "intro",
          title: "Introduction",
          children: [
            {
              type: "heading",
              id: "purpose",
              level: 2,
              text: "Purpose"
            },
            {
              type: "paragraph",
              text: "Ignored for outline."
            }
          ]
        }
      ]
    };

    expect(createViewerDocumentOutline({ entryDocument: document })).toEqual([
      { id: "doc", label: "Document", kind: "document", depth: 0 },
      { id: "intro", label: "Introduction", kind: "section", depth: 1 },
      { id: "purpose", label: "Purpose", kind: "heading", depth: 2 }
    ]);
  });

  it("derives outline rows from comic panels", () => {
    const comic: PrdComicRoot = {
      schemaVersion: "1.0.0",
      profile: "comic",
      type: "comic",
      id: "comic",
      title: "Comic",
      panels: [
        {
          id: "panel-1",
          asset: "panel-1",
          alt: "Opening panel",
          caption: "Opening"
        }
      ]
    };

    expect(createViewerDocumentOutline({ comicDocument: comic })).toEqual([
      { id: "comic", label: "Comic", kind: "document", depth: 0 },
      { id: "panel-1", label: "Opening", kind: "panel", depth: 1 }
    ]);
  });

  it("derives outline rows from storyboard frames", () => {
    const storyboard: PrdStoryboardRoot = {
      schemaVersion: "1.0.0",
      profile: "storyboard",
      type: "storyboard",
      id: "board",
      title: "Storyboard",
      frames: [
        {
          id: "frame-1",
          asset: "frame-1",
          alt: "Opening frame",
          notes: "Establishing shot"
        }
      ]
    };

    expect(createViewerDocumentOutline({ storyboardDocument: storyboard })).toEqual([
      { id: "board", label: "Storyboard", kind: "document", depth: 0 },
      { id: "frame-1", label: "Establishing shot", kind: "frame", depth: 1 }
    ]);
  });
});

describe("visual outline selection", () => {
  const comicDocument: PrdComicRoot = {
    schemaVersion: "1.0.0", profile: "comic", type: "comic", id: "comic", title: "Comic",
    panels: [
      { id: "panel-1", asset: "one", alt: "One" },
      { id: "panel-2", asset: "two", alt: "Two" }
    ]
  };
  const storyboardDocument: PrdStoryboardRoot = {
    schemaVersion: "1.0.0", profile: "storyboard", type: "storyboard", id: "board", title: "Board",
    frames: [
      { id: "frame-1", asset: "one", alt: "One" },
      { id: "frame-2", asset: "two", alt: "Two" }
    ]
  };
  const input = { comicDocument, storyboardDocument };
  const item = (kind: ViewerDocumentOutlineItem["kind"], id: string): ViewerDocumentOutlineItem =>
    ({ kind, id, label: id, depth: 1 });

  it("selects actual panel and frame indices rather than missing DOM anchors", () => {
    expect(resolveViewerVisualOutlineSelection(item("panel", "panel-2"), input))
      .toEqual({ kind: "panel", index: 1 });
    expect(resolveViewerVisualOutlineSelection(item("frame", "frame-2"), input))
      .toEqual({ kind: "frame", index: 1 });
  });

  it("keeps first-item selection and repeated selection valid", () => {
    for (let index = 0; index < 2; index += 1) {
      expect(resolveViewerVisualOutlineSelection(item("panel", "panel-1"), input))
        .toEqual({ kind: "panel", index: 0 });
    }
  });

  it.each([
    ["panel", "missing"], ["panel", "frame-1"], ["frame", "panel-1"],
    ["document", "comic"], ["heading", "panel-1"], ["section", "frame-1"]
  ] as const)("ignores unmatched %s target %s", (kind, id) => {
    expect(resolveViewerVisualOutlineSelection(item(kind, id), input)).toBeUndefined();
  });

  it("ignores visual entries when no corresponding document is open", () => {
    expect(resolveViewerVisualOutlineSelection(item("panel", "panel-1"), {})).toBeUndefined();
    expect(resolveViewerVisualOutlineSelection(item("frame", "frame-1"), { comicDocument })).toBeUndefined();
  });
});
