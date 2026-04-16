import { readdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const repoRoot = process.cwd();

const alwaysIncludedDocs = ["README.md", "AGENTS.md"];
const docsRoots = ["docs"];
const excludedDocPathPrefixes = [
  "docs/archive/",
  "docs/history/",
  "docs/foundation/04_PRD/ARCHIVE/"
];

const optionalRootDocs = ["BUILD_STATUS.md", "NEXT_STEPS.md"];
const includeOptionalRootDocs = process.argv.includes("--include-root-docs");

const explicitlyAllowedMatches = [
  {
    path: "docs/decisions/PRD_DECISIONS.md",
    label: "non-canonical decisions ledger path",
    snippet: "Legacy decisions from `docs/foundation/04_PRD/PRD_DECISIONS.md`"
  }
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

async function collectMarkdownFiles(relativeDir) {
  const absoluteDir = resolve(repoRoot, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const childPath = `${relativeDir}/${entry.name}`;

    if (excludedDocPathPrefixes.some((prefix) => childPath.startsWith(prefix))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(childPath)));
      continue;
    }

    if (entry.isFile() && extname(entry.name) === ".md") {
      files.push(childPath);
    }
  }

  return files;
}

async function getControlledDocs() {
  const discoveredDocs = [];
  for (const root of docsRoots) {
    discoveredDocs.push(...(await collectMarkdownFiles(root)));
  }

  const selectedRootDocs = includeOptionalRootDocs ? optionalRootDocs : [];
  return [...alwaysIncludedDocs, ...selectedRootDocs, ...discoveredDocs].sort();
}

async function main() {
  const failures = [];
  const controlledDocs = await getControlledDocs();

  for (const relativePath of controlledDocs) {
    const absolutePath = resolve(repoRoot, relativePath);
    const contents = await readFile(absolutePath, "utf8");

    for (const { label, pattern } of forbiddenPatterns) {
      for (const match of contents.matchAll(pattern)) {
        const matchedText = match[0]?.trim() ?? "<unknown>";
        const index = match.index ?? 0;
        const matchLength = match[0]?.length ?? 0;
        const isExplicitlyAllowed = explicitlyAllowedMatches.some(
          (allowed) =>
            allowed.path === relativePath &&
            allowed.label === label &&
            matchFallsWithinAllowedSnippet(contents, index, matchLength, allowed.snippet)
        );

        if (isExplicitlyAllowed) {
          continue;
        }

        const line = contents.slice(0, index).split("\n").length;
        failures.push(`${relativePath}:${line} contains ${label}: "${matchedText}"`);
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

  if (includeOptionalRootDocs) {
    console.log("Docs consistency check passed (including optional root docs).");
    return;
  }

  console.log("Docs consistency check passed.");
}

function matchFallsWithinAllowedSnippet(contents, matchIndex, matchLength, snippet) {
  let searchFrom = 0;
  while (searchFrom < contents.length) {
    const snippetStart = contents.indexOf(snippet, searchFrom);
    if (snippetStart === -1) {
      return false;
    }

    const snippetEnd = snippetStart + snippet.length;
    const matchEnd = matchIndex + matchLength;
    if (matchIndex >= snippetStart && matchEnd <= snippetEnd) {
      return true;
    }

    searchFrom = snippetStart + snippet.length;
  }

  return false;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
