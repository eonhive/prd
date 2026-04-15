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
  it("executes pack, validate, and inspect against dist/cli.js", async () => {
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
});
