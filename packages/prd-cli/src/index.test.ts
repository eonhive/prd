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

  it("emits stable JSON keys for validate --json", async () => {
    const root = await createMinimalValidPackageFixture();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      const exitCode = await runCli(["validate", root, "--json"]);
      expect(exitCode).toBe(0);

      const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0])) as {
        valid: boolean;
        manifest: { profile: string };
        profileInfo: { supportClass: string };
        entry: string;
      };

      expect(payload.valid).toBe(true);
      expect(payload.manifest.profile).toBe("general-document");
      expect(typeof payload.profileInfo.supportClass).toBe("string");
      expect(payload.entry).toBe("content/root.json");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("emits stable JSON keys for inspect --json including inspection metrics", async () => {
    const root = await createMinimalValidPackageFixture();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      const exitCode = await runCli(["inspect", root, "--json"]);
      expect(exitCode).toBe(0);

      const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0])) as {
        valid: boolean;
        manifest: { profile: string };
        profileInfo: { supportClass: string };
        entry: string;
        inspection: {
          sourceKind: string;
          fileCount: number;
          totalBytes: number;
          assetCount: number;
          attachmentCount: number;
          localeCount: number;
          collectionCount: number;
          entryKind: string;
          segmentation: string;
          referenceLoadMode: string;
        };
      };

      expect(payload.valid).toBe(true);
      expect(payload.manifest.profile).toBe("general-document");
      expect(typeof payload.profileInfo.supportClass).toBe("string");
      expect(payload.entry).toBe("content/root.json");
      expect(payload.inspection.sourceKind).toBe("directory");
      expect(payload.inspection.fileCount).toBe(4);
      expect(payload.inspection.totalBytes).toBeGreaterThan(0);
      expect(payload.inspection.assetCount).toBe(1);
      expect(payload.inspection.attachmentCount).toBe(1);
      expect(payload.inspection.localeCount).toBe(1);
      expect(payload.inspection.collectionCount).toBe(0);
      expect(payload.inspection.entryKind).toBe("structured-json");
      expect(typeof payload.inspection.segmentation).toBe("string");
      expect(payload.inspection.referenceLoadMode).toBe("eager-whole-package");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps deterministic text order for validate and inspect blocks", async () => {
    const root = await createMinimalValidPackageFixture();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      const validateExitCode = await runCli(["validate", root]);
      const inspectExitCode = await runCli(["inspect", root]);
      expect(validateExitCode).toBe(0);
      expect(inspectExitCode).toBe(0);

      const validateOutput = String(logSpy.mock.calls[0]?.[0]).split("\n");
      const expectedPrefix = [
        "valid:",
        "profile:",
        "profileStatus:",
        "entry:",
        "localization:",
        "errors:",
        "warnings:"
      ];

      let previousIndex = -1;
      for (const prefix of expectedPrefix) {
        const nextIndex = validateOutput.findIndex(
          (line, index) => index > previousIndex && line.startsWith(prefix)
        );
        expect(nextIndex).toBeGreaterThan(previousIndex);
        previousIndex = nextIndex;
      }

      const inspectOutput = String(logSpy.mock.calls[1]?.[0]);
      expect(inspectOutput).toContain("inspection:");
      expect(inspectOutput.indexOf("warnings:")).toBeLessThan(
        inspectOutput.indexOf("inspection:")
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
