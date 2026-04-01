import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { validateManifestObject, validatePackage } from "./index.js";
import {
  validatePackage as validatePackageAtPath,
  validatePackageDirectory,
  validatePrdArchive
} from "./node.js";

const validManifest = {
  prdVersion: "1.0",
  manifestVersion: "1.0",
  id: "urn:test:document-basic",
  profile: "general-document",
  title: "Document Basic",
  entry: "content/root.json",
  assets: [
    {
      id: "cover",
      href: "assets/images/cover.svg",
      type: "image/svg+xml"
    }
  ]
};

const validContentRoot = {
  schemaVersion: "1.0",
  profile: "general-document",
  type: "document",
  id: "document-basic",
  title: "Document Basic",
  children: [
    {
      type: "heading",
      level: 1,
      text: "Hello PRD"
    },
    {
      type: "image",
      asset: "cover",
      alt: "Cover image"
    }
  ]
};

describe("validateManifestObject", () => {
  it("normalizes the legacy responsive-document alias", () => {
    const result = validateManifestObject({
      ...validManifest,
      profile: "responsive-document"
    });

    expect(result.valid).toBe(true);
    expect(result.manifest?.profile).toBe("general-document");
    expect(result.warnings[0]?.code).toBe("profile-alias");
  });

  it("rejects HTML-first entry targets for general-document", () => {
    const result = validateManifestObject({
      ...validManifest,
      entry: "content/index.html"
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "general-document-entry-format"
    );
  });

  it("warns when general-document still declares the legacy HTML capability", () => {
    const result = validateManifestObject({
      ...validManifest,
      compatibility: {
        capabilities: {
          required: ["base-entry-html"]
        }
      }
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.code)).toContain(
      "general-document-html-capability-legacy"
    );
  });
});

describe("validatePackage", () => {
  it("accepts a valid structured general-document package", () => {
    const result = validatePackage({
      "manifest.json": strToU8(JSON.stringify(validManifest)),
      "content/root.json": strToU8(JSON.stringify(validContentRoot)),
      "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
    });

    expect(result.valid).toBe(true);
  });

  it("fails when structured content references an undeclared asset", () => {
    const result = validatePackage({
      "manifest.json": strToU8(JSON.stringify(validManifest)),
      "content/root.json": strToU8(
        JSON.stringify({
          ...validContentRoot,
          children: [
            {
              type: "image",
              asset: "missing-asset",
              alt: "Broken"
            }
          ]
        })
      ),
      "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("image-asset-missing");
  });
});

describe("node validators", () => {
  it("validates a source directory, a .prd archive, and a generic path", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-validator-"));
    const contentDir = join(root, "content");
    const assetDir = join(root, "assets/images");

    await mkdir(contentDir, { recursive: true });
    await mkdir(assetDir, { recursive: true });

    await writeFile(join(root, "manifest.json"), JSON.stringify(validManifest), "utf8");
    await writeFile(join(contentDir, "root.json"), JSON.stringify(validContentRoot), "utf8");
    await writeFile(
      join(assetDir, "cover.svg"),
      "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
      "utf8"
    );

    const dirResult = await validatePackageDirectory(root);
    expect(dirResult.valid).toBe(true);

    const genericDirResult = await validatePackageAtPath(root);
    expect(genericDirResult.valid).toBe(true);

    const archivePath = join(root, "example.prd");
    const archiveBytes = zipSync({
      "manifest.json": strToU8(JSON.stringify(validManifest)),
      "content/root.json": strToU8(JSON.stringify(validContentRoot)),
      "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
    });

    await writeFile(archivePath, Buffer.from(archiveBytes));

    const archiveResult = await validatePrdArchive(archivePath);
    expect(archiveResult.valid).toBe(true);

    const genericArchiveResult = await validatePackageAtPath(archivePath);
    expect(genericArchiveResult.valid).toBe(true);

    await rm(root, { recursive: true, force: true });
  });
});
