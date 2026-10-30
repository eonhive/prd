/**
 * Company: EonHive Inc. | Title: Bounded Directory Reader Tests
 * Purpose: Exercise traversal limits, pre-read checks and actual-byte checks during file growth.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */

import { mkdtemp, mkdir, open, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRD_DEFAULT_ARCHIVE_LIMITS } from "./container.js";
import { PRD_DEFAULT_DIRECTORY_LIMITS, readPackageDirectory, type PrdDirectoryLimits } from "./directory.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, open: vi.fn(actual.open) };
});

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.mocked(open).mockReset();
  vi.mocked(open).mockImplementation((await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises")).open);
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function directory(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "prd-bounded-directory-"));
  temporaryDirectories.push(root);
  return root;
}

function stubFile(size: number, contents: Uint8Array, regular = true) {
  let position = 0;
  const handle = {
    stat: vi.fn(async () => ({ size, isFile: () => regular })),
    read: vi.fn(async (buffer: Uint8Array, offset: number, length: number) => {
      const chunk = contents.subarray(position, position + length);
      buffer.set(chunk, offset);
      position += chunk.length;
      return { bytesRead: chunk.length, buffer };
    }),
    close: vi.fn(async () => undefined)
  };
  vi.mocked(open).mockResolvedValueOnce(handle as unknown as Awaited<ReturnType<typeof open>>);
  return handle;
}

describe("readPackageDirectory", () => {
  it("shares archive defaults without inventing a compressed directory size", () => {
    expect(PRD_DEFAULT_DIRECTORY_LIMITS).toEqual({
      maxEntries: PRD_DEFAULT_ARCHIVE_LIMITS.maxEntries,
      maxFileBytes: PRD_DEFAULT_ARCHIVE_LIMITS.maxFileBytes,
      maxExpandedBytes: PRD_DEFAULT_ARCHIVE_LIMITS.maxExpandedBytes
    });
    expect(Object.isFrozen(PRD_DEFAULT_DIRECTORY_LIMITS)).toBe(true);
  });

  it("keeps exact relative file bytes and inert property names at inclusive limits", async () => {
    const root = await directory();
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "__proto__"), new Uint8Array([0, 255]));
    await writeFile(join(root, "assets/data.bin"), new Uint8Array([1, 2, 3]));
    const files = await readPackageDirectory(root, { maxEntries: 3, maxFileBytes: 3, maxExpandedBytes: 5 });
    expect(Object.getPrototypeOf(files)).toBe(null);
    expect(files["__proto__"]).toEqual(new Uint8Array([0, 255]));
    expect(files["assets/data.bin"]).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("counts empty directories and stops traversal at the entry limit", async () => {
    const root = await directory();
    await mkdir(join(root, "a"));
    await mkdir(join(root, "b"));
    await expect(readPackageDirectory(root, { maxEntries: 1 })).rejects.toMatchObject({ code: "directory-entry-limit" });
    expect(vi.mocked(open)).not.toHaveBeenCalled();
  });

  it("counts hidden entries but excludes their bytes and descendants", async () => {
    const root = await directory();
    await mkdir(join(root, ".ignored"));
    await writeFile(join(root, ".ignored/large.bin"), new Uint8Array(100));
    await writeFile(join(root, ".hidden"), new Uint8Array(100));
    expect(Object.keys(await readPackageDirectory(root, { maxEntries: 2, maxFileBytes: 1, maxExpandedBytes: 1 }))).toEqual([]);
    await expect(readPackageDirectory(root, { maxEntries: 1 })).rejects.toMatchObject({ code: "directory-entry-limit" });
  });

  it.skipIf(process.platform === "win32")("excludes symlinks and does not follow directory cycles", async () => {
    const root = await directory();
    const outside = await directory();
    await writeFile(join(outside, "private.bin"), new Uint8Array(100));
    await symlink(outside, join(root, "outside"));
    await symlink(join(outside, "private.bin"), join(root, "linked.bin"));
    await symlink(root, join(root, "cycle"));
    expect(Object.keys(await readPackageDirectory(root, { maxEntries: 3, maxFileBytes: 1 }))).toEqual([]);
    await expect(readPackageDirectory(root, { maxEntries: 2 })).rejects.toMatchObject({ code: "directory-entry-limit" });
  });

  it("bounds a nested tree without recursive file-map merging", async () => {
    const root = await directory();
    const nested = Array.from({ length: 30 }, () => "part").join("/");
    await mkdir(join(root, nested), { recursive: true });
    await writeFile(join(root, nested, "text.txt"), "ok");
    await expect(readPackageDirectory(root, { maxEntries: 30 })).rejects.toMatchObject({ code: "directory-entry-limit" });
    expect((await readPackageDirectory(root, { maxEntries: 31 }))[`${nested}/text.txt`]).toEqual(new Uint8Array([111, 107]));
  });

  it.each([
    [11, { maxFileBytes: 10 }, "directory-file-size-limit"],
    [10, { maxFileBytes: 20, maxExpandedBytes: 9 }, "directory-total-size-limit"]
  ] as const)("rejects declared size %s before reading file data", async (size, limits, code) => {
    const root = await directory();
    await writeFile(join(root, "data.bin"), "x");
    const handle = stubFile(size, new Uint8Array(size));
    await expect(readPackageDirectory(root, limits)).rejects.toMatchObject({ code });
    expect(handle.read).not.toHaveBeenCalled();
    expect(handle.close).toHaveBeenCalledOnce();
  });

  it.each([
    [{ maxFileBytes: 8 }, "directory-file-size-limit"],
    [{ maxFileBytes: 20, maxExpandedBytes: 8 }, "directory-total-size-limit"]
  ] as const)("catches growth after stat with limits %j", async (limits, code) => {
    const root = await directory();
    await writeFile(join(root, "growing.bin"), "x");
    const handle = stubFile(1, new Uint8Array(1024));
    await expect(readPackageDirectory(root, limits)).rejects.toMatchObject({ code });
    expect(handle.read).toHaveBeenCalledOnce();
    expect(handle.read.mock.calls[0]?.[2]).toBe(9);
    expect(handle.close).toHaveBeenCalledOnce();
  });

  it("accepts growth within the inclusive byte limits", async () => {
    const root = await directory();
    await writeFile(join(root, "growing.bin"), "x");
    const contents = new Uint8Array([1, 2, 3, 4]);
    const handle = stubFile(1, contents);
    expect((await readPackageDirectory(root, { maxFileBytes: 4, maxExpandedBytes: 4 }))["growing.bin"]).toEqual(contents);
    expect(handle.close).toHaveBeenCalledOnce();
  });

  it("returns actual bytes for files that shrink and for empty files", async () => {
    const root = await directory();
    await writeFile(join(root, "empty.bin"), new Uint8Array());
    const handle = stubFile(4, new Uint8Array());
    expect((await readPackageDirectory(root))["empty.bin"]).toEqual(new Uint8Array());
    expect(handle.close).toHaveBeenCalledOnce();
  });

  it("closes a file when a read fails", async () => {
    const root = await directory();
    await writeFile(join(root, "broken.bin"), "x");
    const handle = stubFile(1, new Uint8Array(1));
    handle.read.mockRejectedValueOnce(new Error("I/O failed"));
    await expect(readPackageDirectory(root)).rejects.toMatchObject({ code: "directory-read-invalid" });
    expect(handle.close).toHaveBeenCalledOnce();
  });

  it("rejects an entry replaced with a non-file before reading", async () => {
    const root = await directory();
    await writeFile(join(root, "replaced.bin"), "x");
    const handle = stubFile(1, new Uint8Array(1), false);
    await expect(readPackageDirectory(root)).rejects.toMatchObject({ code: "directory-read-invalid" });
    expect(handle.read).not.toHaveBeenCalled();
    expect(handle.close).toHaveBeenCalledOnce();
  });

  for (const name of ["maxEntries", "maxFileBytes", "maxExpandedBytes"] as const) {
    it.each([0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, undefined])(
      `rejects invalid ${name}: %s before opening files`, async (value) => {
        const root = await directory();
        await writeFile(join(root, "data.bin"), "x");
        const limits: Partial<PrdDirectoryLimits> = { [name]: value };
        await expect(readPackageDirectory(root, limits)).rejects.toMatchObject({ code: "directory-limit-invalid" });
        expect(vi.mocked(open)).not.toHaveBeenCalled();
      }
    );
  }
});
