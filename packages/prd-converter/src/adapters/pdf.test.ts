/**
 * Company: EonHive Inc. | Title: PDF Conversion Tests
 * Purpose: Verify real PDF extraction/fallback, deterministic semantics and bounded hostile-input failures.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { convertDocument, convertFileToPrd, type ConvertOptions } from "../index.js";
import { pdfLines } from "./pdfText.js";
import type { PdfTextItem } from "./pdfProtocol.js";

function pdfObjects(objects: string[], info?: number): Uint8Array {
  const parts = [Buffer.from("%PDF-1.4\n", "ascii")];
  const offsets = [0];
  let position = parts[0]!.length;
  objects.forEach((object, index) => {
    offsets.push(position);
    const bytes = Buffer.from(`${index + 1} 0 obj\n${object}\nendobj\n`, "latin1");
    parts.push(bytes); position += bytes.length;
  });
  parts.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ${info ? `/Info ${info} 0 R` : ""} >>\nstartxref\n${position}\n%%EOF\n`, "ascii"));
  return new Uint8Array(Buffer.concat(parts));
}

function textPdf(streams = ["BT /F1 12 Tf 20 150 Td (Readable PDF) Tj ET"], size = "0 0 200 200", title?: string): Uint8Array {
  const fontId = streams.length * 2 + 3;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Count ${streams.length} /Kids [${streams.map((_, index) => `${index * 2 + 3} 0 R`).join(" ")}] >>`];
  for (const [index, stream] of streams.entries()) objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [${size}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${index * 2 + 4} 0 R >>`,
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  if (title) objects.push(`<< /Title (${title}) >>`);
  return pdfObjects(objects, title ? objects.length : undefined);
}

let root: string;
let sourcePath: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "prd-pdf-test-")); sourcePath = join(root, "source.pdf"); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
async function convert(bytes = textPdf(), options: Partial<ConvertOptions> = {}) {
  await writeFile(sourcePath, bytes);
  return convertDocument({ sourcePath, ...options });
}

describe("PDF conversion", () => {
  it("converts the actual mixed text/image source and preserves original bytes and factual reporting", async () => {
    const original = new Uint8Array(await readFile(resolve("examples/conversion-pdf/source.pdf")));
    const result = await convert(original);
    expect(result.report).toMatchObject({ sourceFormat: "pdf", profile: "general-document", nodeCount: 14, resourceCount: 1, sourcePreserved: true });
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    expect(result.document.children.map((node) => node.type === "section" && node.title)).toEqual(["Page 1", "Page 2"]);
    const text = JSON.stringify(result.document);
    expect(text).toContain("extractable PDF text");
    expect(text).not.toContain("This page contains only pixels");
    const files = readPrdArchive(result.archive);
    expect(validatePackageFiles(files).valid).toBe(true);
    expect(Buffer.from(files["attachments/source.pdf"]!).equals(Buffer.from(original))).toBe(true);
    const image = Buffer.from(files["assets/images/import-image-1.png"]!);
    expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect([image.readUInt32BE(16), image.readUInt32BE(20)]).toEqual([918, 1188]);
    expect(JSON.parse(Buffer.from(files["attachments/conversion-quality.json"]!).toString())).toEqual(result.report);
    expect(result.report.warnings.map((warning) => warning.code)).toEqual(["pdf-reading-order", "pdf-subset", "pdf-page-image-fallback"]);
    const repeated = await convertDocument({ sourcePath });
    expect(repeated.document).toEqual(result.document);
    expect(repeated.report).toEqual(result.report);
  }, 15_000);

  it("honors title, identity, profile, envelope and explicit source opt-out", async () => {
    const result = await convert(textPdf(), { title: "Custom PDF", id: "urn:test:pdf", profile: "general-document", container: "prd", preserveSource: false });
    const files = readPrdArchive(result.archive);
    expect(result.document.title).toBe("Custom PDF");
    expect(JSON.parse(Buffer.from(files["manifest.json"]!).toString()).id).toBe("urn:test:pdf");
    expect(files["attachments/source.pdf"]).toBeUndefined();
    expect(result.report.warnings.some((warning) => warning.code === "source-not-preserved")).toBe(true);
  });

  it("retains extraction order without inventing logical heading or column structure", async () => {
    const result = await convert(textPdf(["BT /F1 12 Tf 20 30 Td (Drawn first) Tj ET BT /F1 12 Tf 20 160 Td (Drawn second) Tj ET"]));
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    const page = result.document.children[0];
    if (page?.type !== "section" || !page.children) throw new Error("Missing page");
    expect(page.children).toMatchObject([{ type: "paragraph", text: "Drawn first" }, { type: "paragraph", text: "Drawn second" }]);
    expect(result.report.warnings.some((warning) => warning.code === "pdf-reading-order")).toBe(true);
  });

  it("preserves a blank page as an image instead of silently discarding it", async () => {
    const result = await convert(textPdf([""]));
    expect(result.report.resourceCount).toBe(1);
    expect(result.report.warnings.some((warning) => warning.code === "pdf-page-image-fallback")).toBe(true);
  });

  it("bounds metadata titles and reports their truncation", async () => {
    const result = await convert(textPdf(undefined, undefined, "A".repeat(600)));
    expect(result.document.title).toHaveLength(512);
    expect(result.report.warnings.some((warning) => warning.code === "pdf-title-truncated")).toBe(true);
  });

  it("does not execute PDF actions or copy active action data into canonical reading content", async () => {
    const stream = "BT /F1 12 Tf 20 150 Td (Safe text) Tj ET";
    const bytes = pdfObjects([
      "<< /Type /Catalog /Pages 2 0 R /OpenAction 6 0 R >>", "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /S /JavaScript /JS (throw 'pdfActionMarker';) >>"
    ]);
    const result = await convert(bytes);
    expect(JSON.stringify(result.document)).toContain("Safe text");
    expect(JSON.stringify(result.document)).not.toContain("pdfActionMarker");
    expect(result.report.warnings.some((warning) => warning.code === "pdf-subset")).toBe(true);
  });
});

describe("PDF limits and rejection", () => {
  it.each(["encrypted.pdf", "encrypted-empty-password.pdf"])("rejects %s without requesting a password or publishing output", async (name) => {
    const outputPath = join(root, "never.prd");
    await expect(convertFileToPrd({ sourcePath: resolve("examples/conversion-pdf/fixtures", name), outputPath })).rejects.toThrow("Encrypted or password-protected");
    await expect(readFile(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each([new Uint8Array(), Buffer.from("%PDF-1.4\n%%EOF\n"), textPdf().subarray(0, -8), Buffer.from("PK-not-a-pdf")])("rejects malformed, truncated or disguised input without output", async (bytes) => {
    await writeFile(sourcePath, bytes);
    const outputPath = join(root, "never.prd");
    await expect(convertFileToPrd({ sourcePath, outputPath })).rejects.toThrow();
    await expect(readFile(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("enforces input, page count, page geometry, text and raster limits", async () => {
    await expect(convert(textPdf(), { limits: { maxInputBytes: 16 } })).rejects.toThrow("byte conversion limit");
    await expect(convert(textPdf(Array.from({ length: 65 }, () => "")))).rejects.toThrow("page count");
    await expect(convert(textPdf(["", ""]), { limits: { maxResources: 1 } })).rejects.toThrow("page count");
    await expect(convert(textPdf(undefined, "0 0 10000 10000"))).rejects.toThrow("page dimensions");
    const lines = Array.from({ length: 6 }, (_, index) => `BT /F1 10 Tf 20 ${150 - index * 15} Td (Twenty readable letters) Tj ET`).join("\n");
    await expect(convert(textPdf([lines]), { limits: { maxTotalResourceBytes: 64 } })).rejects.toThrow("text exceeds");
    await expect(convert(textPdf([""]), { limits: { maxResourceBytes: 8 } })).rejects.toThrow("raster resources");
  }, 15_000);

  it("fails an oversized embedded raster instead of publishing a silently blank page", async () => {
    const stream = "q 100 0 0 100 0 0 cm /Im0 Do Q";
    const bytes = pdfObjects([
      "<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>",
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      "<< /Type /XObject /Subtype /Image /Width 3000 /Height 3000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 1 >>\nstream\n\x00\nendstream"
    ]);
    await expect(convert(bytes)).rejects.toThrow();
  });

  it.each(["comic", "storyboard"] as const)("rejects incompatible profile %s", async (profile) => {
    await expect(convert(textPdf(), { profile })).rejects.toThrow(`requested ${profile}`);
  });
});

describe("PDF line grouping", () => {
  const item = (text: string, x: number, y: number, eol = false): PdfTextItem => ({ text, x, y, width: 10, height: 10, eol, nonHorizontal: false });
  it("uses gaps, baselines and explicit line ends without reordering items", () => {
    expect(pdfLines([item("Joined", 0, 30), item("word", 10, 30), item("next", 30, 30, true), item("Other", 0, 10)])).toEqual({ lines: ["Joinedword next", "Other"], repaired: false });
  });
  it("makes removed control characters visible and reports normalization", () => {
    expect(pdfLines([item("A\x00B", 0, 0)])).toEqual({ lines: ["A\ufffdB"], repaired: true });
  });
});
