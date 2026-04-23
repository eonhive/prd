/**
 * Company: EonHive
 * Title: Runtime Conformance Check Script Tests
 * Purpose: Verify the published runtime conformance corpus manifest and summary generation.
 * Author: Stan Nesi
 * Created: 2026-04-16
 * Updated: 2026-04-16
 * Notes: Vibe coded with Codex.
 */

import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  defaultRuntimeConformanceSummaryPath,
  loadRuntimeConformanceManifest,
  runtimeConformanceContractVersion
} from "./runtime-conformance-check.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function runRuntimeConformanceCommand() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(pnpmCommand, ["runtime:conformance"], {
      cwd: repoRoot,
      stdio: "pipe"
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }

      reject(new Error(stderr || `runtime:conformance failed with exit code ${code}`));
    });
  });
}

describe("runtime conformance manifest", () => {
  it("references only existing fixture directories", async () => {
    const { manifest } = await loadRuntimeConformanceManifest({ repoRoot });

    expect(manifest.contractVersion).toBe(runtimeConformanceContractVersion);
    expect(manifest.runtimeId).toBe("reference-viewer");
    expect(Array.isArray(manifest.fixtures)).toBe(true);
    expect(manifest.fixtures.length).toBeGreaterThan(0);

    for (const fixture of manifest.fixtures) {
      await access(resolve(repoRoot, fixture.path), constants.F_OK);
    }
  });
});

describe("runRuntimeConformanceCheck", () => {
  it("writes a passing summary artifact for the published corpus command", async () => {
    await runRuntimeConformanceCommand();

    const writtenSummary = JSON.parse(
      await readFile(resolve(repoRoot, defaultRuntimeConformanceSummaryPath), "utf8")
    );

    expect(writtenSummary.contractVersion).toBe(runtimeConformanceContractVersion);
    expect(writtenSummary.runtimeId).toBe("reference-viewer");
    expect(writtenSummary.status).toBe("passed");
    expect(Array.isArray(writtenSummary.fixtures)).toBe(true);
    expect(writtenSummary.fixtures.length).toBe(5);
    expect(writtenSummary.fixtures.every((fixture) => fixture.status === "passed")).toBe(
      true
    );
  }, 15_000);
});
