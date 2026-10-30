/**
 * Company: EonHive Inc. | Title: EPUB Conversion Tests
 * Purpose: Verify spine semantics, archive resources, chapter links and hostile XML/ZIP handling.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import { convertDocument, convertFileToPrd, type ConvertOptions } from "../index.js";

const encode = (text: string) => new TextEncoder().encode(text);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT3sAAAAASUVORK5CYII=", "base64");
const container = '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
const opf = `<package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Spine Book &amp; Chapters</dc:title></metadata>
<manifest><item id="last" href="chapters/a.xhtml" media-type="application/xhtml+xml"/><item id="first" href="chapters/z.xhtml" media-type="application/xhtml+xml"/><item id="image" href="images/flow.png" media-type="image/png"/></manifest>
<spine><itemref idref="first"/><itemref idref="last"/></spine></package>`;
const xhtml = (body: string, title = "Chapter") => `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body>${body}</body></html>`;
let root: string;
let sourcePath: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "prd-epub-test-"));
  sourcePath = join(root, "source.epub");
});
afterEach(async () => { vi.unstubAllGlobals(); await rm(root, { recursive: true, force: true }); });

function fixture(): Record<string, Uint8Array> {
  return {
    mimetype: encode("application/epub+zip"), "META-INF/container.xml": encode(container), "EPUB/book.opf": encode(opf),
    "EPUB/chapters/a.xhtml": encode(xhtml('<h1 id="same">Second chapter</h1><a href="z.xhtml#same">Back</a><img src="../images/flow.png" alt="Diagram"/>', "Second")),
    "EPUB/chapters/z.xhtml": encode(xhtml('<h1 id="same">First chapter</h1><p>Readable &amp; portable.</p><a href="a.xhtml#same">Next</a><a href="#same">Here</a><img src="../images/flow.png" alt="Diagram"/>', "First")),
    "EPUB/images/flow.png": png
  };
}

async function convert(files = fixture(), options: Partial<ConvertOptions> = {}) {
  await writeFile(sourcePath, zipSync(files));
  return convertDocument({ sourcePath, ...options });
}

describe("EPUB semantic conversion", () => {
  it("uses OPF spine order, chapter boundaries, globally unique anchors and shared raster resources", async () => {
    const result = await convert();
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    expect(result.document.title).toBe("Spine Book & Chapters");
    const chapters = result.document.children;
    expect(chapters.map((node) => node.type === "section" && node.title)).toEqual(["First", "Second"]);
    const first = chapters[0];
    const last = chapters[1];
    if (first?.type !== "section" || !first.children || last?.type !== "section" || !last.children) throw new Error("Missing chapters");
    const ids = [...chapters, ...first.children, ...last.children].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    const links = first.children.filter((node) => node.type === "links");
    expect(links.flatMap((node) => node.items.map((item) => item.href))).toEqual([`#${last.children[0]!.id}`, `#${first.children[0]!.id}`]);
    expect(last.children.find((node) => node.type === "links")).toMatchObject({ items: [{ href: `#${first.children[0]!.id}` }] });
    expect(result.report.resourceCount).toBe(1);
    expect(result.report.resourceMap).toHaveLength(2);
    const files = readPrdArchive(result.archive);
    expect(validatePackageFiles(files).valid).toBe(true);
    expect(files["assets/images/import-image-1.png"]).toEqual(new Uint8Array(png));
    expect(Buffer.from(files["attachments/source.epub"]!).equals(await readFile(sourcePath))).toBe(true);
    expect(JSON.parse(Buffer.from(files["attachments/conversion-quality.json"]!).toString())).toEqual(result.report);
    expect((await convertDocument({ sourcePath })).document).toEqual(result.document);
  });

  it("supports OPF 2.0 and namespace prefixes without using HTML parser recovery", async () => {
    const files = fixture();
    files["EPUB/book.opf"] = encode(opf.replace('version="3.0"', 'version="2.0"'));
    files["EPUB/chapters/z.xhtml"] = encode('<x:html xmlns:x="http://www.w3.org/1999/xhtml"><x:body><x:h1>Prefixed chapter</x:h1></x:body></x:html>');
    const result = await convert(files);
    expect(JSON.stringify(result.document)).toContain("Prefixed chapter");
    expect(result.report.warnings.some((warning) => warning.code === "html-parser-recovery")).toBe(false);
  });

  it("honors title, identity, profile, envelope and source opt-out options", async () => {
    const result = await convert(fixture(), { title: "Custom", id: "urn:test:epub", profile: "general-document", container: "prd", preserveSource: false });
    const files = readPrdArchive(result.archive);
    expect(result.document.title).toBe("Custom");
    expect(JSON.parse(Buffer.from(files["manifest.json"]!).toString()).id).toBe("urn:test:epub");
    expect(files["attachments/source.epub"]).toBeUndefined();
    expect(result.report.warnings.some((warning) => warning.code === "source-not-preserved")).toBe(true);
  });

  it("retains nonlinear chapters and reports omitted resources and unsafe source behavior", async () => {
    const files = fixture();
    files["EPUB/book.opf"] = encode(opf.replace('<spine>', '<spine page-progression-direction="rtl">').replace('idref="last"', 'idref="last" linear="no"'));
    files["EPUB/chapters/z.xhtml"] = encode(xhtml('<script>unsafeMarker()</script><style>body{color:red}</style><h1 id="same" onclick="bad()">Safe</h1><p>Text</p><a href="https://example.com/">External</a><a href="a.xhtml">Chapter</a>'));
    files["unused.xml"] = encode('<!DOCTYPE ignored [<!ENTITY x SYSTEM "file:///etc/passwd">]>');
    const fetch = vi.fn(() => { throw new Error("Unexpected fetch"); });
    vi.stubGlobal("fetch", fetch);
    const result = await convert(files);
    expect(JSON.stringify(result.document)).not.toContain("unsafeMarker");
    expect(JSON.stringify(result.document)).toContain("https://example.com/");
    expect(result.report.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["epub-nonlinear-content", "epub-reading-direction", "epub-members-omitted", "html-element-omitted", "html-events-removed"]));
    expect(fetch).not.toHaveBeenCalled();
    expect(await readdir(root)).toEqual(["source.epub"]);
  });

  it("warns for unresolved links and missing, undeclared, remote or escaping images while retaining labels", async () => {
    const files = fixture();
    files["EPUB/chapters/z.xhtml"] = encode(xhtml('<p id="same">Body</p><a href="a.xhtml#missing">Missing anchor</a><a href="other.xhtml">Missing chapter</a><a href="../../../outside">Escape</a><a href="javascript:alert(1)">Unsafe</a><img src="https://example.com/x.png" alt="Remote alt"/><img src="../../../outside.png" alt="Escape alt"/><img src="../missing.png" alt="Missing alt"/>'));
    const result = await convert(files);
    expect(result.report.warnings.filter((warning) => warning.code === "epub-link-omitted")).toHaveLength(3);
    expect(result.report.warnings.filter((warning) => warning.code === "epub-image-omitted")).toHaveLength(3);
    expect(JSON.stringify(result.document)).toContain("Remote alt");
    expect(JSON.stringify(result.document)).not.toContain("#pending");
    expect(JSON.stringify(result.document)).not.toContain("javascript:");
  });

  it("resolves percent-encoded local paths and fragments exactly once", async () => {
    const files = fixture();
    files["EPUB/book.opf"] = encode(opf.replace('chapters/a.xhtml', 'chapters/a%20b.xhtml'));
    files["EPUB/chapters/a b.xhtml"] = encode(new TextDecoder().decode(files["EPUB/chapters/a.xhtml"]).replace("z.xhtml#same", "z.xhtml#target%20space"));
    delete files["EPUB/chapters/a.xhtml"];
    files["EPUB/chapters/z.xhtml"] = encode(xhtml('<h1 id="target space">Here</h1><a href="a%20b.xhtml#same">Next</a><a href="#target%20space">Here</a>'));
    const result = await convert(files);
    expect(result.report.warnings.some((warning) => warning.code === "epub-link-omitted")).toBe(false);
  });

  it("reports mismatched image media types and invalid raster bytes", async () => {
    const files = fixture();
    files["EPUB/book.opf"] = encode(opf.replace('media-type="image/png"', 'media-type="image/jpeg"'));
    const mismatched = await convert(files);
    expect(mismatched.report.resourceCount).toBe(0);
    expect(mismatched.report.warnings.some((warning) => warning.code === "epub-image-omitted")).toBe(true);
    files["EPUB/book.opf"] = encode(opf);
    files["EPUB/images/flow.png"] = encode("invalid PNG");
    const invalid = await convert(files);
    expect(invalid.report.warnings.some((warning) => warning.code === "resource-omitted")).toBe(true);
    expect(invalid.report.resourceCount).toBe(0);
  });

  it("folds a matching opening heading into the chapter title and preserves links to it", async () => {
    const files = fixture();
    files["EPUB/chapters/z.xhtml"] = encode(xhtml('<h1 id="same">First</h1><p>Body</p><a href="#same">Title</a>', "First"));
    const result = await convert(files);
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    const chapter = result.document.children[0];
    if (chapter?.type !== "section" || !chapter.children) throw new Error("Missing chapter");
    expect(chapter.children.some((node) => node.type === "heading")).toBe(false);
    expect(chapter.children.find((node) => node.type === "links")).toMatchObject({ items: [{ href: `#${chapter.id}` }] });
    expect(result.report.warnings.some((warning) => warning.code === "epub-heading-normalized")).toBe(true);
  });
});

describe("EPUB malformed and hostile input", () => {
  it.each(["mimetype", "META-INF/container.xml", "EPUB/book.opf", "EPUB/chapters/z.xhtml"])("fails missing required member %s without publishing output", async (path) => {
    const files = fixture();
    delete files[path];
    await writeFile(sourcePath, zipSync(files));
    const outputPath = join(root, "never.prd");
    await expect(convertFileToPrd({ sourcePath, outputPath })).rejects.toThrow();
    await expect(readFile(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each([
    '<!DOCTYPE html [<!ENTITY ex SYSTEM "file:///etc/passwd">]><html xmlns="http://www.w3.org/1999/xhtml"><body>&ex;</body></html>',
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><p>broken</body></html>',
    '<html xmlns="http://www.w3.org/1999/xhtml"><body>&unknown;</body></html>',
    '<html xmlns="http://www.w3.org/1999/xhtml" xml:base="https://example.com"><body>Base</body></html>',
    '<?xml-stylesheet href="https://example.com/style"?><html xmlns="http://www.w3.org/1999/xhtml"><body>PI</body></html>',
    '<?xml version="1.0" encoding="UTF-16"?><html xmlns="http://www.w3.org/1999/xhtml"><body>Encoding</body></html>',
    '<html xmlns="wrong"><body>Namespace</body></html>'
  ])("rejects unsafe or malformed chapter XML", async (chapter) => {
    const files = fixture();
    files["EPUB/chapters/z.xhtml"] = encode(chapter);
    await expect(convert(files)).rejects.toThrow();
  });

  it.each([
    opf.replace('id="last"', 'id="first"'),
    opf.replace('chapters/a.xhtml', 'chapters/z.xhtml'),
    opf.replace('idref="last"', 'idref="missing"'),
    opf.replace('idref="last"', 'idref="first"'),
    opf.replace('href="chapters/z.xhtml"', 'href="../../../escape.xhtml"'),
    opf.replace('href="chapters/z.xhtml"', 'href="%2Fetc/passwd"'),
    opf.replace('href="chapters/z.xhtml"', 'href="chapters/%5cfile.xhtml"'),
    opf.replace('href="chapters/z.xhtml"', 'href="https://example.com/chapter.xhtml"'),
    opf.replace('idref="first"', 'idref="image"'),
    opf.replace('idref="first"', 'idref="first" properties="rendition:layout-pre-paginated"'),
    opf.replace('</metadata>', '<meta property="rendition:layout">pre-paginated</meta></metadata>'),
    opf.replace('version="3.0"', 'version="9.0"')
  ])("rejects unsupported or ambiguous package relationships", async (packageXml) => {
    const files = fixture();
    files["EPUB/book.opf"] = encode(packageXml);
    await expect(convert(files)).rejects.toThrow();
  });

  it("rejects encryption declarations, invalid mimetype and disguised binaries", async () => {
    const files = fixture();
    files["META-INF/encryption.xml"] = encode("unused");
    await expect(convert(files)).rejects.toThrow("Encrypted or obfuscated");
    delete files["META-INF/encryption.xml"];
    for (const invalid of ["application/zip", "\ufeffapplication/epub+zip", "application/epub+zip\n"]) {
      files.mimetype = encode(invalid);
      await expect(convert(files)).rejects.toThrow("mimetype");
    }
    await writeFile(sourcePath, png);
    await expect(convertDocument({ sourcePath })).rejects.toThrow("Unsupported source");
  });

  it("enforces archive limits, cumulative XML work and depth limits", async () => {
    await expect(convert(fixture(), { limits: { maxInputBytes: 16 } })).rejects.toThrow("byte conversion limit");
    await expect(convert(fixture(), { limits: { maxResourceBytes: 64 } })).rejects.toMatchObject({ code: "archive-file-size-limit" });
    await expect(convert(fixture(), { limits: { maxTotalResourceBytes: 512 } })).rejects.toMatchObject({ code: "archive-expanded-size-limit" });
    await expect(convert(fixture(), { limits: { maxResources: 3 } })).rejects.toMatchObject({ code: "archive-entry-limit" });
    await expect(convert(fixture(), { limits: { maxNodes: 30 } })).rejects.toThrow("XML work");
    const files = fixture();
    files["EPUB/chapters/z.xhtml"] = encode(xhtml('<div>'.repeat(65) + 'deep' + '</div>'.repeat(65)));
    await expect(convert(files)).rejects.toThrow("nesting");
  });

  it("rejects traversal members, invalid UTF-8 and empty chapters", async () => {
    const files = fixture();
    files["../outside"] = encode("bad");
    await expect(convert(files)).rejects.toMatchObject({ code: "archive-member-path-invalid" });
    delete files["../outside"];
    files["EPUB/chapters/z.xhtml"] = new Uint8Array([0xff]);
    await expect(convert(files)).rejects.toThrow();
    files["EPUB/chapters/z.xhtml"] = encode(xhtml(''));
    await expect(convert(files)).rejects.toThrow("no supported readable content");
  });

  it.each([
    container.replace('EPUB/book.opf', '../escape.opf'),
    container.replace('EPUB/book.opf', 'https://example.com/book.opf'),
    container.replace('urn:oasis:names:tc:opendocument:xmlns:container', 'wrong'),
    '<!DOCTYPE container [<!ENTITY x SYSTEM "https://example.com/">]>' + container
  ])("rejects unsafe or namespace-incorrect container XML", async (containerXml) => {
    const files = fixture();
    files["META-INF/container.xml"] = encode(containerXml);
    await expect(convert(files)).rejects.toThrow();
  });

  it("selects the first rendition explicitly and bounds ignored compressed members", async () => {
    const files = fixture();
    files["META-INF/container.xml"] = encode(container.replace('</rootfiles>', '<rootfile full-path="other.opf" media-type="application/oebps-package+xml"/></rootfiles>'));
    expect((await convert(files)).report.warnings.some((warning) => warning.code === "epub-alternate-renditions")).toBe(true);
    files["ignored.bin"] = new Uint8Array(64 * 1024);
    await expect(convert(files, { limits: { maxResourceBytes: 4096 } })).rejects.toMatchObject({ code: "archive-file-size-limit" });
  });

  it.each(["comic", "storyboard"] as const)("rejects incompatible profile %s", async (profile) => {
    await expect(convert(fixture(), { profile })).rejects.toThrow(`requested ${profile}`);
  });
});
