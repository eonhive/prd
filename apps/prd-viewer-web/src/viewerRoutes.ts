/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Routes
 * Purpose: Keep hosted landing/viewer route behavior stable under local and GitHub Pages base paths.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: June 5, 2026
 * Notes: Vibe coded with Codex.
 */

export type ViewerAppRoute = "landing" | "viewer";

export function normalizeViewerBasePath(basePath: string): string {
  const trimmed = basePath.trim();

  if (trimmed.length === 0 || trimmed === ".") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

export function getViewerAppRouteFromPath(
  pathname: string,
  basePath: string
): ViewerAppRoute {
  const normalizedBase = normalizeViewerBasePath(basePath);
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const routePath = normalizedPath.startsWith(normalizedBase)
    ? normalizedPath.slice(normalizedBase.length)
    : normalizedPath.replace(/^\/+/, "");

  return routePath === "viewer" || routePath.startsWith("viewer/")
    ? "viewer"
    : "landing";
}

export function getViewerAppRoutePath(
  route: ViewerAppRoute,
  basePath: string
): string {
  const normalizedBase = normalizeViewerBasePath(basePath);
  return route === "viewer" ? `${normalizedBase}viewer/` : normalizedBase;
}

