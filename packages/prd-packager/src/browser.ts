/**
 * Company: EonHive Inc. | Title: PRD Memory Packager
 * Purpose: Expose canonical validated packaging without Node filesystem imports.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import type { PrdFileMap } from "@eonhive/prd-validator";
import { packSnapshot, type PrdPackOptions } from "./packageSnapshot.js";
export type { PrdPackOptions } from "./packageSnapshot.js";

export function packPackageFiles(files: PrdFileMap, options: PrdPackOptions = {}): Uint8Array {
  return packSnapshot(files, options, "package");
}
