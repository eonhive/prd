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
import { packDirectoryToBuffer } from "../packages/prd-packager/src/index.js";
import { parseLivingVisualPreview } from "../apps/prd-viewer-web/src/livingProfileMedia.js";
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
    const archive = await packDirectoryToBuffer(join(process.cwd(), "examples/document-basic"));
    await writeFile(sourcePath, archive);

    const summary = await prepareViewerDemoAssets({ repoRoot, entries });
    const copiedPath = join(repoRoot, entries[0]!.target);

    expect(summary.contractVersion).toBe("prd-viewer-demo-assets-v0.1");
    expect(summary.copied).toEqual([
      {
        id: "sample",
        source: "examples/dist/sample.prd",
        target: "apps/prd-viewer-web/public/examples/sample.prd",
        publicPath: "examples/sample.prd",
        bytes: archive.length
      }
    ]);
    expect(new Uint8Array(await readFile(copiedPath))).toEqual(archive);
    const inspection = JSON.parse(await readFile(`${copiedPath}.inspection.json`, "utf8"));
    expect(inspection).toMatchObject({
      contractVersion: "prd-home-sample-v0.1",
      sampleId: "sample",
      archiveBytes: archive.length,
      manifest: { id: "urn:prd:example:document-basic", entry: "content/root.json", profile: "general-document" }
    });
    expect(inspection.fileCount).toBeGreaterThan(1);
    expect(inspection.totalBytes).toBeGreaterThan(0);
    await expect(readFile(`${copiedPath}.preview.json`)).rejects.toThrow();
  });

  it.each(["comic-basic", "storyboard-basic"])("publishes actual declared artwork and readable metadata for %s", async (id) => {
    const repoRoot = await createTempRepoRoot();
    const entry = { id, source: `examples/dist/${id}.prd`, target: `apps/prd-viewer-web/public/examples/${id}.prd` };
    await mkdir(join(repoRoot, "examples/dist"), { recursive: true });
    await writeFile(join(repoRoot, entry.source), await packDirectoryToBuffer(join(process.cwd(), "examples", id)));
    await prepareViewerDemoAssets({ repoRoot, entries: [entry] });
    const metadata = JSON.parse(await readFile(join(repoRoot, `${entry.target}.preview.json`), "utf8"));
    const preview = parseLivingVisualPreview(metadata, id);
    expect(preview.items).toHaveLength(3);
    const manifest = JSON.parse(await readFile(join(process.cwd(), "examples", id, "manifest.json"), "utf8"));
    for (let index = 0; index < preview.items.length; index++) {
      const image = preview.items[index]!;
      const actual = await readFile(join(repoRoot, "apps/prd-viewer-web/public", image.imagePath));
      const expected = await readFile(join(process.cwd(), "examples", id, manifest.assets[index].href));
      expect(actual.equals(expected)).toBe(true);
      expect(image.alt.length).toBeGreaterThan(0);
    }
  });

  it("refuses to publish inspection facts for invalid archive bytes", async () => {
    const repoRoot = await createTempRepoRoot();
    await mkdir(join(repoRoot, "examples/dist"), { recursive: true });
    await writeFile(join(repoRoot, "examples/dist/broken.prd"), "not an archive");
    await expect(prepareViewerDemoAssets({ repoRoot, entries: [{ id: "broken", source: "examples/dist/broken.prd", target: "apps/prd-viewer-web/public/examples/broken.prd" }] })).rejects.toThrow("Cannot publish invalid demo archive broken");
    await expect(readFile(join(repoRoot, "apps/prd-viewer-web/public/examples/broken.prd.inspection.json"))).rejects.toThrow();
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
