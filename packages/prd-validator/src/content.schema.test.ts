/**
 * Company: EonHive Inc. | Title: Content Schema And Semantic Parity Tests
 * Purpose: Keep canonical document shapes aligned while testing package-level checks separately.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */

import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ValidateFunction } from "ajv";
import * as Ajv2020Module from "ajv/dist/2020.js";
import * as addFormatsModule from "ajv-formats";
import { beforeAll, describe, expect, it } from "vitest";
import { validatePackageFiles, type PrdFileMap } from "./index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const encoder = new TextEncoder();
const addFormats = (addFormatsModule as unknown as { default: (ajv: unknown) => void }).default;
type JsonObject = Record<string, unknown>;

const paragraph = { type: "paragraph", text: "Readable text." };
const sectionReference = { type: "section", id: "part", title: "Section", src: "content/sections/part.json" };
const sectionRoot = {
  schemaVersion: "1.0", profile: "general-document", type: "document-section",
  id: "part", title: "Section", children: [paragraph]
};
const table = { type: "table", columns: [{ id: "name", label: "Name", align: "left" }], rows: [{ name: "Value" }] };
const chart = { type: "chart", chartType: "bar", categories: ["First", "Second"], series: [{ name: "Count", values: [0, 2] }] };
const validNodes: Array<{ name: string; node: JsonObject }> = [
  { name: "heading", node: { type: "heading", level: 2, text: "Heading" } },
  { name: "paragraph", node: paragraph },
  { name: "list", node: { type: "list", style: "unordered", items: ["One"] } },
  { name: "links", node: { type: "links", style: "inline", items: [{ label: "Section", href: "#part" }] } },
  { name: "table", node: table },
  { name: "chart", node: chart },
  { name: "audio", node: { type: "media", mediaType: "audio", asset: "audio" } },
  { name: "video", node: { type: "media", mediaType: "video", asset: "video", poster: "image" } },
  { name: "image", node: { type: "image", asset: "image", alt: "Illustration" } },
  { name: "quote", node: { type: "quote", text: "Quotation", attribution: "Source" } }
];

function documentRoot(children: unknown[] = [paragraph]): JsonObject {
  return { schemaVersion: "1.0", profile: "general-document", type: "document", id: "document", title: "Document", children };
}

function packageFiles(content: unknown, sections: Record<string, unknown> = { "content/sections/part.json": sectionRoot }): PrdFileMap {
  const manifest = {
    prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:content-schema",
    profile: "general-document", title: "Document", entry: "content/root.json",
    assets: [
      { id: "image", href: "assets/image.svg", type: "image/svg+xml" },
      { id: "audio", href: "assets/audio.wav", type: "audio/wav" },
      { id: "video", href: "assets/video.mp4", type: "video/mp4" }
    ]
  };
  const files: PrdFileMap = {
    "manifest.json": encoder.encode(JSON.stringify(manifest)),
    "content/root.json": encoder.encode(JSON.stringify(content)),
    "assets/image.svg": encoder.encode("<svg xmlns=\"http://www.w3.org/2000/svg\"/>"),
    // These tests cover declarations and shape, not decoding media bytes.
    "assets/audio.wav": new Uint8Array([0]),
    "assets/video.mp4": new Uint8Array([0])
  };
  for (const [path, section] of Object.entries(sections)) files[path] = encoder.encode(JSON.stringify(section));
  return files;
}

async function readExampleFiles(directory: string, prefix = ""): Promise<PrdFileMap> {
  const files: PrdFileMap = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) Object.assign(files, await readExampleFiles(join(directory, entry.name), path + "/"));
    else if (entry.isFile()) files[path] = new Uint8Array(await readFile(join(directory, entry.name)));
  }
  return files;
}

describe("content.schema.json", () => {
  let validateRoot: ValidateFunction;
  let validateSection: ValidateFunction;

  beforeAll(async () => {
    const schema = JSON.parse(await readFile(join(repoRoot, "schemas/content.schema.json"), "utf8"));
    const ajv = new Ajv2020Module.Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    validateRoot = ajv.compile(schema);
    validateSection = ajv.compile({ $ref: `${schema.$id}#/$defs/documentSectionRoot` });
  });

  function expectRootParity(content: unknown, valid: boolean) {
    expect(validateRoot(content), JSON.stringify(validateRoot.errors)).toBe(valid);
    const result = validatePackageFiles(packageFiles(content));
    expect(result.valid, JSON.stringify(result.errors)).toBe(valid);
  }

  it.each(["document-basic", "resume-basic", "document-segmented-basic"])("accepts actual roots and section files from %s", async (example) => {
    const files = await readExampleFiles(join(repoRoot, "examples", example));
    expect(validatePackageFiles(files).valid).toBe(true);
    let checked = 0;
    for (const [path, bytes] of Object.entries(files)) {
      if (!path.endsWith(".json")) continue;
      const content = JSON.parse(new TextDecoder().decode(bytes));
      if (content.type !== "document" && content.type !== "document-section") continue;
      const validate = content.type === "document" ? validateRoot : validateSection;
      expect(validate(content), `${path}: ${JSON.stringify(validate.errors)}`).toBe(true);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it.each(validNodes)("accepts $name nodes with and without optional IDs", ({ node }) => {
    expectRootParity(documentRoot([structuredClone(node)]), true);
    expectRootParity(documentRoot([{ ...structuredClone(node), id: "stable-node" }]), true);
  });

  it("preserves extra metadata without interpreting it as a new node type", () => {
    expectRootParity({ ...documentRoot([{ ...paragraph, editorial: { color: "blue" } }]), customMetadata: { revision: 2 } }, true);
    expectRootParity(documentRoot([{ type: "custom.widget", text: "Unknown node" }]), false);
  });

  it.each(["https://example.com/page", "http://example.com", "mailto:reader@example.com", "tel:+123456789", "#part"])("accepts the allowed link form %s", (href) => {
    expectRootParity(documentRoot([{ type: "links", style: "list", items: [{ label: "Link", href }] }]), true);
  });

  it("allows empty or sparse table rows and empty cell strings", () => {
    for (const rows of [[], [{}], [{ name: "" }]]) expectRootParity(documentRoot([{ ...table, rows }]), true);
  });

  it("accepts inline recursion and top-level packaged sections", () => {
    const inline = { type: "section", id: "outer", title: "Outer", children: [
      { type: "section", id: "inner", title: "Inner", children: [paragraph] }
    ] };
    expectRootParity(documentRoot([inline, sectionReference]), true);
    expect(validateSection(sectionRoot), JSON.stringify(validateSection.errors)).toBe(true);
  });

  it.each([
    ["empty root children", documentRoot([])],
    ["whitespace title", { ...documentRoot(), title: " \t\n" }],
    ["wrong root profile", { ...documentRoot(), profile: "comic" }],
    ["wrong root type", { ...documentRoot(), type: "document-section" }],
    ["empty schema version", { ...documentRoot(), schemaVersion: "" }],
    ["empty optional summary", { ...documentRoot(), summary: " " }],
    ["non-string optional language", { ...documentRoot(), lang: 42 }],
    ["missing root ID", { ...documentRoot(), id: null }]
  ])("rejects %s in both schema and semantic validation", (_name, content) => {
    expectRootParity(content, false);
  });

  it.each([
    ["invalid heading level", { type: "heading", level: 7, text: "Heading" }],
    ["fractional heading level", { type: "heading", level: 1.5, text: "Heading" }],
    ["whitespace text", { type: "paragraph", text: "\u00a0 \n" }],
    ["empty optional ID", { ...paragraph, id: " " }],
    ["invalid list style", { type: "list", style: "bullets", items: ["One"] }],
    ["empty list", { type: "list", style: "ordered", items: [] }],
    ["invalid link style", { type: "links", style: "grid", items: [{ label: "Link", href: "#part" }] }],
    ["empty link label", { type: "links", style: "list", items: [{ label: "", href: "#part" }] }],
    ["script link", { type: "links", style: "list", items: [{ label: "Link", href: "javascript:alert(1)" }] }],
    ["relative link", { type: "links", style: "list", items: [{ label: "Link", href: "other.html" }] }],
    ["whitespace in URL", { type: "links", style: "list", items: [{ label: "Link", href: "https://example.com/a b" }] }],
    ["empty table columns", { ...table, columns: [] }],
    ["invalid table alignment", { ...table, columns: [{ id: "name", label: "Name", align: "justify" }] }],
    ["non-string table cell", { ...table, rows: [{ name: 42 }] }],
    ["invalid chart type", { ...chart, chartType: "pie" }],
    ["empty chart categories", { ...chart, categories: [] }],
    ["empty chart series", { ...chart, series: [] }],
    ["negative chart value", { ...chart, series: [{ name: "Count", values: [-1, 2] }] }],
    ["invalid media type", { type: "media", mediaType: "animation", asset: "video" }],
    ["audio poster", { type: "media", mediaType: "audio", asset: "audio", poster: "image" }],
    ["empty image alt", { type: "image", asset: "image", alt: " " }],
    ["empty image caption", { type: "image", asset: "image", alt: "Image", caption: "" }],
    ["empty attribution", { type: "quote", text: "Quote", attribution: " " }]
  ])("rejects a node with %s", (_name, node) => {
    expectRootParity(documentRoot([node]), false);
  });

  it.each([
    ["missing section ID", { type: "section", title: "Section", children: [paragraph] }],
    ["empty inline section", { type: "section", id: "part", title: "Section", children: [] }],
    ["both section forms", { ...sectionReference, children: [paragraph] }],
    ["null inline children with src", { ...sectionReference, children: null }],
    ["non-array inline children with src", { ...sectionReference, children: "ignored" }],
    ["section outside packaged prefix", { ...sectionReference, src: "other/part.json" }],
    ["non-JSON section path", { ...sectionReference, src: "content/sections/part.html" }],
    ["nested section reference", { type: "section", id: "outer", title: "Outer", children: [sectionReference] }]
  ])("rejects %s", (_name, node) => {
    expectRootParity(documentRoot([node]), false);
  });

  it.each([
    ["wrong section type", { ...sectionRoot, type: "document" }],
    ["empty section title", { ...sectionRoot, title: " " }],
    ["empty section children", { ...sectionRoot, children: [] }],
    ["nested segmented reference in a section file", { ...sectionRoot, children: [sectionReference] }]
  ])("rejects %s through the section schema and package validator", (_name, section) => {
    expect(validateSection(section)).toBe(false);
    expect(validatePackageFiles(packageFiles(documentRoot([sectionReference]), { "content/sections/part.json": section })).valid).toBe(false);
  });

  it.each([
    ["duplicate node IDs", documentRoot([{ ...paragraph, id: "same" }, { ...paragraph, id: "same" }]), "content-node-id-duplicate"],
    ["duplicate table columns", documentRoot([{ ...table, columns: [{ id: "name", label: "A" }, { id: "name", label: "B" }] }]), "table-column-id-duplicate"],
    ["undeclared table column", documentRoot([{ ...table, rows: [{ other: "Value" }] }]), "table-row-column-unknown"],
    ["unequal chart lengths", documentRoot([{ ...chart, series: [{ name: "Count", values: [1] }] }]), "chart-series-length"],
    ["undeclared image", documentRoot([{ type: "image", asset: "missing", alt: "Image" }]), "image-asset-missing"]
  ])("keeps %s as a separate semantic check", (_name, content, issue) => {
    expect(validateRoot(content), JSON.stringify(validateRoot.errors)).toBe(true);
    const result = validatePackageFiles(packageFiles(content));
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain(issue);
  });

  it("requires semantic resolution for missing or mismatched section files", () => {
    const content = documentRoot([sectionReference]);
    expect(validateRoot(content)).toBe(true);
    expect(validatePackageFiles(packageFiles(content, {})).errors.map((error) => error.code)).toContain("section-src-missing");
    const mismatch = { ...sectionRoot, id: "different", title: "Different" };
    expect(validateSection(mismatch)).toBe(true);
    const result = validatePackageFiles(packageFiles(content, { "content/sections/part.json": mismatch }));
    expect(result.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["section-content-id-mismatch", "section-content-title-mismatch"]));
  });

  it("does not silently introduce a supported-version range", () => {
    const content = { ...documentRoot(), schemaVersion: "999.0" };
    expect(validateRoot(content)).toBe(true);
    const files = packageFiles(content);
    const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
    manifest.prdVersion = "999.0";
    manifest.manifestVersion = "999.0";
    manifest.compatibility = { minViewer: "999.0" };
    files["manifest.json"] = encoder.encode(JSON.stringify(manifest));
    expect(validatePackageFiles(files).valid).toBe(true);
  });

  it("records the existing minViewer type check without inventing range enforcement", () => {
    for (const [minViewer, valid] of [["", true], ["0.1", true], ["999.0", true], [42, false]] as const) {
      const files = packageFiles(documentRoot());
      const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
      manifest.compatibility = { minViewer };
      files["manifest.json"] = encoder.encode(JSON.stringify(manifest));
      expect(validatePackageFiles(files).valid).toBe(valid);
    }
  });
});
