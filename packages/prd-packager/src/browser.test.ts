/**
 * Company: EonHive Inc. | Title: Memory Packaging Tests
 * Purpose: Verify shared package validation and unsafe archive-member rejection.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import { packPackageFiles } from "./browser.js";

describe("memory package writer", () => {
  it.each(["zip", "prd"] as const)("round trips a real validated package in %s transport", async (container) => {
    const files = readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-markdown/converted.prd"))));
    const result = readPrdArchive(packPackageFiles(files, { container }));
    expect(result).toEqual(files);
  });
  it("rejects invalid content and unsafe unreferenced members", async () => {
    expect(() => packPackageFiles({})).toThrow("Cannot pack invalid PRD package");
    const files = readPrdArchive(new Uint8Array(await readFile(resolve("examples/conversion-markdown/converted.prd"))));
    expect(() => packPackageFiles({ ...files, "../escape.txt": new Uint8Array([1]) })).toThrow();
    expect(() => packPackageFiles(files, { container: "bad" as "zip" })).toThrow("Container");
  });
});
