/**
 * Company: EonHive Inc.
 * Title: Release Publish Preflight Script Tests
 * Purpose: Verify release publish preflight summary generation without requiring live npm credentials.
 * Author: Stan Nesi
 * Created: 2026-04-22
 * Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  releasePublishPreflightContractVersion,
  runReleasePublishPreflight
} from "./release-publish-preflight.mjs";
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

async function createWorkspace(repoRoot, version = "0.1.0", versions = {}) {
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
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    }
  };
}

describe("runReleasePublishPreflight", () => {
  it("uses Changesets even when every local package is initially 0.1.0", async () => {
    const repoRoot = await createTempDir("prd-release-preflight-pass-");
    const summaryPath = join(repoRoot, "summary.json");
    const recordedCommands = [];
    await createWorkspace(repoRoot);

    const result = await runReleasePublishPreflight({
      repoRoot,
      summaryPath,
      npmToken: "token",
      fetchImpl: async (url) => {
        if (String(url).endsWith("/-/whoami")) {
          return createJsonResponse(200, { username: "stan" });
        }

        return createJsonResponse(404, {});
      },
      commandRunner: async (command, args, options) => {
        recordedCommands.push({
          command,
          args,
          options
        });
        return {
          stdout: JSON.stringify({ stan: "owner" }),
          stderr: ""
        };
      }
    });

    const writtenSummary = JSON.parse(await readFile(summaryPath, "utf8"));

    expect(result.status).toBe("passed");
    expect(writtenSummary.contractVersion).toBe(
      releasePublishPreflightContractVersion
    );
    expect(writtenSummary.checks.npmAuth.username).toBe("stan");
    expect(writtenSummary.checks.organizationMembership.role).toBe("owner");
    expect(writtenSummary.checks.bootstrapMode.releaseMode).toBe("changesets-versioned");
    expect(writtenSummary.checks.bootstrapMode.previewEligible).toBe(false);
    expect(writtenSummary.checks.bootstrapMode.bootstrapRequired).toBe(false);
    expect(writtenSummary.checks.bootstrapMode.missingPackages).toHaveLength(5);
    expect(recordedCommands[0].args).toEqual(["org", "ls", "eonhive", "--json"]);
  });

  it("passes when an unpublished 0.1.1 package set uses normal changesets release mode", async () => {
    const repoRoot = await createTempDir("prd-release-preflight-versioned-");
    const summaryPath = join(repoRoot, "summary.json");
    await createWorkspace(repoRoot, "0.1.1");

    const result = await runReleasePublishPreflight({
      repoRoot,
      summaryPath,
      npmToken: "token",
      fetchImpl: async (url) => {
        if (String(url).endsWith("/-/whoami")) {
          return createJsonResponse(200, { username: "stan" });
        }

        return createJsonResponse(404, {});
      },
      commandRunner: async () => ({
        stdout: JSON.stringify({ stan: "owner" }),
        stderr: ""
      })
    });

    const writtenSummary = JSON.parse(await readFile(summaryPath, "utf8"));

    expect(result.status).toBe("passed");
    expect(writtenSummary.checks.packageTargets.versionSet).toEqual(["0.1.1"]);
    expect(writtenSummary.checks.bootstrapMode.releaseMode).toBe(
      "changesets-versioned"
    );
    expect(writtenSummary.checks.bootstrapMode.bootstrapRequired).toBe(false);
    expect(writtenSummary.checks.bootstrapMode.missingPackages).toHaveLength(5);
  });

  it("accepts independent versions and a new unpublished converter without forcing unrelated bumps", async () => {
    const repoRoot = await createTempDir("prd-release-preflight-independent-");
    await createWorkspace(repoRoot, "0.1.1", { "@eonhive/prd-converter": "0.1.0", "@eonhive/prd-cli": "0.2.0" });
    const result = await runReleasePublishPreflight({
      repoRoot, npmToken: "test-token",
      fetchImpl: async url => {
        if (String(url).endsWith("/-/whoami")) return createJsonResponse(200, { username: "stan" });
        return createJsonResponse(200, { versions: { "0.1.1": {} } });
      },
      commandRunner: async () => ({ stdout: JSON.stringify({ stan: "owner" }) })
    });
    expect(result.status).toBe("passed");
    expect(result.checks.packageTargets.versionPolicy).toBe("independent");
    expect(result.checks.packageTargets.versionSet).toEqual(["0.1.0", "0.1.1", "0.2.0"]);
    expect(result.checks.bootstrapMode.missingPackages).toEqual(["@eonhive/prd-converter@0.1.0", "@eonhive/prd-cli@0.2.0"]);
    expect(result.checks.bootstrapMode.publishedPackages).toHaveLength(3);
    expect(result.checks.bootstrapMode.bootstrapRequired).toBe(false);
  });

  it("fails a wrong target identity and records registry outages without publishing", async () => {
    const repoRoot = await createTempDir("prd-release-preflight-target-");
    await createWorkspace(repoRoot);
    await writeFile(join(repoRoot, "packages/prd-converter/package.json"), JSON.stringify({ name: "@other/converter", version: "0.1.0" }));
    const result = await runReleasePublishPreflight({ repoRoot, npmToken: "", fetchImpl: async () => createJsonResponse(404, {}) });
    expect(result.status).toBe("failed");
    expect(result.checks.packageTargets.status).toBe("failed");
    await createWorkspace(repoRoot);
    const unavailable = await runReleasePublishPreflight({ repoRoot, npmToken: "", fetchImpl: async () => createJsonResponse(503, {}) });
    expect(unavailable.status).toBe("failed");
    expect(unavailable.unhandledError).toContain("HTTP 503");
  });

  it("fails cleanly when NPM_TOKEN is missing", async () => {
    const repoRoot = await createTempDir("prd-release-preflight-no-token-");
    const summaryPath = join(repoRoot, "summary.json");
    await createWorkspace(repoRoot);

    const result = await runReleasePublishPreflight({
      repoRoot,
      summaryPath,
      npmToken: "",
      fetchImpl: async () => createJsonResponse(404, {})
    });

    const writtenSummary = JSON.parse(await readFile(summaryPath, "utf8"));

    expect(result.status).toBe("failed");
    expect(writtenSummary.checks.token.status).toBe("failed");
    expect(writtenSummary.checks.npmAuth.status).toBe("skipped");
    expect(writtenSummary.actions[0]).toContain("NPM_TOKEN");
  });

  it("fails when the authenticated npm user is not confirmed in the eonhive org", async () => {
    const repoRoot = await createTempDir("prd-release-preflight-org-fail-");
    const summaryPath = join(repoRoot, "summary.json");
    await createWorkspace(repoRoot);

    const result = await runReleasePublishPreflight({
      repoRoot,
      summaryPath,
      npmToken: "token",
      fetchImpl: async (url) => {
        if (String(url).endsWith("/-/whoami")) {
          return createJsonResponse(200, { username: "stan" });
        }

        return createJsonResponse(404, {});
      },
      commandRunner: async () => {
        throw new Error("npm org ls eonhive --json failed: user not in org");
      }
    });

    const writtenSummary = JSON.parse(await readFile(summaryPath, "utf8"));

    expect(result.status).toBe("failed");
    expect(writtenSummary.checks.organizationMembership.status).toBe("failed");
    expect(writtenSummary.actions.some((action) => action.includes("eonhive npm org"))).toBe(true);
  });
});
