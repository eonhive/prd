import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { unzipSync } from "fflate";
import { validatePackageFiles, type PrdFileMap, type PrdPackageValidationResult } from "./index.js";

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
    return {
      valid: false,
      errors: [
        {
          code: "package-directory-invalid",
          message: `Expected a directory path, got \`${basename(directoryPath)}\`.`,
          severity: "error",
          path: directoryPath
        }
      ],
      warnings: []
    };
  }

  return validatePackageFiles(await collectFiles(directoryPath));
}

export async function validatePrdArchive(
  archivePath: string
): Promise<PrdPackageValidationResult> {
  if (!archivePath.endsWith(".prd")) {
    return {
      valid: false,
      errors: [
        {
          code: "archive-extension-invalid",
          message: "PRD transport files must use the `.prd` extension.",
          severity: "error",
          path: archivePath
        }
      ],
      warnings: []
    };
  }

  const bytes = new Uint8Array(await readFile(archivePath));
  const archiveEntries = unzipSync(bytes);

  return validatePackageFiles(archiveEntries);
}

