/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Navigation And Header
 * Purpose: Provide accessible public navigation and truthful package status without renderer coupling.
 * Author: Stan Nesi
 * Created: October 25, 2026
 * Updated: October 25, 2026
 * Notes: Vibe coded with Codex.
 */

import type { MouseEvent } from "react";
import { getViewerAppRoutePath, type ViewerAppRoute } from "./viewerRoutes.js";

export type ViewerTheme = "dark" | "light";

export function ViewerSiteNavigation({
  route,
  basePath,
  theme,
  onNavigate,
  onToggleTheme,
  onOpenArchive
}: {
  route: ViewerAppRoute;
  basePath: string;
  theme: ViewerTheme;
  onNavigate: (route: ViewerAppRoute, hash?: string) => void;
  onToggleTheme: () => void;
  onOpenArchive: () => void;
}) {
  function navigate(
    event: MouseEvent<HTMLAnchorElement>,
    next: ViewerAppRoute,
    hash?: string
  ) {
    // Keep native new-tab and modified-click behavior on real route links.
    if (
      event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    ) {
      return;
    }
    event.preventDefault();
    onNavigate(next, hash);
  }

  return (
    <header className="site-nav">
      <a
        className="brand-lockup"
        href={getViewerAppRoutePath("home", basePath)}
        onClick={(event) => navigate(event, "home")}
        aria-label="PRD Home"
      >
        <span className="brand-mark" aria-hidden="true">P</span>
        <span>
          <strong>PRD</strong>
          <small>Portable Responsive Document</small>
        </span>
      </a>
      <nav className="site-nav-links" aria-label="Main navigation">
        {(["home", "viewer", "docs"] as const).map((item) => (
          <a
            key={item}
            href={getViewerAppRoutePath(item, basePath)}
            aria-current={route === item ? "page" : undefined}
            onClick={(event) => navigate(event, item)}
          >
            {item === "home" ? "Home" : item === "viewer" ? "Viewer" : "Docs"}
          </a>
        ))}
        <a
          href={`${getViewerAppRoutePath("home", basePath)}#cli-flow`}
          onClick={(event) => navigate(event, "home", "cli-flow")}
        >
          CLI Flow
        </a>
      </nav>
      <div className="site-nav-actions">
        <button type="button" className="theme-toggle" onClick={onToggleTheme}>
          <span aria-hidden="true">{theme === "dark" ? "Dark" : "Light"}</span>
          <strong>{theme === "dark" ? "Switch to light" : "Switch to dark"}</strong>
        </button>
        <button type="button" className="nav-open-button" onClick={onOpenArchive}>
          Open .prd
        </button>
      </div>
    </header>
  );
}

export function ViewerWorkspaceHeader({
  validation,
  packageTitle,
  loading,
  loadMode
}: {
  validation: { valid: boolean } | null;
  packageTitle?: string;
  loading: boolean;
  loadMode: string;
}) {
  let status = "No package loaded";
  let statusClassName = "status-pill";
  if (loading) {
    status = "Opening package...";
  } else if (validation) {
    status = validation.valid ? "Valid package" : "Invalid package";
    statusClassName += validation.valid ? " valid" : " invalid";
  }

  return (
    <div className="viewer-dashboard-topbar">
      <div className="viewer-document-heading">
        <p className="eyebrow">PRD Web Viewer</p>
        <h1>{packageTitle ?? "Your document workspace"}</h1>
        <p className="viewer-load-note">{loadMode}. Files you choose stay in this browser.</p>
      </div>
      <div className="viewer-dashboard-status">
        <span role="status" aria-live="polite" className={statusClassName}>
          {status}
        </span>
        {validation && (
          <nav className="viewer-workspace-links" aria-label="Workspace sections">
            <a href="#document-stage">Document</a>
            <a href="#document-outline">Outline</a>
            <a href="#package-details">Package details</a>
          </nav>
        )}
      </div>
    </div>
  );
}
