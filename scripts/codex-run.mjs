/**
 * Company: Not specified
 * Title: Codex Run Script
 * Purpose: Standardize local test, build, packaging, and web viewer run flows for Codex.
 * Author: Stan Nesi
 * Created: 2026-04-10
 * Updated: 2026-04-10
 * Notes: Vibe coded with Codex.
 */

import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const pipelines = {
  check: [
    ["docs:check"],
    ["typecheck"],
    ["test"],
    ["build"],
    ["examples:validate"]
  ],
  pack: [
    ["build"],
    ["examples:pack"]
  ],
  "run-web": [
    ["build"],
    ["examples:pack"],
    ["dev:web"]
  ]
};

function printUsage() {
  console.error(
    [
      "Usage: node ./scripts/codex-run.mjs <command>",
      "",
      "Commands:",
      "  check    Run typecheck, tests, build, and example validation.",
      "  pack     Build the workspace and pack the example PRD archives.",
      "  run-web  Build the workspace, pack examples, and start the web viewer."
    ].join("\n")
  );
}

function runStep(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit"
    });

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          signal == null
            ? `Command failed: ${command} ${args.join(" ")} (exit ${code ?? "unknown"})`
            : `Command failed: ${command} ${args.join(" ")} (signal ${signal})`
        )
      );
    });

    child.on("error", reject);
  });
}

async function main() {
  const subcommand = process.argv[2];
  const steps = subcommand == null ? undefined : pipelines[subcommand];

  if (steps == null) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  for (const args of steps) {
    await runStep(args);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
