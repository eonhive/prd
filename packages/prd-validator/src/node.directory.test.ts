/**
 * Company: EonHive Inc. | Title: Directory Loading Policy Tests
 * Purpose: Verify bounded directory validation and inspection without changing semantic results.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { zipSync } from "fflate";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectPackage, inspectPackageDirectory, validatePackage, validatePackageDirectory } from "./node.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function createPackage(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "prd-directory-policy-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "content"));
  await writeFile(join(root, "manifest.json"), JSON.stringify({
    prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:directory-policy",
    profile: "general-document", title: "Directory policy", entry: "content/root.json"
  }));
  await writeFile(join(root, "content/root.json"), JSON.stringify({
    schemaVersion: "1.0", profile: "general-document", type: "document", id: "directory-policy",
    title: "Directory policy", children: [{ type: "paragraph", text: "Readable content." }]
  }));
  return root;
}

describe("directory loading budgets", () => {
  it.each([
    ["direct validation", validatePackageDirectory],
    ["generic validation", validatePackage],
    ["direct inspection", inspectPackageDirectory],
    ["generic inspection", inspectPackage]
  ] as const)("enforces a configured file budget through %s", async (_label, load) => {
    const root = await createPackage();
    const result = await load(root, { maxFileBytes: 16 });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.objectContaining({ code: "directory-file-size-limit", path: root })]);
  });

  it.each([
    [{ maxEntries: 2 }, "directory-entry-limit"],
    [{ maxExpandedBytes: 250 }, "directory-total-size-limit"],
    [{ maxFileBytes: 0 }, "directory-limit-invalid"]
  ] as const)("reports directory limits %j without exposing a partial inspection", async (limits, code) => {
    const root = await createPackage();
    for (const load of [validatePackageDirectory, validatePackage, inspectPackageDirectory, inspectPackage]) {
      const result = await load(root, limits);
      expect(result).toMatchObject({ valid: false, warnings: [], errors: [{ code, path: root, severity: "error" }] });
    }
    expect(await inspectPackage(root, limits)).toMatchObject({ sourceKind: "directory", fileCount: 0, totalBytes: 0 });
  });

  it("preserves validation and inspection facts with explicit sufficient budgets", async () => {
    const root = await createPackage();
    const limits = { maxEntries: 3, maxFileBytes: 1000, maxExpandedBytes: 2000 };
    expect(await validatePackage(root, limits)).toEqual(await validatePackage(root));
    expect(await inspectPackage(root, limits)).toEqual(await inspectPackage(root));
    expect(await inspectPackage(root)).toMatchObject({ valid: true, sourceKind: "directory", fileCount: 2 });
  });

  it("passes generic budgets to archive loading as well", async () => {
    const root = await createPackage();
    const path = join(root, "document.prd");
    await writeFile(path, zipSync({
      "manifest.json": new Uint8Array(await readFile(join(root, "manifest.json"))),
      "content/root.json": new Uint8Array(await readFile(join(root, "content/root.json")))
    }));
    for (const load of [validatePackage, inspectPackage]) {
      expect(await load(path, { maxArchiveBytes: 16 })).toMatchObject({ valid: false, errors: [{ code: "archive-size-limit" }] });
      expect((await load(path)).valid).toBe(true);
    }
  });

  it("keeps the existing invalid path and invalid directory diagnostics", async () => {
    const root = await createPackage();
    const missing = join(root, "missing");
    expect(await validatePackage(missing)).toMatchObject({ valid: false, errors: [{ code: "package-path-missing" }] });
    expect(await inspectPackage(missing)).toMatchObject({ valid: false, errors: [{ code: "package-path-missing" }] });
    expect(await validatePackageDirectory(join(root, "manifest.json"))).toMatchObject({ valid: false, errors: [{ code: "package-directory-invalid" }] });
    expect(await inspectPackageDirectory(join(root, "manifest.json"))).toMatchObject({ valid: false, errors: [{ code: "package-directory-invalid" }] });
    expect(await validatePackageDirectory(missing)).toMatchObject({ valid: false, errors: [{ code: "directory-read-invalid" }] });
  });
});
