/**
 * Company: EonHive Inc. | Title: Asset Blob Snapshot Tests
 * Purpose: Verify exact byte ranges, immutable snapshots and the native-buffer fast path.
 * Author: Stan Nesi | Created: 2026-10-30 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAssetBlob } from "./assetBlob.js";

afterEach(() => vi.unstubAllGlobals());

function observeBlobParts() {
  let parts: BlobPart[] = [];
  class ObservedBlob extends Blob {
    constructor(next: BlobPart[] = [], options?: BlobPropertyBag) {
      super(next, options);
      parts = next;
    }
  }
  vi.stubGlobal("Blob", ObservedBlob);
  return () => parts;
}

describe("asset Blob snapshots", () => {
  it("preserves MIME and bytes when the source changes", async () => {
    const source = new Uint8Array([1, 2, 255]);
    const blob = createAssetBlob(source, "image/png");
    source.fill(0);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(3);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 255]));
  });

  it("excludes bytes outside an offset view", async () => {
    const storage = new Uint8Array([99, 1, 2, 3, 88]);
    const blob = createAssetBlob(storage.subarray(1, 4), "application/octet-stream");
    storage.fill(0);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("does not expose a Node Buffer's surrounding storage", async () => {
    const storage = Buffer.from([99, 4, 5, 6, 88]);
    const blob = createAssetBlob(storage.subarray(1, 4), "application/octet-stream");
    storage.fill(0);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([4, 5, 6]));
  });

  it("passes the ordinary buffer range without a preliminary byte clone", () => {
    const getParts = observeBlobParts();
    const source = new Uint8Array([99, 1, 2, 3, 88]).subarray(1, 4);
    createAssetBlob(source, "application/octet-stream");
    const part = getParts()[0] as Uint8Array;
    expect(part.buffer).toBe(source.buffer);
    expect(part.byteOffset).toBe(source.byteOffset);
    expect(part.byteLength).toBe(source.byteLength);
  });

  it("copies a shared backing store into an ordinary snapshot source", async () => {
    const getParts = observeBlobParts();
    const source = new Uint8Array(new SharedArrayBuffer(5));
    source.set([99, 7, 8, 9, 88]);
    const blob = createAssetBlob(source.subarray(1, 4), "application/octet-stream");
    const part = getParts()[0] as Uint8Array;
    expect(part.buffer).toBeInstanceOf(ArrayBuffer);
    expect(part.buffer).not.toBe(source.buffer);
    source.fill(0);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([7, 8, 9]));
  });

  it("keeps the safe copy path for a foreign-realm buffer", async () => {
    const getParts = observeBlobParts();
    const source = runInNewContext("new Uint8Array([10, 11, 12])") as Uint8Array;
    expect(source.buffer instanceof ArrayBuffer).toBe(false);
    const blob = createAssetBlob(source, "application/octet-stream");
    expect((getParts()[0] as Uint8Array).buffer).not.toBe(source.buffer);
    source.fill(0);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([10, 11, 12]));
  });

  it("keeps a zero-length offset view empty", async () => {
    const blob = createAssetBlob(new Uint8Array([99, 88]).subarray(1, 1), "application/octet-stream");
    expect(blob.size).toBe(0);
    expect((await blob.arrayBuffer()).byteLength).toBe(0);
  });

  it("routes Viewer URL creation through the helper and retains URL ownership", async () => {
    const source = await readFile(new URL("./App.tsx", import.meta.url), "utf8");
    const start = source.indexOf("function createObjectUrl(");
    const end = source.indexOf("function createAssetUrlMap(", start);
    const creation = source.slice(start, end);
    expect(creation).toContain("createAssetBlob(file, mimeType)");
    expect(creation).toContain("objectUrls.push(url)");
    expect(creation).not.toContain("toArrayBuffer");
  });
});
