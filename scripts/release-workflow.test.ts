/*
 * Company: EonHive Inc.
 * Title: PRD Release Workflow Authentication Tests
 * Purpose: Keep the publishing client on the credential verified by preflight.
 * Author: Stan Nesi
 * Created: 2026-10-29
 * Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const workflow = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
const ciWorkflow = readFileSync(new URL("../.github/workflows/codex-ci.yml", import.meta.url), "utf8");
const publishSteps = ["Version or publish packages"];
const secretReference = "${{ secrets.NPM_TOKEN }}";

function readStep(name: string, source = workflow) {
  const step = source.split(/^      - name: /m).find((block) => block.startsWith(`${name}\n`));
  if (!step) throw new Error(`Missing workflow step: ${name}`);
  return step;
}

describe("pull request tarball validation", () => {
  it("runs the existing installed-package gate after build/check steps on Node 22", () => {
    const smoke = readStep("Run installed tarball smoke", ciWorkflow);
    expect(ciWorkflow).toMatch(/^  pull_request:/m);
    expect(ciWorkflow).toContain("node-version: 22");
    expect(smoke).toContain("id: tarball_smoke");
    expect(smoke).toContain("run: node ./scripts/release-smoke.mjs");
    expect(smoke).not.toMatch(/^        (?:if|continue-on-error):/m);
    for (const prerequisite of ["Run Codex checks", "Pack example archives"]) {
      expect(ciWorkflow.indexOf(`- name: ${prerequisite}`)).toBeLessThan(
        ciWorkflow.indexOf("- name: Run installed tarball smoke")
      );
    }
  });

  it("uploads the consumer report after an attempted smoke run, including failures", () => {
    const upload = readStep("Upload tarball consumer smoke summary", ciWorkflow);
    expect(upload).toContain("if: ${{ always() && steps.tarball_smoke.outcome != 'skipped' }}");
    expect(upload).toContain("uses: actions/upload-artifact@v4");
    expect(upload).toContain("name: tarball-consumer-smoke-summary");
    expect(upload).toContain("path: examples/dist/tarball-consumer-smoke-summary.json");
    expect(upload).toContain("if-no-files-found: error");
    expect(ciWorkflow.indexOf("- name: Run installed tarball smoke")).toBeLessThan(
      ciWorkflow.indexOf("- name: Upload tarball consumer smoke summary")
    );
  });

  it("keeps PR validation read-only without publisher credentials or commands", () => {
    expect(ciWorkflow).toMatch(/^permissions:\n  contents: read\n/m);
    expect(readStep("Check out repository", ciWorkflow)).toContain("persist-credentials: false");
    expect(ciWorkflow).not.toContain("pull_request_target:");
    expect(ciWorkflow).not.toMatch(/secrets\.|NPM_TOKEN|NODE_AUTH_TOKEN|id-token: write/);
    expect(ciWorkflow).not.toMatch(/release:(?:publish|preflight|bootstrap)|changesets\/action/);
  });
});

describe("release workflow authentication", () => {
  it("keeps full CI on Node 22 and retires automatic bootstrap publication", () => {
    const ci = readFileSync(new URL("../.github/workflows/codex-ci.yml", import.meta.url), "utf8");
    expect(ci).toContain("node-version: 22");
    expect(workflow).toContain("node-version: 22");
    expect(workflow).not.toContain("release:bootstrap");
    expect(workflow).toContain("if: needs.release.outputs.published == 'true'");
    expect(workflow).toContain("release_ref: ${{ github.sha }}");
    expect(workflow).not.toContain("secrets: inherit");
  });
  it.each(publishSteps)("gives %s the same token for preflight and setup-node auth", (name) => {
    const step = readStep(name);
    expect(step).toContain(`          NPM_TOKEN: ${secretReference}\n`);
    expect(step).toContain(`          NODE_AUTH_TOKEN: ${secretReference}\n`);
    expect(step).toContain('          NPM_CONFIG_PROVENANCE: "true"');
  });

  it("keeps credentials step-scoped and preflight before publication", () => {
    expect(workflow).toContain("registry-url: https://registry.npmjs.org");
    expect(readStep("Run release publish preflight")).toContain(`NPM_TOKEN: ${secretReference}`);
    for (const name of publishSteps) {
      expect(workflow.indexOf("- name: Run release publish preflight")).toBeLessThan(
        workflow.indexOf(`- name: ${name}`)
      );
    }
    expect(workflow).not.toMatch(/^env:/m);
    expect(workflow).not.toMatch(/^    env:/m);
    expect(readStep("Install dependencies")).not.toContain("secrets.NPM_TOKEN");
    expect(readStep("Run release gate")).not.toContain("secrets.NPM_TOKEN");
  });

  it("authenticates through setup-node's userconfig instead of a shadowed home npmrc", async () => {
    const scratch = await mkdtemp(join(tmpdir(), "prd-release-auth-test-"));
    const token = "fake-publisher-token-for-local-test";
    const requests: Array<string | undefined> = [];
    const server = createServer((request, response) => {
      requests.push(request.headers.authorization);
      response.setHeader("content-type", "application/json");
      if (request.url === "/-/whoami" && request.headers.authorization === `Bearer ${token}`) {
        response.end(JSON.stringify({ username: "test-publisher" }));
      } else {
        response.writeHead(401);
        response.end(JSON.stringify({ error: "wrong test credential" }));
      }
    });

    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No local registry port");
      const registry = `http://127.0.0.1:${address.port}/`;
      const authKey = `//127.0.0.1:${address.port}/:_authToken`;
      const home = join(scratch, "home");
      const userconfig = join(scratch, "setup-node.npmrc");
      await mkdir(home);
      // Changesets writes HOME/.npmrc, but setup-node selects a different userconfig.
      await writeFile(join(home, ".npmrc"), `${authKey}=${token}\n`);
      await writeFile(userconfig, `${authKey}=\${NODE_AUTH_TOKEN}\nregistry=${registry}\n`);
      const env = {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        NPM_CONFIG_USERCONFIG: userconfig,
        npm_config_userconfig: userconfig,
        npm_config_cache: join(scratch, "cache"),
        NPM_TOKEN: token,
        NODE_AUTH_TOKEN: "XXXXX-XXXXX-XXXXX-XXXXX"
      };
      const args = ["whoami", "--registry", registry, "--json", "--fetch-retries=0"];

      await expect(execFileAsync("npm", args, { cwd: scratch, env, timeout: 5_000 })).rejects.toThrow();
      expect(requests.at(-1)).toBe(`Bearer ${env.NODE_AUTH_TOKEN}`);

      const step = readStep("Version or publish packages");
      expect(step).toContain(`NODE_AUTH_TOKEN: ${secretReference}`);
      const result = await execFileAsync("npm", args, {
        cwd: scratch,
        env: { ...env, NODE_AUTH_TOKEN: token },
        timeout: 5_000
      });
      expect(JSON.parse(result.stdout)).toBe("test-publisher");
      expect(requests.at(-1)).toBe(`Bearer ${token}`);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(scratch, { recursive: true, force: true });
    }
  }, 15_000);
});
