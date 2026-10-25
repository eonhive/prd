/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Hosting Configuration Tests
 * Purpose: Keep Workers production and GitHub Pages fallback deployment settings aligned.
 * Author: Stan Nesi
 * Created: October 25, 2026
 * Updated: October 25, 2026
 * Notes: Vibe coded with Codex.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("viewer hosting configuration", () => {
  it("serves only the built app through Workers Static Assets with native SPA routing", () => {
    const config = readRepoFile("wrangler.toml");
    expect(config).toMatch(/^name = "prd-worker"$/m);
    expect(config).toMatch(/^compatibility_date = "\d{4}-\d{2}-\d{2}"$/m);
    expect(config).toMatch(/^\[assets\]$/m);
    expect(config).toMatch(/^directory = "\.\/apps\/prd-viewer-web\/dist"$/m);
    expect(config).toMatch(/^not_found_handling = "single-page-application"$/m);
    expect(config).not.toMatch(/^\s*(?:pages_build_output_dir|main|binding)\s*=/m);
    const redirectsPath = fileURLToPath(
      new URL("../apps/prd-viewer-web/public/_redirects", import.meta.url)
    );
    expect(existsSync(redirectsPath)).toBe(false);
  });

  it("rebuilds root-domain assets before checking, previewing, or deploying", () => {
    const { scripts, devDependencies } = JSON.parse(readRepoFile("package.json"));
    expect(devDependencies.wrangler).toMatch(/^4\.\d+\.\d+$/);
    expect(scripts["viewer:demo:build:cloudflare"]).toBe(
      "PRD_VIEWER_BASE_PATH=/ pnpm viewer:demo:build"
    );
    expect(scripts["viewer:demo:check:cloudflare"]).toBe(
      "pnpm viewer:demo:build:cloudflare && wrangler deploy --dry-run"
    );
    expect(scripts["viewer:demo:preview:cloudflare"]).toBe(
      "pnpm viewer:demo:build:cloudflare && wrangler dev --local"
    );
    expect(scripts["viewer:demo:deploy:cloudflare"]).toBe(
      "pnpm viewer:demo:build:cloudflare && wrangler deploy"
    );
  });

  it("retains the separate GitHub Pages base path and refresh fallback", () => {
    const { scripts } = JSON.parse(readRepoFile("package.json"));
    expect(scripts["viewer:demo:build:github-pages"]).toBe(
      "PRD_VIEWER_BASE_PATH=/prd/ pnpm viewer:demo:build"
    );
    const workflow = readRepoFile(".github/workflows/viewer-demo-pages.yml");
    expect(workflow).toContain("pnpm viewer:demo:build:github-pages");
    expect(workflow).toContain(
      "cp apps/prd-viewer-web/dist/index.html apps/prd-viewer-web/dist/404.html"
    );
    expect(workflow).toContain("uses: actions/deploy-pages@");
  });

  it("ignores local Workers state and credentials", () => {
    const ignoredPaths = readRepoFile(".gitignore").split(/\r?\n/);
    expect(ignoredPaths).toEqual(expect.arrayContaining([".wrangler", ".dev.vars", ".dev.vars.*"]));
  });
});
