import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { readPackageDirectory } from "@eonhive/prd-validator/node";
import { packSnapshot, type PrdPackOptions } from "./packageSnapshot.js";
export type { PrdPackOptions } from "./packageSnapshot.js";

export async function packDirectoryToBuffer(directoryPath: string, options: PrdPackOptions = {}): Promise<Uint8Array> {
  const container = options.container ?? "zip";
  if (container !== "zip" && container !== "prd") throw new Error("Container must be `zip` or `prd`.");
  // Validate and pack the same snapshot rather than reading mutable source files twice.
  const files = await readPackageDirectory(directoryPath, options.limits);
  return packSnapshot(files, options, "source directory");
}

export async function packDirectoryToFile(
  directoryPath: string,
  outputPath: string,
  options: PrdPackOptions = {}
): Promise<string> {
  const archive = await packDirectoryToBuffer(directoryPath, options);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(archive));
  return outputPath;
}

