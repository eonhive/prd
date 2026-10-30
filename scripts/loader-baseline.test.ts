/**
 * Company: EonHive Inc. | Title: Loader Baseline Tests
 * Purpose: Verify complete-byte measurement and reject comparisons across incompatible fixtures or methods.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { createPrdContainer } from "../packages/prd-validator/dist/container.js";
import { compareLoaderReports, LOADER_BASELINE_VERSION, logicalFileDigest, measureLoaderArchive } from "./loader-baseline.mjs";

const requireArchive = createRequire(new URL("../packages/prd-validator/package.json", import.meta.url));
const { zipSync, strToU8 } = requireArchive("fflate");
const directories: string[] = [];

function files() {
  return {
    "manifest.json": strToU8(JSON.stringify({
      prdVersion: "1.0", manifestVersion: "1.0", id: "urn:prd:loader-test", profile: "general-document",
      title: "Loader test", entry: "content/root.json", assets: [{ id: "bytes", href: "assets/data.bin" }]
    })),
    "content/root.json": strToU8(JSON.stringify({
      schemaVersion: "1.0", profile: "general-document", type: "document", id: "loader-test", title: "Loader test",
      children: [{ type: "paragraph", text: "Complete package measurement." }]
    })),
    "assets/data.bin": new Uint8Array([0, 1, 2, 255])
  };
}

async function archivePath(archive: Uint8Array) {
  const directory = await mkdtemp(join(tmpdir(), "prd-loader-test-"));
  directories.push(directory);
  const path = join(directory, "fixture.prd");
  await writeFile(path, archive);
  return path;
}

function report() {
  return {
    contractVersion: LOADER_BASELINE_VERSION, sampleCount: 5, archiveLimits: { maxEntries: 10_000 },
    environment: { node: "same", platform: "same", release: "same", arch: "same", cpu: "same" },
    cases: [{
      id: "fixture/level-0/zip", archiveSha256: "archive", logicalSha256: "files",
      median: { decodeMs: 10, totalMs: 12 }, processPeakRssKiB: 100
    }]
  };
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("bounded loader baseline", () => {
  it.each(["zip", "prd"])("measures every logical file in %s without counting warmup", async (transport) => {
    const source = files();
    const zip = zipSync(source, { level: 0 });
    const archive = transport === "prd" ? createPrdContainer(zip) : zip;
    const result = await measureLoaderArchive(await archivePath(archive), 2);
    expect(result.samples).toHaveLength(2);
    expect(result.logicalSha256).toBe(logicalFileDigest(source));
    expect(result.fileCount).toBe(3);
    expect(result.materializedBytes).toBe(Object.values(source).reduce((total, bytes) => total + bytes.length, 0));
    expect(result.archiveBytes).toBe(archive.length);
    expect(result.supportState).toBe("fully-supported");
    expect(result.samples.every((sample: { decodeMs: number; memoryAfter: { rss: number } }) => sample.decodeMs >= 0 && sample.memoryAfter.rss > 0)).toBe(true);
    expect(result.processPeakRssKiB).toBeGreaterThan(0);
  });

  it("does not turn a CRC rejection into a fast successful result", async () => {
    const archive = zipSync(files(), { level: 0 });
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    archive[30 + view.getUint16(26, true) + view.getUint16(28, true)] ^= 1;
    await expect(measureLoaderArchive(await archivePath(archive), 1)).rejects.toMatchObject({ code: "archive-checksum-mismatch" });
  });

  it("requires actual package validation after successful archive decoding", async () => {
    const source = { ...files(), "manifest.json": strToU8("{}") };
    await expect(measureLoaderArchive(await archivePath(zipSync(source)), 1)).rejects.toThrow("Invalid benchmark package");
  });

  it("does not report an unsupported required capability as a successful open", async () => {
    const source = files();
    const manifest = JSON.parse(new TextDecoder().decode(source["manifest.json"]));
    manifest.compatibility = { capabilities: { required: ["baseline.unsupported"] } };
    source["manifest.json"] = strToU8(JSON.stringify(manifest));
    await expect(measureLoaderArchive(await archivePath(zipSync(source)), 1)).rejects.toThrow("cannot be opened");
  });

  it("hashes paths, lengths and all asset bytes independently of insertion order", () => {
    const source = files();
    const reversed = Object.fromEntries(Object.entries(source).reverse());
    expect(logicalFileDigest(reversed)).toBe(logicalFileDigest(source));
    expect(logicalFileDigest({ ...source, "assets/data.bin": new Uint8Array([0, 1, 2, 254]) })).not.toBe(logicalFileDigest(source));
    expect(logicalFileDigest({ ...source, "assets/extra.bin": new Uint8Array() })).not.toBe(logicalFileDigest(source));
  });

  it.each([0, 26, 1.5, Number.NaN])("rejects an invalid sample count %s", async (count) => {
    await expect(measureLoaderArchive("unused", count)).rejects.toThrow("Sample count");
  });

  it("compares equivalent cases without imposing noisy performance thresholds", () => {
    const before = report();
    const after = report();
    after.cases[0].median.decodeMs = 5;
    expect(compareLoaderReports(before, after)[0]).toMatchObject({ decodeBeforeMs: 10, decodeAfterMs: 5, decodeChangePercent: -50 });
    after.cases[0].median.decodeMs = 20;
    expect(compareLoaderReports(before, after)[0].decodeChangePercent).toBe(100);
  });

  it.each(["archiveSha256", "logicalSha256", "id"] as const)("rejects changed case %s", (field) => {
    const after = report();
    after.cases[0][field] = "different";
    expect(() => compareLoaderReports(report(), after)).toThrow("fixture bytes differ");
  });

  it("rejects changed methods, environment, limits and case sets", () => {
    const before = report();
    const version = { ...report(), contractVersion: "older" };
    expect(() => compareLoaderReports(before, version)).toThrow("contract");
    expect(() => compareLoaderReports(before, { ...report(), sampleCount: 3 })).toThrow("sample count");
    expect(() => compareLoaderReports(before, { ...report(), archiveLimits: {} })).toThrow("archive limits");
    expect(() => compareLoaderReports(before, { ...report(), environment: { ...before.environment, node: "other" } })).toThrow("environment");
    expect(() => compareLoaderReports(before, { ...report(), cases: [] })).toThrow("case sets");
    expect(() => compareLoaderReports(before, { ...report(), cases: [before.cases[0], before.cases[0]] })).toThrow("case sets");
  });
});
