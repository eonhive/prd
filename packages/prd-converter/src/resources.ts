/**
 * Company: EonHive Inc. | Title: Bounded Conversion Resources
 * Purpose: Read regular local files within budgets and map safe raster resources once.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { rasterType } from "./raster.js";
import type { ConversionLimits, ConversionWarning } from "./contracts.js";

export { DEFAULT_CONVERSION_LIMITS, resolveConversionLimits } from "./limits.js";

export async function readBoundedFile(path: string, limit: number): Promise<Uint8Array> {
  // Nonblocking open prevents FIFOs from hanging before their file type can be checked.
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    if (!info.isFile()) throw new Error("Conversion inputs must be regular files.");
    if (info.size > limit) throw new Error(`File exceeds the ${limit}-byte conversion limit.`);
    const bytes = Buffer.alloc(Math.min(info.size + 1, limit + 1));
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await file.read(bytes, length, bytes.length - length, null);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    // Reject files that changed during the snapshot instead of silently truncating them.
    const final = await file.stat();
    if (length > limit || final.size !== info.size || final.mtimeMs !== info.mtimeMs || length !== info.size) {
      throw new Error("File changed during conversion or exceeded its byte limit.");
    }
    return bytes.subarray(0, length);
  } finally {
    await file.close();
  }
}

function isInside(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export class ResourceCollector {
  readonly assets: Array<{ id: string; href: string; type: string; bytes: Uint8Array }> = [];
  readonly references: Array<{ source: string; asset: string; href: string }> = [];
  readonly warnings: ConversionWarning[] = [];
  private readonly byPath = new Map<string, { id: string; href: string }>();
  private totalBytes = 0;
  private attempts = 0;

  constructor(private readonly root: string, private readonly limits: ConversionLimits) {}

  private countAttempt(): void {
    this.attempts += 1;
    if (this.attempts > this.limits.maxNodes) throw new Error("Resource reference count exceeds the conversion limit.");
  }

  private register(reference: string, key: string, bytes: Uint8Array, extension: string): { id: string } {
    const previous = this.byPath.get(key);
    if (previous) {
      this.references.push({ source: reference, asset: previous.id, href: previous.href });
      return previous;
    }
    if (this.assets.length >= this.limits.maxResources) throw new Error("Resource count exceeds the conversion limit.");
    if (bytes.byteLength > this.limits.maxResourceBytes) throw new Error(`File exceeds the ${this.limits.maxResourceBytes}-byte conversion limit.`);
    const type = rasterType(bytes, extension);
    if (!type) throw new Error("Expected a PNG, JPEG, GIF or WebP signature matching its extension; SVG is deferred.");
    if (this.totalBytes + bytes.length > this.limits.maxTotalResourceBytes) throw new Error("Total resource bytes exceed the conversion limit.");
    const id = `import-image-${this.assets.length + 1}`;
    const href = `assets/images/${id}${extension}`;
    this.assets.push({ id, href, type, bytes });
    this.byPath.set(key, { id, href });
    this.references.push({ source: reference, asset: id, href });
    this.totalBytes += bytes.length;
    return { id };
  }

  private warn(reference: string, error: unknown): void {
    // Filesystem errors contain absolute workstation paths; keep reports portable.
    const message = error instanceof Error && "code" in error
      ? "Resource file was not found or could not be read."
      : error instanceof Error ? error.message : "Resource could not be read.";
    this.warnings.push({ code: "resource-omitted", stage: "extract", reference, message: `Image omitted: ${message}` });
  }

  async collectImage(reference: string, bytes: Uint8Array): Promise<{ id: string } | undefined> {
    this.countAttempt();
    try {
      return this.register(reference, `archive:${reference}`, bytes, extname(reference).toLowerCase());
    } catch (error) {
      this.warn(reference, error);
      return undefined;
    }
  }

  async resolveImage(reference: string): Promise<{ id: string } | undefined> {
    this.countAttempt();
    try {
      const decoded = decodeURIComponent(reference);
      if (/[\\:\u0000-\u001f?#]/u.test(decoded) || decoded.startsWith("/")) throw new Error("Only local relative image paths are supported.");
      const candidate = resolve(this.root, decoded);
      if (!isInside(candidate, this.root)) throw new Error("Resource path leaves the source directory.");
      const path = await realpath(candidate);
      if (!isInside(path, this.root)) throw new Error("Resource symlink leaves the source directory.");
      const previous = this.byPath.get(path);
      if (previous) {
        this.references.push({ source: reference, asset: previous.id, href: previous.href });
        return previous;
      }
      if (this.assets.length >= this.limits.maxResources) throw new Error("Resource count exceeds the conversion limit.");
      const bytes = await readBoundedFile(path, this.limits.maxResourceBytes);
      return this.register(reference, path, bytes, extname(path).toLowerCase());
    } catch (error) {
      this.warn(reference, error);
      return undefined;
    }
  }
}
