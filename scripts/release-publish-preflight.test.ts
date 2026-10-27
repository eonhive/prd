/**
 * Company: EonHive Inc.
 * Title: Release Publish Preflight Script Tests
 * Purpose: Verify release publish preflight summary generation without requiring live npm credentials.
 * Author: Stan Nesi
 * Created: 2026-04-22
 * Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
  releasePublishPreflightContractVersion,
  runReleasePublishPreflight
} from "./release-publish-preflight.mjs";
import { getReleasePackageVersionMode } from "./release-package-versions.mjs";

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

async function createWorkspace(repoRoot, version = "0.1.0", overrides = {}) {
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
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    }
  };
}

function authorizedOptions(repoRoot) {
  return {
    repoRoot,
    summaryPath: join(repoRoot, "summary.json"),
    npmToken: "test-publisher-token",
    fetchImpl: async (url) => String(url).endsWith("/-/whoami")
      ? createJsonResponse(200, { username: "stan" })
      : createJsonResponse(404, {}),
    commandRunner: async () => ({ stdout: JSON.stringify({ stan: "owner" }), stderr: "" })
  };
}

describe("release package version modes", () => {
  it("keeps bootstrap coordinated but permits independently versioned stable releases", () => {
    expect(getReleasePackageVersionMode(["0.1.0", "0.1.0"])).toBe("bootstrap-preview");
    expect(getReleasePackageVersionMode(["0.1.1", "0.2.0", "1.0.0"])).toBe("changesets-versioned");
  });

  it.each([
    [], ["0.1.0", "0.2.0"], ["0.0.9"], ["0.2"], ["01.2.3"], ["^0.2.0"],
    ["0.2.0-beta.1"], ["0.2.0+build"], ["0.2.0\n"], ["latest"], [undefined], [1], ["9007199254740992.1.1"]
  ])("rejects invalid, legacy-mixed, or unconfigured prerelease version set %j", (...versions) => {
    expect(getReleasePackageVersionMode(versions)).toBeNull();
  });
});

describe("runReleasePublishPreflight", () => {
  it("leaves independently versioned targets to Changesets rather than bootstrap", async () => {
    const repoRoot = await createTempDir("prd-release-bootstrap-independent-");
    await createWorkspace(repoRoot, "0.1.1", { "@eonhive/prd-cli": { version: "0.2.0" } });
    const script = fileURLToPath(new URL("./release-bootstrap.mjs", import.meta.url));
    const { stdout } = await promisify(execFile)(process.execPath, [script], { cwd: repoRoot });
    expect(stdout).toContain("Bootstrap publish applies only to the first 0.1.0 public preview");
    expect(stdout).not.toContain("Publishing");
  });

  it.each([false, true])("allows a CLI-only minor version with other versions unchanged (CLI published: %s)", async (cliPublished) => {
    const repoRoot = await createTempDir("prd-release-preflight-independent-");
    await createWorkspace(repoRoot, "0.1.1", { "@eonhive/prd-cli": { version: "0.2.0" } });
    const result = await runReleasePublishPreflight({
      ...authorizedOptions(repoRoot),
      fetchImpl: async (url) => {
        if (String(url).endsWith("/-/whoami")) return createJsonResponse(200, { username: "stan" });
        const isCli = decodeURIComponent(String(url)).endsWith("@eonhive/prd-cli");
        return createJsonResponse(200, { versions: isCli
          ? cliPublished ? { "0.2.0": {} } : { "0.1.1": {} }
          : { "0.1.1": {} } });
      }
    });
    expect(result.status).toBe("passed");
    expect(result.checks.packageTargets.versionSet).toEqual(["0.1.1", "0.2.0"]);
    expect(result.checks.bootstrapMode).toMatchObject({
      status: "passed", releaseMode: "changesets-versioned", previewEligible: false,
      bootstrapRequired: false,
      missingPackages: cliPublished ? [] : ["@eonhive/prd-cli@0.2.0"]
    });
    const artifact = JSON.parse(await readFile(join(repoRoot, "summary.json"), "utf8"));
    expect(artifact.checks.packageTargets.packages[3].version).toBe("0.2.0");
    expect(JSON.stringify(artifact)).not.toContain("test-publisher-token");
  });

  it.each([
    { name: "@other/prd-cli" }, { version: "latest" }, { version: "0.1.0" }
  ])("keeps invalid targets and mixed bootstrap releases gated: %j", async (cli) => {
    const repoRoot = await createTempDir("prd-release-preflight-invalid-");
    await createWorkspace(repoRoot, "0.1.1", { "@eonhive/prd-cli": cli });
    const result = await runReleasePublishPreflight(authorizedOptions(repoRoot));
    expect(result.status).toBe("failed");
    expect(result.checks.packageTargets.status).toBe("failed");
  });

  it("does not bypass npm authentication for independently versioned targets", async () => {
    const repoRoot = await createTempDir("prd-release-preflight-independent-auth-");
    await createWorkspace(repoRoot, "0.1.1", { "@eonhive/prd-cli": { version: "0.2.0" } });
    const result = await runReleasePublishPreflight({
      ...authorizedOptions(repoRoot),
      fetchImpl: async (url) => createJsonResponse(String(url).endsWith("/-/whoami") ? 401 : 404, {})
    });
    expect(result.status).toBe("failed");
    expect(result.checks.packageTargets.status).toBe("passed");
    expect(result.checks.npmAuth.status).toBe("failed");
    expect(result.checks.organizationMembership.status).toBe("skipped");
  });

  it("writes a passing summary when npm auth, org membership, and bootstrap state are valid", async () => {
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
    expect(writtenSummary.checks.bootstrapMode.releaseMode).toBe("bootstrap-preview");
    expect(writtenSummary.checks.bootstrapMode.bootstrapRequired).toBe(true);
    expect(writtenSummary.checks.bootstrapMode.missingPackages).toHaveLength(4);
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
    expect(writtenSummary.checks.bootstrapMode.missingPackages).toHaveLength(4);
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
