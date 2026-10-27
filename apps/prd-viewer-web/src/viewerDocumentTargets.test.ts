/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Document Target Tests
 * Purpose: Verify rendered content and outline anchors cannot shadow viewer shell IDs.
 * Author: Stan Nesi
 * Created: October 26, 2026
 * Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PrdComicRoot, PrdGeneralDocumentRoot, PrdStoryboardRoot } from "@eonhive/prd-types";
import { validatePackageFiles } from "@eonhive/prd-validator";
import {
  ComicPanelNavigationView,
  ComicPanelStripView,
  ResumeDocumentView,
  StoryboardFrameGridView,
  StoryboardReviewGridView,
  StructuredDocumentView
} from "./App.js";
import { ViewerDocumentOutline } from "./viewerChrome.js";
import {
  createViewerDocumentOutline,
  resolveViewerVisualOutlineSelection,
  type ViewerDocumentOutlineInput
} from "./viewerDocumentOutline.js";
import { getViewerContentLinkHref, getViewerContentTargetId } from "./viewerDocumentTargets.js";

const shellIds = ["main-content", "document-stage", "document-outline", "package-details", "viewer-locale-select"];
const visualIds = [...shellIds, "panel:one / #%\u00e9", getViewerContentTargetId("document", "document-stage")];
const comicDocument: PrdComicRoot = {
  schemaVersion: "1.0", type: "comic", profile: "comic", id: "document-stage", title: "Collision comic",
  panels: visualIds.map((id) => ({ id, asset: "art", alt: id }))
};
const storyboardDocument: PrdStoryboardRoot = {
  schemaVersion: "1.0", type: "storyboard", profile: "storyboard", id: "document-stage", title: "Collision storyboard",
  frames: visualIds.map((id) => ({ id, asset: "art", alt: id }))
};
const document: PrdGeneralDocumentRoot = {
  schemaVersion: "1.0", type: "document", profile: "general-document", id: "main-content", title: "Collision document",
  children: [
    { type: "section", id: "document-stage", title: "Section", children: [
      { type: "heading", id: "package-details", level: 2, text: "Details" },
      { type: "paragraph", id: "document-outline", text: "Paragraph" },
      { type: "links", id: "viewer-locale-select", style: "inline", items: [
        { label: "Section", href: "#document-stage" },
        { label: "Root", href: "#main-content" },
        { label: "Details", href: "#package-details" },
        { label: "Special", href: "#note%3Aone%20%25" }
      ] }
    ] },
    { type: "quote", id: "note:one %", text: "Quote" },
    { type: "list", id: "cli-flow", style: "ordered", items: ["One"] },
    { type: "list", id: "samples", style: "unordered", items: ["Two"] },
    { type: "links", id: "docs-format", style: "list", items: [{ label: "Root", href: "#main-content" }] },
    { type: "image", id: "image", asset: "art", alt: "Art" },
    { type: "table", id: "table", columns: [{ id: "one", label: "One" }], rows: [{ one: "Value" }] },
    { type: "chart", id: "chart", chartType: "bar", categories: ["One"], series: [{ name: "Counts", values: [1] }] },
    { type: "media", id: "media", mediaType: "audio", asset: "audio" }
  ]
};

function expectValid(root: PrdComicRoot | PrdStoryboardRoot | PrdGeneralDocumentRoot) {
  const files = {
    "manifest.json": JSON.stringify({
      prdVersion: "1.0", manifestVersion: "1.0", id: "urn:prd:test:dom-targets",
      profile: root.profile, title: root.title, entry: "content/root.json",
      assets: [
        { id: "art", href: "assets/art.svg", type: "image/svg+xml" },
        { id: "audio", href: "assets/audio.mp3", type: "audio/mpeg" }
      ]
    }),
    "content/root.json": JSON.stringify(root),
    "assets/art.svg": '<svg xmlns="http://www.w3.org/2000/svg"/>',
    "assets/audio.mp3": "test audio"
  };
  const encoded = Object.fromEntries(Object.entries(files).map(([path, value]) => [path, new TextEncoder().encode(value)]));
  const validation = validatePackageFiles(encoded);
  expect(validation.errors).toEqual([]);
  expect(validation.valid).toBe(true);
}

function renderWithShell(content: ReactNode, input: ViewerDocumentOutlineInput) {
  return renderToStaticMarkup(createElement("main", { id: "main-content" },
    createElement("section", { id: "document-stage" }, content),
    createElement(ViewerDocumentOutline, {
      items: createViewerDocumentOutline(input), onSelectVisualItem() {}
    }),
    createElement("aside", { id: "package-details" }),
    createElement("select", { id: "viewer-locale-select" })
  ));
}

function expectUniqueTargets(html: string) {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of shellIds) {
    expect(ids.filter((candidate) => candidate === id)).toHaveLength(1);
  }
  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    expect(ids.filter((candidate) => candidate === match[1])).toHaveLength(1);
  }
}

describe("viewer content target mapping", () => {
  it("separates shell IDs, root IDs, and authored IDs that resemble generated targets", () => {
    const ids = visualIds.flatMap((id) => [
      getViewerContentTargetId("document", id), getViewerContentTargetId("node", id),
      getViewerContentTargetId("panel", id), getViewerContentTargetId("frame", id)
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(shellIds).not.toContain(id);
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("preserves distinct whitespace, punctuation, Unicode, and malformed Unicode IDs", () => {
    const authoredIds = ["a b", "a-b", "a%20b", "a/b", "a#b", "\u00e9", "e\u0301", "\ud800", "\udfff", "\ud83d\ude80"];
    const targets = authoredIds.map((id) => getViewerContentTargetId("node", id));
    expect(new Set(targets).size).toBe(authoredIds.length);
    expect(targets.every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });

  it("remaps root/node fragment links without changing external URLs", () => {
    expect(getViewerContentLinkHref("#main-content", document.id))
      .toBe(`#${getViewerContentTargetId("document", document.id)}`);
    expect(getViewerContentLinkHref("#document-stage", document.id))
      .toBe(`#${getViewerContentTargetId("node", "document-stage")}`);
    expect(getViewerContentLinkHref("#note%3Aone%20%25", document.id))
      .toBe(`#${getViewerContentTargetId("node", "note:one %")}`);
    expect(getViewerContentLinkHref("#bad%escape", document.id))
      .toBe(`#${getViewerContentTargetId("node", "bad%escape")}`);
    for (const href of ["https://example.com/#document-stage", "mailto:reader@example.com", "#"]) {
      expect(getViewerContentLinkHref(href, document.id)).toBe(href);
    }
  });
});

describe("rendered viewer targets", () => {
  it("keeps a valid static comic and its outline clear of shell/root collisions", () => {
    expectValid(comicDocument);
    const html = renderWithShell(createElement(ComicPanelStripView, {
      comicDocument, assetUrls: {}
    }), { comicDocument });
    expectUniqueTargets(html);
    for (const panel of comicDocument.panels) {
      expect(html).toContain(`id="${getViewerContentTargetId("panel", panel.id)}" class="comic-panel-card"`);
    }
  });

  it("keeps a valid static storyboard and its outline clear of shell/root collisions", () => {
    expectValid(storyboardDocument);
    const html = renderWithShell(createElement(StoryboardFrameGridView, {
      storyboardDocument, assetUrls: {}
    }), { storyboardDocument });
    expectUniqueTargets(html);
    for (const frame of storyboardDocument.frames) {
      expect(html).toContain(`id="${getViewerContentTargetId("frame", frame.id)}" class="storyboard-frame-card"`);
    }
  });

  it("keeps active visual stage targets namespaced while selection uses authored IDs", () => {
    const panel = comicDocument.panels[1]!;
    const frame = storyboardDocument.frames[1]!;
    const comicHtml = renderToStaticMarkup(createElement(ComicPanelNavigationView, {
      comicDocument, assetUrls: {}, activePanelIndex: 1, onPanelChange() {}, stageRef: { current: null }
    }));
    const boardHtml = renderToStaticMarkup(createElement(StoryboardReviewGridView, {
      storyboardDocument, assetUrls: {}, activeFrameIndex: 1, onFrameChange() {}, stageRef: { current: null }
    }));
    for (const html of [comicHtml, boardHtml]) {
      expect(html).not.toContain('id="document-stage"');
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(comicHtml).toContain(`id="${getViewerContentTargetId("panel", panel.id)}"`);
    expect(boardHtml).toContain(`id="${getViewerContentTargetId("frame", frame.id)}"`);
    expect(resolveViewerVisualOutlineSelection({ id: panel.id, kind: "panel", label: "Panel", depth: 1 }, { comicDocument }))
      .toEqual({ kind: "panel", index: 1 });
    expect(resolveViewerVisualOutlineSelection({ id: frame.id, kind: "frame", label: "Frame", depth: 1 }, { storyboardDocument }))
      .toEqual({ kind: "frame", index: 1 });
  });

  it.each(["standard", "resume"])("preserves %s document links and outline targets without shell collisions", (mode) => {
    expectValid(document);
    const content = mode === "resume"
      ? createElement(ResumeDocumentView, { document, assetUrls: {}, resumeProfile: { id: "resume" } })
      : createElement(StructuredDocumentView, { document, assetUrls: {} });
    const html = renderWithShell(content, { entryDocument: document });
    expectUniqueTargets(html);
    expect(html).toContain(`id="${getViewerContentTargetId("document", document.id)}"`);
    expect(html).toContain(`href="#${getViewerContentTargetId("node", "document-stage")}"`);
    expect(html).not.toContain('href="#document-stage"');
    expect(html).not.toContain('href="#main-content"');
    const section = document.children[0];
    const nodes = [
      ...document.children,
      ...(section?.type === "section" ? section.children ?? [] : [])
    ];
    for (const node of nodes) {
      expect(html).toContain(`id="${getViewerContentTargetId("node", node.id!)}"`);
    }
  });
});
