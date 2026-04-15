import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const thisDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(thisDir, "../../..");
const cliDistPath = resolve(repoRoot, "packages/prd-cli/dist/cli.js");

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

beforeAll(async () => {
  await execFileAsync("pnpm", ["--filter", "@eonhive/prd-cli", "build"], {
    cwd: repoRoot
  });
});

describe("built CLI binary end-to-end", () => {
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
});
