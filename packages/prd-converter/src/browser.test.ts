/**
 * Company: EonHive Inc. | Title: Browser Conversion Contract Tests
 * Purpose: Prove Node parity, safe selected resources and actual canonical archive output.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { convertMarkdownInBrowser, type BrowserConvertOptions } from "./browser.js";
import { convertDocument } from "./index.js";

const encode = (text: string) => new TextEncoder().encode(text);
const simple = (text = "# A portable document\n\nReadable content."): BrowserConvertOptions => ({ source: { name: "source.md", bytes: encode(text) } });
afterEach(() => vi.unstubAllGlobals());

describe("browser Markdown conversion", () => {
  it.each(["zip", "prd"] as const)("matches Node logical output and quality in %s transport", async (container) => {
    const sourcePath = resolve("examples/conversion-markdown/source.md");
    const source = { name: "source.md", bytes: new Uint8Array(await readFile(sourcePath)) };
    const image = { name: "flow.png", bytes: new Uint8Array(await readFile(resolve("examples/conversion-markdown/flow.png"))) };
    const browser = await convertMarkdownInBrowser({ source, resources: [image], container });
    const node = await convertDocument({ sourcePath, container });
    expect(browser.document).toEqual(node.document);
    expect(browser.report).toEqual(node.report);
    const files = readPrdArchive(browser.archive);
    expect(validatePackageFiles(files).valid).toBe(true);
    const nodeFiles = readPrdArchive(node.archive);
    expect(Object.keys(files).sort()).toEqual(Object.keys(nodeFiles).sort());
    for (const [name, bytes] of Object.entries(files)) expect(Buffer.from(bytes).equals(Buffer.from(nodeFiles[name]!)), name).toBe(true);
  });

  it("uses caller metadata and warns when original source retention is disabled", async () => {
    const result = await convertMarkdownInBrowser({ ...simple(), title: "Chosen title", id: "urn:test:browser", profile: "general-document", preserveSource: false });
    const files = readPrdArchive(result.archive);
    expect(result.document.title).toBe("Chosen title");
    expect(JSON.parse(new TextDecoder().decode(files["manifest.json"])).id).toBe("urn:test:browser");
    expect(files["attachments/source.md"]).toBeUndefined();
    expect(result.report.warnings.some((item) => item.code === "source-not-preserved")).toBe(true);
  });

  it("snapshots caller-owned views before asynchronous extraction", async () => {
    const original = Buffer.from("# Original\n\nRetained text.");
    const expected = Buffer.from(original);
    const pending = convertMarkdownInBrowser({ source: { name: "source.md", bytes: original } });
    original.fill(0);
    const result = await pending;
    const files = readPrdArchive(result.archive);
    expect(Buffer.from(files["attachments/source.md"]!).equals(expected)).toBe(true);
    expect(result.document.title).toBe("Original");
  });

  it.each(["https://example.invalid/image.png", "../image.png", "/etc/image.png", "file:image.png", "%2e%2e/image.png", "image.png?secret"])("reports unsafe/missing resource %s without retrieval", async (reference) => {
    const fetch = vi.fn(() => { throw new Error("Unexpected network retrieval"); });
    vi.stubGlobal("fetch", fetch);
    const result = await convertMarkdownInBrowser(simple(`# Source\n\n![Available label](${reference})\n\nReadable.`));
    expect(result.report.resourceCount).toBe(0);
    expect(result.report.warnings.some((warning) => warning.code === "resource-omitted")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps encoded local references, deduplicates assets and reports unused selected files", async () => {
    const bytes = new Uint8Array(await readFile(resolve("examples/conversion-markdown/flow.png")));
    const result = await convertMarkdownInBrowser({ ...simple("# Source\n\n![One](./flow%20image.png)\n\n![Two](flow%20image.png)"), resources: [{ name: "flow image.png", bytes }, { name: "unused.png", bytes }] });
    expect(result.report.resourceCount).toBe(1);
    expect(result.report.resourceMap).toHaveLength(2);
    expect(result.report.warnings.some((warning) => warning.code === "resource-unreferenced" && warning.reference === "unused.png")).toBe(true);
  });

  it("reports a disguised raster without copying it into the resource map", async () => {
    const result = await convertMarkdownInBrowser({ ...simple("# Source\n\n![Bad](image.png)"), resources: [{ name: "image.png", bytes: encode("<svg onload='bad()'/>") }] });
    expect(result.report.resourceCount).toBe(0);
    expect(result.report.warnings.some((warning) => warning.message.includes("signature"))).toBe(true);
  });

  it.each(["", "```js\nignored()\n```", "<script>bad()</script>"])("refuses empty or entirely unsupported content", async (text) => {
    await expect(convertMarkdownInBrowser(simple(text))).rejects.toThrow();
  });

  it.each([new Uint8Array([255, 254]), encode("%PDF-1.7\n%%EOF"), encode("PK\u0003\u0004"), encode("a\u0000b")])("rejects binary, invalid UTF-8 and disguised documents", async (bytes) => {
    await expect(convertMarkdownInBrowser({ source: { name: "source.md", bytes } })).rejects.toThrow();
  });

  it("enforces source/resource/node budgets and refuses raised browser limits", async () => {
    await expect(convertMarkdownInBrowser({ ...simple(), limits: { maxInputBytes: 1 } })).rejects.toThrow("byte limit");
    await expect(convertMarkdownInBrowser({ ...simple(), limits: { maxNodes: 1 } })).rejects.toThrow("node count");
    await expect(convertMarkdownInBrowser({ ...simple(), limits: { maxNodes: 0 } })).rejects.toThrow("positive");
    await expect(convertMarkdownInBrowser({ ...simple(), limits: { maxInputBytes: 5 * 1024 * 1024 } })).rejects.toThrow("tightened");
    const resources = [{ name: "one.png", bytes: new Uint8Array(4) }, { name: "two.png", bytes: new Uint8Array(4) }];
    await expect(convertMarkdownInBrowser({ ...simple(), resources, limits: { maxResources: 1 } })).rejects.toThrow("count");
    await expect(convertMarkdownInBrowser({ ...simple(), resources, limits: { maxResourceBytes: 2 } })).rejects.toThrow("byte limit");
    await expect(convertMarkdownInBrowser({ ...simple(), resources, limits: { maxTotalResourceBytes: 6 } })).rejects.toThrow("resource bytes");
  });

  it("rejects duplicate or unsafe names, incompatible profiles and strategies", async () => {
    const input = { name: "same.png", bytes: new Uint8Array() };
    await expect(convertMarkdownInBrowser({ ...simple(), resources: [input, input] })).rejects.toThrow("unique");
    await expect(convertMarkdownInBrowser({ ...simple(), resources: [{ ...input, name: "../same.png" }] })).rejects.toThrow("traversal");
    await expect(convertMarkdownInBrowser({ ...simple(), source: { name: "../source.md", bytes: encode("Text") } })).rejects.toThrow("filename");
    await expect(convertMarkdownInBrowser({ ...simple(), profile: "comic" })).rejects.toThrow("requested comic");
    await expect(convertMarkdownInBrowser({ ...simple(), strategy: "hybrid" as "adaptive" })).rejects.toThrow("adaptive");
  });

  it("fails clearly without Web Crypto instead of changing identity semantics", async () => {
    vi.stubGlobal("crypto", undefined);
    await expect(convertMarkdownInBrowser(simple())).rejects.toThrow("Web Crypto");
  });
});
