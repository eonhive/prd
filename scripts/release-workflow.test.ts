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
const publishSteps = ["Bootstrap first public preview publish", "Version or publish packages"];
const secretReference = "${{ secrets.NPM_TOKEN }}";

function readStep(name: string) {
  const step = workflow.split(/^      - name: /m).find((block) => block.startsWith(`${name}\n`));
  if (!step) throw new Error(`Missing release step: ${name}`);
  return step;
}

describe("release workflow authentication", () => {
  it.each(publishSteps)("gives %s the same token for preflight and setup-node auth", (name) => {
    const step = readStep(name);
    expect(step).toContain(`          NPM_TOKEN: ${secretReference}\n`);
    expect(step).toContain(`          NODE_AUTH_TOKEN: ${secretReference}\n`);
    expect(step).toContain('          NPM_CONFIG_PROVENANCE: "true"');
  });

  it("keeps credentials step-scoped and preflight before both publishing paths", () => {
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
