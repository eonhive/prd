import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { validateManifestObject, validatePackageFiles } from "./index.js";
import { validatePackageDirectory, validatePrdArchive } from "./node.js";

describe("validateManifestObject", () => {
  it("normalizes the legacy responsive-document alias", () => {
    const result = validateManifestObject({
      prdVersion: "1.0",
      manifestVersion: "1.0",
      id: "urn:test:alias",
      profile: "responsive-document",
      title: "Alias",
      entry: "content/index.html"
    });

    expect(result.valid).toBe(true);
    expect(result.manifest?.profile).toBe("general-document");
    expect(result.warnings[0]?.code).toBe("profile-alias");
  });

  it("fails malformed localization declarations", () => {
    const result = validateManifestObject({
      prdVersion: "1.0",
      manifestVersion: "1.0",
      id: "urn:test:bad-locale",
      profile: "general-document",
      title: "Bad Locale",
      entry: "content/index.html",
      localization: {
        defaultLocale: "en-US",
        availableLocales: ["fr-FR"]
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "localization-default-missing"
    );
  });
});

describe("validatePackageFiles", () => {
  it("fails when the entry path is missing", () => {
    const result = validatePackageFiles({
      "manifest.json": strToU8(
        JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:missing-entry",
          profile: "general-document",
          title: "Missing Entry",
          entry: "content/index.html"
        })
      )
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("entry-missing");
  });
});

describe("node validators", () => {
  it("validates a source directory and a .prd archive", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-validator-"));
    const contentDir = join(root, "content");
    await mkdir(contentDir, { recursive: true });
    await writeFile(
      join(root, "manifest.json"),
      JSON.stringify({
        prdVersion: "1.0",
        manifestVersion: "1.0",
        id: "urn:test:dir",
        profile: "general-document",
        title: "Directory Example",
        entry: "content/index.html"
      }),
      "utf8"
    );
    await writeFile(
      join(contentDir, "index.html"),
      "<!doctype html><html><body>ok</body></html>",
      "utf8"
    );

    const dirResult = await validatePackageDirectory(root);
    expect(dirResult.valid).toBe(true);

    const archivePath = join(root, "example.prd");
    const bytes = zipSync({
      "manifest.json": strToU8(
        JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:archive",
          profile: "general-document",
          title: "Archive Example",
          entry: "content/index.html"
        })
      ),
      "content/index.html": strToU8(
        "<!doctype html><html><body>archive</body></html>"
      )
    });
    await writeFile(archivePath, Buffer.from(bytes));

    const archiveResult = await validatePrdArchive(archivePath);
    expect(archiveResult.valid).toBe(true);

    await rm(root, { recursive: true, force: true });
  });
});

