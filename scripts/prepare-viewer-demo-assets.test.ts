/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Demo Asset Preparation Tests
 * Purpose: Verify hosted viewer demo asset preparation without committing PRD binaries.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: June 5, 2026
 * Notes: Vibe coded with Codex.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  createViewerDemoAssetPlan,
  prepareViewerDemoAssets
} from "./prepare-viewer-demo-assets.mjs";

const tempRoots: string[] = [];

async function createTempRepoRoot() {
  const repoRoot = await mkdtemp(join(tmpdir(), "prd-viewer-demo-assets-"));
  tempRoots.push(repoRoot);
  return repoRoot;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe("prepare viewer demo assets", () => {
  it("creates a stable copy plan", () => {
    const plan = createViewerDemoAssetPlan({ repoRoot: "/repo" });

    expect(plan.map((item) => item.publicPath)).toEqual([
      "examples/document-basic.prd",
      "examples/document-segmented-basic.prd",
      "examples/comic-basic.prd",
      "examples/storyboard-basic.prd"
    ]);
  });

  it("copies generated archives into the viewer public examples directory", async () => {
    const repoRoot = await createTempRepoRoot();
    const entries = [
      {
        id: "sample",
        source: "examples/dist/sample.prd",
        target: "apps/prd-viewer-web/public/examples/sample.prd"
      }
    ];
    const sourcePath = join(repoRoot, entries[0]!.source);

    await mkdir(dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, "fake-prd-archive", { encoding: "utf8" });

    const summary = await prepareViewerDemoAssets({ repoRoot, entries });
    const copiedPath = join(repoRoot, entries[0]!.target);

    expect(summary.contractVersion).toBe("prd-viewer-demo-assets-v0.1");
    expect(summary.copied).toEqual([
      {
        id: "sample",
        source: "examples/dist/sample.prd",
        target: "apps/prd-viewer-web/public/examples/sample.prd",
        publicPath: "examples/sample.prd",
        bytes: "fake-prd-archive".length
      }
    ]);
    await expect(readFile(copiedPath, "utf8")).resolves.toBe("fake-prd-archive");
  });

  it("fails with action text when a generated archive is missing", async () => {
    const repoRoot = await createTempRepoRoot();

    await expect(
      prepareViewerDemoAssets({
        repoRoot,
        entries: [
          {
            id: "missing",
            source: "examples/dist/missing.prd",
            target: "apps/prd-viewer-web/public/examples/missing.prd"
          }
        ]
      })
    ).rejects.toThrow("Run `pnpm examples:pack`");
  });
});
