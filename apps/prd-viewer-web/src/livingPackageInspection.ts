/*
 * Company: EonHive Inc. | Title: Living Homepage Package Inspection
 * Purpose: Load build-generated facts for allowlisted, validated example archives.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { validateManifestObject } from "@eonhive/prd-validator";
import type { PrdManifest } from "@eonhive/prd-types";
import { viewerDemoExampleArchives } from "./viewerDemoContent.js";

export type DocumentLayer = "manifest" | "content" | "resources" | "profile";

export interface LivingPackageInspection {
  sampleId: string;
  archiveBytes: number;
  fileCount: number;
  totalBytes: number;
  manifest: PrdManifest;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export async function loadLivingPackageInspection(
  sampleId: string,
  basePath: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<LivingPackageInspection> {
  const example = viewerDemoExampleArchives.find((item) => item.id === sampleId);
  if (!example) throw new Error("Choose a known PRD example package.");
  const base = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const response = await fetcher(`${base}${example.hostedPath}.inspection.json`, { signal });
  if (!response.ok) throw new Error("Package details could not load. Try again.");
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Package details are unavailable in this build. The Viewer can still open the example.");
  }
  if (
    !isRecord(data) ||
    data.contractVersion !== "prd-home-sample-v0.1" ||
    data.sampleId !== sampleId ||
    !isCount(data.archiveBytes) ||
    !isCount(data.fileCount) ||
    !isCount(data.totalBytes)
  ) throw new Error("Package details do not match this example.");

  const validation = validateManifestObject(data.manifest);
  if (
    !validation.valid ||
    !validation.manifest ||
    validation.manifest.profile !== example.profile
  ) {
    throw new Error("Package details contain an invalid or mismatched manifest.");
  }
  return {
    sampleId,
    archiveBytes: data.archiveBytes,
    fileCount: data.fileCount,
    totalBytes: data.totalBytes,
    manifest: validation.manifest,
  };
}

export function getInspectionLayer(
  inspection: LivingPackageInspection,
  layer: DocumentLayer,
): unknown {
  const manifest = inspection.manifest;
  if (layer === "manifest") return manifest;
  if (layer === "content") return { entry: manifest.entry, profile: manifest.profile };
  if (layer === "resources") {
    return { assets: manifest.assets ?? [], attachments: manifest.attachments ?? [] };
  }
  return { profile: manifest.profile, compatibility: manifest.compatibility ?? {} };
}
