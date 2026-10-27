/*
 * Company: EonHive Inc. | Title: Living Profile Media Tests
 * Purpose: Protect bounded same-origin excerpts, hosting bases, and truthful study markup.
 * Author: Stan Nesi | Created: October 27, 2026 | Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LivingProfileArtwork, type useLivingProfilePreview } from "./LivingProfilePreview.js";
import { loadLivingVisualPreview, parseLivingVisualPreview } from "./livingProfileMedia.js";

const metadata = {
  contractVersion: "prd-home-profile-preview-v0.1", sampleId: "comic-basic", profile: "comic",
  title: "PRD Comic Fixture", sourceEntry: "content/root.json",
  items: [{ id: "panel-1", imagePath: "examples/previews/comic-basic/1.png", alt: "Source panel art", caption: "An authored caption." }],
};

describe("profile preview media boundary", () => {
  it.each(["/", "/prd/"])("loads its known metadata beneath base %s", async (base) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(metadata)));
    const signal = new AbortController().signal;
    expect(await loadLivingVisualPreview("comic-basic", base, signal, fetcher)).toMatchObject({ sampleId: "comic-basic", profile: "comic" });
    expect(fetcher).toHaveBeenCalledWith(`${base}examples/comic-basic.prd.preview.json`, { signal });
  });

  it.each(["document-basic", "https://other.example/archive.prd", "../private"])("rejects a nonvisual or unknown sample before fetching: %s", async (id) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(loadLivingVisualPreview(id, "/", new AbortController().signal, fetcher)).rejects.toThrow("comic or storyboard");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    "https://other.example/art.png", "/outside.png", "examples/previews/storyboard-basic/1.svg",
    "examples/previews/comic-basic/../private.png", "examples/previews/comic-basic/%2e%2e/private.png",
    "examples/previews/comic-basic/1.png?url=elsewhere", "examples/previews/comic-basic/1.gif",
  ])("rejects unsafe or unrelated image references: %s", (imagePath) => {
    expect(() => parseLivingVisualPreview({ ...metadata, items: [{ ...metadata.items[0], imagePath }] }, "comic-basic")).toThrow("unsupported image");
  });

  it.each([
    { ...metadata, sampleId: "storyboard-basic" }, { ...metadata, profile: "general-document" },
    { ...metadata, contractVersion: "unknown" }, { ...metadata, items: [] },
    { ...metadata, items: [...metadata.items, ...metadata.items, ...metadata.items, ...metadata.items] },
  ])("rejects mismatched or unbounded metadata %#", (data) => {
    expect(() => parseLivingVisualPreview(data, "comic-basic")).toThrow("does not match");
  });

  it("rejects a missing metadata asset served as an HTTP 200 HTML shell", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("<!doctype html><html></html>"));
    await expect(loadLivingVisualPreview("comic-basic", "/", new AbortController().signal, fetcher)).rejects.toThrow("unavailable in this build");
  });

  it("leaves unknown metadata fields out of the rendered model", () => {
    expect(parseLivingVisualPreview({ ...metadata, script: "unrelated" }, "comic-basic")).not.toHaveProperty("script");
  });
});

describe("profile artwork", () => {
  const state: ReturnType<typeof useLivingProfilePreview> = {
    data: parseLivingVisualPreview(metadata, "comic-basic"), error: "", loading: false,
    revision: 0, retry() {}, imageFailed() {},
  };

  it("does not mount media elements while the floating presentation is offscreen", () => {
    const html = renderToStaticMarkup(createElement(LivingProfileArtwork, { profile: "comic", preview: state, basePath: "/prd/", active: false }));
    expect(html).not.toContain("<img");
  });

  it("uses real source media under the hosting base when active", () => {
    const html = renderToStaticMarkup(createElement(LivingProfileArtwork, { profile: "comic", preview: state, basePath: "/prd/", active: true }));
    expect(html).toContain('src="/prd/examples/previews/comic-basic/1.png"');
    expect(html).toContain('alt="Source panel art"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("PACKAGE EXCERPT");
  });

  it.each(["document", "report", "resume", "magazine"] as const)("preserves shared content and order for the %s study", (profile) => {
    const html = renderToStaticMarkup(createElement(LivingProfileArtwork, { profile, preview: state, basePath: "/", active: true }));
    expect(html).toContain("LAYOUT STUDY");
    expect(html).toContain("general-document");
    expect(html.indexOf("The foundation")).toBeLessThan(html.indexOf("Beyond the page"));
    expect(html).not.toContain("<img");
  });
});
