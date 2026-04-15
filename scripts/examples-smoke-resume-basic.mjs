/**
 * Company: EonHive
 * Title: Example Smoke Script (resume-basic)
 * Purpose: Run the MVP format gate for resume-basic by packing, validating, and inspecting in sequence.
 * Author: Stan Nesi
 * Created: 2026-04-15
 * Updated: 2026-04-15
 */

import { runExampleSmoke } from "./examples-smoke-runner.mjs";

await runExampleSmoke("resume-basic", {
  jsonSummary: process.argv.includes("--json-summary")
});
