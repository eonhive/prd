/**
 * Company: EonHive
 * Title: Example Smoke Script (document-basic)
 * Purpose: Run the MVP format gate for document-basic by packing, validating, and inspecting in sequence.
 * Author: Stan Nesi
 * Created: 2026-04-15
 * Updated: 2026-04-15
 */

import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const cliPath = resolve(repoRoot, "packages/prd-cli/dist/cli.js");
const sourceDir = resolve(repoRoot, "examples/document-basic");
const outputFile = resolve(repoRoot, "examples/dist/document-basic.prd");

const steps = [
  {
    title: "Step 1/4: Pack examples/document-basic",
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

function runCli(args, title) {
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

async function main() {
  await mkdir(resolve(repoRoot, "examples/dist"), { recursive: true });

  for (const step of steps) {
    await runCli(step.args, step.title);
  }

  console.log("\n✅ document-basic smoke gate passed.");
}

main().catch((error) => {
  console.error(`\n❌ document-basic smoke gate failed: ${error.message}`);
  process.exitCode = 1;
});
