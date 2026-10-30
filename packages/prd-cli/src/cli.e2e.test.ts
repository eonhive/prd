import { execFile } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { packDirectoryToBuffer } from "@eonhive/prd-packager";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import { PRD_DEFAULT_DIRECTORY_LIMITS } from "@eonhive/prd-validator/node";
import { mkdtemp, mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const thisDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(thisDir, "../../..");
const cliDistPath = resolve(repoRoot, "packages/prd-cli/dist/cli.js");
const conformanceFixturePaths = {
  generalDocument: resolve(repoRoot, "examples/conformance/general-document-invalid-entry"),
  comic: resolve(repoRoot, "examples/conformance/comic-invalid-entry"),
  storyboard: resolve(repoRoot, "examples/conformance/storyboard-invalid-entry")
} as const;

type CliExecutionResult = {
  code: number;
  stdout: string;
  stderr: string;
};

function normalizeInspectTextSnapshot(output: string): string {
  return output.replace(/- bytes: \d+/u, "- bytes: <number>");
}

function normalizeInspectJsonSnapshot(output: string): Record<string, unknown> {
  const parsed = JSON.parse(output) as {
    inspection?: { totalBytes?: number };
  };

  if (parsed.inspection && typeof parsed.inspection.totalBytes === "number") {
    parsed.inspection.totalBytes = -1;
  }

  return parsed as Record<string, unknown>;
}

async function runBuiltCli(args: string[]): Promise<CliExecutionResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliDistPath, ...args], {
      cwd: repoRoot
    });

    return {
      code: 0,
      stdout,
      stderr
    };
  } catch (error) {
    const failed = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: failed.code ?? 1,
      stdout: failed.stdout ?? "",
      stderr: failed.stderr ?? ""
    };
  }
}

async function createFixture(rootPrefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), rootPrefix));
  await mkdir(join(root, "content"), { recursive: true });
  await mkdir(join(root, "assets/images"), { recursive: true });

  await writeFile(
    join(root, "manifest.json"),
    JSON.stringify({
      prdVersion: "1.0",
      manifestVersion: "1.0",
      id: "urn:test:cli-e2e",
      profile: "general-document",
      title: "CLI E2E Fixture",
      entry: "content/root.json",
      assets: [
        {
          id: "cover",
          href: "assets/images/cover.svg",
          type: "image/svg+xml"
        }
      ]
    }),
    "utf8"
  );

  await writeFile(
    join(root, "content/root.json"),
    JSON.stringify({
      schemaVersion: "1.0",
      profile: "general-document",
      type: "document",
      id: "cli-e2e",
      title: "CLI E2E Fixture",
      children: [{ type: "paragraph", text: "E2E fixture body." }]
    }),
    "utf8"
  );

  await writeFile(
    join(root, "assets/images/cover.svg"),
    "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
    "utf8"
  );

  return root;
}

async function createInvalidFixture(rootPrefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), rootPrefix));
  await mkdir(join(root, "content"), { recursive: true });

  await writeFile(
    join(root, "manifest.json"),
    JSON.stringify({
      prdVersion: "1.0",
      manifestVersion: "1.0",
      id: "urn:test:cli-e2e-invalid",
      profile: "general-document",
      title: "CLI E2E Invalid Fixture",
      entry: "content/index.html"
    }),
    "utf8"
  );

  await writeFile(
    join(root, "content/index.html"),
    "<!doctype html><html><body>legacy</body></html>",
    "utf8"
  );

  return root;
}

beforeAll(async () => {
  await execFileAsync("pnpm", ["--filter", "@eonhive/prd-cli", "build"], {
    cwd: repoRoot
  });
});

describe("built CLI binary end-to-end", () => {
  it("reports corrupt ZIP checksums in both transports and recovers to an intact package", async () => {
    const root = await createFixture("prd-cli-zip-checksum-");
    try {
      const valid = await packDirectoryToBuffer(root);
      const invalid = valid.slice();
      const data = new DataView(invalid.buffer, invalid.byteOffset, invalid.byteLength);
      const central = data.getUint32(invalid.length - 6, true);
      data.setUint32(14, data.getUint32(14, true) ^ 1, true);
      data.setUint32(central + 16, data.getUint32(central + 16, true) ^ 1, true);
      const wrapped = new Uint8Array(invalid.length + 16);
      wrapped.set([80, 82, 68, 0, 1, 0]);
      new DataView(wrapped.buffer).setBigUint64(8, BigInt(invalid.length), true);
      wrapped.set(invalid, 16);
      const path = join(root, "document.prd");
      for (const archive of [invalid, wrapped]) {
        await writeFile(path, archive);
        for (const command of ["validate", "inspect"]) {
          const result = await runBuiltCli([command, path, "--json"]);
          expect(result.code).toBe(1);
          expect(JSON.parse(result.stdout)).toMatchObject({
            valid: false, manifest: null, errors: [{ code: "archive-checksum-mismatch" }]
          });
          expect(result.stderr).toBe("");
        }
      }
      await writeFile(path, valid);
      expect((await runBuiltCli(["validate", path, "--json"])).code).toBe(0);
      expect((await runBuiltCli(["inspect", path, "--json"])).code).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects an oversized directory file with coded JSON and no output, then recovers", async () => {
    const root = await createFixture("prd-cli-directory-limit-");
    const oversized = join(root, "oversized.bin");
    const output = join(root, "out/document.prd");
    try {
      const handle = await open(oversized, "w");
      try {
        // A sparse file proves the default pre-read rejection without allocating its contents in the test.
        await handle.truncate(PRD_DEFAULT_DIRECTORY_LIMITS.maxFileBytes + 1);
      } finally {
        await handle.close();
      }
      for (const command of ["validate", "inspect"]) {
        const result = await runBuiltCli([command, root, "--json"]);
        expect(result.code).toBe(1);
        expect(JSON.parse(result.stdout)).toMatchObject({
          valid: false, manifest: null, errors: [{ code: "directory-file-size-limit" }]
        });
        expect(result.stderr).toBe("");
      }
      const rejected = await runBuiltCli(["pack", root, "--out", output]);
      expect(rejected.code).toBe(1);
      expect(rejected.stderr).toContain("directory file-size limit");
      await expect(readFile(output)).rejects.toMatchObject({ code: "ENOENT" });
      await rm(oversized);
      expect((await runBuiltCli(["validate", root, "--json"])).code).toBe(0);
      expect((await runBuiltCli(["pack", root, "--out", output])).code).toBe(0);
      expect((await runBuiltCli(["validate", output, "--json"])).code).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("converts mixed PDF pages and rejects encrypted sources without publishing output", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-cli-pdf-"));
    const source = resolve(repoRoot, "examples/conversion-pdf/source.pdf");
    const output = join(root, "pages.prd");
    try {
      const converted = await runBuiltCli(["convert", source, "--out", output, "--json"]);
      expect(converted.code).toBe(0);
      expect(JSON.parse(converted.stdout)).toMatchObject({ converted: true, quality: { sourceFormat: "pdf", profile: "general-document", nodeCount: 14, resourceCount: 1, sourcePreserved: true } });
      expect((await runBuiltCli(["validate", output, "--json"])).code).toBe(0);
      expect((await runBuiltCli(["convert", source, "--out", output])).code).toBe(1);
      const files = readPrdArchive(new Uint8Array(await readFile(output)));
      expect(Buffer.from(files["attachments/source.pdf"]!).equals(await readFile(source))).toBe(true);
      const rejected = await runBuiltCli(["convert", resolve(repoRoot, "examples/conversion-pdf/fixtures/encrypted.pdf"), "--out", join(root, "never.prd"), "--json"]);
      expect(rejected.code).toBe(1);
      await expect(readFile(join(root, "never.prd"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 15_000);

  it("converts a real DOCX to a validated package with original source and quality diagnostics", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-cli-docx-"));
    const source = resolve(repoRoot, "examples/conversion-docx/source.docx");
    const output = join(root, "word.prd");
    try {
      const converted = await runBuiltCli(["convert", source, "--out", output, "--json"]);
      expect(converted.code).toBe(0);
      expect(JSON.parse(converted.stdout)).toMatchObject({ converted: true, quality: { sourceFormat: "docx", profile: "general-document", nodeCount: 12, resourceCount: 1, sourcePreserved: true } });
      expect((await runBuiltCli(["validate", output, "--json"])).code).toBe(0);
      expect((await runBuiltCli(["convert", source, "--out", output])).code).toBe(1);
      const files = readPrdArchive(new Uint8Array(await readFile(output)));
      expect(Buffer.from(files["attachments/source.docx"]!).equals(await readFile(source))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("converts EPUB spine chapters to a validated package with diagnostics", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-cli-epub-"));
    const source = resolve(repoRoot, "examples/conversion-epub/portable-chapters.epub");
    const output = join(root, "book.prd");
    try {
      const converted = await runBuiltCli(["convert", source, "--out", output, "--json"]);
      expect(converted.code).toBe(0);
      expect(JSON.parse(converted.stdout)).toMatchObject({ converted: true, quality: { sourceFormat: "epub", profile: "general-document", resourceCount: 1, nodeCount: 13, sourcePreserved: true } });
      const validation = await runBuiltCli(["validate", output, "--json"]);
      expect(validation.code).toBe(0);
      expect(JSON.parse(validation.stdout).valid).toBe(true);
      const files = readPrdArchive(new Uint8Array(await readFile(output)));
      expect(JSON.parse(Buffer.from(files["content/root.json"]!).toString()).children).toHaveLength(2);
      expect(Buffer.from(files["content/root.json"]!).toString()).not.toContain("epubScriptMarker");
      expect((await runBuiltCli(["convert", source, "--out", output])).code).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // Both transports exercise separate Node processes for conversion, validation and inspection.
  it("converts a real CBZ to a valid comic in both PRD transports", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-cli-cbz-"));
    const source = resolve(repoRoot, "examples/conversion-cbz/sample-comic.cbz");
    try {
      for (const container of ["zip", "prd"]) {
        const output = join(root, `${container}.prd`);
        const result = await runBuiltCli(["convert", source, "--profile", "comic", "--container", container, "--out", output, "--json"]);
        expect(result.code).toBe(0);
        const payload = JSON.parse(result.stdout);
        expect(payload.quality).toMatchObject({ sourceFormat: "cbz", profile: "comic", nodeCount: 3, resourceCount: 3, sourcePreserved: true });
        const files = readPrdArchive(new Uint8Array(await readFile(output)));
        expect(JSON.parse(Buffer.from(files["content/root.json"]!).toString()).type).toBe("comic");
        expect((await runBuiltCli(["validate", output, "--json"])).code).toBe(0);
        expect(JSON.parse((await runBuiltCli(["inspect", output, "--json"])).stdout)).toMatchObject({ valid: true, manifest: { profile: "comic" }, inspection: { assetCount: 3, attachmentCount: 2 } });
        const before = await readFile(output);
        expect((await runBuiltCli(["convert", source, "--out", output])).code).toBe(1);
        expect((await readFile(output)).equals(before)).toBe(true);
      }
      const invalid = await runBuiltCli(["convert", source, "--profile", "general-document", "--out", join(root, "never.prd")]);
      expect(invalid.code).toBe(1);
      await expect(readFile(join(root, "never.prd"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 15_000);

  it("imports HTML to a directory, validates it and packs an archive with versioned diagnostics", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-cli-import-html-"));
    const targetDir = join(root, "document");
    const outputPath = join(root, "document.prd");
    try {
      const source = resolve(repoRoot, "examples/conversion-html/source.html");
      const imported = await runBuiltCli(["import", "html", source, "--out", targetDir, "--json"]);
      expect(imported.code).toBe(0);
      const payload = JSON.parse(imported.stdout);
      expect(payload).toMatchObject({
        contractVersion: "prd-cli-html-import-v1", imported: true,
        report: { contractVersion: "prd-import-report-v1", sourceFormat: "html", sourcePreserved: false, validation: { valid: true, errors: [] } }
      });
      expect((await runBuiltCli(["validate", targetDir, "--json"])).code).toBe(0);
      expect((await runBuiltCli(["pack", targetDir, "--out", outputPath])).code).toBe(0);
      expect((await runBuiltCli(["validate", outputPath, "--json"])).code).toBe(0);
      const files = readPrdArchive(new Uint8Array(await readFile(outputPath)));
      expect(JSON.parse(Buffer.from(files["attachments/import-report.json"]!).toString())).toEqual(payload.report);
      expect(files["attachments/source.html"]).toBeUndefined();
      expect(Buffer.from(files["content/root.json"]!).toString()).not.toContain("prdSourceScriptRan");
      const failure = await runBuiltCli(["import", "html", source, "--out", targetDir, "--json"]);
      expect(failure.code).toBe(1);
      expect(failure.stdout).toBe("");
      expect(JSON.parse(failure.stderr)).toMatchObject({ contractVersion: "prd-cli-html-import-v1", imported: false });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("converts HTML to canonical PRD without carrying scripts into readable content", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-cli-convert-html-"));
    const output = join(root, "html.prd");
    try {
      const source = resolve(repoRoot, "examples/conversion-html/source.html");
      const converted = await runBuiltCli(["convert", source, "--out", output, "--profile", "general-document", "--json"]);
      expect(converted.code).toBe(0);
      expect(JSON.parse(converted.stdout)).toMatchObject({ converted: true, quality: { sourceFormat: "html", profile: "general-document", sourcePreserved: true, resourceCount: 1 } });
      const files = readPrdArchive(new Uint8Array(await readFile(output)));
      const content = Buffer.from(files["content/root.json"]!).toString();
      expect(content).not.toContain("prdSourceScriptRan");
      expect(JSON.parse(content).children.some((node: { type: string }) => node.type === "table")).toBe(true);
      expect(Buffer.from(files["attachments/source.html"]!).toString()).toContain("prdSourceScriptRan");
      expect((await runBuiltCli(["validate", output, "--json"])).code).toBe(0);
      expect(JSON.parse((await runBuiltCli(["inspect", output, "--json"])).stdout)).toMatchObject({ valid: true, inspection: { entryKind: "structured-json", attachmentCount: 2 } });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("converts Markdown directly to a validated PRD with a persistent quality report", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-cli-convert-"));
    const source = join(root, "source.md");
    const output = join(root, "converted.prd");
    try {
      await writeFile(source, "# Converted Report\n\nA real source document.\n\n```\nsource retained\n```\n");
      const converted = await runBuiltCli(["convert", source, "--out", output, "--json"]);
      expect(converted.code).toBe(0);
      expect(converted.stderr).toBe("");
      const payload = JSON.parse(converted.stdout);
      expect(payload).toMatchObject({ converted: true, quality: { sourceFormat: "markdown", profile: "general-document", sourcePreserved: true } });
      const files = readPrdArchive(new Uint8Array(await readFile(output)));
      expect(JSON.parse(Buffer.from(files["attachments/conversion-quality.json"]!).toString())).toEqual(payload.quality);
      expect((await runBuiltCli(["validate", output, "--json"])).code).toBe(0);
      const inspected = await runBuiltCli(["inspect", output, "--json"]);
      expect(JSON.parse(inspected.stdout)).toMatchObject({ valid: true, inspection: { attachmentCount: 2, entryKind: "structured-json" } });
      const original = await readFile(output);
      expect((await runBuiltCli(["convert", source, "--out", output])).code).toBe(1);
      expect(await readFile(output)).toEqual(original);
      for (const args of [
        ["--profile", "comic"], ["--strategy", "hybrid"], ["--container", "unknown"],
        ["--title"], ["--bogus"], ["--json", "--json"]
      ]) {
        expect((await runBuiltCli(["convert", source, "--out", join(root, "never.prd"), ...args])).code).toBe(1);
      }
      await expect(readFile(join(root, "never.prd"))).rejects.toMatchObject({ code: "ENOENT" });
      const noSource = await runBuiltCli(["convert", source, "--out", join(root, "no-source.prd"), "--no-source", "--container", "prd", "--json"]);
      expect(noSource.code).toBe(0);
      expect(JSON.parse(noSource.stdout).quality.sourcePreserved).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("signs without overwriting and verifies only with an explicitly trusted public key", async () => {
    const sourceDir = await createFixture("prd-cli-sign-source-");
    const outputDir = await mkdtemp(join(tmpdir(), "prd-cli-sign-output-"));
    const keys = generateKeyPairSync("ed25519");
    const other = generateKeyPairSync("ed25519");
    const privatePem = keys.privateKey.export({ format: "pem", type: "pkcs8" }).toString();
    const keyPath = join(outputDir, "private.pem");
    const publicPath = join(outputDir, "public.pem");
    const wrongPath = join(outputDir, "wrong.pem");
    try {
      await writeFile(keyPath, privatePem, { mode: 0o600 });
      await writeFile(publicPath, keys.publicKey.export({ format: "pem", type: "spki" }));
      await writeFile(wrongPath, other.publicKey.export({ format: "pem", type: "spki" }));
      const unsigned = join(outputDir, "unsigned.prd");
      const signed = join(outputDir, "signed.prd");
      expect((await runBuiltCli(["pack", sourceDir, "--out", unsigned, "--container", "prd"])).code).toBe(0);
      const original = await readFile(unsigned);
      const signedResult = await runBuiltCli(["sign", unsigned, "--key", keyPath, "--out", signed, "--json"]);
      expect(signedResult.code).toBe(0);
      expect(JSON.parse(signedResult.stdout)).toMatchObject({ contractVersion: "prd-cli-signature-v1", signed: true, outputPath: signed });
      expect(signedResult.stdout + signedResult.stderr).not.toContain(privatePem);
      expect(await readFile(unsigned)).toEqual(original);
      const emitted = await readFile(signed);
      expect([...emitted.subarray(0, 4)]).toEqual([0x50, 0x52, 0x44, 0]);
      for (const [path, trustedKey, status, code] of [
        [signed, undefined, "untrusted", 1],
        [signed, publicPath, "verified", 0],
        [signed, wrongPath, "untrusted", 1],
        [unsigned, publicPath, "unsigned", 1]
      ] as const) {
        const result = await runBuiltCli(["verify", path, "--json", ...(trustedKey ? ["--trusted-key", trustedKey] : [])]);
        expect(result.code).toBe(code);
        expect(JSON.parse(result.stdout)).toMatchObject({ contractVersion: "prd-cli-signature-v1", status });
      }
      expect((await runBuiltCli(["validate", signed, "--json"])).code).toBe(0);
      const tamperedFiles = readPrdArchive(emitted);
      tamperedFiles["content/root.json"] = Buffer.concat([tamperedFiles["content/root.json"]!, Buffer.from(" ")]);
      const tampered = join(outputDir, "tampered.prd");
      const tamperedDir = join(outputDir, "tampered");
      for (const [path, bytes] of Object.entries(tamperedFiles)) {
        await mkdir(dirname(join(tamperedDir, path)), { recursive: true });
        await writeFile(join(tamperedDir, path), bytes);
      }
      await writeFile(tampered, await packDirectoryToBuffer(tamperedDir));
      const failed = await runBuiltCli(["verify", tampered, "--trusted-key", publicPath, "--json"]);
      expect(failed.code).toBe(1);
      expect(JSON.parse(failed.stdout).status).toBe("invalid");
      expect((await runBuiltCli(["sign", unsigned, "--key", keyPath, "--out", signed])).code).toBe(1);
      expect(await readFile(signed)).toEqual(emitted);
      expect((await runBuiltCli(["sign", unsigned, "--key", keyPath, "--out", unsigned])).stderr).toContain("separate output");
      expect((await runBuiltCli(["sign", signed, "--key", keyPath, "--out", join(outputDir, "resigned.prd")])).stderr).toContain("already contains");
      expect((await runBuiltCli(["sign", unsigned, "--key"])).stderr).toContain("Usage:");
      expect((await runBuiltCli(["verify", signed, "--trusted-key"])).stderr).toContain("Usage:");
    } finally {
      await rm(sourceDir, { recursive: true, force: true });
      await rm(outputDir, { recursive: true, force: true });
    }
  }, 20_000);

  it("packs both transports and validates/inspects the explicit PRD envelope", async () => {
    const sourceDir = await createFixture("prd-cli-container-source-");
    const outputDir = await mkdtemp(join(tmpdir(), "prd-cli-container-output-"));
    try {
      const legacyPath = join(outputDir, "legacy.prd");
      const envelopePath = join(outputDir, "enveloped.prd");
      expect((await runBuiltCli(["pack", sourceDir, "--out", legacyPath])).code).toBe(0);
      expect([...(await readFile(legacyPath)).subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
      expect((await runBuiltCli(["pack", sourceDir, "--out", envelopePath, "--container", "prd"])).code).toBe(0);
      expect([...(await readFile(envelopePath)).subarray(0, 4)]).toEqual([0x50, 0x52, 0x44, 0x00]);
      const validated = await runBuiltCli(["validate", envelopePath, "--json"]);
      const inspected = await runBuiltCli(["inspect", envelopePath, "--json"]);
      expect(validated.code).toBe(0);
      expect(JSON.parse(validated.stdout).valid).toBe(true);
      expect(inspected.code).toBe(0);
      expect(JSON.parse(inspected.stdout).inspection.sourceKind).toBe("archive");
      for (const flags of [["--container"], ["--container", "unknown"]]) {
        const failed = await runBuiltCli(["pack", sourceDir, "--out", join(outputDir, "invalid.prd"), ...flags]);
        expect(failed.code).toBe(1);
        expect(failed.stderr).toContain("`--container` must be `zip` or `prd`.");
        await expect(readFile(join(outputDir, "invalid.prd"))).rejects.toThrow();
      }
      const broken = await readFile(envelopePath);
      broken[6] = 1;
      await writeFile(envelopePath, broken);
      const rejected = await runBuiltCli(["validate", envelopePath, "--json"]);
      expect(rejected.code).toBe(1);
      expect(JSON.parse(rejected.stdout).errors[0].code).toBe("container-flags-unsupported");
    } finally {
      await rm(sourceDir, { recursive: true, force: true });
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("executes built binary image import, validate, inspect, and pack for visual profiles", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "prd-cli-e2e-import-images-"));
    const sourceDir = join(outDir, "pages");
    const comicDir = join(outDir, "comic-prd");
    const storyboardDir = join(outDir, "storyboard-prd");
    const packedComicFile = join(outDir, "comic.prd");

    try {
      await mkdir(sourceDir, { recursive: true });
      await writeFile(
        join(sourceDir, "page-2.svg"),
        "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
        "utf8"
      );
      await writeFile(
        join(sourceDir, "page-10.svg"),
        "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
        "utf8"
      );

      const comicImportResult = await runBuiltCli([
        "import",
        "images",
        sourceDir,
        "--profile",
        "comic",
        "--out",
        comicDir,
        "--json"
      ]);
      expect(comicImportResult.code).toBe(0);
      const comicImportJson = JSON.parse(comicImportResult.stdout) as {
        imported: boolean;
        profile: string;
        imageCount: number;
        assetCount: number;
      };
      expect(comicImportJson.imported).toBe(true);
      expect(comicImportJson.profile).toBe("comic");
      expect(comicImportJson.imageCount).toBe(2);
      expect(comicImportJson.assetCount).toBe(2);

      const validateComicResult = await runBuiltCli(["validate", comicDir]);
      expect(validateComicResult.code).toBe(0);
      expect(validateComicResult.stdout).toContain("valid: yes");

      const inspectComicResult = await runBuiltCli(["inspect", comicDir, "--json"]);
      expect(inspectComicResult.code).toBe(0);
      const inspectComicJson = JSON.parse(inspectComicResult.stdout) as {
        valid: boolean;
        inspection: { assetCount: number; entryKind: string };
      };
      expect(inspectComicJson.valid).toBe(true);
      expect(inspectComicJson.inspection.assetCount).toBe(2);
      expect(inspectComicJson.inspection.entryKind).toBe("structured-json");

      const packComicResult = await runBuiltCli(["pack", comicDir, "--out", packedComicFile]);
      expect(packComicResult.code).toBe(0);
      const packedBuffer = await readFile(packedComicFile);
      expect(packedBuffer.length).toBeGreaterThan(0);

      const storyboardImportResult = await runBuiltCli([
        "import",
        "images",
        sourceDir,
        "--profile",
        "storyboard",
        "--out",
        storyboardDir,
        "--json"
      ]);
      expect(storyboardImportResult.code).toBe(0);
      const storyboardImportJson = JSON.parse(storyboardImportResult.stdout) as {
        profile: string;
        imageCount: number;
      };
      expect(storyboardImportJson.profile).toBe("storyboard");
      expect(storyboardImportJson.imageCount).toBe(2);

      const validateStoryboardResult = await runBuiltCli(["validate", storyboardDir]);
      expect(validateStoryboardResult.code).toBe(0);
      expect(validateStoryboardResult.stdout).toContain("valid: yes");
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("executes built binary markdown import, validate, inspect, and pack", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "prd-cli-e2e-import-md-"));
    const sourcePath = join(outDir, "launch.md");
    const sourceDir = join(outDir, "launch-prd");
    const packedFile = join(outDir, "launch.prd");

    try {
      await writeFile(
        sourcePath,
        [
          "# Launch Plan",
          "This Markdown file becomes structured PRD content.",
          "",
          "## Checks",
          "1. Validate",
          "2. Inspect",
          "3. Pack"
        ].join("\n"),
        "utf8"
      );

      const importResult = await runBuiltCli([
        "import",
        "markdown",
        sourcePath,
        "--out",
        sourceDir,
        "--json"
      ]);
      expect(importResult.code).toBe(0);
      const importJson = JSON.parse(importResult.stdout) as {
        imported: boolean;
        profile: string;
        nodeCount: number;
        assetCount: number;
      };
      expect(importJson.imported).toBe(true);
      expect(importJson.profile).toBe("general-document");
      expect(importJson.nodeCount).toBe(4);
      expect(importJson.assetCount).toBe(0);

      const validateResult = await runBuiltCli(["validate", sourceDir]);
      expect(validateResult.code).toBe(0);
      expect(validateResult.stdout).toContain("valid: yes");

      const inspectResult = await runBuiltCli(["inspect", sourceDir, "--json"]);
      expect(inspectResult.code).toBe(0);
      const inspectJson = JSON.parse(inspectResult.stdout) as {
        valid: boolean;
        inspection: { entryKind: string; assetCount: number };
      };
      expect(inspectJson.valid).toBe(true);
      expect(inspectJson.inspection.entryKind).toBe("structured-json");
      expect(inspectJson.inspection.assetCount).toBe(0);

      const packResult = await runBuiltCli(["pack", sourceDir, "--out", packedFile]);
      expect(packResult.code).toBe(0);
      const packedBuffer = await readFile(packedFile);
      expect(packedBuffer.length).toBeGreaterThan(0);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("executes built binary init, validate, inspect, and pack for a generated package", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "prd-cli-e2e-init-"));
    const sourceDir = join(outDir, "starter-comic");
    const packedFile = join(outDir, "starter-comic.prd");

    try {
      const initResult = await runBuiltCli([
        "init",
        sourceDir,
        "--profile",
        "comic",
        "--title",
        "Starter Comic",
        "--json"
      ]);
      expect(initResult.code).toBe(0);
      const initJson = JSON.parse(initResult.stdout) as {
        created: boolean;
        profile: string;
        files: string[];
      };
      expect(initJson.created).toBe(true);
      expect(initJson.profile).toBe("comic");
      expect(initJson.files).toContain("assets/panels/panel-1.svg");

      const validateResult = await runBuiltCli(["validate", sourceDir]);
      expect(validateResult.code).toBe(0);
      expect(validateResult.stdout).toContain("valid: yes");

      const inspectResult = await runBuiltCli(["inspect", sourceDir, "--json"]);
      expect(inspectResult.code).toBe(0);
      const inspectJson = JSON.parse(inspectResult.stdout) as {
        valid: boolean;
        inspection: { assetCount: number; entryKind: string };
      };
      expect(inspectJson.valid).toBe(true);
      expect(inspectJson.inspection.assetCount).toBe(1);
      expect(inspectJson.inspection.entryKind).toBe("structured-json");

      const packResult = await runBuiltCli(["pack", sourceDir, "--out", packedFile]);
      expect(packResult.code).toBe(0);
      const packedBuffer = await readFile(packedFile);
      expect(packedBuffer.length).toBeGreaterThan(0);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("executes built binary commands pack, validate, and inspect", async () => {
    const sourceDir = await createFixture("prd-cli-e2e-");
    const outDir = await mkdtemp(join(tmpdir(), "prd-cli-e2e-dist-"));
    const packedFile = join(outDir, "fixture.prd");

    try {
      const packResult = await runBuiltCli(["pack", sourceDir, "--out", packedFile]);
      expect(packResult.code).toBe(0);
      expect(packResult.stdout).toContain("Packed");

      const validateSourceResult = await runBuiltCli(["validate", sourceDir]);
      expect(validateSourceResult.code).toBe(0);
      expect(validateSourceResult.stdout).toContain("valid: yes");

      const validateArchiveResult = await runBuiltCli(["validate", packedFile, "--json"]);
      expect(validateArchiveResult.code).toBe(0);
      const validateArchiveJson = JSON.parse(validateArchiveResult.stdout) as {
        valid: boolean;
        manifest: { profile: string };
      };
      expect(validateArchiveJson.valid).toBe(true);
      expect(validateArchiveJson.manifest.profile).toBe("general-document");

      const inspectArchiveResult = await runBuiltCli(["inspect", packedFile, "--json"]);
      expect(inspectArchiveResult.code).toBe(0);
      const inspectArchiveJson = JSON.parse(inspectArchiveResult.stdout) as {
        valid: boolean;
        inspection: { sourceKind: string; fileCount: number };
      };
      expect(inspectArchiveJson.valid).toBe(true);
      expect(inspectArchiveJson.inspection.sourceKind).toBe("archive");
      expect(inspectArchiveJson.inspection.fileCount).toBeGreaterThan(0);

      const packedBuffer = await readFile(packedFile);
      expect(packedBuffer.length).toBeGreaterThan(0);
    } finally {
      await rm(sourceDir, { recursive: true, force: true });
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("captures stable snapshots for validate and inspect (text + --json)", async () => {
    const sourceDir = await createFixture("prd-cli-e2e-snapshot-");
    const outDir = await mkdtemp(join(tmpdir(), "prd-cli-e2e-snapshot-dist-"));
    const packedFile = join(outDir, "fixture.prd");

    try {
      const packResult = await runBuiltCli(["pack", sourceDir, "--out", packedFile]);
      expect(packResult.code).toBe(0);

      const validateText = await runBuiltCli(["validate", sourceDir]);
      expect(validateText.code).toBe(0);
      expect(validateText.stdout.trimEnd()).toMatchInlineSnapshot(`
        "valid: yes
        profile: general-document
        profileStatus: canonical-core
        entry: content/root.json
        localization: none
        errors:
        - none
        warnings:
        - none"
      `);

      const validateJson = await runBuiltCli(["validate", packedFile, "--json"]);
      expect(validateJson.code).toBe(0);
      expect(JSON.parse(validateJson.stdout) as Record<string, unknown>).toMatchInlineSnapshot(`
        {
          "entry": "content/root.json",
          "errors": [],
          "manifest": {
            "entry": "content/root.json",
            "localizationDefaultLocale": null,
            "profile": "general-document",
          },
          "profileInfo": {
            "supportClass": "canonical-core",
          },
          "valid": true,
          "warnings": [],
        }
      `);

      const inspectText = await runBuiltCli(["inspect", sourceDir]);
      expect(inspectText.code).toBe(0);
      expect(normalizeInspectTextSnapshot(inspectText.stdout.trimEnd())).toMatchInlineSnapshot(`
        "valid: yes
        profile: general-document
        profileStatus: canonical-core
        entry: content/root.json
        localization: none
        errors:
        - none
        warnings:
        - none
        inspection:
        - source: directory
        - files: 3
        - bytes: <number>
        - assets: 1
        - attachments: 0
        - locales: 0
        - series: no
        - collections: 0
        - entry mode: structured-json
        - segmentation: none
        - localized resources: no
        - localized alternate entries: no
        - reference load mode: eager-whole-package"
      `);

      const inspectJson = await runBuiltCli(["inspect", packedFile, "--json"]);
      expect(inspectJson.code).toBe(0);
      expect(normalizeInspectJsonSnapshot(inspectJson.stdout)).toMatchInlineSnapshot(`
        {
          "entry": "content/root.json",
          "errors": [],
          "inspection": {
            "assetCount": 1,
            "attachmentCount": 0,
            "collectionCount": 0,
            "entryKind": "structured-json",
            "fileCount": 3,
            "hasSeriesMembership": false,
            "localeCount": 0,
            "localizedAlternateEntries": false,
            "localizedResources": false,
            "referenceLoadMode": "eager-whole-package",
            "segmentation": "none",
            "sourceKind": "archive",
            "totalBytes": -1,
          },
          "manifest": {
            "entry": "content/root.json",
            "localizationDefaultLocale": null,
            "profile": "general-document",
          },
          "profileInfo": {
            "supportClass": "canonical-core",
          },
          "valid": true,
          "warnings": [],
        }
      `);
    } finally {
      await rm(sourceDir, { recursive: true, force: true });
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("captures stable snapshots for invalid-package validate and inspect (text + --json)", async () => {
    const sourceDir = await createInvalidFixture("prd-cli-e2e-invalid-snapshot-");

    try {
      const validateText = await runBuiltCli(["validate", sourceDir]);
      expect(validateText.code).toBe(1);
      expect(validateText.stdout.trimEnd()).toMatchInlineSnapshot(`
        "valid: no
        profile: general-document
        profileStatus: canonical-core
        entry: content/index.html
        localization: none
        errors:
        - [general-document-entry-format] \`general-document\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`.
        - [content-json-invalid] The \`general-document\` entry must parse as valid JSON structured content.
        warnings:
        - none"
      `);

      const validateJson = await runBuiltCli(["validate", sourceDir, "--json"]);
      expect(validateJson.code).toBe(1);
      expect(JSON.parse(validateJson.stdout) as Record<string, unknown>).toMatchInlineSnapshot(`
        {
          "entry": "content/index.html",
          "errors": [
            {
              "code": "general-document-entry-format",
              "message": "\`general-document\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`.",
            },
            {
              "code": "content-json-invalid",
              "message": "The \`general-document\` entry must parse as valid JSON structured content.",
            },
          ],
          "manifest": {
            "entry": "content/index.html",
            "localizationDefaultLocale": null,
            "profile": "general-document",
          },
          "profileInfo": {
            "supportClass": "canonical-core",
          },
          "valid": false,
          "warnings": [],
        }
      `);

      const inspectText = await runBuiltCli(["inspect", sourceDir]);
      expect(inspectText.code).toBe(1);
      expect(normalizeInspectTextSnapshot(inspectText.stdout.trimEnd())).toMatchInlineSnapshot(`
        "valid: no
        profile: general-document
        profileStatus: canonical-core
        entry: content/index.html
        localization: none
        errors:
        - [general-document-entry-format] \`general-document\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`.
        - [content-json-invalid] The \`general-document\` entry must parse as valid JSON structured content.
        warnings:
        - none
        inspection:
        - source: directory
        - files: 2
        - bytes: <number>
        - assets: 0
        - attachments: 0
        - locales: 0
        - series: no
        - collections: 0
        - entry mode: html-fallback
        - segmentation: none
        - localized resources: no
        - localized alternate entries: no
        - reference load mode: eager-whole-package"
      `);

      const inspectJson = await runBuiltCli(["inspect", sourceDir, "--json"]);
      expect(inspectJson.code).toBe(1);
      expect(normalizeInspectJsonSnapshot(inspectJson.stdout)).toMatchInlineSnapshot(`
        {
          "entry": "content/index.html",
          "errors": [
            {
              "code": "general-document-entry-format",
              "message": "\`general-document\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`.",
            },
            {
              "code": "content-json-invalid",
              "message": "The \`general-document\` entry must parse as valid JSON structured content.",
            },
          ],
          "inspection": {
            "assetCount": 0,
            "attachmentCount": 0,
            "collectionCount": 0,
            "entryKind": "html-fallback",
            "fileCount": 2,
            "hasSeriesMembership": false,
            "localeCount": 0,
            "localizedAlternateEntries": false,
            "localizedResources": false,
            "referenceLoadMode": "eager-whole-package",
            "segmentation": "none",
            "sourceKind": "directory",
            "totalBytes": -1,
          },
          "manifest": {
            "entry": "content/index.html",
            "localizationDefaultLocale": null,
            "profile": "general-document",
          },
          "profileInfo": {
            "supportClass": "canonical-core",
          },
          "valid": false,
          "warnings": [],
        }
      `);
    } finally {
      await rm(sourceDir, { recursive: true, force: true });
    }
  });

  it("captures stable snapshots for profile-entry conformance fixtures", async () => {
    const outputs: Record<
      string,
      {
        validateText: string;
        validateJson: Record<string, unknown>;
        inspectText: string;
        inspectJson: Record<string, unknown>;
      }
    > = {};

    for (const [label, fixturePath] of Object.entries(conformanceFixturePaths)) {
      const validateText = await runBuiltCli(["validate", fixturePath]);
      expect(validateText.code).toBe(1);

      const validateJson = await runBuiltCli(["validate", fixturePath, "--json"]);
      expect(validateJson.code).toBe(1);

      const inspectText = await runBuiltCli(["inspect", fixturePath]);
      expect(inspectText.code).toBe(1);

      const inspectJson = await runBuiltCli(["inspect", fixturePath, "--json"]);
      expect(inspectJson.code).toBe(1);

      outputs[label] = {
        validateText: validateText.stdout.trimEnd(),
        validateJson: JSON.parse(validateJson.stdout) as Record<string, unknown>,
        inspectText: normalizeInspectTextSnapshot(inspectText.stdout.trimEnd()),
        inspectJson: normalizeInspectJsonSnapshot(inspectJson.stdout)
      };
    }

    expect(outputs).toMatchInlineSnapshot(`
      {
        "comic": {
          "inspectJson": {
            "entry": "profiles/comic/panels.json",
            "errors": [
              {
                "code": "comic-entry-format",
                "message": "\`comic\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`. HTML entries remain legacy fallback behavior.",
              },
              {
                "code": "comic-content-schema-version",
                "message": "Structured comic roots must include a non-empty \`schemaVersion\` string.",
              },
              {
                "code": "comic-content-type-invalid",
                "message": "Structured comic roots must declare \`type: \"comic\"\`.",
              },
              {
                "code": "comic-content-id-required",
                "message": "Structured comic roots must include a non-empty \`id\` string.",
              },
              {
                "code": "comic-content-title-required",
                "message": "Structured comic roots must include a non-empty \`title\` string.",
              },
            ],
            "inspection": {
              "assetCount": 2,
              "attachmentCount": 0,
              "collectionCount": 0,
              "entryKind": "structured-json",
              "fileCount": 4,
              "hasSeriesMembership": false,
              "localeCount": 0,
              "localizedAlternateEntries": false,
              "localizedResources": false,
              "referenceLoadMode": "eager-whole-package",
              "segmentation": "none",
              "sourceKind": "directory",
              "totalBytes": -1,
            },
            "manifest": {
              "entry": "profiles/comic/panels.json",
              "localizationDefaultLocale": null,
              "profile": "comic",
            },
            "profileInfo": {
              "supportClass": "canonical-core",
            },
            "valid": false,
            "warnings": [],
          },
          "inspectText": "valid: no
      profile: comic
      profileStatus: canonical-core
      entry: profiles/comic/panels.json
      localization: none
      errors:
      - [comic-entry-format] \`comic\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`. HTML entries remain legacy fallback behavior.
      - [comic-content-schema-version] Structured comic roots must include a non-empty \`schemaVersion\` string.
      - [comic-content-type-invalid] Structured comic roots must declare \`type: "comic"\`.
      - [comic-content-id-required] Structured comic roots must include a non-empty \`id\` string.
      - [comic-content-title-required] Structured comic roots must include a non-empty \`title\` string.
      warnings:
      - none
      inspection:
      - source: directory
      - files: 4
      - bytes: <number>
      - assets: 2
      - attachments: 0
      - locales: 0
      - series: no
      - collections: 0
      - entry mode: structured-json
      - segmentation: none
      - localized resources: no
      - localized alternate entries: no
      - reference load mode: eager-whole-package",
          "validateJson": {
            "entry": "profiles/comic/panels.json",
            "errors": [
              {
                "code": "comic-entry-format",
                "message": "\`comic\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`. HTML entries remain legacy fallback behavior.",
              },
              {
                "code": "comic-content-schema-version",
                "message": "Structured comic roots must include a non-empty \`schemaVersion\` string.",
              },
              {
                "code": "comic-content-type-invalid",
                "message": "Structured comic roots must declare \`type: \"comic\"\`.",
              },
              {
                "code": "comic-content-id-required",
                "message": "Structured comic roots must include a non-empty \`id\` string.",
              },
              {
                "code": "comic-content-title-required",
                "message": "Structured comic roots must include a non-empty \`title\` string.",
              },
            ],
            "manifest": {
              "entry": "profiles/comic/panels.json",
              "localizationDefaultLocale": null,
              "profile": "comic",
            },
            "profileInfo": {
              "supportClass": "canonical-core",
            },
            "valid": false,
            "warnings": [],
          },
          "validateText": "valid: no
      profile: comic
      profileStatus: canonical-core
      entry: profiles/comic/panels.json
      localization: none
      errors:
      - [comic-entry-format] \`comic\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`. HTML entries remain legacy fallback behavior.
      - [comic-content-schema-version] Structured comic roots must include a non-empty \`schemaVersion\` string.
      - [comic-content-type-invalid] Structured comic roots must declare \`type: "comic"\`.
      - [comic-content-id-required] Structured comic roots must include a non-empty \`id\` string.
      - [comic-content-title-required] Structured comic roots must include a non-empty \`title\` string.
      warnings:
      - none",
        },
        "generalDocument": {
          "inspectJson": {
            "entry": "content/index.html",
            "errors": [
              {
                "code": "general-document-entry-format",
                "message": "\`general-document\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`.",
              },
              {
                "code": "content-json-invalid",
                "message": "The \`general-document\` entry must parse as valid JSON structured content.",
              },
            ],
            "inspection": {
              "assetCount": 0,
              "attachmentCount": 0,
              "collectionCount": 0,
              "entryKind": "html-fallback",
              "fileCount": 2,
              "hasSeriesMembership": false,
              "localeCount": 0,
              "localizedAlternateEntries": false,
              "localizedResources": false,
              "referenceLoadMode": "eager-whole-package",
              "segmentation": "none",
              "sourceKind": "directory",
              "totalBytes": -1,
            },
            "manifest": {
              "entry": "content/index.html",
              "localizationDefaultLocale": null,
              "profile": "general-document",
            },
            "profileInfo": {
              "supportClass": "canonical-core",
            },
            "valid": false,
            "warnings": [],
          },
          "inspectText": "valid: no
      profile: general-document
      profileStatus: canonical-core
      entry: content/index.html
      localization: none
      errors:
      - [general-document-entry-format] \`general-document\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`.
      - [content-json-invalid] The \`general-document\` entry must parse as valid JSON structured content.
      warnings:
      - none
      inspection:
      - source: directory
      - files: 2
      - bytes: <number>
      - assets: 0
      - attachments: 0
      - locales: 0
      - series: no
      - collections: 0
      - entry mode: html-fallback
      - segmentation: none
      - localized resources: no
      - localized alternate entries: no
      - reference load mode: eager-whole-package",
          "validateJson": {
            "entry": "content/index.html",
            "errors": [
              {
                "code": "general-document-entry-format",
                "message": "\`general-document\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`.",
              },
              {
                "code": "content-json-invalid",
                "message": "The \`general-document\` entry must parse as valid JSON structured content.",
              },
            ],
            "manifest": {
              "entry": "content/index.html",
              "localizationDefaultLocale": null,
              "profile": "general-document",
            },
            "profileInfo": {
              "supportClass": "canonical-core",
            },
            "valid": false,
            "warnings": [],
          },
          "validateText": "valid: no
      profile: general-document
      profileStatus: canonical-core
      entry: content/index.html
      localization: none
      errors:
      - [general-document-entry-format] \`general-document\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`.
      - [content-json-invalid] The \`general-document\` entry must parse as valid JSON structured content.
      warnings:
      - none",
        },
        "storyboard": {
          "inspectJson": {
            "entry": "profiles/storyboard/frames.json",
            "errors": [
              {
                "code": "storyboard-entry-format",
                "message": "\`storyboard\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`. HTML entries remain legacy fallback behavior.",
              },
              {
                "code": "storyboard-content-schema-version",
                "message": "Structured storyboard roots must include a non-empty \`schemaVersion\` string.",
              },
              {
                "code": "storyboard-content-type-invalid",
                "message": "Structured storyboard roots must declare \`type: \"storyboard\"\`.",
              },
              {
                "code": "storyboard-content-id-required",
                "message": "Structured storyboard roots must include a non-empty \`id\` string.",
              },
              {
                "code": "storyboard-content-title-required",
                "message": "Structured storyboard roots must include a non-empty \`title\` string.",
              },
            ],
            "inspection": {
              "assetCount": 2,
              "attachmentCount": 0,
              "collectionCount": 0,
              "entryKind": "structured-json",
              "fileCount": 4,
              "hasSeriesMembership": false,
              "localeCount": 0,
              "localizedAlternateEntries": false,
              "localizedResources": false,
              "referenceLoadMode": "eager-whole-package",
              "segmentation": "none",
              "sourceKind": "directory",
              "totalBytes": -1,
            },
            "manifest": {
              "entry": "profiles/storyboard/frames.json",
              "localizationDefaultLocale": null,
              "profile": "storyboard",
            },
            "profileInfo": {
              "supportClass": "canonical-core",
            },
            "valid": false,
            "warnings": [],
          },
          "inspectText": "valid: no
      profile: storyboard
      profileStatus: canonical-core
      entry: profiles/storyboard/frames.json
      localization: none
      errors:
      - [storyboard-entry-format] \`storyboard\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`. HTML entries remain legacy fallback behavior.
      - [storyboard-content-schema-version] Structured storyboard roots must include a non-empty \`schemaVersion\` string.
      - [storyboard-content-type-invalid] Structured storyboard roots must declare \`type: "storyboard"\`.
      - [storyboard-content-id-required] Structured storyboard roots must include a non-empty \`id\` string.
      - [storyboard-content-title-required] Structured storyboard roots must include a non-empty \`title\` string.
      warnings:
      - none
      inspection:
      - source: directory
      - files: 4
      - bytes: <number>
      - assets: 2
      - attachments: 0
      - locales: 0
      - series: no
      - collections: 0
      - entry mode: structured-json
      - segmentation: none
      - localized resources: no
      - localized alternate entries: no
      - reference load mode: eager-whole-package",
          "validateJson": {
            "entry": "profiles/storyboard/frames.json",
            "errors": [
              {
                "code": "storyboard-entry-format",
                "message": "\`storyboard\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`. HTML entries remain legacy fallback behavior.",
              },
              {
                "code": "storyboard-content-schema-version",
                "message": "Structured storyboard roots must include a non-empty \`schemaVersion\` string.",
              },
              {
                "code": "storyboard-content-type-invalid",
                "message": "Structured storyboard roots must declare \`type: \"storyboard\"\`.",
              },
              {
                "code": "storyboard-content-id-required",
                "message": "Structured storyboard roots must include a non-empty \`id\` string.",
              },
              {
                "code": "storyboard-content-title-required",
                "message": "Structured storyboard roots must include a non-empty \`title\` string.",
              },
            ],
            "manifest": {
              "entry": "profiles/storyboard/frames.json",
              "localizationDefaultLocale": null,
              "profile": "storyboard",
            },
            "profileInfo": {
              "supportClass": "canonical-core",
            },
            "valid": false,
            "warnings": [],
          },
          "validateText": "valid: no
      profile: storyboard
      profileStatus: canonical-core
      entry: profiles/storyboard/frames.json
      localization: none
      errors:
      - [storyboard-entry-format] \`storyboard\` packages must use a structured JSON entry under \`content/\`, such as \`content/root.json\`. HTML entries remain legacy fallback behavior.
      - [storyboard-content-schema-version] Structured storyboard roots must include a non-empty \`schemaVersion\` string.
      - [storyboard-content-type-invalid] Structured storyboard roots must declare \`type: "storyboard"\`.
      - [storyboard-content-id-required] Structured storyboard roots must include a non-empty \`id\` string.
      - [storyboard-content-title-required] Structured storyboard roots must include a non-empty \`title\` string.
      warnings:
      - none",
        },
      }
    `);
  }, 15_000);
});
