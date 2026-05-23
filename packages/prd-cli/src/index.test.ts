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
    expect(errorSpy).toHaveBeenCalledWith("Usage: prd <init|pack|validate|inspect> ...");
  });

  it("reports usage/help errors for missing command args", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await runCli(["init"])).toBe(1);
    expect(await runCli(["pack"])).toBe(1);
    expect(await runCli(["validate"])).toBe(1);
    expect(await runCli(["inspect"])).toBe(1);

    const messages = errorSpy.mock.calls.map(([value]) => String(value));
    expect(messages).toContain(
      "Usage: prd init <targetDir> [--profile <general-document|comic|storyboard>] [--title <title>] [--id <id>] [--json]"
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
