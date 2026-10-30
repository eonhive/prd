/**
 * Company: EonHive Inc. | Title: HTML Directory Import Tests
 * Purpose: Verify directory output, report contracts, legacy compatibility boundaries and unsafe inputs.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validatePackage } from "@eonhive/prd-validator/node";
import { importHtmlToPrdPackage } from "./importHtml.js";
import { writeImportPackage } from "./importPackage.js";
import { runCli } from "./index.js";

let root: string;
let sourcePath: string;
let targetDir: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "prd-html-import-test-"));
  sourcePath = join(root, "source.html");
  targetDir = join(root, "output");
  await writeFile(sourcePath, "<h1>Article</h1><p>Readable content.</p>");
});
afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe("HTML directory import", () => {
  it("writes canonical content and a declared, factual report without raw source", async () => {
    await writeFile(sourcePath, '<h1 id="intro">Article</h1><p>Readable <strong>text</strong>.</p><script>UNSAFE_SOURCE_SENTINEL</script>');
    const result = await importHtmlToPrdPackage({ sourcePath, targetDir, title: "Custom title", id: "urn:test:html-directory" });
    expect(result).toMatchObject({ contractVersion: "prd-cli-html-import-v1", imported: true, profile: "general-document", title: "Custom title", id: "urn:test:html-directory" });
    expect(result.report).toMatchObject({
      contractVersion: "prd-import-report-v1", sourceFormat: "html", targetProfile: "general-document",
      sourcePreserved: false, semanticFidelity: "partial", visualFidelity: "not-preserved", readingQuality: "not-assessed",
      content: { nodeCount: 2, nodeTypes: { heading: 1, paragraph: 1 } },
      resources: { assetCount: 0, byteCount: 0, items: [] },
      errors: [], unsupportedElements: ["script"], validation: { valid: true, errors: [] }
    });
    const manifest = JSON.parse(await readFile(join(targetDir, "manifest.json"), "utf8"));
    expect(manifest.entry).toBe("content/root.json");
    expect(manifest.attachments).toEqual([{ id: "import-report", href: "attachments/import-report.json", type: "application/json" }]);
    expect(JSON.parse(await readFile(join(targetDir, "attachments/import-report.json"), "utf8"))).toEqual(result.report);
    expect((await validatePackage(targetDir)).valid).toBe(true);
    for (const path of result.files) expect((await readFile(join(targetDir, path))).toString()).not.toContain("UNSAFE_SOURCE_SENTINEL");
    expect(JSON.stringify(result.report)).not.toContain(root);
    expect(result.files).not.toContain("attachments/source.html");
  });

  it("preserves reading order in a long article and nested sections", async () => {
    const paragraphs = Array.from({ length: 500 }, (_, index) => `<p>Paragraph ${index + 1}.</p>`).join("");
    await writeFile(sourcePath, `<article><h1>Long article</h1><section><h2>Part</h2><section><h3>Detail</h3>${paragraphs}</section></section></article>`);
    const result = await importHtmlToPrdPackage({ sourcePath, targetDir });
    expect(result.report.content.nodeCount).toBe(503);
    const content = JSON.parse(await readFile(join(targetDir, "content/root.json"), "utf8"));
    expect(content.children.slice(0, 3).map((node: { level: number }) => node.level)).toEqual([1, 2, 3]);
    expect(content.children[3].text).toBe("Paragraph 1.");
    expect(content.children.at(-1).text).toBe("Paragraph 500.");
    expect((await validatePackage(targetDir)).valid).toBe(true);
  });

  it("imports tables, lists and local images from the real example", async () => {
    const source = new URL("../../../examples/conversion-html/source.html", import.meta.url);
    const image = new URL("../../../examples/conversion-html/flow.png", import.meta.url);
    await writeFile(sourcePath, await readFile(source));
    const imageBytes = await readFile(image);
    await writeFile(join(root, "flow.png"), imageBytes);
    const result = await importHtmlToPrdPackage({ sourcePath, targetDir });
    expect(result.report.content.nodeTypes).toMatchObject({ heading: 2, list: 1, quote: 1, image: 1, table: 1, links: 2 });
    expect(result.report.resources.byteCount).toBe(imageBytes.byteLength);
    expect(result.report.resources.items).toEqual([{ id: "import-image-1", href: "assets/images/import-image-1.png", type: "image/png" }]);
    expect(await readFile(join(targetDir, "assets/images/import-image-1.png"))).toEqual(imageBytes);
  });

  it("reports HTML repairs and unsupported constructs", async () => {
    await writeFile(sourcePath, '<h1 title="a" title="b">Article</h1><pre>const value = 1;</pre><iframe src="https://example.com">Omitted frame</iframe><table><tr><td colspan="2">Merged text</td></tr></table>');
    const result = await importHtmlToPrdPackage({ sourcePath, targetDir });
    expect(result.report.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["html-parser-recovery", "html-code-flattened", "html-element-omitted", "html-table-flattened", "source-not-preserved"]));
    expect(result.report.unsupportedElements).toContain("iframe");
    expect((await validatePackage(targetDir)).valid).toBe(true);
  });

  it("reports missing/unsafe resources without exporting private path or URL references", async () => {
    const privatePath = join(root, "private-image.png");
    await writeFile(sourcePath, `<h1>Privacy</h1><img src="${privatePath}" alt="Private image"><img src="https://user:password@example.com/image.png?token=private" alt="Remote"><img src="missing.png" alt="Missing">`);
    const result = await importHtmlToPrdPackage({ sourcePath, targetDir });
    expect(result.report.resources.assetCount).toBe(0);
    expect(result.report.warnings.filter((warning) => warning.code === "resource-omitted")).toHaveLength(3);
    const report = JSON.stringify(result.report);
    expect(report).not.toContain(root);
    expect(report).not.toContain("password");
    expect(report).not.toContain("token=private");
    expect(report).not.toContain("missing.png");
  });

  it.each(["", "<script>Only active content</script>", "<iframe>Only unsupported content</iframe>"])("fails unusable source before creating a directory", async (source) => {
    await writeFile(sourcePath, source);
    await expect(importHtmlToPrdPackage({ sourcePath, targetDir })).rejects.toThrow();
    await expect(readdir(targetDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses nonempty targets, file targets and symlink targets without modifying them", async () => {
    await mkdir(targetDir);
    await writeFile(join(targetDir, "keep.txt"), "keep");
    await expect(importHtmlToPrdPackage({ sourcePath, targetDir })).rejects.toThrow("not empty");
    expect(await readdir(targetDir)).toEqual(["keep.txt"]);
    const fileTarget = join(root, "file");
    await writeFile(fileTarget, "keep");
    await expect(importHtmlToPrdPackage({ sourcePath, targetDir: fileTarget })).rejects.toThrow("not a directory");
    const empty = join(root, "empty");
    await mkdir(empty);
    const linkTarget = join(root, "link");
    await symlink(empty, linkTarget);
    await expect(importHtmlToPrdPackage({ sourcePath, targetDir: linkTarget })).rejects.toThrow("symbolic link");
    expect(await readdir(empty)).toEqual([]);
  });

  it("supports an existing empty output directory", async () => {
    await mkdir(targetDir);
    expect((await importHtmlToPrdPackage({ sourcePath, targetDir })).imported).toBe(true);
  });

  it("exposes versioned JSON success and failure without changing other command payloads", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await runCli(["import", "html", sourcePath, "--out", targetDir, "--json"])).toBe(0);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({ contractVersion: "prd-cli-html-import-v1", imported: true, report: { validation: { valid: true } } });
    log.mockClear();
    expect(await runCli(["import", "html", sourcePath, "--out", targetDir, "--json"])).toBe(1);
    expect(log).not.toHaveBeenCalled();
    expect(JSON.parse(String(error.mock.calls[0]?.[0]))).toMatchObject({ contractVersion: "prd-cli-html-import-v1", imported: false, error: { code: "html-import-failed" } });
  });

  it.each([["--out"], ["--out", "--json"], ["--unknown"], ["--json", "--json"], ["--title"]])("rejects invalid CLI options before writing", async (...options) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await runCli(["import", "html", sourcePath, "--out", targetDir, ...options])).toBe(1);
    await expect(readdir(targetDir)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("shared import output boundaries", () => {
  it.each(["../escape", "/absolute", "C:/drive", "content\\escape", "content/../escape"])("rejects unsafe generated paths before target creation", async (path) => {
    await expect(writeImportPackage(targetDir, [{ path, contents: "unsafe" }])).rejects.toThrow("Unsafe");
    await expect(readdir(targetDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects duplicate and file/directory collision paths before writing", async () => {
    await expect(writeImportPackage(targetDir, [{ path: "manifest.json", contents: "one" }, { path: "manifest.json", contents: "two" }])).rejects.toThrow("Duplicate");
    await expect(writeImportPackage(targetDir, [{ path: "content", contents: "one" }, { path: "content/root.json", contents: "two" }])).rejects.toThrow("also used as a directory");
    await expect(readdir(targetDir)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
