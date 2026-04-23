/**
 * Company: EonHive
 * Title: External Consumer Smoke Script Tests
 * Purpose: Verify npm consumer smoke summary generation without hitting the network.
 * Author: Stan Nesi
 * Created: 2026-04-19
 * Updated: 2026-04-19
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
      "@eonhive/prd-cli@latest"
    ]);
  });

  it("prefers an explicit version when provided", () => {
    expect(buildPublishedPackageSpecs({ version: "0.1.0" })).toEqual([
      "@eonhive/prd-types@0.1.0",
      "@eonhive/prd-validator@0.1.0",
      "@eonhive/prd-packager@0.1.0",
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
    expect(writtenSummary.steps).toHaveLength(6);
    expect(recordedCommands).toHaveLength(6);
    expect(recordedCommands[0].args).toContain("@eonhive/prd-cli@0.1.0");
    expect(recordedCommands[2].args).toEqual([
      "--no-install",
      "prd",
      "inspect",
      expect.stringContaining("document-basic")
    ]);
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
