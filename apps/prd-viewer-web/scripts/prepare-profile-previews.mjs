/*
 * Company: EonHive Inc. | Title: Living Profile Preview Assets
 * Purpose: Derive bounded media excerpts from validated canonical example archives.
 * Author: Stan Nesi | Created: October 27, 2026 | Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { strFromU8, unzipSync } from "fflate";

const visualProfiles = { "comic-basic": "comic", "storyboard-basic": "storyboard" };
const extensions = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };

export function buildLivingProfilePreview(archive, manifest, sampleId) {
  const profile = visualProfiles[sampleId];
  if (!profile) return undefined;
  if (manifest.profile !== profile) throw new Error(`Preview profile mismatch: ${sampleId}`);
  const files = unzipSync(archive);
  const root = JSON.parse(strFromU8(files[manifest.entry]));
  const sequence = profile === "comic" ? root.panels : root.frames;
  if (!Array.isArray(sequence) || sequence.length === 0) throw new Error(`Missing preview sequence: ${sampleId}`);
  const assets = [];
  const items = sequence.slice(0, 3).map((item, index) => {
    const asset = manifest.assets?.find((candidate) => candidate.id === item.asset);
    const extension = extensions[asset?.type];
    if (!extension || !files[asset.href] || typeof item.alt !== "string") {
      throw new Error(`Preview requires a declared packaged image and alt text: ${sampleId}`);
    }
    const publicPath = `examples/previews/${sampleId}/${index + 1}.${extension}`;
    assets.push({ publicPath, type: asset.type, bytes: files[asset.href] });
    return { id: item.id, imagePath: publicPath, alt: item.alt, caption: item.caption ?? item.notes ?? "" };
  });
  return {
    metadata: {
      contractVersion: "prd-home-profile-preview-v0.1",
      sampleId, profile, title: manifest.title, sourceEntry: manifest.entry, items,
    },
    assets,
  };
}

export async function writeLivingProfilePreview(item, manifest, publicExamplesDir) {
  const preview = buildLivingProfilePreview(new Uint8Array(await readFile(item.sourcePath)), manifest, item.id);
  if (!preview) return;
  for (const asset of preview.assets) {
    const target = join(publicExamplesDir, asset.publicPath.slice("examples/".length));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, asset.bytes);
  }
  await writeFile(`${item.targetPath}.preview.json`, JSON.stringify(preview.metadata, null, 2) + "\n");
}
