/**
 * Company: EonHive Inc. | Title: PRD Snapshot Packaging
 * Purpose: Validate and package one in-memory logical file snapshot in either environment.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import { zipSync } from "fflate";
import { validatePackageFiles, type PrdFileMap } from "@eonhive/prd-validator";
import { createPrdContainer, readPrdArchive, type PrdArchiveLimits, type PrdContainerKind } from "@eonhive/prd-validator/container";

export interface PrdPackOptions {
  container?: PrdContainerKind;
  limits?: Partial<PrdArchiveLimits>;
}

export function packSnapshot(files: PrdFileMap, options: PrdPackOptions, sourceLabel: string): Uint8Array {
  const container = options.container ?? "zip";
  if (container !== "zip" && container !== "prd") throw new Error("Container must be `zip` or `prd`.");
  const validation = validatePackageFiles(files);
  if (!validation.valid) {
    throw new Error(`Cannot pack invalid PRD ${sourceLabel}.\n${validation.errors.map((issue) => `- ${issue.message}`).join("\n")}`);
  }
  const payload = zipSync(files);
  const archive = container === "prd" ? createPrdContainer(payload, options.limits) : payload;
  readPrdArchive(archive, options.limits);
  return archive;
}
