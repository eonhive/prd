/**
 * Company: EonHive Inc. | Title: CBZ Conversion Tests
 * Purpose: Verify page reconstruction, archive budgets, resource screening and deterministic ordering.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { createPrdContainer, readPrdArchive } from "@eonhive/prd-validator/container";
import { convertDocument, convertFileToPrd, type ConvertOptions } from "../index.js";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT3sAAAAASUVORK5CYII=", "base64");
const text = (value: string) => new TextEncoder().encode(value);
const unreadableArchives: Record<string, Uint8Array>[] = [
  {}, { "readme.txt": text("no pages") }, { "page.png": text("invalid image") }
];
const otherDocumentMarkers: Record<string, Uint8Array>[] = [
  { "[Content_Types].xml": text("Office marker") },
  { "META-INF/container.xml": text("EPUB marker") },
  { "manifest.json": text('{"prdVersion":"1.0","entry":"content/root.json"}') }
];
let root: string;
let sourcePath: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "prd-cbz-test-"));
  sourcePath = join(root, "sample-comic.cbz");
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(root, { recursive: true, force: true });
});

async function convert(files: Record<string, Uint8Array>, options: Partial<ConvertOptions> = {}) {
  await writeFile(sourcePath, zipSync(files));
  return convertDocument({ sourcePath, ...options });
}

function replaceNames(bytes: Uint8Array, original: string, replacement: string, all = true): Uint8Array {
  const result = Buffer.from(bytes);
  if (original.length !== replacement.length) throw new Error("Test names must have equal byte lengths.");
  let offset = result.indexOf(original);
  while (offset !== -1) {
    result.write(replacement, offset, "utf8");
    if (!all) break;
    offset = result.indexOf(original, offset + replacement.length);
  }
  return new Uint8Array(result);
}

describe("CBZ page conversion", () => {
  it("maps whole pages in natural path order to canonical comic panels and preserves bytes", async () => {
    const result = await convert({
      "pages/page-10.png": png, "pages/page-2.png": png, "pages/page-1.png": png,
      "ComicInfo.xml": text("<ComicInfo/>"), "__MACOSX/._page.png": text("ignored")
    });
    expect(result.document.profile).toBe("comic");
    if (result.document.profile !== "comic") throw new Error("Unexpected profile");
    expect(result.document.title).toBe("Sample Comic");
    expect(result.document.panels.map((panel) => panel.id)).toEqual(["page-1", "page-2", "page-3"]);
    expect(result.document.panels.map((panel) => panel.alt)).toEqual(["Page 1 comic page", "Page 2 comic page", "Page 10 comic page"]);
    expect(result.report.resourceMap.map((item) => item.source)).toEqual(["pages/page-1.png", "pages/page-2.png", "pages/page-10.png"]);
    expect(result.report.nodeCount).toBe(3);
    expect(result.report.resourceCount).toBe(3);
    const files = readPrdArchive(result.archive);
    expect(validatePackageFiles(files).valid).toBe(true);
    for (let index = 1; index <= 3; index += 1) expect(files[`assets/images/import-image-${index}.png`]).toEqual(new Uint8Array(png));
    expect(files["attachments/source.cbz"]).toEqual(new Uint8Array(await readFile(sourcePath)));
    expect(JSON.parse(Buffer.from(files["attachments/conversion-quality.json"]!).toString())).toEqual(result.report);
    expect(result.report.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["cbz-reading-order", "cbz-generated-alt", "cbz-members-omitted"]));
    expect(readPrdArchive((await convertDocument({ sourcePath })).archive)).toEqual(files);
  });

  it("breaks natural-sort ties deterministically rather than trusting ZIP entry order", async () => {
    const first = await convert({ "page-1.png": png, "Page-1.png": png });
    const second = await convert({ "Page-1.png": png, "page-1.png": png });
    expect(first.document).toEqual(second.document);
    expect(first.report.resourceMap.map((item) => item.source)).toEqual(["Page-1.png", "page-1.png"]);
    expect(second.report.resourceMap).toEqual(first.report.resourceMap);
  });

  it("honors compatible profile/title/identity options and explicit source opt-out", async () => {
    const result = await convert({ "page.png": png }, { profile: "comic", title: "Custom comic", id: "urn:test:comic", preserveSource: false, container: "prd" });
    const files = readPrdArchive(result.archive);
    expect(result.document.title).toBe("Custom comic");
    expect(JSON.parse(Buffer.from(files["manifest.json"]!).toString()).id).toBe("urn:test:comic");
    expect(files["attachments/source.cbz"]).toBeUndefined();
    expect(result.report.sourcePreserved).toBe(false);
    expect(result.report.warnings.some((warning) => warning.code === "source-not-preserved")).toBe(true);
  });

  it("omits unsupported, hidden and invalid images explicitly without fetching or extracting files", async () => {
    const fetch = vi.fn(() => { throw new Error("Unexpected fetch"); });
    vi.stubGlobal("fetch", fetch);
    const result = await convert({
      "page-1.png": png, "page-2.png": text("<script>invalid image</script>"),
      "vector.svg": text("<svg/>"), ".hidden/page.png": png, "readme.html": text("<script>unused</script>")
    }, { preserveSource: false });
    expect(result.report.resourceCount).toBe(1);
    expect(result.report.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["cbz-members-omitted", "resource-omitted"]));
    expect(fetch).not.toHaveBeenCalled();
    expect(await readdir(root)).toEqual(["sample-comic.cbz"]);
    expect(JSON.stringify(result.document)).not.toContain("script");
  });

  it.each(unreadableArchives)("rejects archives without a supported readable page", async (files) => {
    await expect(convert(files)).rejects.toThrow("No supported comic page images");
  });
});

describe("CBZ archive safety", () => {
  it.each(["../outside.txt", "/absolute.txt", "C:/drive.txt", "nested\\outside.txt", "nested/../escape.txt"])("rejects unsafe members even when they are not page candidates", async (path) => {
    await expect(convert({ "page.png": png, [path]: text("unsafe") })).rejects.toMatchObject({ code: "archive-member-path-invalid" });
    expect(await readdir(root)).toEqual(["sample-comic.cbz"]);
  });

  it("rejects duplicate paths and local/central member disagreement", async () => {
    const original = zipSync({ "safe.png": png, "copy.png": png });
    await writeFile(sourcePath, replaceNames(original, "copy.png", "safe.png"));
    await expect(convertDocument({ sourcePath })).rejects.toMatchObject({ code: "archive-member-duplicate" });
    await writeFile(sourcePath, replaceNames(original, "copy.png", "else.png", false));
    await expect(convertDocument({ sourcePath })).rejects.toMatchObject({ code: "archive-read-invalid" });
  });

  it.each([
    { limits: { maxResourceBytes: 8 }, code: "archive-file-size-limit" },
    { limits: { maxTotalResourceBytes: png.byteLength }, code: "archive-expanded-size-limit" },
    { limits: { maxResources: 1 }, code: "archive-entry-limit" }
  ])("enforces $code on all decoded members", async ({ limits, code }) => {
    await expect(convert({ "page.png": png, "metadata.txt": text("additional bytes") }, { limits })).rejects.toMatchObject({ code });
  });

  it("bounds high-ratio ignored data, source bytes and page counts", async () => {
    await expect(convert({ "page.png": png, "ignored.bin": new Uint8Array(128 * 1024) }, { limits: { maxResourceBytes: 4096 } })).rejects.toMatchObject({ code: "archive-file-size-limit" });
    await expect(convert({ "page.png": png }, { limits: { maxInputBytes: 16 } })).rejects.toThrow("byte conversion limit");
    await expect(convert({ "page-1.png": png, "page-2.png": png }, { limits: { maxNodes: 1 } })).rejects.toThrow("Comic page count");
  });

  it("rejects malformed, disguised and enveloped inputs before creating output", async () => {
    const outputPath = join(root, "never.prd");
    for (const bytes of [text("%PDF-renamed"), png, zipSync({ "page.png": png }).subarray(0, -1), createPrdContainer(zipSync({ "page.png": png }))]) {
      await writeFile(sourcePath, bytes);
      await expect(convertFileToPrd({ sourcePath, outputPath })).rejects.toThrow();
      await expect(readFile(outputPath)).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  it.each(otherDocumentMarkers)("rejects renamed Office, EPUB and PRD packages", async (marker) => {
    await expect(convert({ "page.png": png, ...marker })).rejects.toThrow("renamed ZIP");
  });

  it.each(["general-document", "storyboard"] as const)("refuses incompatible profile %s", async (profile) => {
    await expect(convert({ "page.png": png }, { profile })).rejects.toThrow(`requested ${profile}`);
  });
});
