/**
 * Company: EonHive
 * Title: External Consumer Smoke Script Tests
 * Purpose: Verify npm consumer smoke summary generation without hitting the network.
 * Author: Stan Nesi
 * Created: 2026-04-19
 * Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildPublishedPackageSpecs,
  externalConsumerSmokeContractVersion,
  runExternalConsumerSmoke
} from "./external-consumer-smoke.mjs";
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

async function createFixtureRoot(repoRoot) {
  const fixtureSource = join(repoRoot, "examples", "document-basic");
  await mkdir(join(fixtureSource, "content"), { recursive: true });
  await writeFile(
    join(fixtureSource, "manifest.json"),
    JSON.stringify(
      {
        prdVersion: "1.0",
        manifestVersion: "1.0",
        id: "urn:test:consumer-smoke",
        profile: "general-document",
        title: "Consumer Smoke",
        entry: "content/root.json"
      },
      null,
      2
    )
  );
  await writeFile(
    join(fixtureSource, "content", "root.json"),
    JSON.stringify(
      {
        schemaVersion: "1.0",
        profile: "general-document",
        type: "document",
        id: "doc",
        title: "Consumer Smoke",
        children: []
      },
      null,
      2
    )
  );
}

describe("buildPublishedPackageSpecs", () => {
  it("builds npm specs from a dist tag by default", () => {
    expect(buildPublishedPackageSpecs({ distTag: "latest" })).toEqual([
      "@eonhive/prd-types@latest",
      "@eonhive/prd-validator@latest",
      "@eonhive/prd-packager@latest",
      "@eonhive/prd-converter@latest",
      "@eonhive/prd-cli@latest"
    ]);
  });

  it("prefers an explicit version when provided", () => {
    expect(buildPublishedPackageSpecs({ version: "0.1.0" })).toEqual([
      "@eonhive/prd-types@0.1.0",
      "@eonhive/prd-validator@0.1.0",
      "@eonhive/prd-packager@0.1.0",
      "@eonhive/prd-converter@0.1.0",
      "@eonhive/prd-cli@0.1.0"
    ]);
  });
});

describe("runExternalConsumerSmoke", () => {
  it("writes a passing summary for a mocked npm consumer flow", async () => {
    const repoRoot = await createTempDir("prd-consumer-smoke-");
    const summaryPath = join(repoRoot, "summary.json");
    const recordedCommands = [];
    await createFixtureRoot(repoRoot);

    const result = await runExternalConsumerSmoke({
      repoRoot,
      summaryPath,
      packageSpecs: buildPublishedPackageSpecs({ version: "0.1.0" }),
      commandRunner: async (command, args, options) => {
        recordedCommands.push({
          command,
          args,
          cwd: options.cwd
        });
      }
    });

    const writtenSummary = JSON.parse(await readFile(summaryPath, "utf8"));

    expect(result.status).toBe("passed");
    expect(writtenSummary.contractVersion).toBe(externalConsumerSmokeContractVersion);
    expect(writtenSummary.status).toBe("passed");
    expect(writtenSummary.steps).toHaveLength(18);
    expect(recordedCommands).toHaveLength(18);
    expect(recordedCommands[0].args).toContain("@eonhive/prd-cli@0.1.0");
    expect(recordedCommands[0].args).toContain("@eonhive/prd-converter@0.1.0");
    expect(recordedCommands.some(call => call.args.includes("init"))).toBe(true);
    expect(recordedCommands.some(call => call.args.includes("markdown"))).toBe(true);
    expect(recordedCommands.some(call => call.args.includes("html"))).toBe(true);
    expect(recordedCommands.some(call => call.args.includes("images"))).toBe(true);
    expect(recordedCommands.some(call => call.args.includes("convert"))).toBe(true);
    expect(writtenSummary.steps.some(step => step.title === "Convert with the public SDK" && step.status === "passed")).toBe(true);
    expect(recordedCommands[2].args).toEqual([
      "--no-install",
      "prd",
      "inspect",
      expect.stringContaining("document-basic")
    ]);
  });

  it("uses exact per-package workspace versions for the CI consumer path", async () => {
    const repoRoot = await createTempDir("prd-consumer-workspace-versions-");
    await createFixtureRoot(repoRoot);
    for (const pkg of publicReleasePackages) {
      await mkdir(join(repoRoot, pkg.directory), { recursive: true });
      await writeFile(join(repoRoot, pkg.directory, "package.json"), JSON.stringify({
        name: pkg.name, version: pkg.name === "@eonhive/prd-converter" ? "0.2.0" : "0.1.1"
      }));
    }
    const result = await runExternalConsumerSmoke({ repoRoot, workspaceVersions: true, commandRunner: async () => {} });
    expect(result.status).toBe("passed");
    expect(result.packageSpecs).toContain("@eonhive/prd-converter@0.2.0");
    expect(result.packageSpecs).toContain("@eonhive/prd-cli@0.1.1");
    expect(result.packageSpecs.some(spec => spec.endsWith("@latest"))).toBe(false);
  });

  it("records preparation failures as failed summaries and makes no install attempt", async () => {
    const repoRoot = await createTempDir("prd-consumer-prepare-failure-");
    let commands = 0;
    const result = await runExternalConsumerSmoke({ repoRoot, commandRunner: async () => { commands++; } });
    expect(result.status).toBe("failed");
    expect(result.steps[0]?.title).toBe("Prepare consumer smoke");
    expect(commands).toBe(0);
    expect(JSON.parse(await readFile(result.summaryPath, "utf8")).status).toBe("failed");
  });

  it("stops at a failed new conversion step without claiming subsequent validation passed", async () => {
    const repoRoot = await createTempDir("prd-consumer-convert-failure-");
    await createFixtureRoot(repoRoot);
    const result = await runExternalConsumerSmoke({ repoRoot, commandRunner: async (_command, args) => {
      if (args.includes("convert")) throw new Error("convert failed");
    } });
    expect(result.status).toBe("failed");
    expect(result.steps.at(-1)?.title).toBe("Convert with the CLI");
    expect(result.steps.at(-1)?.status).toBe("failed");
    expect(result.steps.some(step => step.title === "Validate CLI conversion")).toBe(false);
  });

  it("records the failing step when a mocked command errors", async () => {
    const repoRoot = await createTempDir("prd-consumer-smoke-fail-");
    const summaryPath = join(repoRoot, "summary.json");
    await createFixtureRoot(repoRoot);

    const result = await runExternalConsumerSmoke({
      repoRoot,
      summaryPath,
      commandRunner: async (_command, args) => {
        if (args.includes("inspect")) {
          throw new Error("inspect failed");
        }
      }
    });

    const writtenSummary = JSON.parse(await readFile(summaryPath, "utf8"));

    expect(result.status).toBe("failed");
    expect(writtenSummary.status).toBe("failed");
    expect(writtenSummary.steps.some((step) => step.status === "failed")).toBe(true);
  });
});
