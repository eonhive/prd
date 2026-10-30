/**
 * Company: EonHive Inc. | Title: HTML Conversion Tests
 * Purpose: Verify semantic reconstruction, source retention and hostile HTML boundaries.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import { convertDocument, convertFileToPrd } from "../index.js";

let root: string;
let sourcePath: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "prd-html-test-"));
  sourcePath = join(root, "source.html");
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(root, { recursive: true, force: true });
});

async function convert(html: string, options: Partial<Parameters<typeof convertDocument>[0]> = {}) {
  await writeFile(sourcePath, html);
  return convertDocument({ sourcePath, ...options });
}

describe("HTML semantic conversion", () => {
  it("maps title, headings, entities, paragraphs, lists, quotes, links, anchors and tables", async () => {
    const original = `<!doctype html><html><head><title>Portable &amp; readable</title></head><body>
      <h1 id="intro">Welcome</h1><p>Text with <strong>emphasis</strong> &amp; decoded entities.</p>
      <ul><li>One</li><li>Two</li></ul><blockquote>Quoted <em>text</em>.</blockquote>
      <p>Read <a href="https://example.com/guide">the guide</a> or <a href="#intro">return</a>.</p>
      <table><caption>Team</caption><thead><tr><th>Name</th><th>Role</th></tr></thead>
      <tbody><tr><td>Stan</td><td>Author</td></tr></tbody></table></body></html>`;
    const result = await convert(original);
    const files = readPrdArchive(result.archive);
    expect(validatePackageFiles(files).valid).toBe(true);
    expect(result.report.sourceFormat).toBe("html");
    expect(result.document.title).toBe("Portable & readable");
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    const nodes = result.document.children;
    expect(nodes.map((node) => node.type)).toEqual(["heading", "paragraph", "list", "quote", "paragraph", "links", "links", "table"]);
    expect(nodes[0]).toMatchObject({ id: "html-anchor-1", text: "Welcome", level: 1 });
    expect(nodes[1]).toMatchObject({ text: "Text with emphasis & decoded entities." });
    expect(nodes[5]).toMatchObject({ items: [{ label: "the guide", href: "https://example.com/guide" }] });
    expect(nodes[6]).toMatchObject({ items: [{ label: "return", href: "#html-anchor-1" }] });
    expect(nodes[7]).toMatchObject({
      type: "table", caption: "Team",
      columns: [{ id: "column-1", label: "Name" }, { id: "column-2", label: "Role" }],
      rows: [{ "column-1": "Stan", "column-2": "Author" }]
    });
    expect(Buffer.from(files["attachments/source.html"]!).toString()).toBe(original);
    const manifest = JSON.parse(Buffer.from(files["manifest.json"]!).toString());
    expect(manifest.attachments.find((item: { id: string }) => item.id === "conversion-source").type).toBe("application/octet-stream");
    expect(readPrdArchive((await convertDocument({ sourcePath })).archive)).toEqual(files);
  });

  it("uses H1 then filename when title metadata is absent and supports .htm fragments", async () => {
    sourcePath = join(root, "fragment.htm");
    expect((await convert("<h1>Fragment title</h1><p>Body" )).document.title).toBe("Fragment title");
    expect((await convert("<p>Body only</p>")).document.title).toBe("fragment");
  });

  it("keeps inline prose together across emphasis, comments and line breaks", async () => {
    const result = await convert("<div>Hello <em>world</em><!-- comment -->!<br>Next line.</div>");
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    expect(result.document.children).toEqual([{ type: "paragraph", id: "node-1", text: "Hello world! Next line." }]);
  });

  it("normalizes ragged/headerless tables and reports nested lists and preformatted content", async () => {
    const result = await convert(`<ol start="4"><li>First<ul><li>Nested</li></ul></li><li>Next</li></ol>
      <pre>const value = 1;\n  return value;</pre>
      <table><tr><td>A</td><td>B</td></tr><tr><td>C</td></tr></table>`);
    expect(result.report.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["html-subset", "html-list-flattened", "html-code-flattened", "html-table-normalized"]));
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    expect(result.document.children.find((node) => node.type === "list")).toMatchObject({ items: ["First Nested", "Next"] });
    expect(result.document.children.find((node) => node.type === "table")).toMatchObject({ rows: [{ "column-1": "A", "column-2": "B" }, { "column-1": "C", "column-2": "" }] });
  });

  it("flattens merged and nested tables without inventing equivalent relationships", async () => {
    const result = await convert(`<h1>Complex</h1><table><tr><td colspan="2">Merged</td></tr></table>
      <table><tr><td>Outer<table><tr><td>Inner</td></tr></table></td></tr></table>`);
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    expect(result.document.children.some((node) => node.type === "table")).toBe(false);
    expect(JSON.stringify(result.document)).toContain("Merged");
    expect(JSON.stringify(result.document)).toContain("Inner");
    expect(result.report.warnings.some((warning) => warning.code === "html-table-flattened")).toBe(true);
  });

  it("retains wrapper targets, resolves forward links and degrades missing/duplicate anchors", async () => {
    const result = await convert(`<a href="#later">Later</a><a href="#missing">Missing</a>
      <section id="later"><h2 id="heading">Target</h2></section>
      <p id="heading">Duplicate</p><a href="#heading">Heading</a>`);
    expect(validatePackageFiles(readPrdArchive(result.archive)).valid).toBe(true);
    expect(result.report.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["html-duplicate-id", "html-link-omitted"]));
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    const nodes = result.document.children;
    const target = nodes.find((node) => node.type === "heading")!;
    expect(nodes[0]).toMatchObject({ type: "links", items: [{ href: `#${target.id}` }] });
    expect(nodes[1]).toMatchObject({ type: "paragraph", text: "Missing" });
  });

  it("bounds rectangular expansion for highly uneven tables", async () => {
    const wideRow = `<tr>${"<td>Wide</td>".repeat(100)}</tr>`;
    const narrowRows = "<tr><td>Narrow</td></tr>".repeat(100);
    const result = await convert(`<table>${wideRow}${narrowRows}</table>`, { limits: { maxNodes: 1500 } });
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    expect(result.document.children.some((node) => node.type === "table")).toBe(false);
    expect(result.report.warnings.some((warning) => warning.code === "html-table-flattened")).toBe(true);
  });

  it("collects local raster images through the shared resource snapshot and preserves alternative text", async () => {
    await writeFile(join(root, "flow.png"), await readFile(new URL("../../../../examples/conversion-markdown/flow.png", import.meta.url)));
    const result = await convert(`<h1>Images</h1><p>Diagram<img src="flow.png" alt="Flow"></p>
      <img src="./flow.png" alt="Again" srcset="remote.png 2x"><img src="missing.png" alt="Missing image description">`);
    expect(result.report.resourceCount).toBe(1);
    expect(result.report.resourceMap.map((item) => item.asset)).toEqual(["import-image-1", "import-image-1"]);
    expect(JSON.stringify(result.document)).toContain("Missing image description");
    expect(result.report.warnings.some((warning) => warning.code === "html-image-variants")).toBe(true);
    expect(result.report.warnings.some((warning) => warning.code === "resource-omitted")).toBe(true);
  });
});

describe("HTML safety and bounded parsing", () => {
  it("never executes scripts, fetches remote resources or emits active HTML", async () => {
    const fetchSpy = vi.fn(() => { throw new Error("Network access attempted"); });
    vi.stubGlobal("fetch", fetchSpy);
    const original = `<!doctype html><html><head><base href="https://bad.invalid/"><link rel="stylesheet" href="https://bad.invalid/x.css">
      <script>globalThis.__prdHtmlExecuted = true</script></head><body onload="alert(1)">
      <h1>Safe</h1><script src="https://bad.invalid/x.js">EXECUTABLE_SENTINEL</script>
      <style>CSS_SENTINEL</style><iframe srcdoc="<script>bad()</script>">FRAME_SENTINEL</iframe>
      <object>OBJECT_SENTINEL</object><svg><script>SVG_SENTINEL</script></svg><template>TEMPLATE_SENTINEL</template>
      <p hidden>HIDDEN_SENTINEL</p><p aria-hidden="true">ARIA_SENTINEL</p>
      <a href="java&#x73;cript:alert(1)">Blocked link</a><a href="data:text/html,unsafe">Data link</a>
      <img src="https://bad.invalid/pixel.png" onerror="alert(1)" alt="Remote description">
      <p>Readable final text.</p></body></html>`;
    const result = await convert(original);
    const content = JSON.stringify(result.document);
    for (const sentinel of ["EXECUTABLE_SENTINEL", "CSS_SENTINEL", "FRAME_SENTINEL", "OBJECT_SENTINEL", "SVG_SENTINEL", "TEMPLATE_SENTINEL", "HIDDEN_SENTINEL", "ARIA_SENTINEL", "onerror", "onload"]) {
      expect(content).not.toContain(sentinel);
    }
    expect(content).toContain("Readable final text.");
    expect(content).toContain("Remote description");
    expect(content).not.toContain('"href":"javascript:');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.report.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["html-element-omitted", "html-events-removed", "html-resource-policy", "html-link-omitted", "resource-omitted"]));
    expect(Buffer.from(readPrdArchive(result.archive)["attachments/source.html"]!).toString()).toBe(original);
  });

  it.each(["%PDF-1.7<p>renamed</p>", "<?xml version='1.0'?><root>XML</root>", "plain text", "<p>bad\u0000text</p>"])("rejects incompatible input detection", async (source) => {
    await expect(convert(source)).rejects.toThrow("Unsupported source format");
  });

  it("reports parser repairs and safely drops controls and unrepresentable links", async () => {
    const result = await convert(`<h1 title="first" title="duplicate">Safe</h1><p>Recovered <b>text</p></b>
      <form><label>Name</label><input value="CONTROL_SENTINEL"></form>
      <a href="file:///etc/passwd">File</a><a href="relative.html">Relative</a><a href="#%zz">Broken fragment</a>`);
    expect(JSON.stringify(result.document)).not.toContain("CONTROL_SENTINEL");
    expect(result.report.warnings.some((warning) => warning.code === "html-parser-recovery")).toBe(true);
    expect(validatePackageFiles(readPrdArchive(result.archive)).valid).toBe(true);
  });

  it("enforces parse work, nesting and input budgets before publishing output", async () => {
    await expect(convert("<p>One</p><p>Two</p>", { limits: { maxNodes: 4 } })).rejects.toThrow("HTML parse node budget");
    await expect(convert("<div>".repeat(80) + "deep" + "</div>".repeat(80))).rejects.toThrow("nesting");
    await expect(convert("<p>Oversize</p>", { limits: { maxInputBytes: 4 } })).rejects.toThrow("byte conversion limit");
    await writeFile(sourcePath, "<script>Only active content</script>");
    const outputPath = join(root, "never.prd");
    await expect(convertFileToPrd({ sourcePath, outputPath })).rejects.toThrow("No supported readable content");
    await expect(readFile(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("blocks encoded traversal and escaping symlinks in HTML image attributes", async () => {
    await mkdir(join(root, "input"));
    await writeFile(join(root, "outside.png"), "outside");
    await symlink(join(root, "outside.png"), join(root, "input/escape.png"));
    sourcePath = join(root, "input/source.html");
    const result = await convert('<h1>Paths</h1><img src="%2e%2e/outside.png"><img src="escape.png">');
    expect(result.report.resourceCount).toBe(0);
    expect(result.report.warnings.filter((warning) => warning.code === "resource-omitted")).toHaveLength(2);
    expect(JSON.stringify(result.report)).not.toContain(root);
  });
});
