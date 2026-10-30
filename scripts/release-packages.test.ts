/**
 * Company: EonHive Inc. | Title: Release Catalog Tests
 * Purpose: Verify public target coverage, independent version pins and workspace identity checks.
 * Author: Stan Nesi | Created: 2026-10-30 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildWorkspacePackageSpecs,
  loadReleasePackageMetadata,
  publicReleasePackages
} from "./release-packages.mjs";
import { publishablePreviewPackages } from "./release-publish-preflight.mjs";
import { auditedPublicPackages } from "./release-registry-audit.mjs";
import { publishedPrdPackages } from "./external-consumer-smoke.mjs";
import { publishablePackages } from "./release-smoke.mjs";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true }))
  );
});

async function workspace() {
  const root = await mkdtemp(join(tmpdir(), "prd release catalog "));
  directories.push(root);
  for (const pkg of publicReleasePackages) {
    await mkdir(join(root, pkg.directory), { recursive: true });
    await writeFile(
      join(root, pkg.directory, "package.json"),
      JSON.stringify({
        name: pkg.name,
        version: pkg.name === "@eonhive/prd-converter" ? "0.2.0" : "0.1.1"
      })
    );
  }
  return root;
}

describe("public release catalog", () => {
  it("matches the actual public Changesets workspace rather than silently omitting a package", async () => {
    const config = JSON.parse(await readFile(".changeset/config.json", "utf8"));
    const actual: string[] = [];
    for (const parent of ["packages", "apps"]) {
      for (const entry of await readdir(parent, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        let manifest;
        try {
          manifest = JSON.parse(
            await readFile(join(parent, entry.name, "package.json"), "utf8")
          );
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw error;
        }
        if (!manifest.private && !config.ignore.includes(manifest.name))
          actual.push(manifest.name);
      }
    }
    expect(actual.sort()).toEqual(
      publicReleasePackages.map((pkg) => pkg.name).sort()
    );
  });

  it("keeps the five dependency-ordered public targets aligned across every check", () => {
    const names = [
      "@eonhive/prd-types",
      "@eonhive/prd-validator",
      "@eonhive/prd-packager",
      "@eonhive/prd-converter",
      "@eonhive/prd-cli"
    ];
    expect(publicReleasePackages.map((pkg) => pkg.name)).toEqual(names);
    expect(publishablePreviewPackages.map((pkg) => pkg.name)).toEqual(names);
    expect(auditedPublicPackages.map((pkg) => pkg.name)).toEqual(names);
    expect(publishedPrdPackages).toEqual(names);
    expect(publishablePackages.map((pkg) => pkg.name)).toEqual(names);
  });

  it("pins each package's actual version even in a workspace path with spaces", async () => {
    const root = await workspace();
    expect(await buildWorkspacePackageSpecs(root)).toEqual([
      "@eonhive/prd-types@0.1.1",
      "@eonhive/prd-validator@0.1.1",
      "@eonhive/prd-packager@0.1.1",
      "@eonhive/prd-converter@0.2.0",
      "@eonhive/prd-cli@0.1.1"
    ]);
    expect(await loadReleasePackageMetadata(root)).toHaveLength(5);
  });

  it.each([undefined, ""])(
    "rejects a missing declared converter version %#",
    async (version) => {
      const root = await workspace();
      await writeFile(
        join(root, "packages/prd-converter/package.json"),
        JSON.stringify({ name: "@eonhive/prd-converter", version })
      );
      await expect(buildWorkspacePackageSpecs(root)).rejects.toThrow(
        "Missing package version"
      );
    }
  );

  it.each(["latest", "^0.2.0", "0.2.0-beta.1", "0.2.0+build", "01.2.0", "0.2.0\n", "9007199254740992.1.1"])(
    "rejects ambiguous release version %j before building an npm spec",
    async (version) => {
      const root = await workspace();
      await writeFile(join(root, "packages/prd-converter/package.json"),
        JSON.stringify({ name: "@eonhive/prd-converter", version }));
      await expect(buildWorkspacePackageSpecs(root)).rejects.toThrow("stable package version");
    }
  );

  it("refuses to build install specs for a renamed public target", async () => {
    const root = await workspace();
    await writeFile(
      join(root, "packages/prd-converter/package.json"),
      JSON.stringify({ name: "@other/replacement", version: "0.2.0" })
    );
    await expect(buildWorkspacePackageSpecs(root)).rejects.toThrow(
      "Unexpected public package name"
    );
  });
});
