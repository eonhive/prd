/**
 * Company: EonHive Inc. | Title: DOCX Conversion Tests
 * Purpose: Verify Word semantic mapping, OPC relationships, XML bounds and hostile inputs.
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
import { REL_NS, WORD_NS, WORD_TYPE } from "./docxPackage.js";

const encode = (value: string) => new TextEncoder().encode(value);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT3sAAAAASUVORK5CYII=", "base64");
const packageRelationships = (items: string) => `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items}</Relationships>`;
const relationship = (id: string, type: string, target: string, mode = "") => `<Relationship Id="${id}" Type="${REL_NS}/${type}" Target="${target}" ${mode}/>`;
const documentXml = (body: string) => `<w:document xmlns:w="${WORD_NS}" xmlns:r="${REL_NS}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body}</w:body></w:document>`;
const paragraph = (text: string, properties = "") => `<w:p>${properties ? `<w:pPr>${properties}</w:pPr>` : ""}<w:r><w:t>${text}</w:t></w:r></w:p>`;
const image = '<w:p><w:r><w:drawing><wp:inline><wp:docPr id="1" name="Image" descr="Diagram"/><a:graphic><a:blip r:embed="image"/></a:graphic></wp:inline></w:drawing></w:r></w:p>';
const table = '<w:tbl><w:tr><w:trPr><w:tblHeader/></w:trPr><w:tc>'+paragraph("Feature")+'</w:tc><w:tc>'+paragraph("Result")+'</w:tc></w:tr><w:tr><w:tc>'+paragraph("Text")+'</w:tc><w:tc>'+paragraph("Retained")+'</w:tc></w:tr></w:tbl>';
const numbering = `<w:numbering xmlns:w="${WORD_NS}"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
let root: string;
let sourcePath: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "prd-docx-test-")); sourcePath = join(root, "source.docx"); });
afterEach(async () => { vi.unstubAllGlobals(); await rm(root, { recursive: true, force: true }); });

function fixture(body = paragraph("Heading", '<w:pStyle w:val="Heading1"/>') + paragraph("Body text") + table + image): Record<string, Uint8Array> {
  return {
    "[Content_Types].xml": encode(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="${WORD_TYPE}"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`),
    "_rels/.rels": encode(packageRelationships(relationship("main", "officeDocument", "word/document.xml"))),
    "word/document.xml": encode(documentXml(body)),
    "word/_rels/document.xml.rels": encode(packageRelationships(relationship("styles", "styles", "styles.xml") + relationship("numbering", "numbering", "numbering.xml") + relationship("image", "image", "media/flow.png") + relationship("link", "hyperlink", "https://example.com/", 'TargetMode="External"'))),
    "word/styles.xml": encode(`<w:styles xmlns:w="${WORD_NS}"><w:style w:type="paragraph" w:styleId="Base"><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:basedOn w:val="Base"/></w:style></w:styles>`),
    "word/numbering.xml": encode(numbering),
    "word/media/flow.png": png
  };
}

async function convert(files = fixture(), options: Partial<ConvertOptions> = {}) {
  await writeFile(sourcePath, zipSync(files));
  return convertDocument({ sourcePath, ...options });
}

describe("DOCX semantics", () => {
  it("maps inherited headings, paragraphs, tables and unchanged images to canonical content", async () => {
    const result = await convert();
    expect(result.document.title).toBe("Heading");
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    expect(result.document.children.map((node) => node.type)).toEqual(["heading", "paragraph", "table", "image"]);
    expect(result.document.children[0]).toMatchObject({ level: 1, text: "Heading" });
    expect(result.document.children[2]).toMatchObject({ columns: [{ label: "Feature" }, { label: "Result" }], rows: [{ "column-1": "Text", "column-2": "Retained" }] });
    const files = readPrdArchive(result.archive);
    expect(validatePackageFiles(files).valid).toBe(true);
    expect(files["assets/images/import-image-1.png"]).toEqual(new Uint8Array(png));
    expect(Buffer.from(files["attachments/source.docx"]!).equals(await readFile(sourcePath))).toBe(true);
    expect(JSON.parse(Buffer.from(files["attachments/conversion-quality.json"]!).toString())).toEqual(result.report);
    expect((await convertDocument({ sourcePath })).document).toEqual(result.document);
  });

  it("groups consecutive decimal items and preserves continued numbering as explicit text", async () => {
    const props = '<w:numPr><w:numId w:val="1"/><w:ilvl w:val="0"/></w:numPr>';
    const result = await convert(fixture(paragraph("First", props) + paragraph("Second", props) + paragraph("Break") + paragraph("Third", props)));
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    expect(result.document.children).toMatchObject([{ type: "list", style: "ordered", items: ["First", "Second"] }, { type: "paragraph", text: "Break" }, { type: "paragraph", text: "3. Third" }]);
    expect(result.report.warnings.some((warning) => warning.code === "docx-list-continuation")).toBe(true);
  });

  it("keeps the numeric position after an omitted empty decimal item", async () => {
    const props = '<w:numPr><w:numId w:val="1"/></w:numPr>';
    const result = await convert(fixture(paragraph("", props) + paragraph("Second", props)));
    expect(JSON.stringify(result.document)).toContain("2. Second");
    expect(result.report.warnings.some((warning) => warning.code === "docx-empty-list-item")).toBe(true);
  });

  it("retains a title-only Word document as readable canonical content", async () => {
    const files = fixture(paragraph("Only title", '<w:pStyle w:val="Title"/>'));
    files["word/styles.xml"] = encode(`<w:styles xmlns:w="${WORD_NS}"><w:style w:styleId="Title"/></w:styles>`);
    const result = await convert(files);
    expect(result.document.title).toBe("Only title");
    expect(JSON.stringify(result.document)).toContain('"text":"Only title"');
    expect(validatePackageFiles(readPrdArchive(result.archive)).valid).toBe(true);
  });

  it("resolves a relocated main part, package-root targets and relative resources", async () => {
    const files = fixture();
    files["_rels/.rels"] = encode(packageRelationships(relationship("main", "officeDocument", "/docs/main.xml")));
    files["[Content_Types].xml"] = encode(new TextDecoder().decode(files["[Content_Types].xml"]).replace('/word/document.xml', '/docs/main.xml'));
    files["docs/main.xml"] = files["word/document.xml"]!;
    files["docs/_rels/main.xml.rels"] = encode(new TextDecoder().decode(files["word/_rels/document.xml.rels"]).replace('Target="styles.xml"', 'Target="../word/styles.xml"').replace('Target="numbering.xml"', 'Target="../word/numbering.xml"').replace('Target="media/flow.png"', 'Target="../word/media/flow.png"'));
    delete files["word/document.xml"];
    delete files["word/_rels/document.xml.rels"];
    expect((await convert(files)).report.resourceCount).toBe(1);
  });

  it("retains bookmark and safe external links and never activates unsafe destinations", async () => {
    const body = '<w:p><w:bookmarkStart w:id="1" w:name="target"/><w:r><w:t>Target</w:t></w:r></w:p><w:p><w:hyperlink w:anchor="target"><w:r><w:t>Jump</w:t></w:r></w:hyperlink><w:hyperlink r:id="link"><w:r><w:t>External</w:t></w:r></w:hyperlink></w:p>';
    const result = await convert(fixture(body));
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    expect(result.document.children.filter((node) => node.type === "links").flatMap((node) => node.items.map((item) => item.href))).toEqual(["#docx-node-1", "https://example.com/"]);
    const files = fixture(body.replace('w:anchor="target"', 'w:anchor="missing"'));
    files["word/_rels/document.xml.rels"] = encode(packageRelationships(relationship("link", "hyperlink", "javascript:alert(1)", 'TargetMode="External"')));
    const unsafe = await convert(files);
    expect(JSON.stringify(unsafe.document)).not.toContain("javascript:");
    expect(JSON.stringify(unsafe.document)).not.toContain("#pending");
    expect(JSON.stringify(unsafe.document)).toContain("External");
    expect(unsafe.report.warnings.some((warning) => warning.code === "docx-link-omitted")).toBe(true);
  });

  it("reads namespace aliases correctly and does not trust spoofed attribute prefixes", async () => {
    const body = paragraph("Aliased heading", '<w:outlineLvl xmlns:q="'+WORD_NS+'" q:val="2"/>') + paragraph("Ordinary", '<w:outlineLvl xmlns:fake="wrong" fake:val="0"/>');
    const result = await convert(fixture(body));
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    expect(result.document.children).toMatchObject([{ type: "heading", level: 3 }, { type: "paragraph" }]);
  });

  it("keeps stored field results and current revisions while reporting omitted instructions and history", async () => {
    const body = '<w:p><w:ins><w:r><w:t>Current </w:t></w:r></w:ins><w:del><w:r><w:delText>Deleted marker</w:delText></w:r></w:del><w:r><w:rPr><w:vanish/></w:rPr><w:t>Hidden marker</w:t></w:r><w:fldSimple w:instr="DDE unsafe instruction"><w:r><w:t>Cached result</w:t></w:r></w:fldSimple><w:r><w:footnoteReference w:id="1"/></w:r></w:p>';
    const fetch = vi.fn(() => { throw new Error("Unexpected fetch"); }); vi.stubGlobal("fetch", fetch);
    const result = await convert(fixture(body));
    expect(JSON.stringify(result.document)).toContain("Current Cached result");
    for (const marker of ["Deleted marker", "Hidden marker", "DDE"]) expect(JSON.stringify(result.document)).not.toContain(marker);
    expect(result.report.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["docx-revisions", "docx-hidden-run", "docx-fields", "docx-reference-omitted"]));
    expect(fetch).not.toHaveBeenCalled();
    expect(await readdir(root)).toEqual(["source.docx"]);
  });

  it("flattens merged tables and reports unsupported list numbering and embedded content", async () => {
    const merged = table.replace('<w:tc>', '<w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr>');
    const body = merged + paragraph("Nested list", '<w:numPr><w:numId w:val="1"/><w:ilvl w:val="1"/></w:numPr>') + '<w:altChunk r:id="unused"/>';
    const result = await convert(fixture(body));
    expect(JSON.stringify(result.document)).toContain("Retained");
    expect(result.report.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["docx-table-flattened", "docx-list-flattened", "docx-object-omitted"]));
  });

  it("reports native equations rather than presenting incomplete notation as equivalent text", async () => {
    const body = '<w:p><w:r><w:t>Equation follows</w:t></w:r><m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:r><m:t>math marker</m:t></m:r></m:oMath></w:p>';
    const result = await convert(fixture(body));
    expect(JSON.stringify(result.document)).not.toContain("math marker");
    expect(result.report.warnings.some((warning) => warning.code === "docx-equation-omitted")).toBe(true);
  });

  it("warns for external images, missing media, and signature-mismatched raster data", async () => {
    const files = fixture(image + paragraph("Body"));
    files["word/_rels/document.xml.rels"] = encode(packageRelationships(relationship("image", "image", "https://example.com/x.png", 'TargetMode="External"')));
    expect((await convert(files)).report.warnings.some((warning) => warning.code === "docx-image-omitted")).toBe(true);
    files["word/_rels/document.xml.rels"] = fixture()["word/_rels/document.xml.rels"]!;
    delete files["word/media/flow.png"];
    expect((await convert(files)).report.resourceCount).toBe(0);
    files["word/media/flow.png"] = encode("bad PNG");
    expect((await convert(files)).report.warnings.some((warning) => warning.code === "resource-omitted")).toBe(true);
  });

  it("honors compatible title/identity/profile/transport and source-retention options", async () => {
    const result = await convert(fixture(), { title: "Custom", id: "urn:test:word", profile: "general-document", container: "prd", preserveSource: false });
    const files = readPrdArchive(result.archive);
    expect(result.document.title).toBe("Custom");
    expect(JSON.parse(Buffer.from(files["manifest.json"]!).toString()).id).toBe("urn:test:word");
    expect(files["attachments/source.docx"]).toBeUndefined();
    expect(result.report.warnings.some((warning) => warning.code === "source-not-preserved")).toBe(true);
  });
});

describe("DOCX hostile and unsupported inputs", () => {
  it.each(["[Content_Types].xml", "_rels/.rels", "word/document.xml"])("fails missing required part %s without publishing", async (path) => {
    const files = fixture(); delete files[path]; await writeFile(sourcePath, zipSync(files));
    const outputPath = join(root, "never.prd");
    await expect(convertFileToPrd({ sourcePath, outputPath })).rejects.toThrow();
    await expect(readFile(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["../escape.xml", "../../escape.xml", "file:///etc/passwd", "word/%5cfile.xml", "word/../..", "//server/share", "word/document.xml?query"])("rejects unsafe internal targets %s", async (target) => {
    const files = fixture(); files["_rels/.rels"] = encode(packageRelationships(relationship("main", "officeDocument", target)));
    await expect(convert(files)).rejects.toThrow();
  });

  it.each([
    '<!DOCTYPE document [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + documentXml(paragraph("&x;")),
    documentXml('<w:p><w:r><w:t>broken</w:p>'),
    documentXml(paragraph("&unknown;")),
    documentXml(paragraph("Base")).replace('<w:body>', '<w:body xml:base="https://example.com/">'),
    '<?xml-stylesheet href="https://example.com/"?>' + documentXml(paragraph("PI")),
    '<?xml version="1.0" encoding="UTF-16"?>' + documentXml(paragraph("Wrong encoding")),
    documentXml(paragraph("Strict")).replaceAll(WORD_NS, "http://purl.oclc.org/ooxml/wordprocessingml/main")
  ])("rejects malformed, unsafe or unsupported XML", async (document) => {
    const files = fixture(); files["word/document.xml"] = encode(document);
    await expect(convert(files)).rejects.toThrow();
  });

  it("rejects duplicate IDs, cyclic styles, duplicate content types and macro-enabled packages", async () => {
    const files = fixture();
    files["_rels/.rels"] = encode(packageRelationships(relationship("same", "officeDocument", "word/document.xml") + relationship("same", "image", "word/media/flow.png")));
    await expect(convert(files)).rejects.toThrow("duplicate relationship");
    files["_rels/.rels"] = fixture()["_rels/.rels"]!;
    files["word/styles.xml"] = encode(`<w:styles xmlns:w="${WORD_NS}"><w:style w:styleId="Heading1"><w:basedOn w:val="Heading1"/></w:style></w:styles>`);
    await expect(convert(files)).rejects.toThrow("cyclic");
    files["word/styles.xml"] = fixture()["word/styles.xml"]!;
    files["[Content_Types].xml"] = encode(new TextDecoder().decode(files["[Content_Types].xml"]).replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>'));
    await expect(convert(files)).rejects.toThrow("duplicate default");
    files["[Content_Types].xml"] = encode(new TextDecoder().decode(fixture()["[Content_Types].xml"]).replace(WORD_TYPE, "application/vnd.ms-word.document.macroEnabled.main+xml"));
    await expect(convert(files)).rejects.toThrow("Macro-enabled");
  });

  it("rejects archive traversal, byte/count limits, cumulative XML work and deep nesting", async () => {
    const files = fixture(); files["../outside.bin"] = encode("bad");
    await expect(convert(files)).rejects.toMatchObject({ code: "archive-member-path-invalid" });
    await expect(convert(fixture(), { limits: { maxInputBytes: 16 } })).rejects.toThrow("byte conversion limit");
    await expect(convert(fixture(), { limits: { maxResourceBytes: 64 } })).rejects.toMatchObject({ code: "archive-file-size-limit" });
    await expect(convert(fixture(), { limits: { maxTotalResourceBytes: 256 } })).rejects.toMatchObject({ code: "archive-expanded-size-limit" });
    await expect(convert(fixture(), { limits: { maxResources: 2 } })).rejects.toMatchObject({ code: "archive-entry-limit" });
    await expect(convert(fixture(), { limits: { maxNodes: 10 } })).rejects.toThrow("XML work");
    await expect(convert(fixture('<w:sdt>'.repeat(65) + paragraph("deep") + '</w:sdt>'.repeat(65)))).rejects.toThrow("nesting");
  });

  it("rejects renamed binaries, invalid UTF-8 and empty readable bodies", async () => {
    for (const bytes of [encode("%PDF-renamed"), png, new Uint8Array([208, 207, 17, 224, 161, 177, 26, 225])]) {
      await writeFile(sourcePath, bytes);
      await expect(convertDocument({ sourcePath })).rejects.toThrow("Unsupported source");
    }
    const files = fixture(); files["word/document.xml"] = new Uint8Array([0xff]);
    await expect(convert(files)).rejects.toThrow();
    await expect(convert(fixture(""))).rejects.toThrow("no supported readable body");
  });

  it.each(["comic", "storyboard"] as const)("rejects incompatible profile %s", async (profile) => {
    await expect(convert(fixture(), { profile })).rejects.toThrow(`requested ${profile}`);
  });
});
