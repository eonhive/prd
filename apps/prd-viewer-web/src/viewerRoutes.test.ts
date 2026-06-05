/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Route Tests
 * Purpose: Verify landing/viewer route behavior under local and hosted base paths.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: June 5, 2026
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

  it("resolves landing and viewer routes locally", () => {
    expect(getViewerAppRouteFromPath("/", "/")).toBe("landing");
    expect(getViewerAppRouteFromPath("/viewer", "/")).toBe("viewer");
    expect(getViewerAppRouteFromPath("/viewer/", "/")).toBe("viewer");
    expect(getViewerAppRouteFromPath("/anything-else", "/")).toBe("landing");
  });

  it("resolves landing and viewer routes under GitHub Pages base path", () => {
    expect(getViewerAppRouteFromPath("/prd/", "/prd/")).toBe("landing");
    expect(getViewerAppRouteFromPath("/prd/viewer", "/prd/")).toBe("viewer");
    expect(getViewerAppRouteFromPath("/prd/viewer/", "/prd/")).toBe("viewer");
  });

  it("builds stable route paths for local and hosted deployment", () => {
    expect(getViewerAppRoutePath("landing", "/")).toBe("/");
    expect(getViewerAppRoutePath("viewer", "/")).toBe("/viewer/");
    expect(getViewerAppRoutePath("landing", "/prd/")).toBe("/prd/");
    expect(getViewerAppRoutePath("viewer", "/prd/")).toBe("/prd/viewer/");
  });
});

