import { describe, expect, it } from "vitest";
import type { PrdFileMap } from "@eonhive/prd-validator";
import type { PrdPackageReader } from "@eonhive/prd-types";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { openPrdDocument } from "@eonhive/prd-viewer-core";
import { inferViewerRenderMode } from "./viewerRenderMode.js";
import { createHtmlFallbackRenderer } from "./htmlFallback.js";
import { HtmlFallbackFrame } from "./HtmlFallbackFrame.js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

function createPackageReader(files: Record<string, string>): PrdPackageReader {
  return {
    has(path) {
      return path in files;
    },
    readText(path) {
      const value = files[path];
      if (value === undefined) {
        throw new Error(`Missing file: ${path}`);
      }
      return value;
    },
    readBinary(path) {
      const value = files[path];
      if (value === undefined) {
        throw new Error(`Missing file: ${path}`);
      }
      return new TextEncoder().encode(value);
    }
  };
}

function toValidationFiles(files: Record<string, string>): PrdFileMap {
  const encoder = new TextEncoder();
  return Object.fromEntries(
    Object.entries(files).map(([path, content]) => [path, encoder.encode(content)])
  );
}

describe("validator + viewer-core + web render-mode mapping", () => {
  it.each(["comic", "storyboard", "custom.zine"])("retains %s safe-mode while isolating its HTML presentation", async (profile) => {
    const files = {
      "manifest.json": JSON.stringify({
        prdVersion: "1.0", manifestVersion: "1.0", id: `urn:test:isolated-${profile}`,
        profile, title: "Restricted HTML", entry: "content/index.html"
      }),
      "content/index.html": '<!doctype html><html><body><h1>Readable legacy content</h1><a href="https://remote.test/leave">Link label</a><iframe src="https://remote.test/frame"></iframe></body></html>'
    };
    const binary = toValidationFiles(files);
    expect(validatePackageFiles(binary).valid).toBe(true);
    const opened = await openPrdDocument(createPackageReader(files));
    expect(opened.supportState).toBe("safe-mode");
    const render = createHtmlFallbackRenderer(binary, opened.manifest.assets, {
      create() { throw new Error("No media expected"); }, revoke() {}
    });
    const html = await render(opened.entryHtml!, opened.entryPath);
    expect(inferViewerRenderMode(opened, undefined, undefined, undefined, html)).toBe("html-fallback-rendered");
    expect(html).toContain("Readable legacy content");
    expect(html).toContain("Link label");
    expect(html).not.toContain("remote.test");
    expect(renderToStaticMarkup(createElement(HtmlFallbackFrame, { html }))).toContain('sandbox=""');
  });

  it.each([true, false])("preserves validity while mapping an extension with required=%s truthfully", async (required) => {
    const files = {
      "manifest.json": JSON.stringify({
        prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:web-extension",
        profile: "general-document", title: "Extension", entry: "content/root.json",
        extensions: [{ id: "custom.renderer", required }]
      }),
      "content/root.json": JSON.stringify({
        schemaVersion: "1.0", profile: "general-document", type: "document",
        id: "extension", title: "Extension", children: [{ type: "paragraph", text: "Readable content." }]
      })
    };
    expect(validatePackageFiles(toValidationFiles(files)).valid).toBe(true);
    const opened = await openPrdDocument(createPackageReader(files));
    expect(opened.supportState).toBe(required ? "unsupported-required-capability" : "fully-supported");
    expect(inferViewerRenderMode(opened, opened.entryDocument, opened.comicDocument, opened.storyboardDocument, opened.entryHtml))
      .toBe(required ? "unsupported-entry-mode" : "structured-json-rendered");
  });

  it.each([
    { name: "object", capabilities: { required: ["custom.renderer"] } },
    { name: "legacy array", capabilities: ["custom.renderer"] }
  ])("keeps valid packages with unsupported $name requirements out of the rendered mode", async ({ capabilities }) => {
    const files = {
      "manifest.json": JSON.stringify({
        prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:web-required-capability",
        profile: "general-document", title: "Required", entry: "content/root.json",
        compatibility: { capabilities }
      }),
      "content/root.json": JSON.stringify({
        schemaVersion: "1.0", profile: "general-document", type: "document",
        id: "required", title: "Required", children: [{ type: "paragraph", text: "Readable content." }]
      })
    };

    expect(validatePackageFiles(toValidationFiles(files)).valid).toBe(true);
    const opened = await openPrdDocument(createPackageReader(files));
    expect(opened.supportState).toBe("unsupported-required-capability");
    expect(opened.entryDocument).toBeUndefined();
    expect(inferViewerRenderMode(opened, opened.entryDocument, opened.comicDocument, opened.storyboardDocument, opened.entryHtml)).toBe("unsupported-entry-mode");
  });

  it("maps validator-valid structured general-document packages to structured-json-rendered", async () => {
    const files = {
      "manifest.json": JSON.stringify({
        prdVersion: "1.0",
        manifestVersion: "1.0",
        id: "urn:test:web-structured",
        profile: "general-document",
        title: "Structured Document",
        entry: "content/root.json"
      }),
      "content/root.json": JSON.stringify({
        schemaVersion: "1.0",
        profile: "general-document",
        type: "document",
        id: "doc",
        title: "Structured",
        children: [
          {
            type: "paragraph",
            text: "Structured content."
          }
        ]
      })
    };

    const validation = validatePackageFiles(toValidationFiles(files));
    const opened = await openPrdDocument(createPackageReader(files));
    const renderMode = inferViewerRenderMode(
      opened,
      opened.entryDocument,
      opened.comicDocument,
      opened.storyboardDocument,
      opened.entryHtml
    );

    expect(validation.valid).toBe(true);
    expect(opened.supportState).toBe("fully-supported");
    expect(renderMode).toBe("structured-json-rendered");
  });

  it("maps validator-valid HTML fallback packages to html-fallback-rendered", async () => {
    const files = {
      "manifest.json": JSON.stringify({
        prdVersion: "1.0",
        manifestVersion: "1.0",
        id: "urn:test:web-html-fallback",
        profile: "custom.zine",
        title: "Legacy HTML",
        entry: "content/index.html"
      }),
      "content/index.html": "<!doctype html><html><body>Legacy</body></html>"
    };

    const validation = validatePackageFiles(toValidationFiles(files));
    const opened = await openPrdDocument(createPackageReader(files));
    const renderMode = inferViewerRenderMode(
      opened,
      opened.entryDocument,
      opened.comicDocument,
      opened.storyboardDocument,
      opened.entryHtml
    );

    expect(validation.valid).toBe(true);
    expect(opened.supportState).toBe("safe-mode");
    expect(renderMode).toBe("html-fallback-rendered");
  });

  it("maps validator-valid but unsupported custom entry packages to unsupported-entry-mode", async () => {
    const files = {
      "manifest.json": JSON.stringify({
        prdVersion: "1.0",
        manifestVersion: "1.0",
        id: "urn:test:web-unsupported-entry",
        profile: "custom.zine",
        title: "Custom Unsupported",
        entry: "content/root.xml"
      }),
      "content/root.xml": "<doc>custom</doc>"
    };

    const validation = validatePackageFiles(toValidationFiles(files));
    const opened = await openPrdDocument(createPackageReader(files));
    const renderMode = inferViewerRenderMode(
      opened,
      opened.entryDocument,
      opened.comicDocument,
      opened.storyboardDocument,
      opened.entryHtml
    );

    expect(validation.valid).toBe(true);
    expect(opened.supportState).toBe("unsupported-required-capability");
    expect(renderMode).toBe("unsupported-entry-mode");
  });
});
