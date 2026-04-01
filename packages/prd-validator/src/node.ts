import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { unzipSync } from "fflate";
import {
  validatePackage as validatePackageFiles,
  type PrdFileMap,
  type PrdPackageValidationResult
} from "./index.js";

function invalidResult(code: string, message: string, path: string): PrdPackageValidationResult {
  return {
    valid: false,
    errors: [{ code, message, path, severity: "error" }],
    warnings: []
  };
}

async function collectFiles(rootDir: string, currentDir = rootDir): Promise<PrdFileMap> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files: PrdFileMap = {};

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = join(currentDir, entry.name);

    if (entry.isDirectory()) {
      Object.assign(files, await collectFiles(rootDir, fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const relPath = relative(rootDir, fullPath).split("\\").join("/");
    files[relPath] = new Uint8Array(await readFile(fullPath));
  }

  return files;
}

export async function validatePackageDirectory(
  directoryPath: string
): Promise<PrdPackageValidationResult> {
  const stats = await stat(directoryPath);

  if (!stats.isDirectory()) {
    return invalidResult(
      "package-directory-invalid",
      `Expected a directory path, got \`${basename(directoryPath)}\`.`,
      directoryPath
    );
  }

  return validatePackageFiles(await collectFiles(directoryPath));
}

export async function validatePrdArchive(
  archivePath: string
): Promise<PrdPackageValidationResult> {
  if (!archivePath.endsWith(".prd")) {
    return invalidResult(
      "archive-extension-invalid",
      "PRD transport files must use the `.prd` extension.",
      archivePath
    );
  }

  let archiveEntries: PrdFileMap;

  try {
    const bytes = new Uint8Array(await readFile(archivePath));
    archiveEntries = unzipSync(bytes);
  } catch {
    return invalidResult(
      "archive-read-invalid",
      "The `.prd` archive could not be opened as a valid ZIP package.",
      archivePath
    );
  }

  return validatePackageFiles(archiveEntries);
}

export async function validatePackage(
  targetPath: string
): Promise<PrdPackageValidationResult> {
  let targetStats;

  try {
    targetStats = await stat(targetPath);
  } catch {
    return invalidResult(
      "package-path-missing",
      `Package path \`${targetPath}\` does not exist.`,
      targetPath
    );
  }

  if (targetStats.isDirectory()) {
    return validatePackageDirectory(targetPath);
  }

  return validatePrdArchive(targetPath);
}
