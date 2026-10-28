/**
 * Company: EonHive
 * Title: External Consumer Smoke Script
 * Purpose: Verify published PRD packages from npm in a clean temp project without workspace linking.
 * Author: Stan Nesi
 * Created: 2026-04-19
 * Updated: 2026-04-19
 * Notes: Vibe coded with Codex.
 */

import { spawn } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthoringSmokeSteps, requiresAuthoringSmoke } from "./consumer-authoring-smoke.mjs";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

export const externalConsumerSmokeContractVersion =
  "prd-external-consumer-smoke-v0.1";
export const defaultExternalConsumerSmokeSummaryPath =
  "examples/dist/external-consumer-smoke-summary.json";
export const publishedPrdPackages = [
  "@eonhive/prd-types",
  "@eonhive/prd-validator",
  "@eonhive/prd-packager",
  "@eonhive/prd-cli"
];

function formatCommand(command, args) {
  return [command, ...args].join(" ");
}

function runCommand(command, args, options = {}) {
  const {
    cwd = process.cwd(),
    env,
    stdio = "inherit",
    capture = false
  } = options;

  return new Promise((resolvePromise, reject) => {
    const stdout = [];
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env
      },
      stdio: capture ? ["ignore", "pipe", "inherit"] : stdio
    });

    child.stdout?.on("data", (chunk) => stdout.push(String(chunk)));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolvePromise(stdout.join(""));
        return;
      }

      reject(
        new Error(
          signal == null
            ? `Command failed: ${formatCommand(command, args)} (exit ${code ?? "unknown"})`
            : `Command failed: ${formatCommand(command, args)} (signal ${signal})`
        )
      );
    });
  });
}

export function buildPublishedPackageSpecs(options = {}) {
  const version = options.version ?? process.env.PRD_NPM_VERSION;
  const distTag = options.distTag ?? process.env.PRD_NPM_DIST_TAG ?? "latest";

  if (version) {
    return [...publishedPrdPackages].map((name) => `${name}@${version}`);
  }

  return [...publishedPrdPackages].map((name) => `${name}@${distTag}`);
}

function buildConsumerSteps(fixturePath, archivePath, packageSpecs, npmCacheDir) {
  return [
    {
      title: "Install published PRD packages from npm",
      command: npmCommand,
      args: ["install", "--no-audit", "--no-fund", ...packageSpecs],
      env: {
        npm_config_cache: npmCacheDir
      }
    },
    {
      title: "Validate unpacked fixture",
      command: npxCommand,
      args: ["--no-install", "prd", "validate", fixturePath]
    },
    {
      title: "Inspect unpacked fixture",
      command: npxCommand,
      args: ["--no-install", "prd", "inspect", fixturePath]
    },
    {
      title: "Pack fixture archive",
      command: npxCommand,
      args: ["--no-install", "prd", "pack", fixturePath, "--out", archivePath]
    },
    {
      title: "Validate packed fixture archive",
      command: npxCommand,
      args: ["--no-install", "prd", "validate", archivePath]
    },
    {
      title: "Inspect packed fixture archive",
      command: npxCommand,
      args: ["--no-install", "prd", "inspect", archivePath]
    }
  ];
}

export async function runExternalConsumerSmoke(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const summaryPath = resolve(
    repoRoot,
    options.summaryPath ?? defaultExternalConsumerSmokeSummaryPath
  );
  const scratchRoot = await mkdtemp(join(tmpdir(), "prd-external-consumer-smoke-"));
  const npmCacheDir = join(scratchRoot, "npm-cache");
  const consumerProjectDir = join(scratchRoot, "consumer-project");
  const fixtureSourcePath = resolve(
    repoRoot,
    options.fixtureSourcePath ?? "examples/document-basic"
  );
  const fixturePath = join(consumerProjectDir, "fixtures", "document-basic");
  const archivePath = join(consumerProjectDir, "artifacts", "document-basic.prd");
  const packageSpecs = options.packageSpecs ?? buildPublishedPackageSpecs();
  const commandRunner = options.commandRunner ?? runCommand;
  const summary = {
    contractVersion: externalConsumerSmokeContractVersion,
    generatedAt: new Date().toISOString(),
    status: "passed",
    consumerProjectDir,
    fixtureSourcePath,
    packageSpecs,
    authoringRequired: false,
    steps: []
  };

  await mkdir(dirname(summaryPath), { recursive: true });

  const preparationStartedAt = Date.now();
  try {
    if (options.authoring != null) {
      summary.authoringRequired = options.authoring;
    } else {
      const manifest = JSON.parse(await readFile(join(repoRoot, "packages/prd-cli/package.json"), "utf8"));
      summary.authoringRequired = requiresAuthoringSmoke(manifest.version);
    }
    await mkdir(consumerProjectDir, { recursive: true });
    await mkdir(join(consumerProjectDir, "fixtures"), { recursive: true });
    await mkdir(join(consumerProjectDir, "artifacts"), { recursive: true });
    await mkdir(npmCacheDir, { recursive: true });
    await writeFile(
      join(consumerProjectDir, "package.json"),
      `${JSON.stringify(
        {
          name: "prd-external-consumer-smoke",
          private: true,
          type: "module"
        },
        null,
        2
      )}\n`,
      "utf8"
    );
    await cp(fixtureSourcePath, fixturePath, { recursive: true });

    const steps = buildConsumerSteps(
      fixturePath,
      archivePath,
      packageSpecs,
      npmCacheDir
    );
    if (summary.authoringRequired) {
      steps.push(...await createAuthoringSmokeSteps(consumerProjectDir));
    }

    for (const step of steps) {
      const startedAt = Date.now();

      try {
        const output = await commandRunner(step.command, step.args, {
          cwd: consumerProjectDir,
          env: step.env,
          capture: step.capture
        });
        await step.verify?.(output);
        summary.steps.push({
          title: step.title,
          command: formatCommand(step.command, step.args),
          durationMs: Date.now() - startedAt,
          status: "passed"
        });
      } catch (error) {
        summary.status = "failed";
        summary.steps.push({
          title: step.title,
          command: formatCommand(step.command, step.args),
          durationMs: Date.now() - startedAt,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        break;
      }
    }
  } catch (error) {
    summary.status = "failed";
    summary.steps.push({
      title: "Prepare consumer smoke inputs",
      command: "prepare consumer smoke inputs",
      durationMs: Date.now() - preparationStartedAt,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error)
    });
  } finally {
    await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

    if (process.env.KEEP_EXTERNAL_CONSUMER_SMOKE !== "1") {
      await rm(scratchRoot, { recursive: true, force: true });
    }
  }

  return {
    ...summary,
    summaryPath
  };
}

const currentPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;

if (invokedPath === currentPath) {
  const result = await runExternalConsumerSmoke();
  console.log(`EXTERNAL_CONSUMER_SMOKE_SUMMARY_FILE: ${result.summaryPath}`);
  if (result.status !== "passed") {
    process.exitCode = 1;
  }
}
