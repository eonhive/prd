/**
 * Company: EonHive Inc. | Title: ZIP Filename Encoding Tests
 * Purpose: Reject malformed declared UTF-8 and preserve literal package names without identifier rewriting.
 * Author: Stan Nesi | Created: 2026-10-30 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createPrdContainer, readPrdArchive } from "./container.js";
import { validatePackageFiles } from "./index.js";
import { inspectPrdArchive, validatePrdArchive } from "./node.js";

const base = {
  "manifest.json": strToU8(JSON.stringify({
    prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:filename", profile: "general-document",
    title: "Filename", entry: "content/root.json"
  })),
  "content/root.json": strToU8(JSON.stringify({
    schemaVersion: "1.0", profile: "general-document", type: "document", id: "filename", title: "Filename",
    children: [{ type: "paragraph", text: "Exact filename bytes." }]
  }))
};
const malformed = [
  { label: "continuation byte", bytes: [0x80] },
  { label: "invalid leading byte", bytes: [0xff] },
  { label: "overlong NUL", bytes: [0xc0, 0x80] },
  { label: "overlong slash", bytes: [0xc0, 0xaf] },
  { label: "missing continuation", bytes: [0xc2] },
  { label: "truncated three-byte codepoint", bytes: [0xe2, 0x82] },
  { label: "surrogate codepoint", bytes: [0xed, 0xa0, 0x80] },
  { label: "above Unicode maximum", bytes: [0xf4, 0x90, 0x80, 0x80] },
  { label: "invalid four-byte lead", bytes: [0xf5, 0x80, 0x80, 0x80] },
  { label: "overlong four-byte sequence", bytes: [0xf0, 0x80, 0x80, 0xaf] }
];

function rawName(prefix: number[], utf8 = true): Uint8Array {
  const zip = zipSync({ [`${"x".repeat(prefix.length)}.txt`]: strToU8("data"), ...base }, { level: 0 });
  const data = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const central = data.getUint32(zip.length - 6, true);
  data.setUint16(6, utf8 ? 0x800 : 0, true);
  data.setUint16(central + 8, utf8 ? 0x800 : 0, true);
  zip.set(prefix, 30);
  zip.set(prefix, central + 46);
  return zip;
}

function transport(zip: Uint8Array, kind: string): Uint8Array {
  return kind === "prd" ? createPrdContainer(zip) : zip;
}

describe.each(["zip", "prd"])("ZIP filename encoding in %s", (kind) => {
  it.each(malformed)("rejects declared UTF-8 with $label", ({ bytes }) => {
    expect(() => readPrdArchive(transport(rawName(bytes), kind))).toThrow(expect.objectContaining({ code: "archive-read-invalid" }));
  });

  it("preserves leading U+FEFF, distinct normalization forms and literal replacement characters", () => {
    const source = {
      ...base, "\uFEFFmanifest.json": strToU8("a separate literal filename"),
      "assets/é.txt": strToU8("composed"), "assets/e\u0301.txt": strToU8("decomposed"),
      "assets/\uFFFD.txt": strToU8("literal replacement character"), "assets/東京-😀.txt": strToU8("Unicode")
    };
    const files = readPrdArchive(transport(zipSync(source), kind));
    expect(Object.keys(files).sort()).toEqual(Object.keys(source).sort());
    for (const [name, bytes] of Object.entries(source)) expect(files[name]).toEqual(bytes);
    expect(validatePackageFiles(files).valid).toBe(true);
  });

  it("does not promote a BOM-prefixed filename into the required manifest", () => {
    const zip = zipSync({ "\uFEFFmanifest.json": base["manifest.json"], "content/root.json": base["content/root.json"] });
    const files = readPrdArchive(transport(zip, kind));
    expect(Object.hasOwn(files, "manifest.json")).toBe(false);
    expect(Object.hasOwn(files, "\uFEFFmanifest.json")).toBe(true);
    expect(validatePackageFiles(files)).toMatchObject({ valid: false, errors: [expect.objectContaining({ code: "manifest-missing" })] });
  });

  it("retains the existing unflagged byte-name interpretation", () => {
    const files = readPrdArchive(transport(rawName([0xe9], false), kind));
    expect(files["é.txt"]).toEqual(strToU8("data"));
    expect(validatePackageFiles(files).valid).toBe(true);
  });

  it("reports malformed names through Node adapters and recovers after decoder failure", async () => {
    const directory = await mkdtemp(join(tmpdir(), "prd-filename-"));
    try {
      const path = join(directory, "names.prd");
      await writeFile(path, transport(rawName([0xc0, 0xaf]), kind));
      expect(await validatePrdArchive(path)).toMatchObject({ valid: false, errors: [expect.objectContaining({ code: "archive-read-invalid" })] });
      expect(await inspectPrdArchive(path)).toMatchObject({ valid: false, fileCount: 0, totalBytes: 0 });
      const valid = zipSync({ ...base, "café.txt": strToU8("recovered") });
      await writeFile(path, transport(valid, kind));
      expect((await validatePrdArchive(path)).valid).toBe(true);
      expect(readPrdArchive(transport(valid, kind))["café.txt"]).toEqual(strToU8("recovered"));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
