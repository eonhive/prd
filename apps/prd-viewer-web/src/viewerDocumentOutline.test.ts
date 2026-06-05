/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Document Outline Tests
 * Purpose: Verify real package-derived outline rows for supported structured profiles.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: June 5, 2026
 * Notes: Vibe coded with Codex.
 */

import { describe, expect, it } from "vitest";
import type {
  PrdComicRoot,
  PrdGeneralDocumentRoot,
  PrdStoryboardRoot
} from "@eonhive/prd-types";
import { createViewerDocumentOutline } from "./viewerDocumentOutline.js";

describe("viewer document outline", () => {
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
