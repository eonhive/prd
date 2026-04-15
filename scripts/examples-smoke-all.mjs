/**
 * Company: EonHive
 * Title: Aggregate Example Smoke Script
 * Purpose: Run smoke gates for all MVP example packages in sequence.
 * Author: Stan Nesi
 * Created: 2026-04-15
 * Updated: 2026-04-15
 */

import { runExampleSmoke } from "./examples-smoke-runner.mjs";

const jsonSummary = process.argv.includes("--json-summary");
const examples = ["document-basic", "resume-basic", "comic-basic", "storyboard-basic"];

for (const exampleName of examples) {
  await runExampleSmoke(exampleName, { jsonSummary });

  if (process.exitCode && process.exitCode !== 0) {
    break;
  }
}
