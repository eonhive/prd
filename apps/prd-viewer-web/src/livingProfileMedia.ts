/*
 * Company: EonHive Inc. | Title: Living Profile Media Data
 * Purpose: Load only allowlisted, bounded visual excerpts beneath the current hosting base.
 * Author: Stan Nesi | Created: October 27, 2026 | Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { viewerDemoExampleArchives } from "./viewerDemoContent.js";

export interface LivingVisualPreview {
  sampleId: string;
  profile: "comic" | "storyboard";
  title: string;
  sourceEntry: string;
  items: { id: string; imagePath: string; alt: string; caption: string }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, limit = 300): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= limit;
}

export function getProfilePreviewUrl(basePath: string, path: string): string {
  return `${basePath.endsWith("/") ? basePath : `${basePath}/`}${path}`;
}

export function parseLivingVisualPreview(data: unknown, sampleId: string): LivingVisualPreview {
  const example = viewerDemoExampleArchives.find((item) => item.id === sampleId);
  if (
    !example || (example.profile !== "comic" && example.profile !== "storyboard") ||
    !isRecord(data) || data.contractVersion !== "prd-home-profile-preview-v0.1" ||
    data.sampleId !== sampleId || data.profile !== example.profile ||
    !isText(data.title) || !isText(data.sourceEntry) ||
    !Array.isArray(data.items) || data.items.length < 1 || data.items.length > 3
  ) throw new Error("The media preview does not match this example.");

  const items = data.items.map((item: unknown, index: number) => {
    if (
      !isRecord(item) || !isText(item.id) || !isText(item.alt, 600) ||
      typeof item.caption !== "string" || item.caption.length > 600 ||
      typeof item.imagePath !== "string" ||
      !["png", "jpg", "webp", "svg"].some((extension) =>
        item.imagePath === `examples/previews/${sampleId}/${index + 1}.${extension}`,
      )
    ) throw new Error("This preview contains an unsupported image reference.");
    return { id: item.id, imagePath: item.imagePath, alt: item.alt, caption: item.caption };
  });
  return { sampleId, profile: example.profile, title: data.title, sourceEntry: data.sourceEntry, items };
}

export async function loadLivingVisualPreview(
  sampleId: string, basePath: string, signal: AbortSignal, fetcher: typeof fetch = fetch,
): Promise<LivingVisualPreview> {
  const example = viewerDemoExampleArchives.find((item) => item.id === sampleId);
  if (!example || (example.profile !== "comic" && example.profile !== "storyboard")) {
    throw new Error("Choose a comic or storyboard example.");
  }
  const response = await fetcher(getProfilePreviewUrl(basePath, `${example.hostedPath}.preview.json`), { signal });
  if (!response.ok) throw new Error("The media preview could not load. You can still open the Viewer.");
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new Error("Media previews are unavailable in this build. You can still open the Viewer."); }
  return parseLivingVisualPreview(data, sampleId);
}
