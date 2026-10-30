/**
 * Company: EonHive Inc. | Title: Public Release Package Catalog
 * Purpose: Keep current release checks on the same independently versioned public package set.
 * Author: Stan Nesi | Created: 2026-10-30 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const publicReleasePackages = [
  { directory: "packages/prd-types", name: "@eonhive/prd-types" },
  { directory: "packages/prd-validator", name: "@eonhive/prd-validator" },
  { directory: "packages/prd-packager", name: "@eonhive/prd-packager" },
  { directory: "packages/prd-converter", name: "@eonhive/prd-converter" },
  { directory: "packages/prd-cli", name: "@eonhive/prd-cli" }
];

export async function loadReleasePackageMetadata(repoRoot) {
  const packages = [];
  for (const target of publicReleasePackages) {
    const manifest = JSON.parse(
      await readFile(join(repoRoot, target.directory, "package.json"), "utf8")
    );
    if (typeof manifest.version !== "string" || !manifest.version.trim()) {
      throw new Error(
        `Missing package version in ${target.directory}/package.json.`
      );
    }
    const parts = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(manifest.version);
    if (manifest.version.trim() !== manifest.version || !parts || !parts.slice(1).every(part => Number.isSafeInteger(Number(part)))) {
      throw new Error(`Expected a stable package version in ${target.directory}/package.json.`);
    }
    packages.push({
      directory: target.directory,
      name: manifest.name,
      version: manifest.version
    });
  }
  return packages;
}

export async function buildWorkspacePackageSpecs(repoRoot) {
  const packages = await loadReleasePackageMetadata(repoRoot);
  for (let index = 0; index < packages.length; index++) {
    if (packages[index].name !== publicReleasePackages[index].name) {
      throw new Error(
        `Unexpected public package name in ${packages[index].directory}.`
      );
    }
  }
  return packages.map(({ name, version }) => `${name}@${version}`);
}
