import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "./index.js";

async function createMinimalValidPackageFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "prd-cli-valid-"));
  await mkdir(join(root, "content"), { recursive: true });
  await mkdir(join(root, "assets/images"), { recursive: true });
  await mkdir(join(root, "attachments"), { recursive: true });

  await writeFile(
    join(root, "manifest.json"),
    JSON.stringify({
      prdVersion: "1.0",
      manifestVersion: "1.0",
      id: "urn:test:cli-valid",
      profile: "general-document",
      title: "CLI Valid Fixture",
      entry: "content/root.json",
      localization: {
        defaultLocale: "en-US"
      },
      assets: [
        {
          id: "cover",
          href: "assets/images/cover.svg",
          type: "image/svg+xml"
        }
      ],
      attachments: [
        {
          id: "notes",
          href: "attachments/notes.txt",
          type: "text/plain"
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
      id: "cli-valid",
      title: "CLI Valid Fixture",
      children: [
        {
          type: "paragraph",
          text: "Validation should pass."
        }
      ]
    }),
    "utf8"
  );
  await writeFile(
    join(root, "assets/images/cover.svg"),
    "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
    "utf8"
  );
  await writeFile(join(root, "attachments/notes.txt"), "notes", "utf8");

  return root;
}

async function createInvalidPackageFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "prd-cli-invalid-"));
  await mkdir(join(root, "content"), { recursive: true });

  await writeFile(
    join(root, "manifest.json"),
    JSON.stringify({
      prdVersion: "1.0",
      manifestVersion: "1.0",
      id: "urn:test:cli-invalid",
      profile: "general-document",
      title: "CLI Invalid Fixture",
      entry: "content/missing-root.json"
    }),
    "utf8"
  );
  await writeFile(
    join(root, "content/root.json"),
    JSON.stringify({
      schemaVersion: "1.0",
      profile: "general-document",
      type: "document",
      id: "cli-invalid",
      title: "CLI Invalid Fixture",
      children: []
    }),
    "utf8"
  );

  return root;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runCli", () => {
  it("fails consistently for unknown commands", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = await runCli(["wat"]);

    expect(exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith("Usage: prd <init|import|pack|validate|inspect> ...");
  });

  it("reports usage/help errors for missing command args", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await runCli(["init"])).toBe(1);
    expect(await runCli(["import"])).toBe(1);
    expect(await runCli(["import", "markdown"])).toBe(1);
    expect(await runCli(["pack"])).toBe(1);
    expect(await runCli(["validate"])).toBe(1);
    expect(await runCli(["inspect"])).toBe(1);

    const messages = errorSpy.mock.calls.map(([value]) => String(value));
    expect(messages).toContain(
      "Usage: prd init <targetDir> [--profile <general-document|comic|storyboard>] [--title <title>] [--id <id>] [--json]"
    );
    expect(messages).toContain("Usage: prd import <markdown|images> ...");
    expect(messages).toContain(
      "Usage: prd import markdown <source.md> --out <targetDir> [--title <title>] [--id <id>] [--json]"
    );
    expect(messages).toContain("Usage: prd pack <sourceDir> --out <file.prd>");
    expect(messages).toContain("Usage: prd validate <path> [--json]");
    expect(messages).toContain("Usage: prd inspect <path> [--json]");
  });

  it("creates a default general-document package with prd init", async () => {
    const parent = await mkdtemp(join(tmpdir(), "prd-cli-init-default-"));
    const targetDir = join(parent, "starter-document");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      expect(await runCli(["init", targetDir])).toBe(0);
      expect(await runCli(["validate", targetDir])).toBe(0);

      const manifest = JSON.parse(await readFile(join(targetDir, "manifest.json"), "utf8")) as {
        id: string;
        profile: string;
        title: string;
        entry: string;
      };
      expect(manifest).toMatchObject({
        id: "urn:prd:local:starter-document",
        profile: "general-document",
        title: "Starter Document",
        entry: "content/root.json"
      });
      expect(String(logSpy.mock.calls[0]?.[0])).toMatchInlineSnapshot(`
        "Created PRD package: ${targetDir}
        profile: general-document
        title: Starter Document
        entry: content/root.json
        next:
        - prd validate ${targetDir}
        - prd pack ${targetDir} --out ${targetDir}.prd"
      `);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("creates explicit comic and storyboard packages with prd init", async () => {
    const parent = await mkdtemp(join(tmpdir(), "prd-cli-init-profiles-"));
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      const comicDir = join(parent, "comic-starter");
      const storyboardDir = join(parent, "storyboard-starter");

      await mkdir(comicDir, { recursive: true });
      expect(await runCli(["init", comicDir, "--profile", "comic"])).toBe(0);
      expect(await runCli(["validate", comicDir])).toBe(0);
      expect(await readdir(join(comicDir, "assets/panels"))).toEqual(["panel-1.svg"]);

      expect(await runCli(["init", storyboardDir, "--profile", "storyboard"])).toBe(0);
      expect(await runCli(["validate", storyboardDir])).toBe(0);
      expect(await readdir(join(storyboardDir, "assets/frames"))).toEqual(["frame-1.svg"]);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("emits structured JSON for prd init --json with title and id overrides", async () => {
    const parent = await mkdtemp(join(tmpdir(), "prd-cli-init-json-"));
    const targetDir = join(parent, "custom");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      expect(
        await runCli([
          "init",
          targetDir,
          "--title",
          "Custom Launch Doc",
          "--id",
          "urn:prd:test:custom",
          "--json"
        ])
      ).toBe(0);

      expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchInlineSnapshot(`
        {
          "created": true,
          "entry": "content/root.json",
          "files": [
            "manifest.json",
            "content/root.json",
          ],
          "id": "urn:prd:test:custom",
          "profile": "general-document",
          "targetDir": "${targetDir}",
          "title": "Custom Launch Doc",
        }
      `);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("fails prd init before writing for unsupported profile and non-empty target", async () => {
    const parent = await mkdtemp(join(tmpdir(), "prd-cli-init-fail-"));
    const unsupportedDir = join(parent, "unsupported");
    const nonEmptyDir = join(parent, "non-empty");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await mkdir(nonEmptyDir, { recursive: true });
      await writeFile(join(nonEmptyDir, "existing.txt"), "keep", "utf8");

      expect(await runCli(["init", unsupportedDir, "--profile", "resume"])).toBe(1);
      expect(await runCli(["init", nonEmptyDir])).toBe(1);

      const messages = errorSpy.mock.calls.map(([value]) => String(value));
      expect(messages).toContain(
        'Unsupported profile "resume". Supported profiles: general-document, comic, storyboard.'
      );
      expect(messages).toContain(`Target directory is not empty: ${nonEmptyDir}`);
      await expect(readdir(unsupportedDir)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readdir(nonEmptyDir)).toEqual(["existing.txt"]);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("imports a markdown document into a valid general-document package", async () => {
    const parent = await mkdtemp(join(tmpdir(), "prd-cli-import-md-"));
    const sourcePath = join(parent, "launch-notes.md");
    const targetDir = join(parent, "launch-notes-prd");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      await writeFile(
        sourcePath,
        [
          "# Launch Notes",
          "Intro paragraph wraps",
          "across lines.",
          "",
          "## Goals",
          "- Validate generated package",
          "- Pack archive",
          "",
          "> Keep the path deterministic.",
          "",
          "![Architecture sketch](diagram.svg \"Imported diagram\")"
        ].join("\n"),
        "utf8"
      );
      await writeFile(
        join(parent, "diagram.svg"),
        "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
        "utf8"
      );

      expect(await runCli(["import", "markdown", sourcePath, "--out", targetDir])).toBe(0);
      expect(await runCli(["validate", targetDir])).toBe(0);

      const manifest = JSON.parse(await readFile(join(targetDir, "manifest.json"), "utf8")) as {
        id: string;
        profile: string;
        title: string;
        assets: Array<{ id: string; href: string; type: string }>;
      };
      const root = JSON.parse(await readFile(join(targetDir, "content/root.json"), "utf8")) as {
        title: string;
        children: Array<{ type: string; asset?: string; caption?: string }>;
      };

      expect(manifest).toMatchObject({
        id: "urn:prd:local:launch-notes",
        profile: "general-document",
        title: "Launch Notes",
        assets: [
          {
            id: "markdown-image-1",
            href: "assets/images/diagram.svg",
            type: "image/svg+xml"
          }
        ]
      });
      expect(root.title).toBe("Launch Notes");
      expect(root.children.map((node) => node.type)).toEqual([
        "heading",
        "paragraph",
        "heading",
        "list",
        "quote",
        "image"
      ]);
      expect(await readFile(join(targetDir, "assets/images/diagram.svg"), "utf8")).toContain(
        "<svg"
      );
      expect(String(logSpy.mock.calls[0]?.[0])).toMatchInlineSnapshot(`
        "Imported PRD package: ${targetDir}
        profile: general-document
        title: Launch Notes
        entry: content/root.json
        nodes: 6
        assets: 1
        warnings:
        - none
        next:
        - prd validate ${targetDir}
        - prd inspect ${targetDir}
        - prd pack ${targetDir} --out ${targetDir}.prd"
      `);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("emits structured JSON for markdown import with title and id overrides", async () => {
    const parent = await mkdtemp(join(tmpdir(), "prd-cli-import-md-json-"));
    const sourcePath = join(parent, "notes.md");
    const targetDir = join(parent, "custom-import");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      await writeFile(sourcePath, "Plain imported paragraph.", "utf8");

      expect(
        await runCli([
          "import",
          "markdown",
          sourcePath,
          "--out",
          targetDir,
          "--title",
          "Custom Import",
          "--id",
          "urn:prd:test:custom-import",
          "--json"
        ])
      ).toBe(0);

      expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchInlineSnapshot(`
        {
          "assetCount": 0,
          "entry": "content/root.json",
          "files": [
            "manifest.json",
            "content/root.json",
          ],
          "id": "urn:prd:test:custom-import",
          "imported": true,
          "nodeCount": 1,
          "profile": "general-document",
          "sourcePath": "${sourcePath}",
          "targetDir": "${targetDir}",
          "title": "Custom Import",
          "warnings": [],
        }
      `);
      expect(await runCli(["validate", targetDir])).toBe(0);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("warns and skips unsupported markdown features without creating invalid packages", async () => {
    const parent = await mkdtemp(join(tmpdir(), "prd-cli-import-md-warn-"));
    const sourcePath = join(parent, "warnings.md");
    const targetDir = join(parent, "warnings-prd");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      await writeFile(
        sourcePath,
        [
          "# Warnings",
          "![Remote](https://example.com/remote.png)",
          "![Missing](missing.png)",
          "<div>raw html</div>",
          "```",
          "const unsupported = true;",
          "```"
        ].join("\n"),
        "utf8"
      );

      expect(
        await runCli(["import", "markdown", sourcePath, "--out", targetDir, "--json"])
      ).toBe(0);

      const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0])) as {
        assetCount: number;
        nodeCount: number;
        warnings: string[];
      };
      expect(payload.assetCount).toBe(0);
      expect(payload.nodeCount).toBe(1);
      expect(payload.warnings).toEqual([
        "Skipped image `https://example.com/remote.png`; only local relative image paths are supported.",
        "Skipped image `missing.png`; source image was not found.",
        "Skipped raw HTML; HTML import is not supported by markdown import v0.1.",
        "Skipped fenced code block; code nodes are not supported by markdown import v0.1."
      ]);
      expect(await runCli(["validate", targetDir])).toBe(0);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("fails markdown import for unsupported sources and unsafe targets", async () => {
    const parent = await mkdtemp(join(tmpdir(), "prd-cli-import-md-fail-"));
    const sourcePath = join(parent, "source.md");
    const targetDir = join(parent, "target");
    const nonEmptyDir = join(parent, "non-empty");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await writeFile(sourcePath, "# Safe Source", "utf8");
      await mkdir(nonEmptyDir, { recursive: true });
      await writeFile(join(nonEmptyDir, "existing.txt"), "keep", "utf8");

      expect(await runCli(["import", "html", sourcePath, "--out", targetDir])).toBe(1);
      expect(await runCli(["import", "markdown", sourcePath, "--out", nonEmptyDir])).toBe(1);

      const messages = errorSpy.mock.calls.map(([value]) => String(value));
      expect(messages).toContain(
        'Unsupported import source "html". Supported import sources: markdown, images.'
      );
      expect(messages).toContain(`Target directory is not empty: ${nonEmptyDir}`);
      await expect(readdir(targetDir)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readdir(nonEmptyDir)).toEqual(["existing.txt"]);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("imports ordered images into a valid comic package", async () => {
    const parent = await mkdtemp(join(tmpdir(), "prd-cli-import-images-comic-"));
    const sourceDir = join(parent, "comic-pages");
    const targetDir = join(parent, "comic-prd");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      await mkdir(sourceDir, { recursive: true });
      await writeFile(
        join(sourceDir, "page-10.svg"),
        "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
        "utf8"
      );
      await writeFile(
        join(sourceDir, "page-2.svg"),
        "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
        "utf8"
      );
      await writeFile(join(sourceDir, "notes.txt"), "skip me", "utf8");

      expect(
        await runCli(["import", "images", sourceDir, "--profile", "comic", "--out", targetDir])
      ).toBe(0);
      expect(await runCli(["validate", targetDir])).toBe(0);

      const manifest = JSON.parse(await readFile(join(targetDir, "manifest.json"), "utf8")) as {
        profile: string;
        title: string;
        assets: Array<{ id: string; href: string; type: string }>;
      };
      const root = JSON.parse(await readFile(join(targetDir, "content/root.json"), "utf8")) as {
        profile: string;
        type: string;
        panels: Array<{ id: string; asset: string; alt: string }>;
      };

      expect(manifest).toMatchObject({
        profile: "comic",
        title: "Comic Pages",
        assets: [
          {
            id: "panel-1-art",
            href: "assets/panels/page-2.svg",
            type: "image/svg+xml"
          },
          {
            id: "panel-2-art",
            href: "assets/panels/page-10.svg",
            type: "image/svg+xml"
          }
        ]
      });
      expect(root.profile).toBe("comic");
      expect(root.type).toBe("comic");
      expect(root.panels.map((panel) => panel.asset)).toEqual(["panel-1-art", "panel-2-art"]);
      expect((await readdir(join(targetDir, "assets/panels"))).sort()).toEqual([
        "page-10.svg",
        "page-2.svg"
      ]);
      expect(String(logSpy.mock.calls[0]?.[0])).toMatchInlineSnapshot(`
        "Imported PRD package: ${targetDir}
        profile: comic
        title: Comic Pages
        entry: content/root.json
        images: 2
        assets: 2
        skipped files:
        - notes.txt
        warnings:
        - Skipped \`notes.txt\`; unsupported image extension.
        next:
        - prd validate ${targetDir}
        - prd inspect ${targetDir}
        - prd pack ${targetDir} --out ${targetDir}.prd"
      `);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("imports ordered images into a valid storyboard package with JSON output and overrides", async () => {
    const parent = await mkdtemp(join(tmpdir(), "prd-cli-import-images-storyboard-"));
    const sourceDir = join(parent, "frames");
    const targetDir = join(parent, "storyboard-prd");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      await mkdir(sourceDir, { recursive: true });
      await writeFile(join(sourceDir, "frame-1.png"), "png", "utf8");
      await writeFile(join(sourceDir, "frame-2.webp"), "webp", "utf8");

      expect(
        await runCli([
          "import",
          "images",
          sourceDir,
          "--profile",
          "storyboard",
          "--out",
          targetDir,
          "--title",
          "Custom Board",
          "--id",
          "urn:prd:test:custom-board",
          "--json"
        ])
      ).toBe(0);
      expect(await runCli(["validate", targetDir])).toBe(0);

      const root = JSON.parse(await readFile(join(targetDir, "content/root.json"), "utf8")) as {
        frames: Array<{ id: string; asset: string; notes: string }>;
      };
      expect(root.frames.map((frame) => frame.asset)).toEqual(["frame-1-art", "frame-2-art"]);
      expect(root.frames.every((frame) => frame.notes.length > 0)).toBe(true);

      expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchInlineSnapshot(`
        {
          "assetCount": 2,
          "entry": "content/root.json",
          "files": [
            "manifest.json",
            "content/root.json",
            "assets/frames/frame-1.png",
            "assets/frames/frame-2.webp",
          ],
          "id": "urn:prd:test:custom-board",
          "imageCount": 2,
          "imported": true,
          "profile": "storyboard",
          "skippedFiles": [],
          "sourceDir": "${sourceDir}",
          "targetDir": "${targetDir}",
          "title": "Custom Board",
          "warnings": [],
        }
      `);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("fails image import for unsupported profiles, empty sources, missing sources, and unsafe targets", async () => {
    const parent = await mkdtemp(join(tmpdir(), "prd-cli-import-images-fail-"));
    const sourceDir = join(parent, "images");
    const emptyDir = join(parent, "empty");
    const nonEmptyDir = join(parent, "non-empty");
    const missingDir = join(parent, "missing");
    const targetDir = join(parent, "target");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await mkdir(sourceDir, { recursive: true });
      await mkdir(emptyDir, { recursive: true });
      await mkdir(nonEmptyDir, { recursive: true });
      await writeFile(
        join(sourceDir, "page-1.svg"),
        "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
        "utf8"
      );
      await writeFile(join(nonEmptyDir, "existing.txt"), "keep", "utf8");

      expect(
        await runCli(["import", "images", sourceDir, "--profile", "resume", "--out", targetDir])
      ).toBe(1);
      expect(
        await runCli(["import", "images", emptyDir, "--profile", "comic", "--out", targetDir])
      ).toBe(1);
      expect(
        await runCli(["import", "images", missingDir, "--profile", "comic", "--out", targetDir])
      ).toBe(1);
      expect(
        await runCli([
          "import",
          "images",
          sourceDir,
          "--profile",
          "comic",
          "--out",
          nonEmptyDir
        ])
      ).toBe(1);
      expect(await runCli(["import", "images", sourceDir, "--out", targetDir])).toBe(1);

      const messages = errorSpy.mock.calls.map(([value]) => String(value));
      expect(messages).toContain(
        'Unsupported image import profile "resume". Supported profiles: comic, storyboard.'
      );
      expect(messages).toContain(`No supported image files found in source directory: ${emptyDir}`);
      expect(messages).toContain(`Target directory is not empty: ${nonEmptyDir}`);
      expect(messages).toContain(
        "Missing required image import profile. Use --profile <comic|storyboard>."
      );
      expect(messages.some((message) => message.includes(missingDir))).toBe(true);
      await expect(readdir(targetDir)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readdir(nonEmptyDir)).toEqual(["existing.txt"]);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("returns exit code 0 on valid package and 1 on invalid package for validate", async () => {
    const validRoot = await createMinimalValidPackageFixture();
    const invalidRoot = await createInvalidPackageFixture();
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      expect(await runCli(["validate", validRoot])).toBe(0);
      expect(await runCli(["validate", invalidRoot])).toBe(1);
    } finally {
      await rm(validRoot, { recursive: true, force: true });
      await rm(invalidRoot, { recursive: true, force: true });
    }
  });

  it("matches snapshots for validate text output and validate --json shape", async () => {
    const root = await createMinimalValidPackageFixture();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      expect(await runCli(["validate", root])).toBe(0);
      expect(await runCli(["validate", root, "--json"])).toBe(0);

      const textOutput = String(logSpy.mock.calls[0]?.[0]);
      const jsonOutput = JSON.parse(String(logSpy.mock.calls[1]?.[0])) as Record<string, unknown>;

      expect(textOutput).toMatchInlineSnapshot(`
        "valid: yes
        profile: general-document
        profileStatus: canonical-core
        entry: content/root.json
        localization: en-US
        errors:
        - none
        warnings:
        - none"
      `);
      expect(jsonOutput).toMatchInlineSnapshot(`
        {
          "entry": "content/root.json",
          "errors": [],
          "manifest": {
            "entry": "content/root.json",
            "localizationDefaultLocale": "en-US",
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
      await rm(root, { recursive: true, force: true });
    }
  });

  it("matches snapshots for inspect text output and inspect --json shape", async () => {
    const root = await createMinimalValidPackageFixture();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      expect(await runCli(["inspect", root])).toBe(0);
      expect(await runCli(["inspect", root, "--json"])).toBe(0);

      const textOutput = String(logSpy.mock.calls[0]?.[0]);
      const jsonOutput = JSON.parse(String(logSpy.mock.calls[1]?.[0])) as {
        inspection: {
          totalBytes: number;
        };
      };

      expect(textOutput).toContain("inspection:");
      expect(textOutput).toContain("- source: directory");
      expect(textOutput).toContain("- files: 4");
      expect(textOutput).toContain("- assets: 1");
      expect(textOutput).toContain("- attachments: 1");
      expect(textOutput).toContain("- locales: 1");
      expect(textOutput).toContain("- entry mode: structured-json");
      expect(textOutput).toContain("- reference load mode: eager-whole-package");

      expect(jsonOutput).toMatchInlineSnapshot(
        {
          inspection: {
            totalBytes: expect.any(Number)
          }
        },
        `
        {
          "entry": "content/root.json",
          "errors": [],
          "inspection": {
            "assetCount": 1,
            "attachmentCount": 1,
            "collectionCount": 0,
            "entryKind": "structured-json",
            "fileCount": 4,
            "hasSeriesMembership": false,
            "localeCount": 1,
            "localizedAlternateEntries": false,
            "localizedResources": false,
            "referenceLoadMode": "eager-whole-package",
            "segmentation": "none",
            "sourceKind": "directory",
            "totalBytes": Any<Number>,
          },
          "manifest": {
            "entry": "content/root.json",
            "localizationDefaultLocale": "en-US",
            "profile": "general-document",
          },
          "profileInfo": {
            "supportClass": "canonical-core",
          },
          "valid": true,
          "warnings": [],
        }
      `
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
