/**
 * Company: EonHive Inc.
 * Title: Release Registry Audit Script
 * Purpose: Verify published PRD npm metadata is consumer-safe after release.
 * Author: Stan Nesi
 * Created: 2026-04-23
 * Updated: 2026-04-23
 * Notes: Vibe coded with Codex.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const npmRegistryUrl = "https://registry.npmjs.org";
const expectedDistTag = "latest";
const concreteInternalDependencyRangePattern =
  /^(?:[\^~])?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export const releaseRegistryAuditContractVersion =
  "prd-release-registry-audit-v0.1";
export const defaultReleaseRegistryAuditSummaryPath =
  "examples/dist/release-registry-audit-summary.json";
export const auditedPublicPackages = [
  { directory: "packages/prd-types", name: "@eonhive/prd-types" },
  { directory: "packages/prd-validator", name: "@eonhive/prd-validator" },
  { directory: "packages/prd-packager", name: "@eonhive/prd-packager" },
  { directory: "packages/prd-cli", name: "@eonhive/prd-cli" }
];

function addAction(summary, action) {
  if (!summary.actions.includes(action)) {
    summary.actions.push(action);
  }
}

function markFailed(summary, action) {
  summary.status = "failed";
  addAction(summary, action);
}

async function readJson(repoRoot, relativePath) {
  const raw = await readFile(join(repoRoot, relativePath), "utf8");
  return JSON.parse(raw);
}

async function loadPackageMetadata(repoRoot) {
  const packages = [];

  for (const pkg of auditedPublicPackages) {
    const manifest = await readJson(repoRoot, join(pkg.directory, "package.json"));
    packages.push({
      directory: pkg.directory,
      name: manifest.name,
      version: manifest.version
    });
  }

  return packages;
}

async function fetchRegistryDocument(packageName, fetchImpl) {
  const response = await fetchImpl(
    `${npmRegistryUrl}/${encodeURIComponent(packageName)}`,
    {
      headers: {
        accept: "application/json"
      }
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to query npm registry for ${packageName}: HTTP ${response.status}`
    );
  }

  return response.json();
}

function collectDependencyEntries(manifest) {
  return [
    ...Object.entries(manifest.dependencies ?? {}).map(([name, value]) => ({
      field: "dependencies",
      name,
      value
    })),
    ...Object.entries(manifest.optionalDependencies ?? {}).map(([name, value]) => ({
      field: "optionalDependencies",
      name,
      value
    }))
  ];
}

function collectDependencyIssues(entries) {
  const issues = [];

  for (const entry of entries) {
    if (String(entry.value).startsWith("workspace:")) {
      issues.push({
        ...entry,
        code: "workspace-protocol"
      });
      continue;
    }

    if (
      entry.name.startsWith("@eonhive/prd-") &&
      !concreteInternalDependencyRangePattern.test(String(entry.value))
    ) {
      issues.push({
        ...entry,
        code: "invalid-internal-range"
      });
    }
  }

  return issues;
}

export async function runReleaseRegistryAudit(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const summaryPath = resolve(
    repoRoot,
    options.summaryPath ?? defaultReleaseRegistryAuditSummaryPath
  );
  const fetchImpl = options.fetchImpl ?? fetch;
  const summary = {
    contractVersion: releaseRegistryAuditContractVersion,
    generatedAt: new Date().toISOString(),
    status: "passed",
    expectedDistTag,
    checks: {
      packageTargets: {
        status: "pending",
        packages: [],
        versionSet: []
      }
    },
    packages: [],
    actions: []
  };

  await mkdir(dirname(summaryPath), { recursive: true });

  try {
    const packages = await loadPackageMetadata(repoRoot);
    const expectedPackages = auditedPublicPackages.map(({ directory, name }) => ({
      directory,
      name
    }));
    const actualPackages = packages.map(({ directory, name }) => ({
      directory,
      name
    }));
    const versionSet = [...new Set(packages.map((pkg) => pkg.version))].sort();
    summary.checks.packageTargets.packages = packages;
    summary.checks.packageTargets.versionSet = versionSet;

    if (
      JSON.stringify(actualPackages) !== JSON.stringify(expectedPackages) ||
      versionSet.length !== 1
    ) {
      summary.checks.packageTargets.status = "failed";
      markFailed(
        summary,
        "Align the public publish set and keep the released PRD toolchain on one version before rerunning registry audit."
      );
    } else {
      summary.checks.packageTargets.status = "passed";
    }

    for (const pkg of packages) {
      const packageSummary = {
        name: pkg.name,
        expectedVersion: pkg.version,
        status: "passed",
        published: false,
        latestVersion: null,
        deprecated: null,
        dependencyIssues: []
      };

      try {
        const registryDocument = await fetchRegistryDocument(pkg.name, fetchImpl);

        if (!registryDocument) {
          packageSummary.status = "failed";
          packageSummary.errorMessage = "Package not found in npm registry.";
          markFailed(
            summary,
            `Publish ${pkg.name}@${pkg.version} before treating the release as shipped.`
          );
          summary.packages.push(packageSummary);
          continue;
        }

        const publishedManifest = registryDocument.versions?.[pkg.version] ?? null;
        packageSummary.latestVersion = registryDocument["dist-tags"]?.[expectedDistTag] ?? null;

        if (!publishedManifest) {
          packageSummary.status = "failed";
          packageSummary.errorMessage =
            `Expected version ${pkg.version} is not published in npm registry metadata.`;
          markFailed(
            summary,
            `Publish ${pkg.name}@${pkg.version} on npm before rerunning registry audit.`
          );
          summary.packages.push(packageSummary);
          continue;
        }

        packageSummary.published = true;
        packageSummary.deprecated = publishedManifest.deprecated ?? null;

        if (packageSummary.latestVersion !== pkg.version) {
          packageSummary.status = "failed";
          packageSummary.errorMessage =
            `Dist-tag "${expectedDistTag}" resolves to ${packageSummary.latestVersion ?? "null"} instead of ${pkg.version}.`;
          markFailed(
            summary,
            `Promote ${pkg.name}@${pkg.version} to npm dist-tag "${expectedDistTag}" before rerunning consumer verification.`
          );
        }

        const dependencyIssues = collectDependencyIssues(
          collectDependencyEntries(publishedManifest)
        );
        packageSummary.dependencyIssues = dependencyIssues;

        if (dependencyIssues.length > 0) {
          packageSummary.status = "failed";
          markFailed(
            summary,
            `Republish ${pkg.name}@${pkg.version} with consumer-safe dependency metadata; published npm manifest still contains workspace or invalid internal ranges.`
          );
        }
      } catch (error) {
        packageSummary.status = "failed";
        packageSummary.errorMessage =
          error instanceof Error ? error.message : String(error);
        markFailed(
          summary,
          "Resolve the npm registry audit failure before treating the release as consumer-safe."
        );
      }

      summary.packages.push(packageSummary);
    }
  } catch (error) {
    markFailed(
      summary,
      "Fix the registry audit failure before continuing to post-publish consumer smoke."
    );
    summary.unhandledError = error instanceof Error ? error.message : String(error);
  } finally {
    await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }

  return {
    ...summary,
    summaryPath
  };
}

const currentPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;

if (invokedPath === currentPath) {
  const result = await runReleaseRegistryAudit();
  console.log(`RELEASE_REGISTRY_AUDIT_SUMMARY_FILE: ${result.summaryPath}`);
  if (result.status !== "passed") {
    process.exitCode = 1;
  }
}
