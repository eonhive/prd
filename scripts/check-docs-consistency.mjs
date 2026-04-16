import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = process.cwd();

const controlledDocs = [
  "README.md",
  "AGENTS.md",
  "docs/README.md",
  "docs/architecture/PRD_SYSTEM_BLUEPRINT.md",
  "docs/governance/PRD_PROMPT_DOCTRINE.md",
  "docs/prompts/PRD_MASTER_PROMPTS.md"
];

const forbiddenPatterns = [
  {
    label: "legacy foundation path",
    pattern: /(?:^|[^A-Za-z0-9_])foundation\/PRD_[A-Z0-9_]+\.md\b/g
  },
  {
    label: "non-canonical decisions ledger path",
    pattern: /docs\/foundation\/04_PRD\/PRD_DECISIONS\.md\b/g
  }
];

async function main() {
  const failures = [];

  for (const relativePath of controlledDocs) {
    const absolutePath = resolve(repoRoot, relativePath);
    const contents = await readFile(absolutePath, "utf8");

    for (const { label, pattern } of forbiddenPatterns) {
      for (const match of contents.matchAll(pattern)) {
        const index = match.index ?? 0;
        const line = contents.slice(0, index).split("\n").length;
        failures.push(
          `${relativePath}:${line} contains ${label}: "${match[0]?.trim() ?? "<unknown>"}"`
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error("Docs consistency check failed.");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Docs consistency check passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
