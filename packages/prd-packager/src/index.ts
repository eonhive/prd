import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { zipSync } from "fflate";
import { validatePackageDirectory } from "@prd/validator/node";

async function collectFiles(rootDir: string, currentDir = rootDir): Promise<Record<string, Uint8Array>> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files: Record<string, Uint8Array> = {};

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

export async function packDirectoryToBuffer(directoryPath: string): Promise<Uint8Array> {
  const validation = await validatePackageDirectory(directoryPath);

  if (!validation.valid) {
    throw new Error(
      `Cannot pack invalid PRD source directory.\n${validation.errors
        .map((issue) => `- ${issue.message}`)
        .join("\n")}`
    );
  }

  return zipSync(await collectFiles(directoryPath));
}

export async function packDirectoryToFile(
  directoryPath: string,
  outputPath: string
): Promise<string> {
  const archive = await packDirectoryToBuffer(directoryPath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(archive));
  return outputPath;
}

