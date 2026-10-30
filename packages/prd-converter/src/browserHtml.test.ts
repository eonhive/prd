/**
 * Company: EonHive Inc. | Title: Browser HTML Conversion Tests
 * Purpose: Verify Node parity, bounded static extraction and inactive source material.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import { validatePackageFiles } from "@eonhive/prd-validator";
import {
  convertInBrowser,
  convertMarkdownInBrowser,
  type BrowserConvertOptions,
} from "./browser.js";
import { convertDocument } from "./index.js";

const encode = (text: string) => new TextEncoder().encode(text);
const html = (
  text = "<h1>Portable HTML</h1><p>Readable content.</p>"
): BrowserConvertOptions => ({
  source: { name: "source.html", bytes: encode(text) },
});
afterEach(() => vi.unstubAllGlobals());

describe("browser HTML conversion", () => {
  it.each(["zip", "prd"] as const)(
    "matches real Node HTML output and quality in %s transport",
    async (container) => {
      const sourcePath = resolve("examples/conversion-html/source.html");
      const result = await convertInBrowser({
        source: {
          name: "source.html",
          bytes: new Uint8Array(await readFile(sourcePath)),
        },
        resources: [
          {
            name: "flow.png",
            bytes: new Uint8Array(
              await readFile(resolve("examples/conversion-html/flow.png"))
            ),
          },
        ],
        container,
      });
      const node = await convertDocument({ sourcePath, container });
      expect(result.document).toEqual(node.document);
      expect(result.report).toEqual(node.report);
      const files = readPrdArchive(result.archive);
      expect(files).toEqual(readPrdArchive(node.archive));
      expect(validatePackageFiles(files).valid).toBe(true);
      expect(result.report).toMatchObject({
        nodeCount: 11,
        resourceCount: 1,
        sourceFormat: "html",
      });
      const manifest = JSON.parse(
        new TextDecoder().decode(files["manifest.json"])
      );
      expect(manifest.entry).toBe("content/root.json");
      expect(
        manifest.attachments.find(
          (item: { id: string }) => item.id === "conversion-source"
        ).type
      ).toBe("application/octet-stream");
    }
  );

  it("keeps the Markdown-only export strict and generic Markdown output compatible", async () => {
    await expect(convertMarkdownInBrowser(html())).rejects.toThrow(
      "Unsupported source format"
    );
    const source = {
      name: "source.md",
      bytes: encode("# Original\n\nReadable."),
    };
    const generic = await convertInBrowser({ source });
    const legacy = await convertMarkdownInBrowser({ source });
    expect(readPrdArchive(generic.archive)).toEqual(
      readPrdArchive(legacy.archive)
    );
  });

  it("never executes source actions or retrieves source URLs", async () => {
    const fetch = vi.fn(() => {
      throw new Error("Unexpected source fetch");
    });
    vi.stubGlobal("fetch", fetch);
    const text =
      '<h1 onclick="bad()">Safe title</h1><script>globalThis.prdHtmlMarker = true</script><style>body{display:none}</style><iframe src="https://example.invalid/embed"></iframe><img src="https://example.invalid/photo.png" alt="Retained label"><a href="javascript:bad()">Unsafe link label</a><p>Readable.</p>';
    const result = await convertInBrowser(html(text));
    const reading = JSON.stringify(result.document);
    expect(reading).toContain("Retained label");
    expect(reading).toContain("Unsafe link label");
    expect(reading).not.toContain("prdHtmlMarker");
    expect(reading).not.toContain("javascript:");
    expect(reading).not.toContain("onclick");
    expect(result.report.warnings.map((warning) => warning.code)).toContain(
      "html-events-removed"
    );
    expect(fetch).not.toHaveBeenCalled();
    const source = readPrdArchive(result.archive)["attachments/source.html"]!;
    expect(new TextDecoder().decode(source)).toBe(text);
  });

  it("maps actual anchors, lists, tables and supplied raster resources", async () => {
    const image = new Uint8Array(
      await readFile(resolve("examples/conversion-html/flow.png"))
    );
    const result = await convertInBrowser({
      ...html(
        '<h1 id="top">Title</h1><ul><li>One</li><li>Two</li></ul><table><tr><th>Key</th></tr><tr><td>Value</td></tr></table><img src="./flow%20image.png" alt="Flow"><a href="#top">Return</a>'
      ),
      resources: [{ name: "flow image.png", bytes: image }],
    });
    if (result.document.profile !== "general-document")
      throw new Error("Unexpected profile");
    expect(result.document.children.map((node) => node.type)).toEqual([
      "heading",
      "list",
      "table",
      "image",
      "links",
    ]);
    const reading = JSON.stringify(result.document);
    expect(reading).toContain("#html-anchor-1");
    expect(result.report.resourceMap[0]?.source).toBe("./flow%20image.png");
    expect(result.report.resourceCount).toBe(1);
  });

  it("supports htm fragments and reports actual parser recovery", async () => {
    const result = await convertInBrowser({
      source: {
        name: "fragment.HTM",
        bytes: encode(
          '<h1 id="one" id="two">Recovered</h1><table><td>Cell</table>'
        ),
      },
    });
    expect(result.report.sourceFormat).toBe("html");
    expect(JSON.stringify(result.document)).toContain("Cell");
    expect(
      result.report.warnings.some(
        (warning) => warning.code === "html-parser-recovery"
      )
    ).toBe(true);
  });

  it("bounds parsing work, nesting, source size and selected resources", async () => {
    await expect(
      convertInBrowser({ ...html(), limits: { maxNodes: 3 } })
    ).rejects.toThrow("parse node budget");
    await expect(
      convertInBrowser(html("<div>".repeat(70) + "Text" + "</div>".repeat(70)))
    ).rejects.toThrow("nesting");
    await expect(
      convertInBrowser({ ...html(), limits: { maxInputBytes: 2 } })
    ).rejects.toThrow("byte limit");
    await expect(
      convertInBrowser({
        ...html(),
        resources: [{ name: "../bad.png", bytes: new Uint8Array() }],
      })
    ).rejects.toThrow("traversal");
  });

  it.each([
    "",
    "Plain text",
    "<script>bad()</script>",
    "<?xml version='1.0'?><html/>",
    "%PDF-1.7\n<h1>Wrong</h1>",
  ])("rejects unsupported or empty HTML content", async (text) => {
    await expect(convertInBrowser(html(text))).rejects.toThrow();
  });

  it("rejects invalid UTF-8, binary input and incompatible profiles", async () => {
    for (const bytes of [
      new Uint8Array([255]),
      encode("PK\u0003\u0004<h1>Wrong</h1>"),
      encode("<p>bad\u0000text</p>"),
    ]) {
      await expect(
        convertInBrowser({ source: { name: "bad.html", bytes } })
      ).rejects.toThrow();
    }
    await expect(
      convertInBrowser({ ...html(), profile: "comic" })
    ).rejects.toThrow("requested comic");
  });

  it("reports source opt-out and missing HTML resources", async () => {
    const result = await convertInBrowser({
      ...html('<h1>Title</h1><p>Readable.</p><img src="missing.png" alt="Flow">'),
      preserveSource: false,
    });
    expect(
      readPrdArchive(result.archive)["attachments/source.html"]
    ).toBeUndefined();
    expect(
      result.report.warnings.some(
        (warning) => warning.code === "source-not-preserved"
      )
    ).toBe(true);
    expect(
      result.report.warnings.find(
        (warning) => warning.code === "resource-omitted"
      )?.message
    ).toContain("alongside the HTML source");
    expect(JSON.stringify(result.document)).toContain("Readable.");
  });
});
