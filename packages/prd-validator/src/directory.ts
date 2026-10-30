/**
 * Company: EonHive Inc. | Title: Bounded PRD Directory Reader
 * Purpose: Collect unpacked package files within explicit traversal and byte budgets.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */

import { constants } from "node:fs";
import { open, opendir, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { PRD_DEFAULT_ARCHIVE_LIMITS, type PrdArchiveLimits } from "./container.js";
import type { PrdFileMap } from "./index.js";

export type PrdDirectoryLimits = Pick<PrdArchiveLimits, "maxEntries" | "maxFileBytes" | "maxExpandedBytes">;

export const PRD_DEFAULT_DIRECTORY_LIMITS: Readonly<PrdDirectoryLimits> = Object.freeze({
  maxEntries: PRD_DEFAULT_ARCHIVE_LIMITS.maxEntries,
  maxFileBytes: PRD_DEFAULT_ARCHIVE_LIMITS.maxFileBytes,
  maxExpandedBytes: PRD_DEFAULT_ARCHIVE_LIMITS.maxExpandedBytes
});

export class PrdDirectoryError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "PrdDirectoryError";
  }
}

function resolveLimits(overrides: Partial<PrdDirectoryLimits>): PrdDirectoryLimits {
  const limits = { ...PRD_DEFAULT_DIRECTORY_LIMITS, ...overrides };
  for (const name of ["maxEntries", "maxFileBytes", "maxExpandedBytes"] as const) {
    if (!Number.isSafeInteger(limits[name]) || limits[name] <= 0) {
      throw new PrdDirectoryError("directory-limit-invalid", `${name} must be a positive safe integer.`);
    }
  }
  return limits;
}

function checkSize(size: number, totalBytes: number, limits: PrdDirectoryLimits): void {
  if (!Number.isSafeInteger(size) || size < 0 || size > limits.maxFileBytes) {
    throw new PrdDirectoryError("directory-file-size-limit", "A package file exceeds the directory file-size limit.");
  }
  if (size > limits.maxExpandedBytes - totalBytes) {
    throw new PrdDirectoryError("directory-total-size-limit", "Package files exceed the directory total-byte limit.");
  }
}

async function readBoundedFile(path: string, totalBytes: number, limits: PrdDirectoryLimits): Promise<Uint8Array> {
  // Avoid following a replaced leaf symlink or blocking on a substituted FIFO where these flags are available.
  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);
  const handle = await open(path, flags);
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw new PrdDirectoryError("directory-read-invalid", "A package file is no longer a regular file.");
    checkSize(info.size, totalBytes, limits);

    const chunks: Uint8Array[] = [];
    const buffer = new Uint8Array(64 * 1024);
    let fileBytes = 0;
    while (true) {
      // Probe at most one byte past the remaining budget, including when a file grows after stat.
      const length = Math.min(
        buffer.length,
        limits.maxFileBytes - fileBytes + 1,
        limits.maxExpandedBytes - totalBytes - fileBytes + 1
      );
      const { bytesRead } = await handle.read(buffer, 0, length, null);
      if (bytesRead === 0) break;
      fileBytes += bytesRead;
      checkSize(fileBytes, totalBytes, limits);
      chunks.push(buffer.slice(0, bytesRead));
    }

    const bytes = new Uint8Array(fileBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

export async function readPackageDirectory(
  directoryPath: string,
  overrides: Partial<PrdDirectoryLimits> = {}
): Promise<PrdFileMap> {
  const limits = resolveLimits(overrides);
  try {
    if (!(await stat(directoryPath)).isDirectory()) {
      throw new PrdDirectoryError("package-directory-invalid", `Expected a directory path, got \`${basename(directoryPath)}\`.`);
    }

    const files: PrdFileMap = Object.create(null);
    const pendingDirectories = [directoryPath];
    let entries = 0;
    let totalBytes = 0;
    while (pendingDirectories.length > 0) {
      const currentPath = pendingDirectories.pop()!;
      const directory = await opendir(currentPath);
      for await (const entry of directory) {
        // Count visited entries before exclusions, so empty directories and ignored names still bound traversal.
        entries += 1;
        if (entries > limits.maxEntries) {
          throw new PrdDirectoryError("directory-entry-limit", "The package directory contains too many entries.");
        }
        if (entry.name.startsWith(".")) continue;
        const path = join(currentPath, entry.name);
        if (entry.isDirectory()) {
          pendingDirectories.push(path);
        } else if (entry.isFile()) {
          const bytes = await readBoundedFile(path, totalBytes, limits);
          files[relative(directoryPath, path).split("\\").join("/")] = bytes;
          totalBytes += bytes.byteLength;
        }
      }
    }
    return files;
  } catch (error) {
    if (error instanceof PrdDirectoryError) throw error;
    throw new PrdDirectoryError("directory-read-invalid", "The package directory could not be read as regular files.");
  }
}
