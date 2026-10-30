import { describe, expect, it } from "vitest";
import type { PrdOpenedDocument } from "@eonhive/prd-types";
import { inferViewerRenderMode as inferViewerRenderModeCore } from "@eonhive/prd-viewer-core";
import { getViewerRenderModeMessage, inferViewerRenderMode, selectViewerPresentation } from "./viewerRenderMode.js";

function createOpenedDocument(
  supportState: PrdOpenedDocument["supportState"]
): PrdOpenedDocument {
  return {
    manifest: {
      prdVersion: "1.0",
      manifestVersion: "1.0",
      id: "urn:test:web-viewer",
      profile: "general-document",
      title: "Web Viewer",
      entry: "content/root.json"
    },
    profileInfo: {
      input: "general-document",
      normalized: "general-document",
      supportClass: "canonical-core",
      canonical: true,
      supportedByReference: true,
      aliasUsed: false
    },
    supportState,
    entryPath: "content/root.json"
  };
}

describe("viewer render mode messaging", () => {
  it("replaces the full presentation when switching between HTML and structured locales", () => {
    const structured = { entryDocument: {
      schemaVersion: "1.0", profile: "general-document" as const, type: "document" as const,
      id: "locale", title: "Localized", children: []
    } };
    const html = { renderedHtml: "<p>Restricted locale</p>" };
    expect(selectViewerPresentation(structured, html)).toBe(html);
    expect(selectViewerPresentation(structured, html).entryDocument).toBeUndefined();
    expect(selectViewerPresentation(html, structured)).toBe(structured);
    expect(selectViewerPresentation(html, structured).renderedHtml).toBeUndefined();
    expect(selectViewerPresentation(structured)).toBe(structured);
  });

  it("maps structured JSON states to structured mode messaging", () => {
    const mode = inferViewerRenderMode(
      createOpenedDocument("fully-supported"),
      {
        schemaVersion: "1.0",
        profile: "general-document",
        type: "document",
        id: "doc",
        title: "Doc",
        children: []
      },
      undefined,
      undefined,
      undefined
    );

    expect(mode).toBe("structured-json-rendered");
    expect(getViewerRenderModeMessage(mode)).toContain("Structured JSON entry rendered");
  });



  it("delegates to the canonical viewer-core helper", () => {
    const opened = createOpenedDocument("safe-mode");

    expect(
      inferViewerRenderMode(opened, undefined, undefined, undefined, "<html></html>")
    ).toBe(
      inferViewerRenderModeCore({
        opened,
        entryDocument: undefined,
        comicDocument: undefined,
        storyboardDocument: undefined,
        renderedHtml: "<html></html>"
      })
    );
  });

  it("maps HTML fallback states to fallback messaging", () => {
    const mode = inferViewerRenderMode(
      createOpenedDocument("safe-mode"),
      undefined,
      undefined,
      undefined,
      "<html></html>"
    );

    expect(mode).toBe("html-fallback-rendered");
    expect(getViewerRenderModeMessage(mode)).toContain("HTML fallback entry rendered");
  });

  it("maps unsupported states to unsupported messaging", () => {
    const mode = inferViewerRenderMode(
      createOpenedDocument("unsupported-required-capability"),
      undefined,
      undefined,
      undefined,
      undefined
    );

    expect(mode).toBe("unsupported-entry-mode");
    expect(getViewerRenderModeMessage(mode)).toContain("Unsupported entry mode detected");
  });
});
