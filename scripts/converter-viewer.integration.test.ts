/**
 * Company: EonHive Inc. | Title: Converter Viewer Integration
 * Purpose: Reopen generated archives through the existing browser Viewer package-opening path.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { resolve } from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertDocument } from "../packages/prd-converter/src/index.js";
import { convertInBrowser, convertMarkdownInBrowser } from "../packages/prd-converter/src/browser.js";
import { validatePackageFiles } from "../packages/prd-validator/src/index.js";
import { readPrdArchive } from "../packages/prd-validator/src/container.js";
import { inferViewerRenderMode } from "../packages/prd-viewer-core/src/index.js";
import { openViewerPackage } from "../apps/prd-viewer-web/src/viewerPackageVerification.js";
import { importHtmlToPrdPackage } from "../packages/prd-cli/src/importHtml.js";
import { packDirectoryToBuffer } from "../packages/prd-packager/src/index.js";

function expectSameFiles(left: Record<string, Uint8Array>, right: Record<string, Uint8Array>): void {
  expect(Object.keys(left).sort()).toEqual(Object.keys(right).sort());
  for (const path of Object.keys(left)) expect(Buffer.from(left[path]!).equals(Buffer.from(right[path]!)), path).toBe(true);
}

describe("converted source in the existing Viewer", () => {
  it.each(["zip", "prd"] as const)("opens supplied comic descriptions in the existing %s Viewer path", async container => {
    const review = JSON.parse(await readFile(resolve("examples/conversion-web/comic-descriptions/review.json"), "utf8"));
    const converted = await convertInBrowser({
      source: { name: "sample-comic.cbz", bytes: new Uint8Array(await readFile(resolve("examples/conversion-cbz/sample-comic.cbz"))) },
      ...review, container
    });
    const files = readPrdArchive(converted.archive);
    expectSameFiles(files, readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-web/comic-descriptions/converted.prd")))));
    expect(converted.report).toEqual(JSON.parse(await readFile(resolve("examples/conversion-web/comic-descriptions/quality.json"), "utf8")));
    const { opened } = await openViewerPackage(files);
    expect(opened?.supportState).toBe("fully-supported");
    expect(opened?.comicDocument?.panels.map(page => page.id)).toEqual(["page-2", "page-3", "page-1"]);
    expect(opened?.comicDocument?.panels[0]?.alt).toBe(review.comicPageDescriptions[1].text);
    expect(opened?.comicDocument).toEqual(converted.document);
    expect(inferViewerRenderMode({ opened, comicDocument: opened?.comicDocument })).toBe("structured-json-rendered");
  });

  it.each(["zip", "prd"] as const)("opens reviewed CBZ pages in the existing %s Viewer path", async (container) => {
    const converted = await convertInBrowser({
      source: { name: "sample-comic.cbz", bytes: new Uint8Array(await readFile(resolve("examples/conversion-cbz/sample-comic.cbz"))) },
      comicPageIds: ["page-2", "page-3", "page-1"], container
    });
    const files = readPrdArchive(converted.archive);
    expectSameFiles(files, readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-web/cbz-review/converted.prd")))));
    expect(converted.report).toEqual(JSON.parse(await readFile(resolve("examples/conversion-web/cbz-review/quality.json"), "utf8")));
    const { opened } = await openViewerPackage(files);
    expect(opened?.supportState).toBe("fully-supported");
    expect(opened?.comicDocument?.panels.map(page => page.id)).toEqual(["page-2", "page-3", "page-1"]);
    expect(opened?.comicDocument).toEqual(converted.document);
    expect(inferViewerRenderMode({ opened, comicDocument: opened?.comicDocument })).toBe("structured-json-rendered");
  });

  it.each(["zip", "prd"] as const)("opens browser-entry CBZ in the existing %s Viewer path", async (container) => {
    const source = { name: "sample-comic.cbz", bytes: new Uint8Array(await readFile(resolve("examples/conversion-cbz/sample-comic.cbz"))) };
    const converted = await convertInBrowser({ source, container });
    const files = readPrdArchive(converted.archive);
    expectSameFiles(files, readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-web/cbz/converted.prd")))));
    expect(converted.report).toEqual(JSON.parse(await readFile(resolve("examples/conversion-web/cbz/quality.json"), "utf8")));
    const { opened } = await openViewerPackage(files);
    expect(opened?.supportState).toBe("fully-supported");
    expect(opened?.comicDocument).toEqual(converted.document);
    expect(opened?.comicDocument?.panels.map(page => page.alt)).toEqual(["Page 1 comic page", "Page 2 comic page", "Page 10 comic page"]);
    expect(opened?.entryHtml).toBeUndefined();
    expect(inferViewerRenderMode({ opened, comicDocument: opened?.comicDocument })).toBe("structured-json-rendered");
  });

  it.each(["zip", "prd"] as const)("opens browser-entry HTML in the existing %s Viewer path", async (container) => {
    const converted = await convertInBrowser({
      source: { name: "source.html", bytes: new Uint8Array(await readFile(resolve("examples/conversion-html/source.html"))) },
      resources: [{ name: "flow.png", bytes: new Uint8Array(await readFile(resolve("examples/conversion-html/flow.png"))) }], container
    });
    const files = readPrdArchive(converted.archive);
    const saved = readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-web/html/converted.prd"))));
    expect(files).toEqual(saved);
    expect(converted.report).toEqual(JSON.parse(await readFile(resolve("examples/conversion-web/html/quality.json"), "utf8")));
    const { opened } = await openViewerPackage(files);
    expect(opened?.supportState).toBe("fully-supported");
    expect(opened?.entryDocument).toEqual(converted.document);
    expect(opened?.entryHtml).toBeUndefined();
    expect(opened?.entryDocument?.children.some((node) => node.type === "table")).toBe(true);
    expect(inferViewerRenderMode({ opened, entryDocument: opened?.entryDocument })).toBe("structured-json-rendered");
  });

  it.each(["zip", "prd"] as const)("opens actual browser-converted Markdown in the %s Viewer path", async (container) => {
    const converted = await convertMarkdownInBrowser({
      source: { name: "source.md", bytes: new Uint8Array(await readFile(resolve("examples/conversion-markdown/source.md"))) },
      resources: [{ name: "flow.png", bytes: new Uint8Array(await readFile(resolve("examples/conversion-markdown/flow.png"))) }], container
    });
    const files = readPrdArchive(converted.archive);
    const downloaded = readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-web/converted.prd"))));
    expect(files).toEqual(downloaded);
    expect(converted.report).toEqual(JSON.parse(await readFile(resolve("examples/conversion-web/quality.json"), "utf8")));
    const { opened } = await openViewerPackage(files);
    expect(opened?.supportState).toBe("fully-supported");
    expect(opened?.entryDocument).toEqual(converted.document);
    expect(inferViewerRenderMode({ opened, entryDocument: opened?.entryDocument })).toBe("structured-json-rendered");
  });

  it.each(["zip", "prd"] as const)("opens mixed PDF pages through the existing %s Viewer", async (container) => {
    const result = await convertDocument({ sourcePath: resolve("examples/conversion-pdf/source.pdf"), container });
    const files = readPrdArchive(result.archive);
    const saved = readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-pdf/converted.prd"))));
    expect(Object.keys(files).sort()).toEqual(Object.keys(saved).sort());
    for (const [path, bytes] of Object.entries(files)) {
      // Native raster encoding can vary by platform; canonical content and retained source cannot.
      if (path.endsWith(".png")) {
        expect(Buffer.from(bytes).subarray(0, 24)).toEqual(Buffer.from(saved[path]!).subarray(0, 24));
      } else expect(Buffer.from(bytes).equals(Buffer.from(saved[path]!)), path).toBe(true);
    }
    expect(result.report).toEqual(JSON.parse(await readFile(resolve("examples/conversion-pdf/quality.json"), "utf8")));
    expect(validatePackageFiles(files).valid).toBe(true);
    const { opened } = await openViewerPackage(files);
    expect(opened?.supportState).toBe("fully-supported");
    expect(opened?.entryDocument?.children.map((node) => node.type === "section" && node.title)).toEqual(["Page 1", "Page 2"]);
    expect(opened?.entryDocument).toEqual(result.document);
    expect(inferViewerRenderMode({ opened, entryDocument: opened?.entryDocument })).toBe("structured-json-rendered");
  });

  it.each(["zip", "prd"] as const)("opens real DOCX content through the existing %s Viewer", async (container) => {
    const result = await convertDocument({ sourcePath: resolve("examples/conversion-docx/source.docx"), container });
    const files = readPrdArchive(result.archive);
    const saved = readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-docx/converted.prd"))));
    expect(Object.keys(files).sort()).toEqual(Object.keys(saved).sort());
    for (const [path, bytes] of Object.entries(files)) expect(Buffer.from(bytes).equals(Buffer.from(saved[path]!)), path).toBe(true);
    expect(result.report).toEqual(JSON.parse(await readFile(resolve("examples/conversion-docx/quality.json"), "utf8")));
    expect(validatePackageFiles(files).valid).toBe(true);
    const { opened } = await openViewerPackage(files);
    expect(opened?.supportState).toBe("fully-supported");
    expect(opened?.entryDocument?.children.filter((node) => node.type === "list").map((node) => node.items.length)).toEqual([2, 2]);
    expect(opened?.entryDocument?.children.some((node) => node.type === "table")).toBe(true);
    expect(inferViewerRenderMode({ opened, entryDocument: opened?.entryDocument })).toBe("structured-json-rendered");
  });

  it.each(["zip", "prd"] as const)("opens EPUB chapters and mapped resources through the existing %s Viewer", async (container) => {
    const result = await convertDocument({ sourcePath: resolve("examples/conversion-epub/portable-chapters.epub"), container });
    const files = readPrdArchive(result.archive);
    const saved = readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-epub/converted.prd"))));
    expect(Object.keys(files).sort()).toEqual(Object.keys(saved).sort());
    for (const [path, bytes] of Object.entries(files)) expect(Buffer.from(bytes).equals(Buffer.from(saved[path]!)), path).toBe(true);
    expect(result.report).toEqual(JSON.parse(await readFile(resolve("examples/conversion-epub/quality.json"), "utf8")));
    expect(validatePackageFiles(files).valid).toBe(true);
    const { opened } = await openViewerPackage(files);
    expect(opened?.supportState).toBe("fully-supported");
    expect(opened?.entryDocument?.children.map((node) => node.type === "section" && node.title)).toEqual(["A portable beginning", "A responsive result"]);
    expect(inferViewerRenderMode({ opened, entryDocument: opened?.entryDocument })).toBe("structured-json-rendered");
  });

  it.each(["zip", "prd"] as const)("opens CBZ pages through the existing %s comic Viewer path", async (container) => {
    const result = await convertDocument({ sourcePath: resolve("examples/conversion-cbz/sample-comic.cbz"), container });
    const files = readPrdArchive(result.archive);
    const saved = readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-cbz/converted.prd"))));
    expect(Object.keys(files).sort()).toEqual(Object.keys(saved).sort());
    // Compare binary payloads directly instead of deep-walking every image byte in Vitest.
    for (const [path, bytes] of Object.entries(files)) {
      expect(Buffer.from(bytes).equals(Buffer.from(saved[path]!)), path).toBe(true);
    }
    expect(result.report).toEqual(JSON.parse(await readFile(resolve("examples/conversion-cbz/quality.json"), "utf8")));
    expect(validatePackageFiles(files).valid).toBe(true);
    const { opened } = await openViewerPackage(files);
    expect(opened?.supportState).toBe("fully-supported");
    expect(opened?.comicDocument?.panels).toHaveLength(3);
    expect(opened?.comicDocument?.panels.map((panel) => panel.alt)).toEqual(["Page 1 comic page", "Page 2 comic page", "Page 10 comic page"]);
    expect(opened?.entryHtml).toBeUndefined();
    expect(inferViewerRenderMode({ opened, comicDocument: opened?.comicDocument })).toBe("structured-json-rendered");
  });

  it.each(["zip", "prd"] as const)("opens HTML directory import after validation and %s packaging", async (container) => {
    const root = await mkdtemp(join(tmpdir(), "prd-html-directory-viewer-"));
    try {
      const result = await importHtmlToPrdPackage({ sourcePath: resolve("examples/conversion-html/source.html"), targetDir: join(root, "document") });
      expect(result.report.validation.valid).toBe(true);
      const files = readPrdArchive(await packDirectoryToBuffer(join(root, "document"), { container }));
      const saved = readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-html/imported.prd"))));
      expect(files).toEqual(saved);
      expect(validatePackageFiles(files).valid).toBe(true);
      expect(files["attachments/source.html"]).toBeUndefined();
      const { opened } = await openViewerPackage(files);
      expect(opened?.supportState).toBe("fully-supported");
      expect(opened?.entryDocument?.children.some((node) => node.type === "table")).toBe(true);
      expect(opened?.entryDocument?.children.some((node) => node.type === "image")).toBe(true);
      expect(inferViewerRenderMode({ opened, entryDocument: opened?.entryDocument })).toBe("structured-json-rendered");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each(["zip", "prd"] as const)("reopens HTML conversion through the existing %s Viewer path", async (container) => {
    const converted = await convertDocument({ sourcePath: resolve("examples/conversion-html/source.html"), container });
    const files = readPrdArchive(converted.archive);
    const saved = readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-html/converted.prd"))));
    expect(files).toEqual(saved);
    expect(converted.report).toEqual(JSON.parse(await readFile(resolve("examples/conversion-html/quality.json"), "utf8")));
    expect(validatePackageFiles(files).valid).toBe(true);
    const { opened } = await openViewerPackage(files);
    expect(opened?.supportState).toBe("fully-supported");
    expect(opened?.entryDocument).toEqual(converted.document);
    expect(opened?.entryDocument?.children.some((node) => node.type === "table")).toBe(true);
    expect(opened?.entryHtml).toBeUndefined();
    expect(inferViewerRenderMode({ opened, entryDocument: opened?.entryDocument })).toBe("structured-json-rendered");
  });

  it.each(["zip", "prd"] as const)("opens a real %s artifact as fully supported structured content", async (container) => {
    const converted = await convertDocument({ sourcePath: resolve("examples/conversion-markdown/source.md"), container });
    const files = readPrdArchive(converted.archive);
    const saved = readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-markdown/converted.prd"))));
    expect(files).toEqual(saved);
    expect(converted.report).toEqual(JSON.parse(await readFile(resolve("examples/conversion-markdown/quality.json"), "utf8")));
    expect(validatePackageFiles(files).valid).toBe(true);
    const { opened, signature } = await openViewerPackage(files);
    expect(signature.status).toBe("unsigned");
    expect(opened?.supportState).toBe("fully-supported");
    expect(opened?.entryDocument).toEqual(converted.document);
    expect(opened?.entryDocument?.children.some((node) => node.type === "image")).toBe(true);
    expect(inferViewerRenderMode({ opened, entryDocument: opened?.entryDocument })).toBe("structured-json-rendered");
  });
});
