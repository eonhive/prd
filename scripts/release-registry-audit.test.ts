/**
 * Company: EonHive Inc.
 * Title: Release Registry Audit Script Tests
 * Purpose: Verify published npm metadata audit behavior without live registry access.
 * Author: Stan Nesi
 * Created: 2026-04-23
 * Updated: 2026-04-23
 * Notes: Vibe coded with Codex.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  releaseRegistryAuditContractVersion,
  runReleaseRegistryAudit
} from "./release-registry-audit.mjs";

const tempDirs = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((path) => rm(path, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function createTempDir(prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(directory);
  return directory;
}

async function createWorkspace(repoRoot, version = "0.1.1") {
  const packages = [
    { directory: "packages/prd-types", name: "@eonhive/prd-types" },
    { directory: "packages/prd-validator", name: "@eonhive/prd-validator" },
    { directory: "packages/prd-packager", name: "@eonhive/prd-packager" },
    { directory: "packages/prd-cli", name: "@eonhive/prd-cli" }
  ];

  for (const pkg of packages) {
    const packageDirectory = join(repoRoot, pkg.directory);
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: pkg.name,
          version
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }
}

function createJsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() {
      return body;
    }
  };
}

function createRegistryDocument(name, version, dependencies = {}) {
  return {
    "dist-tags": {
      latest: version
    },
    versions: {
      [version]: {
        name,
        version,
        dependencies
      }
    }
  };
}

describe("runReleaseRegistryAudit", () => {
  it("writes a passing summary when published registry metadata is consumer-safe", async () => {
    const repoRoot = await createTempDir("prd-release-registry-audit-pass-");
    const summaryPath = join(repoRoot, "summary.json");
    await createWorkspace(repoRoot);

    const result = await runReleaseRegistryAudit({
      repoRoot,
      summaryPath,
      fetchImpl: async (url) => {
        const packageName = decodeURIComponent(String(url).split("/").pop() ?? "");
        const dependencies =
          packageName === "@eonhive/prd-validator"
            ? { "@eonhive/prd-types": "^0.1.1", fflate: "^0.8.2" }
            : packageName === "@eonhive/prd-packager"
              ? {
                  "@eonhive/prd-types": "^0.1.1",
                  "@eonhive/prd-validator": "^0.1.1",
                  fflate: "^0.8.2"
                }
              : packageName === "@eonhive/prd-cli"
                ? {
                    "@eonhive/prd-packager": "^0.1.1",
                    "@eonhive/prd-types": "^0.1.1",
                    "@eonhive/prd-validator": "^0.1.1"
                  }
                : {};

        return createJsonResponse(
          200,
          createRegistryDocument(packageName, "0.1.1", dependencies)
        );
      }
    });

    const writtenSummary = JSON.parse(await readFile(summaryPath, "utf8"));

    expect(result.status).toBe("passed");
    expect(writtenSummary.contractVersion).toBe(releaseRegistryAuditContractVersion);
    expect(writtenSummary.packages.every((pkg) => pkg.status === "passed")).toBe(true);
  });

  it("fails when published registry metadata still contains workspace protocol dependencies", async () => {
    const repoRoot = await createTempDir("prd-release-registry-audit-workspace-");
    const summaryPath = join(repoRoot, "summary.json");
    await createWorkspace(repoRoot);

    const result = await runReleaseRegistryAudit({
      repoRoot,
      summaryPath,
      fetchImpl: async (url) => {
        const packageName = decodeURIComponent(String(url).split("/").pop() ?? "");
        const dependencies =
          packageName === "@eonhive/prd-validator"
            ? { "@eonhive/prd-types": "workspace:*" }
            : {};

        return createJsonResponse(
          200,
          createRegistryDocument(packageName, "0.1.1", dependencies)
        );
      }
    });

    const writtenSummary = JSON.parse(await readFile(summaryPath, "utf8"));

    expect(result.status).toBe("failed");
    expect(
      writtenSummary.packages.some((pkg) =>
        pkg.dependencyIssues.some((issue) => issue.code === "workspace-protocol")
      )
    ).toBe(true);
  });

  it("fails when the expected published version is missing or not on latest", async () => {
    const repoRoot = await createTempDir("prd-release-registry-audit-version-");
    const summaryPath = join(repoRoot, "summary.json");
    await createWorkspace(repoRoot);

    const result = await runReleaseRegistryAudit({
      repoRoot,
      summaryPath,
      fetchImpl: async (url) => {
        const packageName = decodeURIComponent(String(url).split("/").pop() ?? "");
        return createJsonResponse(200, {
          "dist-tags": {
            latest: "0.1.0"
          },
          versions: {
            "0.1.0": {
              name: packageName,
              version: "0.1.0",
              dependencies: {}
            }
          }
        });
      }
    });

    const writtenSummary = JSON.parse(await readFile(summaryPath, "utf8"));

    expect(result.status).toBe("failed");
    expect(
      writtenSummary.packages.every((pkg) => pkg.published === false)
    ).toBe(true);
  });
});
