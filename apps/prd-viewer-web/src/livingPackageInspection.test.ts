/*
 * Company: EonHive Inc. | Title: Living Package Inspection Tests
 * Purpose: Protect sample identity, hosting paths, and failure behavior at the metadata boundary.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LivingPackageInspector } from "./LivingPackageInspector.js";
import { getInspectionLayer, loadLivingPackageInspection } from "./livingPackageInspection.js";

const manifest = {
  prdVersion: "1.0", manifestVersion: "1.0", id: "urn:prd:test:document",
  profile: "general-document", title: "A test document", entry: "content/root.json",
};
const payload = {
  contractVersion: "prd-home-sample-v0.1", sampleId: "document-basic",
  archiveBytes: 1000, totalBytes: 1500, fileCount: 2, manifest,
};

function fetchJson(value: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(value), { status }));
}

describe("homepage sample inspection", () => {
  it.each(["/", "/prd/", "/prd"])("loads the allowlisted metadata under base %s and forwards cancellation", async (base) => {
    const signal = new AbortController().signal;
    const fetcher = fetchJson(payload);
    const result = await loadLivingPackageInspection("document-basic", base, signal, fetcher);
    expect(fetcher).toHaveBeenCalledWith(`${base === "/" ? "/" : "/prd/"}examples/document-basic.prd.inspection.json`, { signal });
    expect(result.manifest).toEqual(manifest);
    expect(getInspectionLayer(result, "content")).toEqual({ entry: "content/root.json", profile: "general-document" });
    expect(getInspectionLayer(result, "resources")).toEqual({ assets: [], attachments: [] });
  });

  it("rejects unknown sample IDs before any network request", async () => {
    const fetcher = fetchJson(payload);
    await expect(loadLivingPackageInspection("https://other.example/archive", "/", new AbortController().signal, fetcher)).rejects.toThrow("known PRD example");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    { ...payload, sampleId: "comic-basic" },
    { ...payload, contractVersion: "unexpected" },
    { ...payload, archiveBytes: -1 },
    { ...payload, fileCount: 1.2 },
    { ...payload, totalBytes: "1500" },
  ])("rejects mismatched or malformed metadata %#", async (value) => {
    await expect(loadLivingPackageInspection("document-basic", "/", new AbortController().signal, fetchJson(value))).rejects.toThrow("do not match");
  });

  it.each([
    { ...manifest, entry: "../content.json" },
    { ...manifest, profile: "comic" },
    { ...manifest, manifestVersion: undefined },
  ])("uses canonical manifest validation and expected profile %#", async (value) => {
    await expect(loadLivingPackageInspection("document-basic", "/", new AbortController().signal, fetchJson({ ...payload, manifest: value }))).rejects.toThrow("invalid or mismatched manifest");
  });

  it("reports missing assets instead of interpreting an HTTP 200 SPA shell as package facts", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("<!doctype html><html></html>"));
    await expect(loadLivingPackageInspection("document-basic", "/", new AbortController().signal, fetcher)).rejects.toThrow("unavailable in this build");
  });

  it("offers retry feedback for a failed HTTP response", async () => {
    await expect(loadLivingPackageInspection("document-basic", "/", new AbortController().signal, fetchJson({}, 503))).rejects.toThrow("Try again");
  });

  it("keeps available examples and Viewer access usable before facts load", () => {
    const html = renderToStaticMarkup(createElement(LivingPackageInspector, {
      active: false, sample: "comic-basic", layer: "manifest", basePath: "/prd/",
      onSampleChange() {}, onOpenViewer() {},
    }));
    expect(html).toContain('value="comic-basic" selected=""');
    expect(html).toContain('value="document-segmented-basic"');
    expect(html).toContain("Open this example in the Viewer");
    expect(html).not.toContain("validated when");
  });
});
