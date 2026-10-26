/*
 * Company: EonHive Inc.
 * Title: PRD Public Experience Tests
 * Purpose: Check route landmarks, first-use controls, and source layout safeguards without a browser dependency.
 * Author: Stan Nesi
 * Created: October 25, 2026
 * Updated: October 25, 2026
 * Notes: Vibe coded with Codex.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";
import { viewerLandingHero, viewerPublicDocsSections } from "./viewerDemoContent.js";

afterEach(() => vi.unstubAllGlobals());

function renderRoute(pathname: string) {
  vi.stubGlobal("window", {
    location: { pathname },
    localStorage: { getItem: () => null }
  });
  return renderToStaticMarkup(createElement(App));
}

describe("public experience markup", () => {
  it.each(["/", "/viewer/", "/docs/"])("provides a skip target and real navigation on %s", (path) => {
    const html = renderRoute(path);
    expect(html).toContain('href="#main-content"');
    expect(html.match(/id="main-content"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Main navigation"');
    expect(html).toContain('href="/viewer/"');
    expect(html).toContain('href="/docs/"');
  });

  it("keeps the Home message concise and preserves the authoring flow", () => {
    const html = renderRoute("/");
    expect(html).toContain(viewerLandingHero.title);
    expect(viewerLandingHero.title.length).toBeLessThan(50);
    expect(html).toContain('id="cli-flow"');
    expect(html).toContain("prd import markdown");
    expect(html).toContain("prd import images");
    expect(html).toContain("Open Viewer");
    expect(html).toContain("init and import await the next CLI release");
    expect(html).not.toContain("0.1.1 public preview");
    expect(html.match(/data-living-chapter=/g)).toHaveLength(6);
    expect(html).toContain('aria-label="Story chapters"');
    expect(html).toContain('aria-label="Document viewport"');
    expect(html).toContain('aria-label="Document structure layers"');
    expect(html).toContain('aria-label="Enable ambient sound"');
    expect(html).not.toContain('title="Embedded PRD reference viewer"');
    expect(html).not.toContain("Paginated");
  });

  it("still renders when browser storage is blocked", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/" },
      get localStorage() { throw new Error("Storage is blocked"); }
    });
    const html = renderToStaticMarkup(createElement(App));
    expect(html).toContain("Switch to light");
    expect(html).toContain(viewerLandingHero.title);
  });

  it("reads a saved light theme without requiring browser effects", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/" },
      localStorage: { getItem: () => "light" }
    });
    expect(renderToStaticMarkup(createElement(App))).toContain("Switch to dark");
  });

  it("uses a native file-picker button rather than nested button semantics", () => {
    const html = renderRoute("/viewer/");
    expect(html).toContain("Choose .prd file</button>");
    expect(html).toContain('role="region" aria-label="Choose or drop a PRD archive"');
    const inputs = html.match(/<input[^>]*type="file"[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toContain('accept=".prd"');
    expect(inputs[0]).toContain('hidden=""');
    for (const id of ["document-stage", "document-outline", "package-details"]) {
      expect(html).toContain(`id="${id}" tabindex="-1"`);
    }
    expect(html).toContain('<details class="viewer-sample-picker" open="">');
  });

  it("embeds the real viewer workspace without nesting site navigation", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/viewer/", search: "?embed=1&sample=document-basic" },
      localStorage: { getItem: () => null }
    });
    const html = renderToStaticMarkup(createElement(App));
    expect(html).toContain("is-embedded");
    expect(html).toContain('aria-label="PRD web viewer workspace"');
    expect(html).toContain('id="document-stage"');
    expect(html).toContain('id="package-details"');
    expect(html).not.toContain('aria-label="Main navigation"');
    expect(html).not.toContain("living-experience");
  });

  it("prioritizes first-use docs and keeps hosting details in a disclosure", () => {
    const html = renderRoute("/docs/");
    expect(html).toContain('aria-label="First steps"');
    expect(html).toContain('aria-label="Documentation sections"');
    for (const section of viewerPublicDocsSections) {
      expect(html).toContain(`href="#docs-${section.id}"`);
      expect(html).toContain(`id="docs-${section.id}"`);
    }
    expect(html).toContain('<details class="docs-hosting-card">');
    expect(html).not.toContain("SESSION_HANDOFF");
    expect(html).not.toContain("Codex planning");
  });
});

describe("layout source safeguards", () => {
  const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

  it("does not hide mobile navigation or the open action", () => {
    expect(css).not.toMatch(/\.site-nav-links[^{}]*\{[^}]*display:\s*none/);
    expect(css).not.toMatch(/\.nav-open-button[^{}]*\{[^}]*display:\s*none/);
  });

  it("keeps the loaded document ahead of rails on narrow screens", () => {
    expect(css).toMatch(/\.has-package \.viewer-shell-grid\s*\{\s*grid-template-areas: "document" "navigation" "details";/);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
