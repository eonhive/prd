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
import { LivingHomepage } from "./LivingHomepage.js";
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
    expect(html).toContain('href="/#profiles"');
    expect(html).toContain('href="/#examples"');
    expect(html.match(/aria-label="Main navigation"/g)).toHaveLength(1);
    expect(html).toContain('class="prd-brand-symbol"');
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
    expect(html).toContain('id="examples" tabindex="-1"');
    expect(html).toContain('id="profiles"');
    expect(html).toContain("Evolves with your ideas");
    expect(html).toContain('aria-label="Footer navigation"');
    expect(html).not.toContain('title="Embedded PRD reference viewer"');
    expect(html).not.toContain("Paginated");
  });

  it.each(["/", "/prd/"])("keeps the download and example handoff under hosting base %s", (basePath) => {
    const html = renderToStaticMarkup(createElement(LivingHomepage, {
      basePath, theme: "dark", onToggleTheme() {}, children: null,
    }));
    expect(html).toContain(`href="${basePath}examples/document-basic.prd" download=""`);
    expect(html).toContain(`href="${basePath}viewer/?sample=document-basic"`);
    expect(html).toContain(`href="${basePath}viewer/?sample=comic-basic"`);
    expect(html).toContain(`href="${basePath}viewer/?sample=storyboard-basic"`);
    expect(html).toContain(`src="${basePath}brand/prd-world.webp"`);
    expect(html).toContain('aria-label="Example package inspector"');
    expect(html).toContain("Package details load as you reach this chapter.");
    expect(html).not.toContain("validated when the demo was built");
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
    expect(html).toContain('aria-label="Reading controls"');
    expect(html).toContain('aria-label="Search document outline"');
    expect(html).toContain('class="viewer-welcome-examples"');
    expect(html).toContain("Document Basic");
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
      expect(html).toContain(`id="docs-${section.id}" tabindex="-1"`);
    }
    expect(html).toContain('<details class="docs-hosting-card">');
    expect(html).not.toContain("SESSION_HANDOFF");
    expect(html).not.toContain("Codex planning");
  });
});

describe("layout source safeguards", () => {
  const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8") + readFileSync(new URL("./prdBrand.css", import.meta.url), "utf8") + readFileSync(new URL("./viewerWorkspace.css", import.meta.url), "utf8");

  it("does not hide mobile navigation or the open action", () => {
    expect(css).not.toMatch(/\.site-nav-links[^{}]*\{[^}]*display:\s*none/);
    expect(css).not.toMatch(/\.nav-open-button[^{}]*\{[^}]*display:\s*none/);
  });

  it("gives narrow screens one document column with modal side panels", () => {
    expect(css).toContain('@media (max-width: 1000px)');
    expect(css).toContain('grid-template-areas: "document";');
    expect(css).toContain('dialog.viewer-side-panel:not([open])');
    expect(css).toContain('.viewer-side-panel::backdrop');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
