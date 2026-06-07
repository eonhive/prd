/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Routes
 * Purpose: Keep hosted Home/docs/viewer route behavior stable under local and hosted base paths.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: June 7, 2026
 * Notes: Vibe coded with Codex.
 */

export type ViewerAppRoute = "home" | "viewer" | "docs";

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

  if (routePath === "viewer" || routePath.startsWith("viewer/")) {
    return "viewer";
  }

  if (routePath === "docs" || routePath.startsWith("docs/")) {
    return "docs";
  }

  return "home";
}

export function getViewerAppRoutePath(
  route: ViewerAppRoute,
  basePath: string
): string {
  const normalizedBase = normalizeViewerBasePath(basePath);
  if (route === "viewer") {
    return `${normalizedBase}viewer/`;
  }

  if (route === "docs") {
    return `${normalizedBase}docs/`;
  }

  return normalizedBase;
}
