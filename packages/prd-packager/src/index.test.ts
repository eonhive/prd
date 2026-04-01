import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { packDirectoryToBuffer, packDirectoryToFile } from "./index.js";

describe("packDirectoryToBuffer", () => {
  it("packs a valid source directory into a .prd-compatible zip buffer", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-packager-"));
    await mkdir(join(root, "content"), { recursive: true });
    await writeFile(
      join(root, "manifest.json"),
      JSON.stringify({
        prdVersion: "1.0",
        manifestVersion: "1.0",
        id: "urn:test:pack",
        profile: "general-document",
        title: "Pack Example",
        entry: "content/root.json"
      }),
      "utf8"
    );
    await writeFile(
      join(root, "content/root.json"),
      JSON.stringify({
        schemaVersion: "1.0",
        profile: "general-document",
        type: "document",
        id: "pack-example",
        title: "Pack Example",
        children: [
          {
            type: "paragraph",
            text: "ok"
          }
        ]
      }),
      "utf8"
    );

    const archive = await packDirectoryToBuffer(root);
    const files = unzipSync(archive);

    expect(files["manifest.json"]).toBeDefined();
    expect(files["content/root.json"]).toBeDefined();

    const outPath = join(root, "out/example.prd");
    await packDirectoryToFile(root, outPath);
    const saved = await readFile(outPath);
    expect(saved.byteLength).toBeGreaterThan(0);

    await rm(root, { recursive: true, force: true });
  });
});
