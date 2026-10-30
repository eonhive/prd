/**
 * Company: EonHive Inc. | Title: PRD Container Conformance Tests
 * Purpose: Verify binary identification, legacy compatibility, archive boundaries and actual decode limits.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync, Zip, ZipDeflate } from "fflate";
import { describe, expect, it } from "vitest";
import {
  assertPrdArchiveSize, createPrdContainer,
  PRD_CONTAINER_HEADER_SIZE, PRD_DEFAULT_ARCHIVE_LIMITS, readPrdArchive, readPrdContainer,
  type PrdArchiveLimits
} from "./container.js";
import { validatePackageFiles } from "./index.js";
import { inspectPrdArchive, validatePrdArchive } from "./node.js";

const fixture = {
  "manifest.json": strToU8(JSON.stringify({
    prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:container",
    profile: "general-document", title: "Container", entry: "content/root.json"
  })),
  "content/root.json": strToU8(JSON.stringify({
    schemaVersion: "1.0", profile: "general-document", type: "document", id: "container",
    title: "Container", children: [{ type: "paragraph", text: "Readable." }]
  }))
};

function expectCode(action: () => unknown, code: string): void {
  expect(action).toThrow(expect.objectContaining({ name: "PrdContainerError", code }));
}

function renameBytes(archive: Uint8Array, original: string, replacement: string, all = true): Uint8Array {
  const bytes = archive.slice();
  const source = strToU8(original);
  expect(strToU8(replacement).length).toBe(source.length);
  for (let offset = 0; offset <= bytes.length - source.length; offset += 1) {
    if (!source.every((byte, index) => bytes[offset + index] === byte)) continue;
    bytes.set(strToU8(replacement), offset);
    if (!all) break;
    offset += source.length - 1;
  }
  return bytes;
}

describe("PRD container header", () => {
  it("matches the published 1,024-byte payload header vector", () => {
    const payload = new Uint8Array(1024);
    payload.set([0x50, 0x4b, 0x03, 0x04]);
    expect([...createPrdContainer(payload).subarray(0, 16)]).toEqual([
      0x50, 0x52, 0x44, 0x00, 1, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0
    ]);
  });

  it("reads both transports without changing logical files, including offset views", () => {
    const zip = zipSync(fixture);
    const wrapped = createPrdContainer(zip);
    const storage = new Uint8Array(wrapped.length + 23);
    storage.set(wrapped, 7);
    expect(readPrdContainer(zip).kind).toBe("zip");
    expect(readPrdContainer(storage.subarray(7, 7 + wrapped.length)).kind).toBe("prd");
    for (const bytes of [zip, wrapped, storage.subarray(7, 7 + wrapped.length)]) {
      const files = readPrdArchive(bytes);
      expect(validatePackageFiles(files).valid).toBe(true);
      expect(files["content/root.json"]).toEqual(fixture["content/root.json"]);
    }
  });

  it.each(Array.from({ length: 15 }, (_, index) => index + 1))("rejects a truncated header of %i bytes", (length) => {
    const bytes = createPrdContainer(zipSync(fixture)).subarray(0, length);
    expectCode(() => readPrdArchive(bytes), "container-header-truncated");
  });

  it.each([new Uint8Array(), strToU8("PRD text"), strToU8("ordinary text")])("rejects unknown magic (%j)", (bytes) => {
    expectCode(() => readPrdArchive(bytes), "archive-magic-invalid");
  });

  it.each([
    { offset: 4, value: 2, code: "container-version-unsupported" },
    { offset: 5, value: 1, code: "container-version-unsupported" },
    { offset: 6, value: 1, code: "container-flags-unsupported" },
    { offset: 7, value: 1, code: "container-flags-unsupported" }
  ])("rejects unsupported header fields at $offset", ({ offset, value, code }) => {
    const bytes = createPrdContainer(zipSync(fixture));
    bytes[offset] = value;
    expectCode(() => readPrdArchive(bytes), code);
  });

  it.each([0n, 1n, 0x20000000000001n, 0xffffffffffffffffn])("rejects mismatched lengths without allocating %s bytes", (length) => {
    const bytes = createPrdContainer(zipSync(fixture));
    new DataView(bytes.buffer).setBigUint64(8, length, true);
    expectCode(() => readPrdArchive(bytes), "container-length-mismatch");
  });

  it("rejects appended/truncated data and a non-ZIP payload", () => {
    const wrapped = createPrdContainer(zipSync(fixture));
    const appended = new Uint8Array(wrapped.length + 1);
    appended.set(wrapped);
    for (const bytes of [appended, wrapped.subarray(0, wrapped.length - 1)]) {
      expectCode(() => readPrdArchive(bytes), "container-length-mismatch");
    }
    wrapped[PRD_CONTAINER_HEADER_SIZE] = 0;
    expectCode(() => readPrdArchive(wrapped), "archive-magic-invalid");
    expectCode(() => createPrdContainer(strToU8("not ZIP")), "archive-magic-invalid");
  });
});

describe("bounded ZIP decoding", () => {
  it.each(["../escape", "/absolute", "assets\\bad", "C:/bad", "a/../b", "a/./b", "a//b", "a\u0000b"])("screens every member path: %s", (name) => {
    const zip = zipSync({ ...fixture, [name]: strToU8("inert") });
    for (const bytes of [zip, createPrdContainer(zip)]) {
      expectCode(() => readPrdArchive(bytes), "archive-member-path-invalid");
    }
  });

  it("rejects duplicate member names and file/directory collisions", () => {
    const duplicate = renameBytes(zipSync({ "safe.txt": strToU8("a"), "copy.txt": strToU8("b") }), "copy.txt", "safe.txt");
    expectCode(() => readPrdArchive(duplicate), "archive-member-duplicate");
    expectCode(() => readPrdArchive(zipSync({ "a": strToU8("file"), "a/b": strToU8("child") })), "archive-member-duplicate");
  });

  it("rejects local/central directory disagreement and incomplete ZIP data", () => {
    const changed = renameBytes(zipSync({ "safe.txt": strToU8("a") }), "safe.txt", "copy.txt", false);
    expectCode(() => readPrdArchive(changed), "archive-read-invalid");
    expectCode(() => readPrdArchive(zipSync(fixture).subarray(0, -1)), "archive-read-invalid");
  });

  it.each([
    { limits: { maxArchiveBytes: 20 }, code: "archive-size-limit" },
    { limits: { maxEntries: 1 }, code: "archive-entry-limit" },
    { limits: { maxFileBytes: 8 }, code: "archive-file-size-limit" },
    { limits: { maxExpandedBytes: 8 }, code: "archive-expanded-size-limit" }
  ])("enforces configured budgets: $code", ({ limits, code }) => {
    expectCode(() => readPrdArchive(zipSync(fixture), limits), code);
  });

  it("rejects bounded high-ratio expansion before retaining its output", () => {
    const zip = zipSync({ "zeros.bin": new Uint8Array(256 * 1024) });
    expect(zip.length).toBeLessThan(1024);
    expectCode(() => readPrdArchive(zip, { maxFileBytes: 4096 }), "archive-file-size-limit");
  });

  it("does not trust forged uncompressed sizes", () => {
    const zip = zipSync({ "zeros.bin": new Uint8Array(256 * 1024) });
    const view = new DataView(zip.buffer);
    view.setUint32(22, 1, true);
    for (let offset = 0; offset < zip.length - 28; offset += 1) {
      if (view.getUint32(offset, true) === 0x02014b50) view.setUint32(offset + 24, 1, true);
    }
    expectCode(() => readPrdArchive(zip), "archive-read-invalid");
  });

  it("enforces actual output when local streaming sizes are absent", () => {
    const chunks: Uint8Array[] = [];
    const zip = new Zip((error, data) => {
      if (error) throw error;
      chunks.push(data);
    });
    const file = new ZipDeflate("zeros.bin");
    zip.add(file);
    file.push(new Uint8Array(64 * 1024), true);
    zip.end();
    const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    expect(readPrdArchive(bytes)["zeros.bin"]?.length).toBe(64 * 1024);
    expectCode(() => readPrdArchive(bytes, { maxFileBytes: 4096 }), "archive-file-size-limit");
  });

  it("accepts empty directories and keeps special property names inert", () => {
    const zip = renameBytes(zipSync({ ...fixture, "assets/": new Uint8Array(), "prototype": strToU8("inert") }), "prototype", "__proto__");
    const files = readPrdArchive(zip);
    expect(Object.getPrototypeOf(files)).toBeNull();
    expect(Object.hasOwn(files, "__proto__")).toBe(true);
    expect(Object.keys(files)).not.toContain("assets/");
  });

  it("validates reader limits and supports pre-read size checks", () => {
    expectCode(() => assertPrdArchiveSize(PRD_DEFAULT_ARCHIVE_LIMITS.maxArchiveBytes + 1), "archive-size-limit");
    for (const value of [0, -1, NaN, Infinity, 1.5]) {
      expect(() => assertPrdArchiveSize(1, { maxFileBytes: value })).toThrow(RangeError);
    }
  });
});

describe("Node container entrypoints", () => {
  it("validates and inspects both transports without changing inspection facts", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-container-"));
    try {
      const facts = [];
      for (const bytes of [zipSync(fixture), createPrdContainer(zipSync(fixture))]) {
        const path = join(root, "document.prd");
        await writeFile(path, bytes);
        expect((await validatePrdArchive(path)).valid).toBe(true);
        facts.push(await inspectPrdArchive(path));
      }
      expect(facts[0]).toEqual(facts[1]);
      const invalid = join(root, "invalid.prd");
      await writeFile(invalid, zipSync({ "ordinary.txt": strToU8("not PRD") }));
      expect((await validatePrdArchive(invalid)).errors[0]?.code).toBe("manifest-missing");
      const broken = createPrdContainer(zipSync(fixture));
      broken[4] = 2;
      await writeFile(invalid, broken);
      expect((await validatePrdArchive(invalid)).errors[0]?.code).toBe("container-version-unsupported");
      expect((await inspectPrdArchive(invalid)).errors[0]?.code).toBe("container-version-unsupported");
      const limits: Partial<PrdArchiveLimits> = { maxArchiveBytes: 16 };
      expect((await validatePrdArchive(invalid, limits)).errors[0]?.code).toBe("archive-size-limit");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
