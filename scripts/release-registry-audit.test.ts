/**
 * Company: EonHive Inc.
 * Title: Release Registry Audit Script Tests
 * Purpose: Verify published npm metadata audit behavior without live registry access.
 * Author: Stan Nesi
 * Created: 2026-04-23
 * Updated: 2026-10-30
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
import { publicReleasePackages } from "./release-packages.mjs";

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

async function createWorkspace(repoRoot, version = "0.1.1", versions = {}) {
  for (const pkg of publicReleasePackages) {
    const packageDirectory = join(repoRoot, pkg.directory);
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: pkg.name,
          version: versions[pkg.name] ?? version
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
    expect(writtenSummary.packages).toHaveLength(5);
    expect(writtenSummary.packages.every((pkg) => pkg.status === "passed")).toBe(true);
  });

  it("audits each independent version, including the converter, against its own latest tag", async () => {
    const repoRoot = await createTempDir("prd-registry-independent-");
    const versions = { "@eonhive/prd-converter": "0.2.0", "@eonhive/prd-cli": "0.3.0" };
    await createWorkspace(repoRoot, "0.1.1", versions);
    const result = await runReleaseRegistryAudit({ repoRoot, fetchImpl: async url => {
      const name = decodeURIComponent(String(url).split("/").pop() ?? "");
      return createJsonResponse(200, createRegistryDocument(name, versions[name] ?? "0.1.1", { "@eonhive/prd-types": "^0.1.1" }));
    } });
    expect(result.status).toBe("passed");
    expect(result.checks.packageTargets.versionPolicy).toBe("independent");
    expect(result.checks.packageTargets.versionSet).toEqual(["0.1.1", "0.2.0", "0.3.0"]);
    expect(result.packages.find(pkg => pkg.name === "@eonhive/prd-converter")?.expectedVersion).toBe("0.2.0");
  });

  it.each(["missing", "latest", "workspace", "deprecated", "unavailable"])("fails converter metadata case %s even when the four original packages pass", async mode => {
    const repoRoot = await createTempDir("prd-registry-converter-");
    await createWorkspace(repoRoot);
    const result = await runReleaseRegistryAudit({ repoRoot, fetchImpl: async url => {
      const name = decodeURIComponent(String(url).split("/").pop() ?? "");
      const document = createRegistryDocument(name, "0.1.1");
      if (name === "@eonhive/prd-converter") {
        if (mode === "missing") return createJsonResponse(404, {});
        if (mode === "unavailable") return createJsonResponse(503, {});
        if (mode === "latest") document["dist-tags"].latest = "0.1.0";
        if (mode === "workspace") document.versions["0.1.1"].dependencies = { "@eonhive/prd-types": "workspace:*" };
        if (mode === "deprecated") document.versions["0.1.1"].deprecated = "Upgrade to a supported version.";
      }
      return createJsonResponse(200, document);
    } });
    expect(result.status).toBe("failed");
    expect(result.packages.filter(pkg => pkg.status === "passed")).toHaveLength(4);
    expect(result.packages.find(pkg => pkg.name === "@eonhive/prd-converter")?.status).toBe("failed");
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
