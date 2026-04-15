/**
 * Company: EonHive
 * Title: Example Smoke Script (storyboard-basic)
 * Purpose: Run the MVP format gate for storyboard-basic by packing, validating, and inspecting in sequence.
 * Author: Stan Nesi
 * Created: 2026-04-15
 * Updated: 2026-04-15
 */

import { runExampleSmoke } from "./examples-smoke-runner.mjs";

await runExampleSmoke("storyboard-basic", {
  jsonSummary: process.argv.includes("--json-summary")
});
