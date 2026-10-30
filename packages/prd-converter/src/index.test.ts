/**
 * Company: EonHive Inc. | Title: PRD Convert Tests
 * Purpose: Verify semantic conversion, reporting, adapter selection and hostile input boundaries.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { readPrdArchive, readPrdContainer } from "@eonhive/prd-validator/container";
import { convertDocument, convertFileToPrd, ImportAdapterRegistry, markdownAdapter, type ImportAdapter } from "./index.js";

// Real one-pixel PNG; image payloads stay small while exercising binary copying.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT3sAAAAASUVORK5CYII=", "base64");
let root: string;
let sourcePath: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "prd-converter-test-"));
  sourcePath = join(root, "source.md");
  await writeFile(sourcePath, "# Portable report\n\nReadable content.\n");
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe("conversion pipeline", () => {
  it("maps reading order, stable IDs, deduplicated resources and declared source/quality attachments", async () => {
    const original = "# Portable report\r\n\r\nIntro **text**.\r\n\r\n- One\r\n- Two\r\n\r\n> Quote\r\n\r\n![First](pixel.png)\r\n\r\n![Again](./pixel.png)\r\n\n```js\nconst retained = true;\n```\n<div>Source only</div>";
    await writeFile(sourcePath, original);
    await writeFile(join(root, "pixel.png"), png);
    const result = await convertDocument({ sourcePath });
    const files = readPrdArchive(result.archive);
    expect(validatePackageFiles(files).valid).toBe(true);
    expect(result.document.profile).toBe("general-document");
    if (result.document.profile !== "general-document") throw new Error("Unexpected profile");
    expect(result.document.children.map((node) => node.type)).toEqual(["heading", "paragraph", "list", "quote", "image", "image"]);
    expect(result.document.children.map((node) => node.id)).toEqual(["node-1", "node-2", "node-3", "node-4", "node-5", "node-6"]);
    expect(result.document.children[1]).toMatchObject({ type: "paragraph", text: "Intro text." });
    expect(result.report.resourceCount).toBe(1);
    expect(result.report.resourceMap.map((ref) => ref.asset)).toEqual(["import-image-1", "import-image-1"]);
    expect(files["assets/images/import-image-1.png"]).toEqual(new Uint8Array(png));
    expect(Buffer.from(files["attachments/source.md"]!).toString()).toBe(original);
    expect(JSON.parse(Buffer.from(files["attachments/conversion-quality.json"]!).toString())).toEqual(result.report);
    const manifest = JSON.parse(Buffer.from(files["manifest.json"]!).toString());
    expect(manifest.attachments).toHaveLength(2);
    expect(result.report.warnings.map((warning) => warning.message).join(" ")).toContain("Skipped fenced code block");
    expect(result.report.warnings.map((warning) => warning.message).join(" ")).toContain("Skipped raw HTML");
    const second = await convertDocument({ sourcePath });
    expect(readPrdArchive(second.archive)).toEqual(files);
  });

  it("supports explicit compatible profiles, title/id overrides and the existing envelope", async () => {
    const result = await convertDocument({ sourcePath, profile: "general-document", title: "Custom", id: "urn:test:custom", container: "prd" });
    expect(result.document.title).toBe("Custom");
    expect(readPrdContainer(result.archive).kind).toBe("prd");
    const manifest = JSON.parse(Buffer.from(readPrdArchive(result.archive)["manifest.json"]!).toString());
    expect(manifest.id).toBe("urn:test:custom");
  });

  it("reports explicit source-retention opt-out", async () => {
    const result = await convertDocument({ sourcePath, preserveSource: false });
    expect(result.report.sourcePreserved).toBe(false);
    expect(result.report.warnings.some((warning) => warning.code === "source-not-preserved")).toBe(true);
    expect(readPrdArchive(result.archive)["attachments/source.md"]).toBeUndefined();
  });

  it("rejects incompatible profiles, unsupported strategies and invalid normalized output", async () => {
    await expect(convertDocument({ sourcePath, profile: "comic" })).rejects.toThrow("requested comic");
    await expect(convertDocument({ sourcePath, strategy: "hybrid" as "adaptive" })).rejects.toThrow("Only adaptive");
    await expect(convertDocument({ sourcePath, title: "" })).rejects.toThrow("invalid PRD");
    await writeFile(sourcePath, "```\nOnly unsupported content\n```\n");
    await expect(convertDocument({ sourcePath })).rejects.toThrow("No supported readable content");
  });

  it("publishes only successful conversions without overwriting existing data", async () => {
    const outputPath = join(root, "output.prd");
    await convertFileToPrd({ sourcePath, outputPath });
    const before = await readFile(outputPath);
    await expect(convertFileToPrd({ sourcePath, outputPath })).rejects.toMatchObject({ code: "EEXIST" });
    expect(await readFile(outputPath)).toEqual(before);
    await expect(convertFileToPrd({ sourcePath, outputPath: sourcePath })).rejects.toThrow(".prd extension");
    expect(await readdir(root)).toEqual(["output.prd", "source.md"]);
  });

  it.each([
    Buffer.from("%PDF-1.7\nRenamed"), Buffer.from("PK\x03\x04archive"),
    Buffer.from([0xff, 0xfe, 0x61]), Buffer.from("text\u0000binary"),
    Buffer.from("<!DOCTYPE html><html>Renamed</html>"), png
  ])("rejects disguised binary, archive, invalid UTF-8 and HTML inputs", async (bytes) => {
    await writeFile(sourcePath, bytes);
    await expect(convertDocument({ sourcePath })).rejects.toThrow("Unsupported source format");
    expect(await readdir(root)).toEqual(["source.md"]);
  });

  it("rejects unknown suffixes, directories, oversize inputs and invalid budgets", async () => {
    const other = join(root, "source.pdf");
    await writeFile(other, "# Markdown");
    await expect(convertDocument({ sourcePath: other })).rejects.toThrow("Unsupported source format");
    await expect(convertDocument({ sourcePath: root })).rejects.toThrow("regular files");
    await expect(convertDocument({ sourcePath, limits: { maxInputBytes: 8 } })).rejects.toThrow("byte conversion limit");
    await expect(convertDocument({ sourcePath, limits: { maxResources: -1 } })).rejects.toThrow("positive safe integer");
    await expect(convertDocument({ sourcePath, limits: { maxNodes: 1 } })).rejects.toThrow("node count");
  });

  it("omits remote, traversal, symlink escape, missing and mismatched resources with warnings", async () => {
    await mkdir(join(root, "input"));
    await writeFile(join(root, "outside.png"), png);
    await symlink(join(root, "outside.png"), join(root, "input/escape.png"));
    await writeFile(join(root, "input/fake.png"), "<script>unsafe</script>");
    const references = ["https://example.com/a.png", "../outside.png", "%2e%2e/outside.png", "escape.png", "missing.png", "fake.png", "/absolute.png", "C:\\outside.png"];
    const localSource = join(root, "input/source.md");
    await writeFile(localSource, "# Safe\n\n" + references.map((ref) => `![image](${ref})`).join("\n\n"));
    const result = await convertDocument({ sourcePath: localSource });
    expect(result.report.resourceCount).toBe(0);
    expect(result.report.warnings.filter((warning) => warning.code === "resource-omitted")).toHaveLength(references.length);
    expect(JSON.stringify(result.report)).not.toContain(root);
    expect(Object.keys(readPrdArchive(result.archive))).toHaveLength(4);
  });

  it("enforces per-resource, total resource and count limits without undeclared references", async () => {
    await writeFile(join(root, "a.png"), png);
    await writeFile(join(root, "b.png"), png);
    await writeFile(sourcePath, "# Budget\n\n![a](a.png)\n\n![b](b.png)");
    for (const limits of [{ maxResourceBytes: 8 }, { maxTotalResourceBytes: png.length }, { maxResources: 1 }]) {
      const result = await convertDocument({ sourcePath, limits });
      expect(result.report.resourceCount).toBe(limits.maxResourceBytes ? 0 : 1);
      expect(result.report.warnings.some((warning) => warning.code === "resource-omitted")).toBe(true);
      expect(validatePackageFiles(readPrdArchive(result.archive)).valid).toBe(true);
    }
  });
});

describe("adapter registry", () => {
  it("rejects duplicate registrations and ambiguous detection", async () => {
    const registry = new ImportAdapterRegistry().register(markdownAdapter);
    expect(() => registry.register(markdownAdapter)).toThrow("duplicate");
    registry.register({ ...markdownAdapter, id: "another-markdown" });
    await expect(registry.detect({ name: "source.md", bytes: new TextEncoder().encode("# Text") })).rejects.toThrow("Ambiguous");
  });

  it("keeps adapters behind canonical validation instead of accepting adapter-created manifests", async () => {
    const adapter: ImportAdapter = {
      id: "invalid", detect: async () => true,
      import: async () => ({ content: { profile: "general-document", children: [{ type: "image", asset: "undeclared", alt: "Test" }] }, warnings: [] })
    };
    await expect(convertDocument({ sourcePath, registry: new ImportAdapterRegistry().register(adapter) })).rejects.toThrow("invalid PRD");
  });
});
