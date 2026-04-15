import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
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
    expect(errorSpy).toHaveBeenCalledWith("Usage: prd <pack|validate|inspect> ...");
  });

  it("reports usage/help errors for missing command args", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await runCli(["pack"])).toBe(1);
    expect(await runCli(["validate"])).toBe(1);
    expect(await runCli(["inspect"])).toBe(1);

    const messages = errorSpy.mock.calls.map(([value]) => String(value));
    expect(messages).toContain("Usage: prd pack <sourceDir> --out <file.prd>");
    expect(messages).toContain("Usage: prd validate <path> [--json]");
    expect(messages).toContain("Usage: prd inspect <path> [--json]");
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
