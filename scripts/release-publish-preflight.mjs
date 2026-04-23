/**
 * Company: EonHive Inc.
 * Title: Release Publish Preflight Script
 * Purpose: Verify npm token auth, org membership, package targets, and first-preview bootstrap state before CI publish.
 * Author: Stan Nesi
 * Created: 2026-04-22
 * Updated: 2026-04-22
 * Notes: Vibe coded with Codex.
 */

import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmRegistryUrl = "https://registry.npmjs.org";
const npmOrganization = "eonhive";
const previewVersion = "0.1.0";

export const releasePublishPreflightContractVersion =
  "prd-release-publish-preflight-v0.1";
export const defaultReleasePublishPreflightSummaryPath =
  "examples/dist/release-publish-preflight-summary.json";
export const publishablePreviewPackages = [
  { directory: "packages/prd-types", name: "@eonhive/prd-types" },
  { directory: "packages/prd-validator", name: "@eonhive/prd-validator" },
  { directory: "packages/prd-packager", name: "@eonhive/prd-packager" },
  { directory: "packages/prd-cli", name: "@eonhive/prd-cli" }
];

function formatCommand(command, args) {
  return [command, ...args].join(" ");
}

function normaliseCommandResult(result) {
  if (result == null) {
    return { stdout: "", stderr: "" };
  }

  if (typeof result === "string") {
    return { stdout: result, stderr: "" };
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function runCommand(command, args, options = {}) {
  const {
    cwd = process.cwd(),
    env
  } = options;

  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }

      const detail = stderr.trim() || stdout.trim();
      reject(
        new Error(
          signal == null
            ? `Command failed: ${formatCommand(command, args)} (exit ${code ?? "unknown"})${detail ? `\n${detail}` : ""}`
            : `Command failed: ${formatCommand(command, args)} (signal ${signal})${detail ? `\n${detail}` : ""}`
        )
      );
    });
  });
}

async function readJson(repoRoot, relativePath) {
  const raw = await readFile(join(repoRoot, relativePath), "utf8");
  return JSON.parse(raw);
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

async function fetchWhoAmI(npmToken, fetchImpl) {
  const response = await fetchImpl(`${npmRegistryUrl}/-/whoami`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${npmToken}`
    }
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `npm authentication failed with HTTP ${response.status}. Regenerate NPM_TOKEN from the authorized npm publisher account.`
    );
  }

  if (!response.ok) {
    throw new Error(
      `npm whoami failed with HTTP ${response.status}.`
    );
  }

  return response.json();
}

async function loadPackageMetadata(repoRoot) {
  const packages = [];

  for (const pkg of publishablePreviewPackages) {
    const manifest = await readJson(repoRoot, join(pkg.directory, "package.json"));
    packages.push({
      directory: pkg.directory,
      name: manifest.name,
      version: manifest.version
    });
  }

  return packages;
}

function addAction(summary, action) {
  if (!summary.actions.includes(action)) {
    summary.actions.push(action);
  }
}

function markFailed(summary, action) {
  summary.status = "failed";
  addAction(summary, action);
}

function buildPreflightNpmrc(npmToken) {
  return [
    `registry=${npmRegistryUrl}/`,
    `//registry.npmjs.org/:_authToken=${npmToken}`,
    "always-auth=true"
  ].join("\n");
}

function findMembershipRole(rawMembership, username) {
  const candidates = [username, `@${username}`];

  if (Array.isArray(rawMembership)) {
    for (const candidate of rawMembership) {
      if (candidate && typeof candidate === "object") {
        const candidateName = candidate.username ?? candidate.name;
        if (candidates.includes(candidateName)) {
          return candidate.role ?? candidate.value ?? null;
        }
      }
    }
    return null;
  }

  if (rawMembership && typeof rawMembership === "object") {
    for (const candidate of candidates) {
      if (typeof rawMembership[candidate] === "string") {
        return rawMembership[candidate];
      }
    }

    if (Array.isArray(rawMembership.users)) {
      return findMembershipRole(rawMembership.users, username);
    }
  }

  return null;
}

async function checkOrgMembership(options = {}) {
  const {
    npmToken,
    username,
    commandRunner = runCommand
  } = options;

  const scratchRoot = await mkdtemp(join(tmpdir(), "prd-release-preflight-"));
  const npmrcPath = join(scratchRoot, ".npmrc");

  try {
    await writeFile(npmrcPath, `${buildPreflightNpmrc(npmToken)}\n`, "utf8");
    const result = normaliseCommandResult(
      await commandRunner(
        npmCommand,
        ["org", "ls", npmOrganization, "--json"],
        {
          cwd: scratchRoot,
          env: {
            NPM_CONFIG_USERCONFIG: npmrcPath
          }
        }
      )
    );
    const membership = JSON.parse(result.stdout);
    const role = findMembershipRole(membership, username);

    if (!role) {
      throw new Error(
        `Authenticated user "${username}" was not found in npm org "${npmOrganization}".`
      );
    }

    return {
      organization: npmOrganization,
      role
    };
  } finally {
    if (process.env.KEEP_RELEASE_PREFLIGHT_SCRATCH !== "1") {
      await rm(scratchRoot, { recursive: true, force: true });
    }
  }
}

export async function runReleasePublishPreflight(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const summaryPath = resolve(
    repoRoot,
    options.summaryPath ?? defaultReleasePublishPreflightSummaryPath
  );
  const fetchImpl = options.fetchImpl ?? fetch;
  const commandRunner = options.commandRunner ?? runCommand;
  const npmToken = options.npmToken ?? process.env.NPM_TOKEN ?? "";

  const summary = {
    contractVersion: releasePublishPreflightContractVersion,
    generatedAt: new Date().toISOString(),
    status: "passed",
    organization: npmOrganization,
    previewVersion,
    checks: {
      token: {
        status: "pending"
      },
      npmAuth: {
        status: "pending",
        username: null
      },
      organizationMembership: {
        status: "pending",
        organization: npmOrganization,
        username: null,
        role: null
      },
      packageTargets: {
        status: "pending",
        expectedPackages: publishablePreviewPackages.map(({ directory, name }) => ({
          directory,
          name
        })),
        packages: [],
        versionSet: []
      },
      bootstrapMode: {
        status: "pending",
        previewEligible: false,
        bootstrapRequired: false,
        missingPackages: [],
        publishedPackages: []
      }
    },
    actions: []
  };

  await mkdir(dirname(summaryPath), { recursive: true });

  try {
    const packages = await loadPackageMetadata(repoRoot);
    const expectedPackages = publishablePreviewPackages.map(({ directory, name }) => ({
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

    if (JSON.stringify(actualPackages) !== JSON.stringify(expectedPackages)) {
      summary.checks.packageTargets.status = "failed";
      markFailed(
        summary,
        "Restore the expected publish set (@eonhive/prd-types, @eonhive/prd-validator, @eonhive/prd-packager, @eonhive/prd-cli) before rerunning Release."
      );
    } else {
      summary.checks.packageTargets.status = "passed";
    }

    const packageStatuses = [];
    for (const pkg of packages) {
      const registryDocument = await fetchRegistryDocument(pkg.name, fetchImpl);
      packageStatuses.push({
        ...pkg,
        published: registryDocument?.versions?.[pkg.version] != null
      });
    }

    const missingPackages = packageStatuses.filter((pkg) => !pkg.published);
    const publishedPackages = packageStatuses.filter((pkg) => pkg.published);
    const previewEligible =
      versionSet.length === 1 && versionSet[0] === previewVersion;

    summary.checks.bootstrapMode.missingPackages = missingPackages.map(
      ({ name, version }) => `${name}@${version}`
    );
    summary.checks.bootstrapMode.publishedPackages = publishedPackages.map(
      ({ name, version }) => `${name}@${version}`
    );
    summary.checks.bootstrapMode.previewEligible = previewEligible;
    summary.checks.bootstrapMode.bootstrapRequired = missingPackages.length > 0;

    if (missingPackages.length > 0 && !previewEligible) {
      summary.checks.bootstrapMode.status = "failed";
      markFailed(
        summary,
        "Missing preview packages must remain at 0.1.0 for the first bootstrap publish. Align package versions or switch to normal Changesets release flow."
      );
    } else {
      summary.checks.bootstrapMode.status = "passed";
    }

    if (!npmToken) {
      summary.checks.token.status = "failed";
      summary.checks.npmAuth.status = "skipped";
      summary.checks.organizationMembership.status = "skipped";
      markFailed(
        summary,
        "Set GitHub Actions secret NPM_TOKEN from the npm account that belongs to the eonhive org and can publish public @eonhive packages."
      );
      return {
        ...summary,
        summaryPath
      };
    }

    summary.checks.token.status = "passed";

    try {
      const whoAmI = await fetchWhoAmI(npmToken, fetchImpl);
      summary.checks.npmAuth.status = "passed";
      summary.checks.npmAuth.username = whoAmI.username ?? null;
      summary.checks.organizationMembership.username = whoAmI.username ?? null;
    } catch (error) {
      summary.checks.npmAuth.status = "failed";
      summary.checks.npmAuth.errorMessage =
        error instanceof Error ? error.message : String(error);
      summary.checks.organizationMembership.status = "skipped";
      markFailed(
        summary,
        "Regenerate NPM_TOKEN from the authorized npm publisher account and update the GitHub Actions secret before rerunning Release."
      );
      return {
        ...summary,
        summaryPath
      };
    }

    try {
      const membership = await checkOrgMembership({
        npmToken,
        username: summary.checks.npmAuth.username,
        commandRunner
      });
      summary.checks.organizationMembership.status = "passed";
      summary.checks.organizationMembership.role = membership.role;
    } catch (error) {
      summary.checks.organizationMembership.status = "failed";
      summary.checks.organizationMembership.errorMessage =
        error instanceof Error ? error.message : String(error);
      markFailed(
        summary,
        "Confirm the NPM_TOKEN owner belongs to the eonhive npm org and has rights to publish public @eonhive packages."
      );
    }
  } catch (error) {
    markFailed(
      summary,
      "Fix the release publish preflight failure before rerunning the Release workflow."
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
  const result = await runReleasePublishPreflight();
  console.log(`RELEASE_PUBLISH_PREFLIGHT_SUMMARY_FILE: ${result.summaryPath}`);
  if (result.status !== "passed") {
    process.exitCode = 1;
  }
}
