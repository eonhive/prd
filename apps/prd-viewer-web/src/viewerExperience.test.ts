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
import { ConvertWeb } from "./ConvertWeb.js";
import { ConvertUpload } from "./ConvertUpload.js";
import { convertInBrowser, convertMarkdownInBrowser } from "@eonhive/prd-converter/browser";
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
  it.each(["/", "/viewer/", "/docs/", "/convert/"])("provides a skip target and real navigation on %s", (path) => {
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

  it("only offers conversion and a clear local-file policy before any result exists", () => {
    const html = renderRoute("/convert/");
    expect(html).toContain("Files stay in this browser");
    expect(html).toContain("Convert to PRD");
    expect(html).toContain('aria-label="Document upload"');
    expect(html).toContain('accept=".md,.markdown,.html,.htm,.cbz"');
    expect(html).toContain("Browse files");
    expect(html).toContain("Conversion options");
    expect(html).toContain('aria-label="Conversion result"');
    expect(html).not.toContain("Download PRD");
    expect(html).not.toContain("Valid PRD package");
    expect(html).not.toContain("Preview in Viewer");
    expect(html).not.toContain("Recent");
    expect(html).not.toContain("Templates");
    expect(html).not.toContain("AI auto-detect");
  });

  it("escapes retained source markup in the completed conversion disclosure", async () => {
    const sourceText = "# Safe document\n\n<script>unsafe()</script>";
    const result = await convertMarkdownInBrowser({ source: { name: "source.md", bytes: new TextEncoder().encode(sourceText) } });
    const html = renderToStaticMarkup(createElement(ConvertWeb, {
      completed: { result, sourceName: "source.md", sourcePreview: sourceText, previewTruncated: false },
      onComplete() {}, onPreview() {}
    }));
    expect(html).toContain("Valid PRD package");
    expect(html).toContain("Preview in Viewer");
    expect(html).toContain("&lt;script&gt;unsafe()&lt;/script&gt;");
    expect(html).not.toContain("<script>unsafe()");
  });

  it.each([true, false])("reviews CBZ without exposing binary source, retention %s", async (preserveSource) => {
    const bytes = new Uint8Array(readFileSync("examples/conversion-cbz/sample-comic.cbz"));
    const result = await convertInBrowser({ source: { name: "sample-comic.cbz", bytes }, preserveSource });
    const html = renderToStaticMarkup(createElement(ConvertWeb, {
      completed: { result, sourceName: "sample-comic.cbz", sourcePreview: "binary-marker-should-not-render", previewTruncated: false },
      onComplete() {}, onPreview() {}
    }));
    expect(html).toContain("· Comic · Adaptive reading");
    expect(html).toContain("<dt>Pages</dt><dd>3</dd>");
    expect(html).toContain("Original CBZ archive");
    expect(html).toContain(preserveSource ? "exact source archive is included" : "source archive was omitted");
    expect(html).not.toContain("binary-marker-should-not-render");
    expect(html).toContain('aria-label="Comic page review"');
    expect(html).toContain("Convert the original CBZ again to enable comic review.");
    const upload = renderToStaticMarkup(createElement(ConvertUpload, {
      source: new File([bytes], "sample-comic.cbz"), images: [], busy: false,
      onSource() {}, onImages() {}, onError() {}
    }));
    expect(upload).toContain("CBZ comic archive");
    expect(upload).toContain("Pages come from this archive");
    expect(upload).not.toContain("Add images");
  });

  it("offers bounded native page review for a retained conversion session", async () => {
    const bytes = new Uint8Array(readFileSync("examples/conversion-cbz/sample-comic.cbz"));
    const file = new File([bytes], "sample-comic.cbz");
    const result = await convertInBrowser({ source: { name: file.name, bytes } });
    const html = renderToStaticMarkup(createElement(ConvertWeb, {
      completed: { result, sourceName: file.name, sourcePreview: "", previewTruncated: false, sourceFile: file, settings: {} },
      onComplete() {}, onPreview() {}
    }));
    expect(html).toContain("Review comic pages");
    const firstControl = html.match(/<button[^>]+aria-label="Move pages\/page-1\.png earlier"[^>]*>/)?.[0];
    expect(firstControl).toContain('disabled=""');
    expect(html).toContain('aria-label="Move pages/page-2.png later"');
    expect(html).toContain("Apply review");
    expect(html).toContain("Reset changes");
    expect(html).toContain("downloads keep using the current package until it succeeds");
    expect(html).not.toContain("Convert the original CBZ again to enable comic review.");
    expect(html).toContain("Browser support: HTML, Markdown and bounded CBZ comics.");
    expect(html).not.toContain("EPUB, CBZ, DOCX and PDF use");
  });

  it("renders editable, bounded and escaped page descriptions with explicit source status", async () => {
    const bytes = new Uint8Array(readFileSync("examples/conversion-cbz/sample-comic.cbz"));
    const file = new File([bytes], "sample-comic.cbz");
    const settings = { comicPageDescriptions: [{ pageId: "page-1", text: "</textarea><script>literal()</script>" }] };
    const result = await convertInBrowser({ source: { name: file.name, bytes }, ...settings });
    const html = renderToStaticMarkup(createElement(ConvertWeb, {
      completed: { result, sourceName: file.name, sourcePreview: "", previewTruncated: false, sourceFile: file, settings },
      onComplete() {}, onPreview() {}
    }));
    expect(html.match(/<textarea /g)).toHaveLength(3);
    expect(html).toContain('maxLength="2048"');
    expect(html).toContain("Page description");
    expect(html).toContain("Provided description");
    expect(html).toContain("Filename-derived description");
    expect(html).toContain("&lt;/textarea&gt;&lt;script&gt;literal()&lt;/script&gt;");
    expect(html).not.toContain("<script>literal()");
    expect(html).toContain("accuracy is not automatically assessed");
  });

  it("restores an unapplied session draft while keeping the current archive unchanged", async () => {
    const bytes = new Uint8Array(readFileSync("examples/conversion-cbz/sample-comic.cbz"));
    const result = await convertInBrowser({ source: { name: "sample-comic.cbz", bytes } });
    const before = Buffer.from(result.archive);
    const html = renderToStaticMarkup(createElement(ConvertWeb, {
      completed: {
        result, sourceName: "sample-comic.cbz", sourcePreview: "", previewTruncated: false,
        sourceFile: new File([bytes], "sample-comic.cbz"), settings: {},
        reviewDraft: { pageIds: ["page-2", "page-3", "page-1"], descriptions: [{ pageId: "page-1", text: "Unapplied session description." }] }
      }, onComplete() {}, onPreview() {}
    }));
    expect(html).toContain("Unapplied session description.");
    expect(html).toContain("Draft description");
    expect(html).toContain("Draft changes are not applied yet.");
    expect(html.indexOf("pages/page-2.png")).toBeLessThan(html.indexOf("pages/page-1.png"));
    expect(Buffer.from(result.archive).equals(before)).toBe(true);
    if (result.document.profile !== "comic") throw new Error("Unexpected profile");
    expect(result.document.panels[0]?.id).toBe("page-1");
    expect(result.document.panels[0]?.alt).toBe("Page 1 comic page");
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
