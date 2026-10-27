/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Chrome Tests
 * Purpose: Lock real route links, accessible navigation, and empty/loading/valid/invalid package labels.
 * Author: Stan Nesi
 * Created: October 25, 2026
 * Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ViewerDocumentOutline,
  ViewerSiteNavigation,
  ViewerStageStatus,
  ViewerWorkspaceHeader,
  ViewerSidePanel,
  ViewerWorkspaceToolbar,
  PrdSiteFooter,
} from "./viewerChrome.js";
import type { ViewerDocumentOutlineItem } from "./viewerDocumentOutline.js";
import { getViewerContentTargetId } from "./viewerDocumentTargets.js";

describe("viewer chrome", () => {
  it("keeps package validity failures separate from runtime support messages", () => {
    const html = renderToStaticMarkup(
      createElement(ViewerStageStatus, {
        valid: false,
        renderModeMessage: "Unsupported entry mode",
      }),
    );
    expect(html).toContain("Package validation failed");
    expect(html).toContain('role="alert"');
    expect(html).toContain('href="#package-details"');
    expect(html).not.toContain("Unsupported entry mode");
    expect(html).not.toContain("Reading view");
  });

  it("keeps truthful runtime reporting for validator-valid packages", () => {
    const html = renderToStaticMarkup(
      createElement(ViewerStageStatus, {
        valid: true,
        renderModeMessage: "Unsupported entry mode",
      }),
    );
    expect(html).toContain("Reading view");
    expect(html).toContain("Unsupported entry mode");
    expect(html).not.toContain("Package validation failed");
  });

  it.each(["/", "/prd/"])("renders real public links under %s", (basePath) => {
    const html = renderToStaticMarkup(
      createElement(ViewerSiteNavigation, {
        route: "docs",
        basePath,
        theme: "dark",
        onNavigate() {},
        onToggleTheme() {},
        onOpenArchive() {},
      }),
    );
    expect(html).toContain(`href="${basePath}viewer/"`);
    expect(html).toContain(`href="${basePath}docs/" aria-current="page"`);
    expect(html).toContain(`href="${basePath}#profiles"`);
    expect(html).toContain(`href="${basePath}#examples"`);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Main navigation"');
    expect(html).toContain("Switch to light");
    expect(html).toContain('aria-label="Switch to light"');
    expect(html).toContain("Open Viewer");
  });

  it("keeps archive opening in the Viewer while public pages link to the workspace", () => {
    const html = renderToStaticMarkup(
      createElement(ViewerSiteNavigation, {
        route: "viewer",
        basePath: "/prd/",
        theme: "light",
        onToggleTheme() {},
        onOpenArchive() {},
      }),
    );
    expect(html).toContain("Open .prd</button>");
    expect(html).toContain('aria-label="Switch to dark"');
    expect(html).toContain('href="/prd/#examples"');
    expect(html).not.toContain('href="/examples/"');
  });

  it.each(["/", "/prd/"])(
    "keeps footer journeys beneath hosting base %s",
    (basePath) => {
      const html = renderToStaticMarkup(
        createElement(PrdSiteFooter, { basePath }),
      );
      expect(html).toContain('aria-label="Footer navigation"');
      expect(html).toContain(`href="${basePath}viewer/"`);
      expect(html).toContain(`href="${basePath}docs/"`);
      expect(html).toContain(`href="${basePath}#profiles"`);
      expect(html).toContain(`href="${basePath}#examples"`);
      expect(html).toContain(`href="${basePath}#cli-flow"`);
      expect(html).toContain("By EonHive Inc.");
    },
  );

  it.each(["panel", "frame"] as const)("uses buttons for interactive %s outline entries", (kind) => {
    const items: ViewerDocumentOutlineItem[] = [
      { id: "document", kind: "document", label: "Document", depth: 0 },
      { id: "one", kind, label: "One", depth: 1 },
      { id: "two", kind, label: "Two", depth: 1 }
    ];
    const html = renderToStaticMarkup(createElement(ViewerDocumentOutline, {
      items, visualSelectionKind: kind, activeItemId: "two", onSelectVisualItem() {}
    }));
    expect(html).toContain(`href="#${getViewerContentTargetId("document", "document")}"`);
    expect(html).not.toContain(`href="#${getViewerContentTargetId(kind, "one")}"`);
    expect(html).toContain('aria-controls="document-stage"');
    expect(html.match(/<button /g)).toHaveLength(2);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
  });

  it("maps static outline entries to namespaced native links", () => {
    const html = renderToStaticMarkup(createElement(ViewerDocumentOutline, {
      items: [{ id: "panel:one", kind: "panel", label: "One", depth: 1 }],
      onSelectVisualItem() {}
    }));
    expect(html).toContain(`href="#${getViewerContentTargetId("panel", "panel:one")}"`);
    expect(html).not.toContain("<button");
  });

  it.each([
    [null, false, "No package loaded"],
    [null, true, "Opening package..."],
    [{ valid: true }, false, "Valid package"],
    [{ valid: false }, false, "Invalid package"],
    [{ valid: true }, true, "Opening package..."],
  ] as const)(
    "reports package state without inventing support states",
    (validation, loading, label) => {
      const html = renderToStaticMarkup(
        createElement(ViewerWorkspaceHeader, {
          validation,
          loading,
          loadMode: "eager whole-package in-memory",
        }),
      );
      expect(html).toContain(`>${label}</span>`);
      expect(html).toContain('role="status" aria-live="polite"');
      expect(html).toContain("eager whole-package in-memory");
      if (validation?.valid === false && !loading) {
        expect(html).not.toContain("No package loaded");
      }
    },
  );

  it("shows the actual title, profile, and local-reading context for an opened package", () => {
    const html = renderToStaticMarkup(
      createElement(ViewerWorkspaceHeader, {
        validation: { valid: true },
        packageTitle: "A reader's field notes",
        loading: false,
        loadMode: "eager whole-package in-memory",
        profileLabel: "Document",
      }),
    );
    expect(html).toContain("field notes</h1>");
    expect(html).toContain('class="viewer-profile-badge">Document</span>');
    expect(html).toContain("Files you choose stay in this browser");
    expect(html).not.toContain("Your document workspace");
  });

  it("keeps hidden desktop panels mounted without exposing their controls", () => {
    const html = renderToStaticMarkup(
      createElement(ViewerSidePanel, {
        id: "package-details",
        side: "right",
        title: "Package details",
        open: false,
        mobile: false,
        onClose() {},
        children: "Saved package state",
      }),
    );
    expect(html).toContain("<aside");
    expect(html).toContain('hidden=""');
    expect(html).toContain("Saved package state");
  });

  it("uses a native modal dialog for mobile panel focus and Escape handling", () => {
    const html = renderToStaticMarkup(
      createElement(ViewerSidePanel, {
        id: "viewer-navigation",
        side: "left",
        title: "Document navigation",
        open: false,
        mobile: true,
        onClose() {},
        children: "Outline",
      }),
    );
    expect(html).toContain("<dialog");
    expect(html).toContain('aria-label="Document navigation"');
    expect(html).toContain('aria-label="Close document navigation"');
    expect(html).not.toContain('open=""');
  });

  it("exposes the real panel and reading settings to assistive technology", () => {
    const html = renderToStaticMarkup(
      createElement(ViewerWorkspaceToolbar, {
        navigationOpen: false,
        detailsOpen: true,
        focusMode: false,
        wideReading: true,
        onToggleNavigation() {},
        onToggleDetails() {},
        onToggleFocus() {},
        onToggleWidth() {},
        onOpenArchive() {},
      }),
    );
    expect(html).toContain(
      'aria-expanded="false" aria-controls="viewer-navigation"',
    );
    expect(html).toContain(
      'aria-expanded="true" aria-controls="package-details"',
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Reading controls"');
    expect(html).not.toContain("Publish");
  });
});
