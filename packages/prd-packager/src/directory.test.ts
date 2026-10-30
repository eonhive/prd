/**
 * Company: EonHive Inc. | Title: Bounded Directory Packaging Tests
 * Purpose: Verify shared source budgets, output budgets and failure-before-write behavior.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validatePackageDirectory } from "@eonhive/prd-validator/node";
import { readPrdArchive, readPrdContainer } from "@eonhive/prd-validator/container";
import { packDirectoryToBuffer, packDirectoryToFile } from "./index.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function createPackage() {
  const root = await mkdtemp(join(tmpdir(), "prd-bounded-pack-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "content"));
  await writeFile(join(root, "manifest.json"), JSON.stringify({
    prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:bounded-pack",
    profile: "general-document", title: "Bounded pack", entry: "content/root.json"
  }));
  await writeFile(join(root, "content/root.json"), JSON.stringify({
    schemaVersion: "1.0", profile: "general-document", type: "document", id: "bounded-pack",
    title: "Bounded pack", children: [{ type: "paragraph", text: "Readable content." }]
  }));
  return root;
}

describe("directory packaging budgets", () => {
  it.each([
    [{ maxFileBytes: 16 }, "directory-file-size-limit"],
    [{ maxExpandedBytes: 250 }, "directory-total-size-limit"],
    [{ maxEntries: 2 }, "directory-entry-limit"],
    [{ maxEntries: 0 }, "directory-limit-invalid"]
  ] as const)("shares directory validation policy for limits %j", async (limits, code) => {
    const root = await createPackage();
    expect(await validatePackageDirectory(root, limits)).toMatchObject({ valid: false, errors: [{ code }] });
    await expect(packDirectoryToBuffer(root, { limits })).rejects.toMatchObject({ code });
  });

  it.each(["zip", "prd"] as const)("preserves %s output and exact source bytes with explicit budgets", async (container) => {
    const root = await createPackage();
    const limits = { maxFileBytes: 1000, maxExpandedBytes: 2000, maxEntries: 3, maxArchiveBytes: 4000 };
    const archive = await packDirectoryToBuffer(root, { container, limits });
    expect(readPrdContainer(archive).kind).toBe(container);
    expect(readPrdArchive(archive)["content/root.json"]).toEqual(new Uint8Array(await readFile(join(root, "content/root.json"))));
  });

  it.each(["zip", "prd"] as const)("applies the configured compressed output limit to %s", async (container) => {
    const root = await createPackage();
    await expect(packDirectoryToBuffer(root, { container, limits: { maxArchiveBytes: 16 } })).rejects.toMatchObject({ code: "archive-size-limit" });
  });

  it("does not create output or replace an existing file after a source budget failure", async () => {
    const root = await createPackage();
    const outside = await mkdtemp(join(tmpdir(), "prd-bounded-output-"));
    temporaryDirectories.push(outside);
    const output = join(outside, "new/document.prd");
    await expect(packDirectoryToFile(root, output, { limits: { maxFileBytes: 16 } })).rejects.toMatchObject({ code: "directory-file-size-limit" });
    await expect(readFile(output)).rejects.toMatchObject({ code: "ENOENT" });
    const existing = join(outside, "existing.prd");
    await writeFile(existing, "preserve me");
    await expect(packDirectoryToFile(root, existing, { limits: { maxEntries: 1 } })).rejects.toMatchObject({ code: "directory-entry-limit" });
    expect(await readFile(existing, "utf8")).toBe("preserve me");
  });
});
