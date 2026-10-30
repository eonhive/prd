/**
 * Company: EonHive
 * Title: External Consumer Smoke Script Tests
 * Purpose: Verify npm consumer smoke summary generation without hitting the network.
 * Author: Stan Nesi
 * Created: 2026-04-19
 * Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../packages/prd-cli/src/index.js";
import { requiresAuthoringSmoke } from "./consumer-authoring-smoke.mjs";
import {
  buildPublishedPackageSpecs,
  externalConsumerSmokeContractVersion,
  runExternalConsumerSmoke
} from "./external-consumer-smoke.mjs";
import { publicReleasePackages } from "./release-packages.mjs";

const tempDirs = [];
const execFileAsync = promisify(execFile);

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.map((path) => rm(path, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function createTempDir(prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(directory);
  return directory;
}

async function createFixtureRoot(repoRoot) {
  const cliDirectory = join(repoRoot, "packages", "prd-cli");
  await mkdir(cliDirectory, { recursive: true });
  await writeFile(join(cliDirectory, "package.json"), JSON.stringify({ version: "0.1.1" }));
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
        children: [{ type: "paragraph", text: "Consumer smoke." }]
      },
      null,
      2
    )
  );
}

function sourceCliRunner() {
  let lines = [];
  vi.spyOn(console, "log").mockImplementation((line) => lines.push(String(line)));
  return async (_command, args) => {
    if (args[0] === "install") {
      return "";
    }
    // Installed SDK execution is covered by the real tarball consumer lane.
    if (args[0]?.endsWith("check-converter.mjs")) return "";
    lines = [];
    const code = await runCli(args.slice(2));
    if (code !== 0) {
      throw new Error(`CLI exited ${code}`);
    }
    return lines.join("\n");
  };
}

describe("requiresAuthoringSmoke", () => {
  it.each(["0.1.0", "0.1.1", "0.1.12"])("retains legacy checks for CLI %s", (version) => {
    expect(requiresAuthoringSmoke(version)).toBe(false);
  });

  it.each(["0.2.0", "0.2.1", "0.10.0", "1.0.0"])("requires authoring checks for CLI %s", (version) => {
    expect(requiresAuthoringSmoke(version)).toBe(true);
  });

  it.each([undefined, "", "0.2", "0.2.0-rc.1", "0.2.0+build", "01.2.0"])("rejects ambiguous version %s", (version) => {
    expect(() => requiresAuthoringSmoke(version)).toThrow(/stable CLI version/);
  });
});

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
    expect(writtenSummary.steps).toHaveLength(12);
    expect(recordedCommands).toHaveLength(12);
    expect(recordedCommands[0].args).toContain("@eonhive/prd-cli@0.1.0");
    expect(recordedCommands[0].args).toContain("@eonhive/prd-converter@0.1.0");
    expect(recordedCommands.some(call => call.args.includes("html"))).toBe(true);
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
    expect(result.steps[0]?.title).toBe("Prepare consumer smoke inputs");
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

  it("automatically verifies all six authoring round trips for the planned CLI release", async () => {
    const repoRoot = await createTempDir("prd-consumer-authoring-");
    await createFixtureRoot(repoRoot);
    await writeFile(join(repoRoot, "packages/prd-cli/package.json"), JSON.stringify({ version: "0.2.0" }));

    const result = await runExternalConsumerSmoke({
      repoRoot,
      commandRunner: sourceCliRunner()
    });

    expect(result.status, JSON.stringify(result.steps.filter((step) => step.status === "failed"))).toBe("passed");
    expect(result.authoringRequired).toBe(true);
    expect(result.steps).toHaveLength(48);
    expect(result.steps.filter((step) => step.title.endsWith("inspect archive"))).toHaveLength(6);
    await expect(readFile(join(result.consumerProjectDir, "package.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("requires authoring from current-version tarballs when explicitly requested", async () => {
    const repoRoot = await createTempDir("prd-consumer-authoring-tarballs-");
    await createFixtureRoot(repoRoot);
    const result = await runExternalConsumerSmoke({
      repoRoot,
      authoring: true,
      commandRunner: sourceCliRunner()
    });
    expect(result.status, JSON.stringify(result.steps.filter((step) => step.status === "failed"))).toBe("passed");
    expect(result.authoringRequired).toBe(true);
    expect(result.steps).toHaveLength(48);
  });

  it("rejects a successful command that reports the wrong archive profile", async () => {
    const repoRoot = await createTempDir("prd-consumer-wrong-profile-");
    await createFixtureRoot(repoRoot);
    const runner = sourceCliRunner();
    const result = await runExternalConsumerSmoke({
      repoRoot,
      authoring: true,
      commandRunner: async (command, args) => {
        const output = await runner(command, args);
        if (args.includes("inspect") && args.some((arg) => arg.endsWith("init-general-document.prd"))) {
          const payload = JSON.parse(output);
          payload.manifest.profile = "comic";
          return JSON.stringify(payload);
        }
        return output;
      }
    });
    expect(result.status).toBe("failed");
    expect(result.steps.at(-1)).toMatchObject({
      title: "init general-document: inspect archive", status: "failed",
      errorMessage: expect.stringContaining("Consumer profile must match")
    });
    expect(result.steps).toHaveLength(12);
  });

  it("detects changed image bytes before accepting an imported package", async () => {
    const repoRoot = await createTempDir("prd-consumer-corrupt-image-");
    await createFixtureRoot(repoRoot);
    const runner = sourceCliRunner();
    const result = await runExternalConsumerSmoke({
      repoRoot,
      authoring: true,
      commandRunner: async (command, args) => {
        const output = await runner(command, args);
        if (args.includes("images") && args.includes("comic")) {
          const directory = args[args.indexOf("--out") + 1];
          const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
          await writeFile(join(directory, manifest.assets[0].href), "changed");
        }
        return output;
      }
    });
    expect(result.status).toBe("failed");
    expect(result.steps.at(-1)).toMatchObject({
      title: "import images comic: create package", status: "failed",
      errorMessage: expect.stringContaining("Source bytes and order must survive")
    });
  });

  it.each(["invalid JSON", "wrong source kind"])("rejects %s despite a successful inspect exit", async (fault) => {
    const repoRoot = await createTempDir("prd-consumer-invalid-inspection-");
    await createFixtureRoot(repoRoot);
    const runner = sourceCliRunner();
    const result = await runExternalConsumerSmoke({
      repoRoot,
      authoring: true,
      commandRunner: async (command, args) => {
        const output = await runner(command, args);
        if (args.includes("inspect") && args.some((arg) => arg.endsWith("init-general-document.prd"))) {
          if (fault === "invalid JSON") {
            return "not JSON";
          }
          const payload = JSON.parse(output);
          payload.inspection.sourceKind = "directory";
          return JSON.stringify(payload);
        }
        return output;
      }
    });
    expect(result.status).toBe("failed");
    expect(result.steps.at(-1)).toMatchObject({ title: "init general-document: inspect archive", status: "failed" });
  });

  it("fails at the first unavailable authoring command instead of skipping it", async () => {
    const repoRoot = await createTempDir("prd-consumer-missing-init-");
    await createFixtureRoot(repoRoot);
    const runner = sourceCliRunner();
    const result = await runExternalConsumerSmoke({
      repoRoot,
      authoring: true,
      commandRunner: async (command, args) => {
        if (args.includes("init")) {
          throw new Error("installed CLI has no init command");
        }
        return runner(command, args);
      }
    });
    expect(result.status).toBe("failed");
    expect(result.steps).toHaveLength(7);
    expect(result.steps.at(-1)).toMatchObject({ title: "init general-document: create package", status: "failed" });
    await expect(readFile(join(result.consumerProjectDir, "package.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("writes a failed summary when the expected CLI version is invalid", async () => {
    const repoRoot = await createTempDir("prd-consumer-invalid-version-");
    await createFixtureRoot(repoRoot);
    await writeFile(join(repoRoot, "packages/prd-cli/package.json"), JSON.stringify({ version: "unknown" }));
    const commandRunner = vi.fn();
    const result = await runExternalConsumerSmoke({ repoRoot, commandRunner });
    const writtenSummary = JSON.parse(await readFile(result.summaryPath, "utf8"));
    expect(writtenSummary.status).toBe("failed");
    expect(writtenSummary.steps.at(-1)).toMatchObject({
      title: "Prepare consumer smoke inputs", errorMessage: expect.stringContaining("stable CLI version")
    });
    expect(commandRunner).not.toHaveBeenCalled();
  });

  it("exits nonzero and retains a failed summary for a real setup failure", async () => {
    const repoRoot = await createTempDir("prd-consumer-cli-failure-");
    const script = fileURLToPath(new URL("./external-consumer-smoke.mjs", import.meta.url));
    await expect(execFileAsync(process.execPath, [script], { cwd: repoRoot })).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringContaining("EXTERNAL_CONSUMER_SMOKE_SUMMARY_FILE:")
    });
    const summary = JSON.parse(await readFile(join(repoRoot, "examples/dist/external-consumer-smoke-summary.json"), "utf8"));
    expect(summary.status).toBe("failed");
    expect(summary.steps.at(-1)).toMatchObject({ title: "Prepare consumer smoke inputs", status: "failed" });
  });
});
