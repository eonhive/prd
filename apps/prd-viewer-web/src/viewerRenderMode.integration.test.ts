import { describe, expect, it } from "vitest";
import type { PrdFileMap } from "@eonhive/prd-validator";
import type { PrdPackageReader } from "@eonhive/prd-types";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { openPrdDocument } from "@eonhive/prd-viewer-core";
import { inferViewerRenderMode } from "./viewerRenderMode.js";

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
