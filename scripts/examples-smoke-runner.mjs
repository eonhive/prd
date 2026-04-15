/**
 * Company: EonHive
 * Title: Shared Example Smoke Runner
 * Purpose: Run MVP format smoke steps (pack, validate, inspect) for a named example package.
 * Author: Stan Nesi
 * Created: 2026-04-15
 * Updated: 2026-04-15
 */

import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, resolve } from "node:path";

const repoRoot = process.cwd();
const cliPath = resolve(repoRoot, "packages/prd-cli/dist/cli.js");

function parseArgs(rawArgs) {
  const first = rawArgs[0];
  if (!first) {
    throw new Error("Usage: node scripts/examples-smoke-<name>.mjs <example-name> [--json-summary]");
  }

  return {
    exampleName: first,
    jsonSummary: rawArgs.includes("--json-summary")
  };
}

function runCli(args, title, summary) {
  return new Promise((resolvePromise, reject) => {
    console.log(`\n============================================================`);
    console.log(`${title}`);
    console.log(`Command: node ${cliPath} ${args.join(" ")}`);
    console.log(`============================================================`);

    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      const status = code === 0 ? "passed" : "failed";
      summary.steps.push({ title, command: `node ${cliPath} ${args.join(" ")}`, status });

      if (code === 0) {
        resolvePromise();
        return;
      }

      const reason =
        signal == null
          ? `exit code ${code ?? "unknown"}`
          : `signal ${signal}`;

      reject(new Error(`${title} failed (${reason}).`));
    });
  });
}

export async function runExampleSmoke(exampleName, options = {}) {
  const jsonSummary = options.jsonSummary ?? false;
  const sourceDir = resolve(repoRoot, `examples/${exampleName}`);
  const outputFile = resolve(repoRoot, `examples/dist/${exampleName}.prd`);

  const summary = {
    example: exampleName,
    sourceDir,
    outputFile,
    status: "passed",
    steps: []
  };

  const label = basename(sourceDir);
  const steps = [
    {
      title: `Step 1/4: Pack examples/${label}`,
      args: ["pack", sourceDir, "--out", outputFile]
    },
    {
      title: "Step 2/4: Validate source directory",
      args: ["validate", sourceDir]
    },
    {
      title: "Step 3/4: Validate packed archive",
      args: ["validate", outputFile]
    },
    {
      title: "Step 4/4: Inspect packed archive",
      args: ["inspect", outputFile]
    }
  ];

  try {
    await mkdir(resolve(repoRoot, "examples/dist"), { recursive: true });

    for (const step of steps) {
      await runCli(step.args, step.title, summary);
    }

    console.log(`\n✅ ${exampleName} smoke gate passed.`);
  } catch (error) {
    summary.status = "failed";
    summary.error = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ ${exampleName} smoke gate failed: ${summary.error}`);
    process.exitCode = 1;
  } finally {
    if (jsonSummary) {
      console.log("\nSMOKE_SUMMARY_JSON:");
      console.log(JSON.stringify(summary, null, 2));
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const parsed = parseArgs(process.argv.slice(2));
  await runExampleSmoke(parsed.exampleName, { jsonSummary: parsed.jsonSummary });
}
