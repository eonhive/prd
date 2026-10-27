/**
 * Company: EonHive Inc.
 * Title: Release Registry Audit Script Tests
 * Purpose: Verify published npm metadata audit behavior without live registry access.
 * Author: Stan Nesi
 * Created: 2026-04-23
 * Updated: 2026-10-27
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

async function createWorkspace(repoRoot, version = "0.1.1", overrides = {}) {
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
          version,
          ...overrides[pkg.name]
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
  it("audits independently versioned public packages at their own expected latest versions", async () => {
    const repoRoot = await createTempDir("prd-release-registry-independent-");
    await createWorkspace(repoRoot, "0.1.1", { "@eonhive/prd-cli": { version: "0.2.0" } });
    const result = await runReleaseRegistryAudit({
      repoRoot,
      fetchImpl: async (url) => {
        const name = decodeURIComponent(String(url).split("/").pop() ?? "");
        const version = name === "@eonhive/prd-cli" ? "0.2.0" : "0.1.1";
        return createJsonResponse(200, createRegistryDocument(name, version,
          name === "@eonhive/prd-cli" ? { "@eonhive/prd-packager": "^0.1.1" } : {}));
      }
    });
    expect(result.status).toBe("passed");
    expect(result.checks.packageTargets.versionSet).toEqual(["0.1.1", "0.2.0"]);
    expect(result.packages.map((pkg) => [pkg.expectedVersion, pkg.latestVersion]))
      .toEqual([["0.1.1", "0.1.1"], ["0.1.1", "0.1.1"], ["0.1.1", "0.1.1"], ["0.2.0", "0.2.0"]]);
    const artifact = JSON.parse(await readFile(result.summaryPath, "utf8"));
    expect(artifact.packages.every((pkg) => pkg.status === "passed")).toBe(true);
  });

  it.each(["missing", "wrong-latest", "workspace", "optional-workspace", "invalid-range"])("preserves registry failures for independent releases: %s", async (failure) => {
    const repoRoot = await createTempDir("prd-release-registry-independent-fail-");
    await createWorkspace(repoRoot, "0.1.1", { "@eonhive/prd-cli": { version: "0.2.0" } });
    const result = await runReleaseRegistryAudit({
      repoRoot,
      fetchImpl: async (url) => {
        const name = decodeURIComponent(String(url).split("/").pop() ?? "");
        if (name !== "@eonhive/prd-cli") return createJsonResponse(200, createRegistryDocument(name, "0.1.1"));
        if (failure === "missing") return createJsonResponse(200, createRegistryDocument(name, "0.1.1"));
        const document = createRegistryDocument(name, "0.2.0");
        const manifest = document.versions["0.2.0"];
        if (failure === "wrong-latest") document["dist-tags"].latest = "0.1.1";
        if (failure === "workspace") manifest.dependencies = { "@eonhive/prd-packager": "workspace:*" };
        if (failure === "optional-workspace") manifest.optionalDependencies = { "@eonhive/prd-types": "workspace:*" };
        if (failure === "invalid-range") manifest.dependencies = { "@eonhive/prd-validator": "latest" };
        return createJsonResponse(200, document);
      }
    });
    expect(result.status).toBe("failed");
    expect(result.checks.packageTargets.status).toBe("passed");
    const cli = result.packages.find((pkg) => pkg.name === "@eonhive/prd-cli");
    expect(cli.status).toBe("failed");
    expect(result.packages.filter((pkg) => pkg.name !== cli.name).every((pkg) => pkg.status === "passed")).toBe(true);
    if (["workspace", "optional-workspace", "invalid-range"].includes(failure)) {
      expect(cli.dependencyIssues.length).toBeGreaterThan(0);
    }
  });

  it.each([{ name: "@other/prd-cli" }, { version: "latest" }, { version: "0.1.0" }])("fails invalid public targets despite relaxed version equality: %j", async (cli) => {
    const repoRoot = await createTempDir("prd-release-registry-target-fail-");
    await createWorkspace(repoRoot, "0.1.1", { "@eonhive/prd-cli": cli });
    const result = await runReleaseRegistryAudit({ repoRoot, fetchImpl: async () => createJsonResponse(404, {}) });
    expect(result.status).toBe("failed");
    expect(result.checks.packageTargets.status).toBe("failed");
  });

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
