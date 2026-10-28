/**
 * Company: EonHive Inc.
 * Title: Consumer Authoring Smoke Checks
 * Purpose: Verify installed CLI authoring outputs and archive round trips.
 * Author: Stan Nesi
 * Created: 2026-10-28
 * Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const profiles = ["general-document", "comic", "storyboard"];

export function requiresAuthoringSmoke(version) {
  const parts = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.exec(version);
  if (!parts) {
    throw new Error("Consumer smoke requires a stable CLI version.");
  }

  // The queued authoring changesets first ship in CLI 0.2.0.
  return Number(parts[1]) > 0 || Number(parts[2]) >= 2;
}

function cliStep(title, args, verify) {
  return {
    title,
    command: npxCommand,
    args: ["--no-install", "prd", ...args],
    capture: Boolean(verify),
    verify
  };
}

function verifyValidation(output, profile) {
  const result = JSON.parse(output);
  assert.equal(result.valid, true, "Consumer output must validate.");
  assert.equal(result.manifest?.profile, profile, "Consumer profile must match.");
  assert.equal(result.entry, "content/root.json");
  assert.deepEqual(result.errors, []);
  return result;
}

async function verifyAuthoredPackage(scenario) {
  const manifest = JSON.parse(
    await readFile(join(scenario.directory, "manifest.json"), "utf8")
  );
  const root = JSON.parse(
    await readFile(join(scenario.directory, "content/root.json"), "utf8")
  );
  assert.equal(manifest.profile, scenario.profile);
  assert.equal(manifest.entry, "content/root.json");
  assert.equal(root.profile, scenario.profile);

  if (!scenario.images) {
    return;
  }

  assert.equal(manifest.assets?.length, scenario.images.length);
  let references;
  if (scenario.profile === "comic") {
    references = root.panels;
  } else if (scenario.profile === "storyboard") {
    references = root.frames;
  } else {
    references = root.children.filter((node) => node.type === "image");
  }
  assert.deepEqual(
    references.map((node) => node.asset),
    manifest.assets.map((asset) => asset.id)
  );

  for (const [index, image] of scenario.images.entries()) {
    const copied = await readFile(join(scenario.directory, manifest.assets[index].href));
    assert.deepEqual(
      copied, Buffer.from(image.contents),
      `Source bytes and order must survive: ${image.name}`
    );
  }

  if (scenario.profile === "general-document") {
    assert.ok(root.children.some((node) =>
      node.type === "heading" && node.text === "Authoring Consumer Smoke"));
    assert.ok(root.children.some((node) =>
      node.type === "paragraph" && node.text === "Portable authoring smoke."));
    assert.equal(references[0].alt, "Purple page");
  }
}

function buildScenarioSteps(scenario) {
  const archive = `${scenario.directory}.prd`;
  const label = `${scenario.name}: `;
  const steps = [
    cliStep(`${label}create package`, [...scenario.args, "--json"], async (output) => {
      const result = JSON.parse(output);
      assert.equal(result.created ?? result.imported, true);
      assert.equal(result.profile, scenario.profile);
      await verifyAuthoredPackage(scenario);
    })
  ];

  for (const [sourceKind, path] of [["directory", scenario.directory], ["archive", archive]]) {
    if (sourceKind === "archive") {
      steps.push(cliStep(`${label}pack archive`, ["pack", scenario.directory, "--out", archive]));
    }
    steps.push(
      cliStep(`${label}validate ${sourceKind}`, ["validate", path, "--json"], (output) => {
        verifyValidation(output, scenario.profile);
      }),
      cliStep(`${label}inspect ${sourceKind}`, ["inspect", path, "--json"], (output) => {
        const result = verifyValidation(output, scenario.profile);
        assert.equal(result.inspection?.sourceKind, sourceKind);
        assert.ok(result.inspection.fileCount > 1);
        assert.ok(result.inspection.totalBytes > 0);
        if (scenario.images) {
          assert.equal(result.inspection.assetCount, scenario.images.length);
        }
      })
    );
  }

  return steps;
}

export async function createAuthoringSmokeSteps(projectDir) {
  const inputs = join(projectDir, "authoring inputs");
  const pages = join(inputs, "pages");
  const outputs = join(projectDir, "authoring outputs");
  const images = [
    {
      name: "page-2.svg",
      contents: '<svg xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" fill="#713df1"/></svg>\n'
    },
    {
      name: "page-10.svg",
      contents: '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="8" fill="#22d3ee"/></svg>\n'
    }
  ];
  await mkdir(pages, { recursive: true });
  await mkdir(outputs, { recursive: true });
  // Write in reverse order so the check depends on natural ordering, not insertion.
  for (const image of [...images].reverse()) {
    await writeFile(join(pages, image.name), image.contents, "utf8");
  }
  const markdown = join(inputs, "source.md");
  await writeFile(
    markdown,
    "# Authoring Consumer Smoke\n\nPortable authoring smoke.\n\n![Purple page](pages/page-2.svg)\n",
    "utf8"
  );

  const scenarios = profiles.map((profile) => {
    const directory = join(outputs, `init-${profile}`);
    return {
      name: `init ${profile}`, profile, directory,
      args: ["init", directory, "--profile", profile]
    };
  });
  const document = join(outputs, "markdown-document");
  scenarios.push({
    name: "import markdown", profile: "general-document", directory: document,
    args: ["import", "markdown", markdown, "--out", document], images: [images[0]]
  });
  for (const profile of ["comic", "storyboard"]) {
    const directory = join(outputs, `images-${profile}`);
    scenarios.push({
      name: `import images ${profile}`, profile, directory, images,
      args: ["import", "images", pages, "--profile", profile, "--out", directory]
    });
  }

  return scenarios.flatMap(buildScenarioSteps);
}
