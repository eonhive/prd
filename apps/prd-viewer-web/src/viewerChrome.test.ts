/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Chrome Tests
 * Purpose: Lock real route links, accessible navigation, and empty/loading/valid/invalid package labels.
 * Author: Stan Nesi
 * Created: October 25, 2026
 * Updated: October 25, 2026
 * Notes: Vibe coded with Codex.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ViewerDocumentOutline, ViewerSiteNavigation, ViewerStageStatus, ViewerWorkspaceHeader } from "./viewerChrome.js";
import type { ViewerDocumentOutlineItem } from "./viewerDocumentOutline.js";

describe("viewer chrome", () => {
  it("keeps package validity failures separate from runtime support messages", () => {
    const html = renderToStaticMarkup(createElement(ViewerStageStatus, {
      valid: false, renderModeMessage: "Unsupported entry mode"
    }));
    expect(html).toContain("Package validation failed");
    expect(html).toContain('role="alert"');
    expect(html).toContain('href="#package-details"');
    expect(html).not.toContain("Unsupported entry mode");
    expect(html).not.toContain("Render Stage");
  });

  it("keeps truthful runtime reporting for validator-valid packages", () => {
    const html = renderToStaticMarkup(createElement(ViewerStageStatus, {
      valid: true, renderModeMessage: "Unsupported entry mode"
    }));
    expect(html).toContain("Render Stage");
    expect(html).toContain("Unsupported entry mode");
    expect(html).not.toContain("Package validation failed");
  });

  it.each(["/", "/prd/"])("renders real public links under %s", (basePath) => {
    const html = renderToStaticMarkup(createElement(ViewerSiteNavigation, {
      route: "docs", basePath, theme: "dark",
      onNavigate() {}, onToggleTheme() {}, onOpenArchive() {}
    }));
    expect(html).toContain(`href="${basePath}viewer/"`);
    expect(html).toContain(`href="${basePath}docs/" aria-current="page"`);
    expect(html).toContain(`href="${basePath}#cli-flow"`);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Main navigation"');
    expect(html).toContain("Switch to light");
    expect(html).toContain('aria-label="Switch to light"');
    expect(html).toContain("Open .prd");
  });

  it.each(["panel", "frame"] as const)("uses buttons for interactive %s outline entries", (kind) => {
    const items: ViewerDocumentOutlineItem[] = [
      { id: "document", kind: "document", label: "Document", depth: 0 },
      { id: "one", kind, label: "One", depth: 1 },
      { id: "two", kind, label: "Two", depth: 1 }
    ];
    const html = renderToStaticMarkup(createElement(ViewerDocumentOutline, {
      items, visualSelectionKind: kind, activeItemId: "two", onSelectVisualItem() {}
    }));
    expect(html).toContain('href="#document"');
    expect(html).not.toContain('href="#one"');
    expect(html).toContain('aria-controls="document-stage"');
    expect(html.match(/<button /g)).toHaveLength(2);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
  });

  it("keeps static outline entries as encoded native links", () => {
    const html = renderToStaticMarkup(createElement(ViewerDocumentOutline, {
      items: [{ id: "panel:one", kind: "panel", label: "One", depth: 1 }],
      onSelectVisualItem() {}
    }));
    expect(html).toContain('href="#panel%3Aone"');
    expect(html).not.toContain("<button");
  });

  it.each([
    [null, false, "No package loaded"],
    [null, true, "Opening package..."],
    [{ valid: true }, false, "Valid package"],
    [{ valid: false }, false, "Invalid package"],
    [{ valid: true }, true, "Opening package..."]
  ] as const)("reports package state without inventing support states", (validation, loading, label) => {
    const html = renderToStaticMarkup(createElement(ViewerWorkspaceHeader, {
      validation, loading, loadMode: "eager whole-package in-memory"
    }));
    expect(html).toContain(`>${label}</span>`);
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).toContain("eager whole-package in-memory");
    if (validation?.valid === false && !loading) {
      expect(html).not.toContain("No package loaded");
    }
  });

  it("shows the actual title and package navigation when a package is loaded", () => {
    const html = renderToStaticMarkup(createElement(ViewerWorkspaceHeader, {
      validation: { valid: true }, packageTitle: "A reader's field notes",
      loading: false, loadMode: "eager whole-package in-memory"
    }));
    expect(html).toContain("field notes</h1>");
    expect(html).toContain('href="#document-stage"');
    expect(html).toContain('href="#document-outline"');
    expect(html).toContain('href="#package-details"');
    expect(html).not.toContain("Your document workspace");
  });
});
