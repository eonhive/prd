/**
 * Company: EonHive
 * Title: External Consumer Smoke Script
 * Purpose: Verify published PRD packages from npm in a clean temp project without workspace linking.
 * Author: Stan Nesi
 * Created: 2026-04-19
 * Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { spawn } from "node:child_process";
import { cp, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWorkspacePackageSpecs, publicReleasePackages } from "./release-packages.mjs";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

export const externalConsumerSmokeContractVersion =
  "prd-external-consumer-smoke-v0.2";
export const defaultExternalConsumerSmokeSummaryPath =
  "examples/dist/external-consumer-smoke-summary.json";
export const publishedPrdPackages = publicReleasePackages.map(pkg => pkg.name);

function formatCommand(command, args) {
  return [command, ...args].join(" ");
}

function runCommand(command, args, options = {}) {
  const {
    cwd = process.cwd(),
    env,
    stdio = "inherit"
  } = options;

  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env
      },
      stdio
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise(undefined);
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

function buildConsumerSteps(fixturePath, archivePath, packageSpecs, npmCacheDir, consumerProjectDir) {
  const source = join(consumerProjectDir, "fixtures", "source.md");
  const html = join(consumerProjectDir, "fixtures", "source.html");
  const images = join(consumerProjectDir, "fixtures", "images");
  const artifacts = join(consumerProjectDir, "artifacts");
  const cliArchive = join(artifacts, "converted-cli.prd");
  return [
    {
      title: "Install selected PRD packages",
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
    },
    { title: "Initialize a document", command: npxCommand,
      args: ["--no-install", "prd", "init", join(artifacts, "scaffold"), "--profile", "general-document"] },
    { title: "Validate initialized document", command: npxCommand,
      args: ["--no-install", "prd", "validate", join(artifacts, "scaffold")] },
    { title: "Import Markdown", command: npxCommand,
      args: ["--no-install", "prd", "import", "markdown", source, "--out", join(artifacts, "markdown")] },
    { title: "Validate imported Markdown", command: npxCommand,
      args: ["--no-install", "prd", "validate", join(artifacts, "markdown")] },
    { title: "Import HTML", command: npxCommand,
      args: ["--no-install", "prd", "import", "html", html, "--out", join(artifacts, "html")] },
    { title: "Validate imported HTML", command: npxCommand,
      args: ["--no-install", "prd", "validate", join(artifacts, "html")] },
    { title: "Import comic images", command: npxCommand,
      args: ["--no-install", "prd", "import", "images", images, "--profile", "comic", "--out", join(artifacts, "comic")] },
    { title: "Validate imported comic", command: npxCommand,
      args: ["--no-install", "prd", "validate", join(artifacts, "comic")] },
    { title: "Convert with the public SDK", command: process.execPath,
      args: [join(consumerProjectDir, "check-converter.mjs"), source, join(artifacts, "converted-sdk.prd")] },
    { title: "Convert with the CLI", command: npxCommand,
      args: ["--no-install", "prd", "convert", source, "--out", cliArchive] },
    { title: "Validate CLI conversion", command: npxCommand,
      args: ["--no-install", "prd", "validate", cliArchive] },
    { title: "Inspect CLI conversion", command: npxCommand,
      args: ["--no-install", "prd", "inspect", cliArchive] }
  ];
}

async function prepareConversionFixtures(consumerProjectDir) {
  const fixtures = join(consumerProjectDir, "fixtures");
  await mkdir(join(fixtures, "images"), { recursive: true });
  await writeFile(join(fixtures, "images", "page-1.png"), Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT3sAAAAASUVORK5CYII=", "base64"));
  await writeFile(join(fixtures, "source.md"), "# Published converter\n\nReadable content.\n\n![Page](images/page-1.png)\n");
  await writeFile(join(fixtures, "source.html"), "<h1>Published HTML</h1><p>Readable content.</p><img src=\"images/page-1.png\" alt=\"Page\">\n");
  await writeFile(join(consumerProjectDir, "check-converter.mjs"), `/**
 * Company: EonHive Inc. | Title: Installed Converter Check
 * Purpose: Verify the published SDK produces canonical content and factual attachments.
 * Author: Stan Nesi | Created: 2026-10-30 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */
import { readFile } from "node:fs/promises";
import { convertFileToPrd } from "@eonhive/prd-converter";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import { validatePackageFiles } from "@eonhive/prd-validator";
const result = await convertFileToPrd({ sourcePath: process.argv[2], outputPath: process.argv[3] });
const files = readPrdArchive(new Uint8Array(await readFile(process.argv[3])));
if (!validatePackageFiles(files).valid || result.report.profile !== "general-document" || result.report.resourceCount !== 1) throw new Error("Installed SDK conversion failed.");
const source = await readFile(process.argv[2]);
if (!Buffer.from(files["attachments/source.md"]).equals(source)) throw new Error("Installed SDK lost source bytes.");
const report = JSON.parse(new TextDecoder().decode(files["attachments/conversion-quality.json"]));
if (JSON.stringify(report) !== JSON.stringify(result.report)) throw new Error("Installed SDK report does not match its package.");
`);
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
  let packageSpecs = options.packageSpecs ?? buildPublishedPackageSpecs();
  const commandRunner = options.commandRunner ?? runCommand;
  const summary = {
    contractVersion: externalConsumerSmokeContractVersion,
    generatedAt: new Date().toISOString(),
    status: "passed",
    consumerProjectDir,
    fixtureSourcePath,
    packageSpecs,
    steps: []
  };

  await mkdir(dirname(summaryPath), { recursive: true });

  try {
    if (options.workspaceVersions && !options.packageSpecs) {
      packageSpecs = await buildWorkspacePackageSpecs(repoRoot);
      summary.packageSpecs = packageSpecs;
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
    await prepareConversionFixtures(consumerProjectDir);

    for (const step of buildConsumerSteps(
      fixturePath,
      archivePath,
      packageSpecs,
      npmCacheDir,
      consumerProjectDir
    )) {
      const startedAt = Date.now();

      try {
        await commandRunner(step.command, step.args, {
          cwd: consumerProjectDir,
          env: step.env
        });
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
    summary.steps.push({ title: "Prepare consumer smoke", status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error) });
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
  const result = await runExternalConsumerSmoke({ workspaceVersions: process.argv.includes("--workspace-versions") });
  console.log(`EXTERNAL_CONSUMER_SMOKE_SUMMARY_FILE: ${result.summaryPath}`);
  if (result.status !== "passed") {
    process.exitCode = 1;
  }
}
