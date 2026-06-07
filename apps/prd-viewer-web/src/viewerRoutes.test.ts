/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Route Tests
 * Purpose: Verify Home/docs/viewer route behavior under local and hosted base paths.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: June 7, 2026
 * Notes: Vibe coded with Codex.
 */

import { describe, expect, it } from "vitest";
import {
  getViewerAppRouteFromPath,
  getViewerAppRoutePath,
  normalizeViewerBasePath
} from "./viewerRoutes.js";

describe("viewer routes", () => {
  it("normalizes local and hosted base paths", () => {
    expect(normalizeViewerBasePath("")).toBe("/");
    expect(normalizeViewerBasePath("/")).toBe("/");
    expect(normalizeViewerBasePath("prd")).toBe("/prd/");
    expect(normalizeViewerBasePath("/prd")).toBe("/prd/");
    expect(normalizeViewerBasePath("/prd/")).toBe("/prd/");
  });

  it("resolves Home, docs, and viewer routes locally", () => {
    expect(getViewerAppRouteFromPath("/", "/")).toBe("home");
    expect(getViewerAppRouteFromPath("/docs", "/")).toBe("docs");
    expect(getViewerAppRouteFromPath("/docs/", "/")).toBe("docs");
    expect(getViewerAppRouteFromPath("/viewer", "/")).toBe("viewer");
    expect(getViewerAppRouteFromPath("/viewer/", "/")).toBe("viewer");
    expect(getViewerAppRouteFromPath("/anything-else", "/")).toBe("home");
  });

  it("resolves Home, docs, and viewer routes under hosted base path", () => {
    expect(getViewerAppRouteFromPath("/prd/", "/prd/")).toBe("home");
    expect(getViewerAppRouteFromPath("/prd/docs", "/prd/")).toBe("docs");
    expect(getViewerAppRouteFromPath("/prd/docs/", "/prd/")).toBe("docs");
    expect(getViewerAppRouteFromPath("/prd/viewer", "/prd/")).toBe("viewer");
    expect(getViewerAppRouteFromPath("/prd/viewer/", "/prd/")).toBe("viewer");
  });

  it("builds stable route paths for local and hosted deployment", () => {
    expect(getViewerAppRoutePath("home", "/")).toBe("/");
    expect(getViewerAppRoutePath("docs", "/")).toBe("/docs/");
    expect(getViewerAppRoutePath("viewer", "/")).toBe("/viewer/");
    expect(getViewerAppRoutePath("home", "/prd/")).toBe("/prd/");
    expect(getViewerAppRoutePath("docs", "/prd/")).toBe("/prd/docs/");
    expect(getViewerAppRoutePath("viewer", "/prd/")).toBe("/prd/viewer/");
  });
});
