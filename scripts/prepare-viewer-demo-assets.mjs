/**
 * Company: EonHive Inc.
 * Title: PRD Viewer Demo Asset Preparation
 * Purpose: Copy generated example PRD archives into the web viewer public demo asset directory.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: June 5, 2026
 * Notes: Vibe coded with Codex.
 */

import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export const viewerDemoArchiveEntries = [
  {
    id: "document-basic",
    source: "examples/dist/document-basic.prd",
    target: "apps/prd-viewer-web/public/examples/document-basic.prd"
  },
  {
    id: "document-segmented-basic",
    source: "examples/dist/document-segmented-basic.prd",
    target: "apps/prd-viewer-web/public/examples/document-segmented-basic.prd"
  },
  {
    id: "comic-basic",
    source: "examples/dist/comic-basic.prd",
    target: "apps/prd-viewer-web/public/examples/comic-basic.prd"
  },
  {
    id: "storyboard-basic",
    source: "examples/dist/storyboard-basic.prd",
    target: "apps/prd-viewer-web/public/examples/storyboard-basic.prd"
  }
];

export function createViewerDemoAssetPlan({
  repoRoot = process.cwd(),
  entries = viewerDemoArchiveEntries
} = {}) {
  return entries.map((entry) => ({
    id: entry.id,
    sourcePath: join(repoRoot, entry.source),
    targetPath: join(repoRoot, entry.target),
    publicPath: entry.target.replace("apps/prd-viewer-web/public/", "")
  }));
}

export async function prepareViewerDemoAssets({
  repoRoot = process.cwd(),
  entries = viewerDemoArchiveEntries
} = {}) {
  const plan = createViewerDemoAssetPlan({ repoRoot, entries });
  const publicExamplesDir = join(repoRoot, "apps/prd-viewer-web/public/examples");

  await rm(publicExamplesDir, { recursive: true, force: true });
  await mkdir(publicExamplesDir, { recursive: true });

  const copied = [];
  for (const item of plan) {
    try {
      await stat(item.sourcePath);
    } catch {
      throw new Error(
        [
          `Missing generated PRD archive: ${relative(repoRoot, item.sourcePath)}`,
          "Run `pnpm examples:pack` before preparing hosted viewer demo assets."
        ].join("\n")
      );
    }

    await mkdir(dirname(item.targetPath), { recursive: true });
    await copyFile(item.sourcePath, item.targetPath);

    const copiedStat = await stat(item.targetPath);
    copied.push({
      id: item.id,
      source: relative(repoRoot, item.sourcePath),
      target: relative(repoRoot, item.targetPath),
      publicPath: item.publicPath,
      bytes: copiedStat.size
    });
  }

  return {
    contractVersion: "prd-viewer-demo-assets-v0.1",
    outputDir: relative(repoRoot, publicExamplesDir),
    copied
  };
}

async function main() {
  const summary = await prepareViewerDemoAssets();
  console.log(JSON.stringify(summary, null, 2));
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
