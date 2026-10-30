/**
 * Company: EonHive Inc. | Title: HTML Fallback Containment Tests
 * Purpose: Check generated reading markup, package-only resources, budgets and frame restrictions.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse, type DefaultTreeAdapterTypes } from "parse5";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrdAssetDeclaration } from "@eonhive/prd-types";
import type { PrdFileMap } from "@eonhive/prd-validator";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { readPackageDirectory } from "@eonhive/prd-validator/node";
import { createPrdContainer, readPrdArchive } from "@eonhive/prd-validator/container";
import { openPrdDocument } from "@eonhive/prd-viewer-core";
import { strFromU8, zipSync } from "fflate";
import { HtmlFallbackFrame } from "./HtmlFallbackFrame.js";
import { createHtmlFallbackRenderer, HTML_FALLBACK_LIMITS, resolveHtmlFallbackResource } from "./htmlFallback.js";

const encoder = new TextEncoder();
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const imageAsset = { id: "cover", href: "assets/cover.png", type: "image/png" };

afterEach(() => vi.unstubAllGlobals());

function elements(html: string): DefaultTreeAdapterTypes.Element[] {
  const nodes: DefaultTreeAdapterTypes.Node[] = [parse(html)];
  const result: DefaultTreeAdapterTypes.Element[] = [];
  while (nodes.length) {
    const node = nodes.pop()!;
    if ("tagName" in node) result.push(node);
    if ("childNodes" in node) nodes.push(...node.childNodes);
  }
  return result.reverse();
}

function attr(node: DefaultTreeAdapterTypes.Element, name: string): string | undefined {
  return node.attrs.find((item) => item.name === name)?.value;
}

function fixture(files: PrdFileMap = { "assets/cover.png": png }, assets: PrdAssetDeclaration[] = [imageAsset]) {
  let sequence = 0;
  const urls = {
    create: vi.fn((_bytes: Uint8Array, _mime: string) => `blob:https://viewer.test/resource-${++sequence}`),
    revoke: vi.fn((_url: string) => undefined)
  };
  return { urls, render: createHtmlFallbackRenderer(files, assets, urls) };
}

describe("HTML fallback resource paths", () => {
  it.each([
    ["content/index.html", "../assets/cover.png", "assets/cover.png"],
    ["content/locales/fr.html", "../../assets/cover.png", "assets/cover.png"],
    ["content/index.html", "./images/photo%20one.png", "content/images/photo one.png"],
    ["content/index.html", "../assets/%2e/cover.png", "assets/cover.png"]
  ])("resolves %s and %s inside the package", (entry, source, expected) => {
    expect(resolveHtmlFallbackResource(entry!, source!)).toBe(expected);
  });

  it.each([
    "https://remote.test/x", "//remote.test/x", "/assets/cover.png", "javascript:alert(1)",
    "data:image/png;base64,AA", "blob:https://viewer.test/other", "file:///tmp/a.png",
    "../../escape.png", "../%2e%2e/escape.png", "../assets%2fcover.png", "../assets%5ccover.png",
    "../assets/cover.png?v=1", "../assets/cover.png#x", "../assets/%00cover.png",
    "../assets/cover%0a.png", "../assets/cover%3f.png", "../assets/%zz.png", "../assets//cover.png", ""
  ])("does not expose ambiguous or external reference %s", (source) => {
    expect(resolveHtmlFallbackResource("content/index.html", source)).toBeUndefined();
  });
});

describe("restricted HTML reading output", () => {
  it("retains text, semantics, tables, direction and image alternatives with a fixed stylesheet", async () => {
    const { render } = fixture();
    const html = await render('<html lang="fr" dir="rtl"><body><h1 id="intro">Titre</h1><p>A &amp; B <em>important</em></p><ul><li>One</li></ul><table><tr><th scope="col">Name</th><td colspan="2">Value</td></tr></table><img src="../assets/cover.png" alt="Cover"></body></html>', "content/index.html");
    const nodes = elements(html);
    expect(html).toContain("A &amp; B");
    expect(nodes.find((node) => node.tagName === "html")).toMatchObject({ attrs: expect.arrayContaining([{ name: "lang", value: "fr" }, { name: "dir", value: "rtl" }]) });
    expect(nodes.some((node) => node.tagName === "h1" && attr(node, "id") === "intro")).toBe(true);
    expect(nodes.some((node) => node.tagName === "td" && attr(node, "colspan") === "2")).toBe(true);
    expect(attr(nodes.find((node) => node.tagName === "img")!, "alt")).toBe("Cover");
  });

  it("puts default-deny CSP before any content and binds only the fixed stylesheet hash", async () => {
    const { render } = fixture();
    const html = await render('<meta http-equiv="Content-Security-Policy" content="default-src *"><style>@import "https://remote.test/style";</style><p style="background:url(https://remote.test/pixel)">Readable</p>', "content/index.html");
    const nodes = elements(html);
    const policyNode = nodes.find((node) => node.tagName === "meta" && attr(node, "http-equiv") === "Content-Security-Policy")!;
    const policy = attr(policyNode, "content")!;
    const style = nodes.find((node) => node.tagName === "style")!;
    const css = style.childNodes.map((node) => "value" in node ? node.value : "").join("");
    expect(policy).toContain(`style-src 'sha256-${createHash("sha256").update(css).digest("base64")}'`);
    for (const directive of ["default-src", "script-src", "connect-src", "object-src", "frame-src", "font-src", "form-action", "base-uri"]) {
      expect(policy).toContain(`${directive} 'none'`);
    }
    expect(policy).toContain("img-src blob:");
    expect(policy).toContain("media-src blob:");
    expect(policy).not.toContain("unsafe-inline");
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<style>"));
    expect(html).not.toContain("remote.test");
    expect(nodes.filter((node) => node.tagName === "style")).toHaveLength(1);
  });

  it.each([
    '<script src="https://remote.test/script">alert(1)</script>',
    '<iframe src="https://remote.test/frame" srcdoc="<script>alert(1)</script>"></iframe>',
    '<object data="https://remote.test/object"><embed src="https://remote.test/embed"></object>',
    '<meta http-equiv="refresh" content="0;url=https://remote.test/refresh"><base href="https://remote.test/base/">',
    '<link rel="stylesheet" href="https://remote.test/css"><link rel="preconnect" href="https://remote.test">',
    '<svg><foreignObject><img src="https://remote.test/foreign" onerror="alert(1)"></foreignObject></svg>',
    '<math><annotation-xml encoding="text/html"><img src="https://remote.test/math"></annotation-xml></math>',
    '<template shadowrootmode="open"><img src="https://remote.test/template"></template>',
    '<noscript><img src="https://remote.test/noscript"></noscript>'
  ])("discards active/foreign constructs without materializing browser nodes: %s", async (source) => {
    const fetch = vi.fn(() => { throw new Error("Unexpected fetch"); });
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("DOMParser", class { constructor() { throw new Error("Browser parser must not be used"); } });
    const { render, urls } = fixture();
    const html = await render(`${source}<p>Readable fallback</p>`, "content/index.html");
    expect(html).toContain("Readable fallback");
    expect(html).not.toContain("remote.test");
    expect(html).not.toContain("alert(1)");
    expect(fetch).not.toHaveBeenCalled();
    expect(urls.create).not.toHaveBeenCalled();
    expect(elements(html).some((node) => ["iframe", "object", "embed", "svg", "math", "template", "script", "link", "base", "noscript"].includes(node.tagName))).toBe(false);
  });

  it("makes all links and forms inert, including fragments, ping, targets and submit actions", async () => {
    const { render } = fixture();
    const html = await render('<a href="https://remote.test" target="_top" ping="https://remote.test/ping" download>External</a><a href="#part">Local</a><form action="https://remote.test/post"><button formaction="https://remote.test/action">Submit</button><input name="secret" value="x"></form><p id="part">Part</p>', "content/index.html");
    const nodes = elements(html);
    expect(html).toContain("External");
    expect(html).toContain("Local");
    expect(html).toContain("Submit");
    expect(nodes.some((node) => ["a", "form", "button", "input"].includes(node.tagName))).toBe(false);
    expect(nodes.some((node) => node.attrs.some((item) => ["href", "action", "formaction", "target", "download", "ping"].includes(item.name)))).toBe(false);
  });

  it("escapes attribute/text injection and drops handlers, CSS, custom upgrades and responsive URLs", async () => {
    const { render } = fixture();
    const html = await render('<p onclick="alert(1)" style="display:none" is="unsafe-reader">&lt;script&gt;label&lt;/script&gt;</p><img src="../assets/cover.png" srcset="https://remote.test/x 2x" onerror="alert(2)" alt="&quot; onload=&quot;unsafe()">', "content/index.html");
    const nodes = elements(html);
    expect(html).toContain("&lt;script&gt;label&lt;/script&gt;");
    expect(nodes.some((node) => node.attrs.some((item) => item.name.startsWith("on") || ["style", "is", "srcset"].includes(item.name)))).toBe(false);
    expect(attr(nodes.find((node) => node.tagName === "img")!, "alt")).toBe('" onload="unsafe()');
    expect(html).not.toContain("remote.test");
  });

  it.each(["https://remote.test/x", "//remote.test/x", "/assets/cover.png", "data:image/png,AA", "blob:https://viewer.test/old", "javascript:alert(1)", "../assets/missing.png"])("omits unresolvable image %s while keeping its alt text", async (source) => {
    const { render, urls } = fixture();
    const html = await render(`<img src="${source}" alt="Useful description">`, "content/index.html");
    expect(elements(html).some((node) => node.tagName === "img")).toBe(false);
    expect(html).toContain("Useful description");
    expect(urls.create).not.toHaveBeenCalled();
  });

  it("requires manifest declarations, existing bytes and matching safe signatures", async () => {
    const files = { "assets/undeclared.png": png, "assets/fake.png": encoder.encode("<svg onload='unsafe()'/>"), "assets/wrong.png": png, "assets/art.svg": encoder.encode("<svg/>"), "assets/cover.png": png };
    const assets = [{ href: "assets/fake.png", type: "image/png" }, { href: "assets/wrong.png", type: "image/jpeg" }, { href: "assets/missing.png", type: "image/png" }, { href: "assets/art.svg", type: "image/svg+xml" }, imageAsset];
    const { render, urls } = fixture(files, assets);
    const html = await render(Object.keys(files).map((path) => `<img src="../${path}" alt="${path}">`).join(""), "content/index.html");
    expect(elements(html).filter((node) => node.tagName === "img")).toHaveLength(1);
    expect(urls.create).toHaveBeenCalledTimes(1);
    expect(urls.create).toHaveBeenCalledWith(png, "image/png");
  });

  it("accepts header-identified raster assets without requiring a MIME declaration", async () => {
    const { render, urls } = fixture({ "assets/cover.png": png }, [{ href: "assets/cover.png" }]);
    const html = await render('<img src="../assets/cover.png" alt="Cover">', "content/index.html");
    expect(elements(html).some((node) => node.tagName === "img")).toBe(true);
    expect(urls.create).toHaveBeenCalledTimes(1);
    expect(urls.create).toHaveBeenCalledWith(png, "image/png");
  });

  it.each([
    ["audio", "audio/mpeg", new Uint8Array([73, 68, 51])],
    ["audio", "audio/wav", new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69])],
    ["audio", "audio/ogg", new Uint8Array([79, 103, 103, 83])],
    ["video", "video/mp4", new Uint8Array([0, 0, 0, 12, 102, 116, 121, 112])],
    ["video", "video/webm", new Uint8Array([26, 69, 223, 163])]
  ] as const)("retains declared %s %s behind manual native controls", async (kind, mime, bytes) => {
    const { render, urls } = fixture({ "assets/media.bin": bytes, "assets/cover.png": png }, [{ href: "assets/media.bin", type: mime }, imageAsset]);
    const html = await render(`<${kind} src="https://remote.test/unsafe" autoplay loop onplay="unsafe()" poster="../assets/cover.png"><source src="../assets/media.bin" srcset="https://remote.test/alternate">Fallback text</${kind}>`, "content/index.html");
    const media = elements(html).find((node) => node.tagName === kind)!;
    expect(attr(media, "src")).toMatch(/^blob:/u);
    expect(attr(media, "preload")).toBe("none");
    expect(attr(media, "controls")).toBe("");
    expect(attr(media, "autoplay")).toBeUndefined();
    expect(attr(media, "loop")).toBeUndefined();
    expect(attr(media, "onplay")).toBeUndefined();
    expect(html).not.toContain("remote.test");
    expect(urls.create.mock.calls[0]?.[1]).toBe(mime);
    if (kind === "video") expect(attr(media, "poster")).toMatch(/^blob:/u);
  });

  it("does not allow playlists, external tracks or mismatched media kinds", async () => {
    const { render, urls } = fixture({ "assets/list.m3u8": encoder.encode("#EXTM3U\nhttps://remote.test/segment") }, [{ href: "assets/list.m3u8", type: "application/vnd.apple.mpegurl" }]);
    const html = await render('<video src="../assets/list.m3u8"><track src="https://remote.test/subtitles">Readable alternative</video><audio src="../assets/list.m3u8"></audio>', "content/index.html");
    expect(elements(html).some((node) => ["audio", "video", "track", "source"].includes(node.tagName))).toBe(false);
    expect(html).toContain("Readable alternative");
    expect(urls.create).not.toHaveBeenCalled();
  });

  it("shares resource URLs across repeated and localized entries but never across packages", async () => {
    const first = fixture();
    const firstHtml = await first.render('<img src="../assets/cover.png"><img src="../assets/cover.png">', "content/index.html");
    const localized = await first.render('<img src="../../assets/cover.png">', "content/locales/fr.html");
    expect(first.urls.create).toHaveBeenCalledTimes(1);
    expect(attr(elements(firstHtml).find((node) => node.tagName === "img")!, "src")).toBe(attr(elements(localized).find((node) => node.tagName === "img")!, "src"));
    const second = fixture();
    await second.render('<img src="../assets/cover.png">', "content/index.html");
    expect(second.urls.create).toHaveBeenCalledTimes(1);
  });

  it("rolls back partial URL allocation and leaves the previous locale cache usable", async () => {
    const files = { "assets/cover.png": png, "assets/b.png": png, "assets/c.png": png };
    const { render, urls } = fixture(files, Object.keys(files).map((href) => ({ href, type: "image/png" })));
    await render('<img src="../assets/cover.png">', "content/index.html");
    urls.create.mockImplementationOnce(() => "blob:https://viewer.test/partial").mockImplementationOnce(() => { throw new Error("allocation failed"); });
    await expect(render('<img src="../assets/b.png"><img src="../assets/c.png">', "content/index.html")).rejects.toThrow("allocation failed");
    expect(urls.revoke).toHaveBeenCalledTimes(1);
    expect(urls.revoke).toHaveBeenCalledWith("blob:https://viewer.test/partial");
    await render('<img src="../assets/cover.png">', "content/index.html");
    expect(urls.create).toHaveBeenCalledTimes(3);
    const recovered = await render('<img src="../assets/b.png">', "content/index.html");
    expect(recovered).not.toContain("/partial");
  });

  it("refuses a resource allocator returning a network URL", async () => {
    const { render, urls } = fixture();
    urls.create.mockReturnValueOnce("https://remote.test/resource");
    await expect(render('<img src="../assets/cover.png">', "content/index.html")).rejects.toThrow("viewer-created blob URLs");
    expect(urls.revoke).toHaveBeenCalledTimes(1);
    expect(urls.revoke).toHaveBeenCalledWith("https://remote.test/resource");
  });

  it.each([
    ["input bytes", "a".repeat(HTML_FALLBACK_LIMITS.maxHtmlBytes + 1), "preview limit"],
    ["UTF-8 input bytes", "é".repeat(HTML_FALLBACK_LIMITS.maxHtmlBytes / 2 + 1), "preview limit"],
    ["parser work", "<br>".repeat(HTML_FALLBACK_LIMITS.maxParseOperations + 1), "parser work limit"],
    ["nesting", "<div>".repeat(HTML_FALLBACK_LIMITS.maxDepth + 1), "nesting limit"]
  ])("rejects excessive %s before resource allocation", async (_label, source, message) => {
    const { render, urls } = fixture();
    await expect(render(`<img src="../assets/cover.png">${source}`, "content/index.html")).rejects.toThrow(message!);
    expect(urls.create).not.toHaveBeenCalled();
  });

  it("omits oversized assets and caps unique resources across locales", async () => {
    const large = new Uint8Array(HTML_FALLBACK_LIMITS.maxResourceBytes + 1);
    large.set(png);
    const files: PrdFileMap = { "assets/large.png": large };
    for (let index = 0; index <= HTML_FALLBACK_LIMITS.maxResources; index += 1) files[`assets/${index}.png`] = png;
    const { render, urls } = fixture(files, Object.keys(files).map((href) => ({ href, type: "image/png" })));
    const html = await render(Object.keys(files).map((path) => `<img src="../${path}" alt="Description">`).join(""), "content/index.html");
    expect(elements(html).filter((node) => node.tagName === "img")).toHaveLength(HTML_FALLBACK_LIMITS.maxResources);
    expect(urls.create).toHaveBeenCalledTimes(HTML_FALLBACK_LIMITS.maxResources);
    const localized = await render(`<img src="../../assets/${HTML_FALLBACK_LIMITS.maxResources}.png" alt="Remaining">`, "content/locales/fr.html");
    expect(elements(localized).some((node) => node.tagName === "img")).toBe(false);
    expect(localized).toContain("Remaining");
  });

  it("applies the aggregate resource byte budget before minting URLs", async () => {
    const bytes = new Uint8Array(HTML_FALLBACK_LIMITS.maxResourceBytes);
    bytes.set(png);
    const files = Object.fromEntries([0, 1, 2, 3].map((index) => [`assets/${index}.png`, bytes]));
    const { render, urls } = fixture(files, Object.keys(files).map((href) => ({ href, type: "image/png" })));
    const html = await render(Object.keys(files).map((path) => `<img src="../${path}">`).join(""), "content/index.html");
    expect(elements(html).filter((node) => node.tagName === "img")).toHaveLength(3);
    expect(urls.create).toHaveBeenCalledTimes(3);
  });

  it("retains an opaque frame with no privileges, a no-referrer policy and a reading notice", async () => {
    const { render } = fixture();
    const html = await render("<h1>Readable</h1>", "content/index.html");
    const markup = renderToStaticMarkup(createElement(HtmlFallbackFrame, { html }));
    const frame = elements(markup).find((node) => node.tagName === "iframe")!;
    expect(attr(frame, "sandbox")).toBe("");
    expect(attr(frame, "referrerpolicy")).toBe("no-referrer");
    expect(attr(frame, "srcdoc")).toBe(html);
    expect(attr(frame, "allow")).toContain("autoplay 'none'");
    expect(markup).toContain("Restricted HTML preview");
    expect(markup).not.toContain("allow-scripts");
    expect(markup).not.toContain("allow-same-origin");
  });

  it("routes both host HTML paths through the compiler and suppresses outer fallback image previews", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("DOMParser");
    expect(source).not.toContain("srcDoc=");
    expect(source.match(/await renderHtmlFallback\(/gu)).toHaveLength(2);
    expect(source).toMatch(/coverUrl=\{\s*!activeRenderedHtml/u);
    expect(source).toContain('url && !activeRenderedHtml && asset.type?.startsWith("image/")');
  });

  it.each(["zip", "prd"])("opens and prepares the real hostile fixture in %s transport without changing source bytes", async (transport) => {
    const path = fileURLToPath(new URL("../../../examples/security/html-fallback-isolation", import.meta.url));
    const source = await readPackageDirectory(path);
    const zip = zipSync(source);
    const files = readPrdArchive(transport === "prd" ? createPrdContainer(zip) : zip);
    expect(validatePackageFiles(files).valid).toBe(true);
    const opened = await openPrdDocument({
      has: (name) => Object.hasOwn(files, name),
      readText: (name) => strFromU8(files[name]!),
      readBinary: (name) => files[name]!
    });
    expect(opened.supportState).toBe("safe-mode");
    const before = strFromU8(files[opened.entryPath]!);
    const { render, urls } = fixture(files, opened.manifest.assets);
    const html = await render(opened.entryHtml!, opened.entryPath);
    const alternate = JSON.parse(strFromU8(files["content/locales/fr-FR.json"]!));
    expect(urls.create.mock.calls.map((call) => call[1])).toEqual(["image/png", "audio/wav"]);
    const nodes = elements(html);
    expect(nodes.filter((node) => node.tagName === "img")).toHaveLength(1);
    expect(nodes.filter((node) => node.tagName === "audio")).toHaveLength(1);
    expect(html).not.toContain("127.0.0.1");
    expect(nodes.some((node) => ["a", "iframe", "script", "form", "link", "base", "svg"].includes(node.tagName))).toBe(false);
    expect(alternate.profile).toBe("comic");
    expect(alternate.panels[0].asset).toBe("cover");
    expect(before).toContain("<script>");
    expect(strFromU8(files[opened.entryPath]!)).toBe(before);
  });
});
