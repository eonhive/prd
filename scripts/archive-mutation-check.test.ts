/**
 * Company: EonHive Inc. | Title: Archive Mutation Oracle Tests
 * Purpose: Keep the bounded mutation campaign reproducible and verify that its safety checks can fail.
 * Author: Stan Nesi | Created: 2026-10-30 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runArchiveMutationCheck } from "./archive-mutation-check.mjs";

describe("bounded archive mutation campaign", () => {
  it.each([0, 1, 0xc0ffee])("accepts exact controls and safely classifies mutations for seed %i", (seed) => {
    const report = runArchiveMutationCheck({ seed, iterations: 256 });
    expect(report).toMatchObject({ status: "passed", processed: 306, failures: [] });
    expect(report.accepted + report.rejected).toBe(report.processed);
    expect(report.accepted).toBeGreaterThanOrEqual(16);
    expect(report.rejectionCodes["archive-checksum-mismatch"]).toBeGreaterThan(0);
    expect(report.rejectionCodes["archive-file-size-limit"]).toBeGreaterThan(0);
  });

  it("repeats exactly with a fixed seed and fixed DOS timestamps", () => {
    expect(runArchiveMutationCheck({ seed: 42, iterations: 128 })).toEqual(runArchiveMutationCheck({ seed: 42, iterations: 128 }));
  });

  it.each([-1, 0x1_0000_0000, Number.NaN, 1.5])("refuses invalid seed %s", (seed) => {
    expect(() => runArchiveMutationCheck({ seed })).toThrow("unsigned 32-bit");
  });

  it.each([-1, 10_001, Number.POSITIVE_INFINITY])("refuses unbounded/invalid iteration count %s", (iterations) => {
    expect(() => runArchiveMutationCheck({ iterations })).toThrow("Iterations");
  });

  it("detects unsafe or oversized returned files and unexpected native errors", () => {
    for (const [readArchive, expected] of [
      [() => Object.assign(Object.create(null), { "../outside": new Uint8Array([1]) }), "path is unsafe"],
      [() => Object.assign(Object.create(null), { "large.bin": new Uint8Array(16_385) }), "exceed the budget"],
      [() => { throw new RangeError("unexpected native failure"); }, "Unexpected reader error"]
    ] as const) {
      const report = runArchiveMutationCheck({ iterations: 1, readArchive });
      expect(report.status).toBe("failed");
      expect(report.failures[0]?.message).toContain(expected);
      expect(report.failures.length).toBeLessThanOrEqual(8);
      expect(report.failures[0]?.inputBase64).toBeTruthy();
    }
  });

  it("detects input mutation and nondeterministic reader outcomes", () => {
    const mutating = runArchiveMutationCheck({ iterations: 1, readArchive: (input: Uint8Array) => {
      input[0] = input[0]! ^ 1;
      return Object.create(null);
    } });
    expect(mutating.failures[0]?.message).toContain("mutated its input");
    expect(Buffer.from(mutating.failures[0]!.inputBase64, "base64")[0]).toBe(0x50);
    let calls = 0;
    const unstable = runArchiveMutationCheck({ iterations: 1, readArchive: () => Object.assign(Object.create(null), {
      "value.txt": new Uint8Array([calls++ & 1])
    }) });
    expect(unstable.failures[0]?.message).toContain("not deterministic");
  });

  it("writes a complete passing CLI summary from its bounded child", async () => {
    const directory = await mkdtemp(join(tmpdir(), "prd-mutation-cli-"));
    try {
      const path = join(directory, "summary.json");
      execFileSync(process.execPath, [fileURLToPath(new URL("./archive-mutation-check.mjs", import.meta.url)), "--seed", "42", "--iterations", "32", "--out", path], { timeout: 25_000, stdio: "pipe" });
      const report = JSON.parse(await readFile(path, "utf8"));
      expect(report).toMatchObject({ status: "passed", seed: 42, processed: 82, failures: [] });
      expect(Object.keys(report.implementation)).toHaveLength(3);
      expect(report.environment.node).toBe(process.version);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
