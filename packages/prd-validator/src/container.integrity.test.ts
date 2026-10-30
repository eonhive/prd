/**
 * Company: EonHive Inc. | Title: ZIP Integrity Regression Tests
 * Purpose: Verify member checksums and bounded, consistent ZIP records in both PRD transports.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { strToU8, zipSync, Zip, ZipDeflate, ZipPassThrough } from "fflate";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createPrdContainer, PrdContainerError, readPrdArchive } from "./container.js";
import { inspectPrdArchive, validatePrdArchive } from "./node.js";

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function storedZip(): Uint8Array {
  return zipSync({ "vector.txt": strToU8("123456789") }, { level: 0 });
}

function centralOffset(bytes: Uint8Array): number {
  return view(bytes).getUint32(bytes.length - 6, true);
}

function expectRejected(bytes: Uint8Array, code: string): void {
  const placeholder = bytes.slice();
  placeholder.set([0x50, 0x4b, 3, 4]);
  const enveloped = createPrdContainer(placeholder);
  enveloped.set(bytes, 16);
  for (const archive of [bytes, enveloped]) {
    expect(() => readPrdArchive(archive)).toThrow(expect.objectContaining({ name: "PrdContainerError", code }));
  }
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function streamZip(contents: Uint8Array, deflate: boolean): Uint8Array {
  const chunks: Uint8Array[] = [];
  const zip = new Zip((error, chunk) => {
    if (error) throw error;
    chunks.push(chunk);
  });
  const file = deflate ? new ZipDeflate("vector.txt") : new ZipPassThrough("vector.txt");
  zip.add(file);
  file.push(contents, true);
  zip.end();
  return concat(...chunks);
}

function withoutDescriptorSignature(bytes: Uint8Array): Uint8Array {
  const central = centralOffset(bytes);
  const descriptor = central - 16;
  expect(view(bytes).getUint32(descriptor, true)).toBe(0x08074b50);
  const result = concat(bytes.subarray(0, descriptor), bytes.subarray(descriptor + 4));
  view(result).setUint32(result.length - 6, central - 4, true);
  return result;
}

function zip64Fixture(
  descriptor: "none" | "signed" | "unsigned" = "none",
  centralLayout: "wide" | "offset" | "ordinary" = "wide",
  wideEnd = true
): Uint8Array {
  // Hand-authored, small ZIP64 records exercise wide fields without allocating large payloads.
  const name = strToU8("vector.txt");
  const contents = strToU8("123456789");
  const crc = 0xcbf43926;
  const local = new Uint8Array(30 + name.length + 20);
  const lh = view(local);
  lh.setUint32(0, 0x04034b50, true);
  lh.setUint16(4, 45, true);
  lh.setUint16(6, descriptor === "none" ? 0 : 8, true);
  lh.setUint32(14, descriptor === "none" ? crc : 0, true);
  lh.setUint32(18, 0xffffffff, true);
  lh.setUint32(22, 0xffffffff, true);
  lh.setUint16(26, name.length, true);
  lh.setUint16(28, 20, true);
  local.set(name, 30);
  const extra = 30 + name.length;
  lh.setUint16(extra, 1, true);
  lh.setUint16(extra + 2, 16, true);
  lh.setBigUint64(extra + 4, descriptor === "none" ? 9n : 0n, true);
  lh.setBigUint64(extra + 12, descriptor === "none" ? 9n : 0n, true);

  const tail = new Uint8Array(descriptor === "none" ? 0 : descriptor === "signed" ? 24 : 20);
  if (tail.length) {
    const start = descriptor === "signed" ? 4 : 0;
    const td = view(tail);
    if (start) td.setUint32(0, 0x08074b50, true);
    td.setUint32(start, crc, true);
    td.setBigUint64(start + 4, 9n, true);
    td.setBigUint64(start + 12, 9n, true);
  }

  const extraSize = centralLayout === "wide" ? 28 : centralLayout === "offset" ? 12 : 0;
  const central = new Uint8Array(46 + name.length + extraSize);
  const cd = view(central);
  cd.setUint32(0, 0x02014b50, true);
  cd.setUint16(6, 45, true);
  cd.setUint16(8, descriptor === "none" ? 0 : 8, true);
  cd.setUint32(16, crc, true);
  cd.setUint32(20, centralLayout === "wide" ? 0xffffffff : 9, true);
  cd.setUint32(24, centralLayout === "wide" ? 0xffffffff : 9, true);
  cd.setUint16(28, name.length, true);
  cd.setUint16(30, extraSize, true);
  cd.setUint32(42, centralLayout === "ordinary" ? 0 : 0xffffffff, true);
  central.set(name, 46);
  if (extraSize) {
    const start = 46 + name.length;
    cd.setUint16(start, 1, true);
    cd.setUint16(start + 2, extraSize - 4, true);
    if (centralLayout === "wide") {
      cd.setBigUint64(start + 4, 9n, true);
      cd.setBigUint64(start + 12, 9n, true);
      cd.setBigUint64(start + 20, 0n, true);
    } else {
      cd.setBigUint64(start + 4, 0n, true);
    }
  }

  const centralStart = local.length + contents.length + tail.length;
  const wide = new Uint8Array(wideEnd ? 76 : 0);
  if (wideEnd) {
    const wd = view(wide);
    wd.setUint32(0, 0x06064b50, true);
    wd.setBigUint64(4, 44n, true);
    wd.setUint16(14, 45, true);
    wd.setBigUint64(24, 1n, true);
    wd.setBigUint64(32, 1n, true);
    wd.setBigUint64(40, BigInt(central.length), true);
    wd.setBigUint64(48, BigInt(centralStart), true);
    wd.setUint32(56, 0x07064b50, true);
    wd.setBigUint64(64, BigInt(centralStart + central.length), true);
    wd.setUint32(72, 1, true);
  }
  const end = new Uint8Array(22);
  const ed = view(end);
  ed.setUint32(0, 0x06054b50, true);
  ed.setUint16(8, wideEnd ? 0xffff : 1, true);
  ed.setUint16(10, wideEnd ? 0xffff : 1, true);
  ed.setUint32(12, wideEnd ? 0xffffffff : central.length, true);
  ed.setUint32(16, wideEnd ? 0xffffffff : centralStart, true);
  return concat(local, contents, tail, central, wide, end);
}

describe("ZIP integrity", () => {
  it("accepts the independent CRC-32 check vector with its high bit set", () => {
    const bytes = storedZip();
    expect(view(bytes).getUint32(14, true)).toBe(0xcbf43926);
    for (const archive of [bytes, createPrdContainer(bytes)]) {
      expect(readPrdArchive(archive)["vector.txt"]).toEqual(strToU8("123456789"));
    }
  });

  it("rejects a changed stored byte even when lengths and headers are intact", () => {
    const bytes = storedZip();
    const dataOffset = 30 + view(bytes).getUint16(26, true) + view(bytes).getUint16(28, true);
    bytes[dataOffset] = 0x30;
    expectRejected(bytes, "archive-checksum-mismatch");
  });

  it("recomputes CRC-32 instead of trusting matching header checksums", () => {
    const bytes = storedZip();
    view(bytes).setUint32(14, 0, true);
    view(bytes).setUint32(centralOffset(bytes) + 16, 0, true);
    expectRejected(bytes, "archive-checksum-mismatch");
  });

  it("rejects local and central CRC disagreement", () => {
    const bytes = storedZip();
    view(bytes).setUint32(centralOffset(bytes) + 16, 0, true);
    expectRejected(bytes, "archive-read-invalid");
  });

  it("checks the declared central-directory extent", () => {
    const bytes = storedZip();
    const end = bytes.length - 22;
    view(bytes).setUint32(end + 12, view(bytes).getUint32(end + 12, true) - 1, true);
    expectRejected(bytes, "archive-read-invalid");
  });

  it.each([1, 0x40, 0x2000])("does not silently open unsupported ZIP encryption flag %i", (flag) => {
    const bytes = storedZip();
    view(bytes).setUint16(6, flag, true);
    view(bytes).setUint16(centralOffset(bytes) + 8, flag, true);
    expectRejected(bytes, "archive-read-invalid");
  });

  it.each([false, true])("checks CRC across multiple chunks with deflate=%s", (deflate) => {
    let state = 0x12345678;
    const contents = Uint8Array.from({ length: 70_000 }, () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state >>> 24;
    });
    const bytes = zipSync({ "many.bin": contents }, { level: deflate ? 6 : 0 });
    expect(view(bytes).getUint32(18, true)).toBeGreaterThan(1024);
    expect(readPrdArchive(bytes)["many.bin"]).toEqual(contents);
    view(bytes).setUint32(14, 0, true);
    view(bytes).setUint32(centralOffset(bytes) + 16, 0, true);
    expectRejected(bytes, "archive-checksum-mismatch");
  });

  it.each([
    { level: 0, envelope: false }, { level: 0, envelope: true },
    { level: 6, envelope: false }, { level: 6, envelope: true }
  ] as const)("owns decoded bytes for level=$level and envelope=$envelope", ({ level, envelope }) => {
    const contents = Uint8Array.from({ length: 65_537 }, (_, index) => index % 251);
    const zip = zipSync({ "owned.bin": contents }, { level });
    const archive = envelope ? createPrdContainer(zip) : zip;
    const storage = new Uint8Array(archive.length + 37);
    storage.set(archive, 13);
    const source = storage.subarray(13, 13 + archive.length);
    const output = readPrdArchive(source, { maxFileBytes: contents.length, maxExpandedBytes: contents.length })["owned.bin"]!;
    expect(() => readPrdArchive(source, { maxFileBytes: contents.length - 1 })).toThrow(expect.objectContaining({ code: "archive-file-size-limit" }));
    expect(() => readPrdArchive(source, { maxExpandedBytes: contents.length - 1 })).toThrow(expect.objectContaining({ code: "archive-expanded-size-limit" }));
    expect(output.buffer).not.toBe(source.buffer);
    source.fill(0);
    expect(output).toEqual(contents);
  });

  it.each([false, true])("accepts signed/signatureless descriptors with deflate=%s and embedded ZIP markers", (deflate) => {
    const contents = concat(strToU8("prefix"), new Uint8Array([80, 75, 7, 8, 80, 75, 3, 4, 80, 75, 1, 2]), strToU8("suffix"));
    const bytes = streamZip(contents, deflate);
    for (const source of [bytes, withoutDescriptorSignature(bytes)]) {
      expect(readPrdArchive(source)["vector.txt"]).toEqual(contents);
      expect(readPrdArchive(createPrdContainer(source))["vector.txt"]).toEqual(contents);
    }
  });

  it.each([false, true])("owns multiple large decoded members and empty files with envelope=%s", (envelope) => {
    let state = 0x12345678;
    const contents = Uint8Array.from({ length: 1024 * 1024 + 1 }, () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state >>> 24;
    });
    const zip = zipSync({
      "first.bin": contents, "second.bin": contents, "empty.bin": new Uint8Array(), "last.txt": strToU8("end")
    }, { level: 6 });
    const source = envelope ? createPrdContainer(zip) : zip;
    const files = readPrdArchive(source, { maxFileBytes: contents.length, maxExpandedBytes: contents.length * 2 + 3 });
    for (const name of ["first.bin", "second.bin"]) {
      expect(Buffer.from(files[name]!).equals(Buffer.from(contents))).toBe(true);
    }
    expect(files["first.bin"]!.buffer).not.toBe(files["second.bin"]!.buffer);
    files["first.bin"]!.fill(0);
    expect(Buffer.from(files["second.bin"]!).equals(Buffer.from(contents))).toBe(true);
    expect(files["empty.bin"]).toEqual(new Uint8Array());
    expect(files["last.txt"]).toEqual(strToU8("end"));
  });

  it.each([-1, 1])("rejects decoded lengths differing from consistent metadata by %i", (difference) => {
    const contents = new Uint8Array(65_537).fill(65);
    const valid = zipSync({ "length.bin": contents });
    const forged = valid.slice();
    view(forged).setUint32(22, contents.length + difference, true);
    view(forged).setUint32(centralOffset(forged) + 24, contents.length + difference, true);
    expectRejected(forged, "archive-read-invalid");
    expect(readPrdArchive(valid)["length.bin"]).toEqual(contents);
  });

  it.each([false, true])("does not reserve forged output capacity for a short payload with envelope=%s", (envelope) => {
    const declaredSize = 4 * 1024 * 1024;
    const zip = zipSync({ "short.bin": new Uint8Array([1, 2, 3]) });
    view(zip).setUint32(22, declaredSize, true);
    view(zip).setUint32(centralOffset(zip) + 24, declaredSize, true);
    const source = envelope ? createPrdContainer(zip) : zip;
    const allocations: number[] = [];
    const observed = new Proxy(Uint8Array, {
      construct(target, args) {
        if (typeof args[0] === "number") allocations.push(args[0]);
        return Reflect.construct(target, args);
      }
    });
    vi.stubGlobal("Uint8Array", observed);
    try {
      expect(() => readPrdArchive(source)).toThrow(expect.objectContaining({ code: "archive-read-invalid" }));
      expect(allocations.every((size) => size < declaredSize)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([false, true])("checks actual aggregate bytes before copying forged output with envelope=%s", (envelope) => {
    const zip = zipSync({ "first.bin": new Uint8Array(1024), "second.bin": new Uint8Array(1088) });
    const central = centralOffset(zip);
    const records = view(zip);
    const second = central + 46 + records.getUint16(central + 28, true) + records.getUint16(central + 30, true) + records.getUint16(central + 32, true);
    const local = records.getUint32(second + 42, true);
    records.setUint32(local + 22, 1024, true);
    records.setUint32(second + 24, 1024, true);
    const source = envelope ? createPrdContainer(zip) : zip;
    expect(() => readPrdArchive(source, { maxExpandedBytes: 2048 })).toThrow(expect.objectContaining({ code: "archive-expanded-size-limit" }));
  });

  it("accepts a signatureless descriptor whose CRC equals the optional signature marker", () => {
    // This four-byte vector has CRC 0x08074b50, independently checked with Python's zlib.
    const contents = new Uint8Array([0xac, 0x0a, 0x7a, 0xd5]);
    const bytes = streamZip(contents, false);
    expect(view(bytes).getUint32(centralOffset(bytes) + 16, true)).toBe(0x08074b50);
    expect(readPrdArchive(withoutDescriptorSignature(bytes))["vector.txt"]).toEqual(contents);
  });

  it.each([4, 8, 12])("rejects descriptor metadata corruption at offset %i", (offset) => {
    const bytes = streamZip(strToU8("123456789"), false);
    const descriptor = centralOffset(bytes) - 16;
    view(bytes).setUint32(descriptor + offset, 0x12345678, true);
    expectRejected(bytes, "archive-read-invalid");
  });

  it("requires a descriptor when bit 3 is set", () => {
    const bytes = storedZip();
    view(bytes).setUint16(6, 8, true);
    view(bytes).setUint16(centralOffset(bytes) + 8, 8, true);
    expectRejected(bytes, "archive-read-invalid");
  });

  it("keeps Unicode names, comments and benign extra fields", () => {
    const bytes = zipSync({ "café.txt": strToU8("ok") }, { comment: "file comment", extra: { 0xcafe: new Uint8Array([1, 2]) } });
    const comment = strToU8("archive comment PK\x05\x06");
    const result = concat(bytes, comment);
    view(result).setUint16(bytes.length - 2, comment.length, true);
    expect(readPrdArchive(result)["café.txt"]).toEqual(strToU8("ok"));
  });

  it("accepts reordered central records while preserving physical member order", () => {
    const bytes = zipSync({ "a.txt": strToU8("a"), "b.txt": strToU8("b") });
    const start = centralOffset(bytes);
    const second = start + 46 + 5;
    const end = bytes.length - 22;
    const result = concat(bytes.subarray(0, start), bytes.subarray(second, end), bytes.subarray(start, second), bytes.subarray(end));
    expect(Object.keys(readPrdArchive(result))).toEqual(["a.txt", "b.txt"]);
  });

  it.each([false, true])("retains an opaque ZIP central signature record included-in-size=%s", (included) => {
    const bytes = storedZip();
    const signature = new Uint8Array([0x50, 0x4b, 5, 5, 3, 0, 1, 2, 3]);
    const result = concat(bytes.subarray(0, -22), signature, bytes.subarray(-22));
    if (included) view(result).setUint32(result.length - 10, view(bytes).getUint32(bytes.length - 10, true) + signature.length, true);
    expect(readPrdArchive(result)["vector.txt"]).toEqual(strToU8("123456789"));
  });

  it.each(["none", "signed", "unsigned"] as const)("supports small ZIP64 records and %s descriptors", (descriptor) => {
    for (const source of [zip64Fixture(descriptor), createPrdContainer(zip64Fixture(descriptor))]) {
      expect(readPrdArchive(source)["vector.txt"]).toEqual(strToU8("123456789"));
    }
  });

  it.each(["wide", "offset", "ordinary"] as const)("supports ZIP64 %s central fields without requiring saturated legacy end fields", (layout) => {
    const bytes = zip64Fixture("none", layout, false);
    expect(readPrdArchive(bytes)["vector.txt"]).toEqual(strToU8("123456789"));
  });

  it.each([
    ["disk", 4, 2, 1], ["central disk", 6, 2, 1], ["disk count", 8, 2, 0],
    ["total count", 10, 2, 0], ["central offset", 16, 4, 1], ["central size", 12, 4, 1]
  ] as const)("rejects an inconsistent end record %s", (_label, offset, width, value) => {
    const bytes = storedZip();
    const end = bytes.length - 22;
    if (width === 2) view(bytes).setUint16(end + offset, value, true);
    else view(bytes).setUint32(end + offset, value, true);
    expectRejected(bytes, "archive-read-invalid");
  });

  it.each([
    ["signature", 0, 4, 0], ["name length", 28, 2, 0xffff],
    ["extra length", 30, 2, 0xffff], ["comment length", 32, 2, 0xffff],
    ["member disk", 34, 2, 1], ["local offset", 42, 4, 0x7fffffff]
  ] as const)("rejects malformed central %s", (_label, offset, width, value) => {
    const bytes = storedZip();
    const start = centralOffset(bytes);
    if (width === 2) view(bytes).setUint16(start + offset, value, true);
    else view(bytes).setUint32(start + offset, value, true);
    expectRejected(bytes, "archive-read-invalid");
  });

  it.each([
    ["signature", 0, 4, 0], ["flags", 6, 2, 0x800], ["CRC", 14, 4, 0],
    ["compressed size", 18, 4, 20], ["original size", 22, 4, 20],
    ["name length", 26, 2, 0xffff], ["extra length", 28, 2, 0xffff]
  ] as const)("rejects malformed local %s", (_label, offset, width, value) => {
    const bytes = storedZip();
    if (width === 2) view(bytes).setUint16(offset, value, true);
    else view(bytes).setUint32(offset, value, true);
    expectRejected(bytes, offset === 0 ? "archive-magic-invalid" : "archive-read-invalid");
  });

  it("rejects overlapping local offsets and omitted local members", () => {
    const bytes = zipSync({ "a.txt": strToU8("a"), "b.txt": strToU8("b") });
    const central = centralOffset(bytes);
    const second = central + 51;
    const overlap = bytes.slice();
    view(overlap).setUint32(second + 42, 0, true);
    expectRejected(overlap, "archive-read-invalid");
    const omitted = concat(bytes.subarray(0, second), bytes.subarray(bytes.length - 22));
    const end = omitted.length - 22;
    view(omitted).setUint16(end + 8, 1, true);
    view(omitted).setUint16(end + 10, 1, true);
    view(omitted).setUint32(end + 12, 51, true);
    expectRejected(omitted, "archive-read-invalid");
  });

  it("rejects missing, truncated and unsafe ZIP64 extra fields before allocating output", () => {
    const missing = storedZip();
    view(missing).setUint32(centralOffset(missing) + 20, 0xffffffff, true);
    expectRejected(missing, "archive-read-invalid");
    const truncated = zip64Fixture();
    view(truncated).setUint16(30 + strToU8("vector.txt").length + 2, 0xffff, true);
    expectRejected(truncated, "archive-read-invalid");
    const unsafe = zip64Fixture();
    view(unsafe).setBigUint64(30 + strToU8("vector.txt").length + 4, 1n << 60n, true);
    expectRejected(unsafe, "archive-read-invalid");
  });

  it.each([4, 24, 40, 48, 64, 72])("rejects malformed ZIP64 footer field %i", (offset) => {
    const bytes = zip64Fixture();
    const start = bytes.length - 98;
    if (offset === 72) view(bytes).setUint32(start + offset, 2, true);
    else view(bytes).setBigUint64(start + offset, 1n << 60n, true);
    expectRejected(bytes, "archive-read-invalid");
  });

  it("applies ZIP64 entry and byte limits before decoding", () => {
    const bytes = zip64Fixture();
    expect(() => readPrdArchive(bytes, { maxFileBytes: 8 })).toThrow(expect.objectContaining({ code: "archive-file-size-limit" }));
    const start = bytes.length - 98;
    view(bytes).setBigUint64(start + 24, 2n, true);
    view(bytes).setBigUint64(start + 32, 2n, true);
    expect(() => readPrdArchive(bytes, { maxEntries: 1 })).toThrow(expect.objectContaining({ code: "archive-entry-limit" }));
  });

  it("rejects truncated DEFLATE data with otherwise consistent record extents", () => {
    const source = zipSync({ "text.txt": strToU8(Array.from({ length: 200 }, (_, index) => `line ${index}`).join("\n")) });
    const central = centralOffset(source);
    const size = view(source).getUint32(18, true);
    const removed = Math.floor(size / 2);
    const bytes = concat(source.subarray(0, central - removed), source.subarray(central));
    const moved = central - removed;
    view(bytes).setUint32(18, size - removed, true);
    view(bytes).setUint32(moved + 20, size - removed, true);
    view(bytes).setUint32(bytes.length - 6, moved, true);
    expectRejected(bytes, "archive-read-invalid");
  });

  it("keeps every bounded truncation and bit mutation inside the public error boundary", () => {
    const original = storedZip();
    const limits = { maxFileBytes: 1024, maxExpandedBytes: 2048, maxEntries: 8 };
    for (const source of [original, createPrdContainer(original)]) {
      for (let length = 0; length < source.length; length += 1) {
        expect(() => readPrdArchive(source.subarray(0, length), limits)).toThrow(PrdContainerError);
      }
      for (let offset = 0; offset < source.length; offset += 1) {
        for (let bit = 0; bit < 8; bit += 1) {
          const bytes = source.slice();
          bytes[offset] = bytes[offset]! ^ (1 << bit);
          try {
            // CRC protects member data; harmless timestamp/attribute mutations may remain readable.
            expect(Object.values(readPrdArchive(bytes, limits))).toEqual([strToU8("123456789")]);
          } catch (error) {
            expect(error).toBeInstanceOf(PrdContainerError);
          }
        }
      }
    }
  });

  it("reports checksum failures through Node validation/inspection without partial facts and recovers", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-zip-integrity-"));
    try {
      const files = {
        "manifest.json": strToU8(JSON.stringify({
          prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:integrity",
          profile: "general-document", title: "Integrity", entry: "content/root.json"
        })),
        "content/root.json": strToU8(JSON.stringify({
          schemaVersion: "1.0", profile: "general-document", type: "document", id: "integrity",
          title: "Integrity", children: [{ type: "paragraph", text: "Original content" }]
        }))
      };
      const valid = zipSync(files, { level: 0 });
      const invalid = valid.slice();
      const text = strToU8("Original content");
      const position = invalid.findIndex((_byte, offset) => text.every((byte, index) => invalid[offset + index] === byte));
      expect(position).toBeGreaterThan(0);
      invalid[position] = 0x43;
      const path = join(root, "document.prd");
      for (const bytes of [invalid, createPrdContainer(invalid)]) {
        await writeFile(path, bytes);
        expect(await validatePrdArchive(path)).toMatchObject({ valid: false, errors: [{ code: "archive-checksum-mismatch" }] });
        expect(await inspectPrdArchive(path)).toMatchObject({ valid: false, fileCount: 0, totalBytes: 0, errors: [{ code: "archive-checksum-mismatch" }] });
      }
      await writeFile(path, valid);
      expect((await validatePrdArchive(path)).valid).toBe(true);
      expect(await inspectPrdArchive(path)).toMatchObject({ valid: true, fileCount: 2 });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
