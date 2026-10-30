/**
 * Company: EonHive Inc. | Title: Restricted HTML Fallback
 * Purpose: Build a local reading preview without authored navigation, CSS or active content.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */

import type { DefaultTreeAdapterMap, TreeAdapter } from "parse5";
import type { PrdAssetDeclaration } from "@eonhive/prd-types";
import type { PrdFileMap } from "@eonhive/prd-validator";

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];
type ResourceKind = "image" | "audio" | "video";
interface Resource { path: string; bytes: Uint8Array; mime: string; url?: string }
type OutputPart = string | Resource;

export const HTML_FALLBACK_LIMITS = Object.freeze({
  maxHtmlBytes: 4 * 1024 * 1024,
  maxParseOperations: 20_000,
  maxDepth: 64,
  maxResources: 128,
  maxResourceBytes: 8 * 1024 * 1024,
  maxTotalResourceBytes: 24 * 1024 * 1024
});

export interface HtmlFallbackUrls {
  create(bytes: Uint8Array, mime: string): string;
  revoke(url: string): void;
}

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const TEXT_ELEMENTS = new Set([
  "article", "aside", "main", "section", "header", "footer", "nav", "div", "span", "p",
  "h1", "h2", "h3", "h4", "h5", "h6", "br", "hr", "blockquote", "q", "pre", "code",
  "strong", "em", "b", "i", "u", "s", "small", "sub", "sup", "mark", "abbr", "cite",
  "kbd", "samp", "var", "time", "ul", "ol", "li", "dl", "dt", "dd", "figure", "figcaption",
  "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td", "details", "summary"
]);
const OMIT_SUBTREES = new Set([
  "head", "script", "style", "template", "noscript", "iframe", "frame", "frameset",
  "object", "embed", "applet", "canvas", "svg", "math", "xmp", "plaintext"
]);
const GLOBAL_ATTRIBUTES = new Set(["id", "title", "lang", "dir", "role", "aria-label", "aria-labelledby", "aria-describedby"]);
const TRUSTED_STYLE = `body{margin:0;padding:24px;background:#fff;color:#172033;font:16px/1.6 system-ui,sans-serif;overflow-wrap:anywhere}h1,h2,h3,h4,h5,h6{line-height:1.25}img,video{max-width:100%;height:auto}audio{max-width:100%}table{border-collapse:collapse;max-width:100%}th,td{border:1px solid #cbd0dd;padding:8px;text-align:start}pre{white-space:pre-wrap;overflow-wrap:anywhere}blockquote{margin-inline:0;padding-inline:16px;border-inline-start:3px solid #cbd0dd}`;
// The policy test checks this hash against the exact fixed stylesheet.
const TRUSTED_STYLE_HASH = "ZSidxYU85lM8DmMNJgyupxjSY0WY5s7nw5nNZ1EuNIs=";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function attribute(element: HtmlElement, name: string): string | undefined {
  return element.attrs.find((item) => item.name === name && !item.namespace && !item.prefix)?.value;
}

export function resolveHtmlFallbackResource(entryPath: string, target: string): string | undefined {
  const value = target.trim();
  if (!value || value.startsWith("/") || /[\\\u0000-\u001f\u007f:?#]/u.test(value)) return undefined;
  const parts = entryPath.split("/").slice(0, -1);
  for (const segment of value.split("/")) {
    let decoded: string;
    try { decoded = decodeURIComponent(segment); } catch { return undefined; }
    if (!decoded || /[\/\\\u0000-\u001f\u007f:?#]/u.test(decoded)) return undefined;
    if (decoded === ".") continue;
    if (decoded === "..") {
      if (parts.length === 0) return undefined;
      parts.pop();
    } else {
      parts.push(decoded);
    }
  }
  return parts.length ? parts.join("/") : undefined;
}

function begins(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function rasterMime(bytes: Uint8Array): string | undefined {
  if (begins(bytes, [137, 80, 78, 71, 13, 10, 26, 10])) return "image/png";
  if (begins(bytes, [255, 216, 255])) return "image/jpeg";
  if (begins(bytes, [71, 73, 70, 56, 55, 97]) || begins(bytes, [71, 73, 70, 56, 57, 97])) return "image/gif";
  if (begins(bytes, [82, 73, 70, 70]) && begins(bytes, [87, 69, 66, 80], 8)) return "image/webp";
  return undefined;
}

function resourceMime(bytes: Uint8Array, declared: string | undefined): string | undefined {
  const type = declared?.split(";")[0]?.trim().toLowerCase();
  const raster = rasterMime(bytes);
  if (raster && (!type || type === raster)) return raster;
  if (type === "audio/mpeg" && (begins(bytes, [73, 68, 51]) || (bytes[0] === 255 && ((bytes[1] ?? 0) & 0xe0) === 0xe0))) return type;
  if (type === "audio/wav" && begins(bytes, [82, 73, 70, 70]) && begins(bytes, [87, 65, 86, 69], 8)) return type;
  if ((type === "audio/ogg" || type === "video/ogg") && begins(bytes, [79, 103, 103, 83])) return type;
  if ((type === "audio/mp4" || type === "video/mp4") && begins(bytes, [102, 116, 121, 112], 4)) return type;
  if ((type === "audio/webm" || type === "video/webm") && begins(bytes, [26, 69, 223, 163])) return type;
  return undefined;
}

async function parseRestrictedHtml(html: string) {
  const limits = HTML_FALLBACK_LIMITS;
  if (html.length > limits.maxHtmlBytes || new TextEncoder().encode(html).byteLength > limits.maxHtmlBytes) {
    throw new Error("HTML fallback exceeds the 4 MiB preview limit.");
  }
  // parse5 creates a data tree without browser fetches, even for discarded iframe/image nodes.
  const parser = await import("parse5");
  const base = parser.defaultTreeAdapter;
  let operations = 0;
  let depth = 0;
  function consume(): void {
    if (++operations > limits.maxParseOperations) throw new Error("HTML fallback exceeds the parser work limit.");
  }
  const treeAdapter: TreeAdapter<DefaultTreeAdapterMap> = {
    ...base,
    createElement(...args) { consume(); return base.createElement(...args); },
    createCommentNode(...args) { consume(); return base.createCommentNode(...args); },
    createDocumentFragment() { consume(); return base.createDocumentFragment(); },
    insertText(...args) { consume(); base.insertText(...args); },
    insertTextBefore(...args) { consume(); base.insertTextBefore(...args); },
    setDocumentType(...args) { consume(); base.setDocumentType(...args); },
    onItemPush() {
      if (++depth > limits.maxDepth) throw new Error("HTML fallback exceeds the nesting limit.");
    },
    onItemPop() { depth -= 1; }
  };
  return parser.parse(html, { treeAdapter, scriptingEnabled: true });
}

function safeAttributes(element: HtmlElement): string {
  const values: string[] = [];
  for (const item of element.attrs) {
    if (item.namespace || item.prefix || item.value.length > 2048) continue;
    let allowed = GLOBAL_ATTRIBUTES.has(item.name);
    if (item.name === "dir") allowed = ["ltr", "rtl", "auto"].includes(item.value);
    if (["colspan", "rowspan"].includes(item.name) && ["td", "th"].includes(element.tagName)) allowed = /^[1-9]\d?$/u.test(item.value);
    if (item.name === "scope" && element.tagName === "th") allowed = ["row", "col", "rowgroup", "colgroup"].includes(item.value);
    if (item.name === "start" && element.tagName === "ol") allowed = /^-?\d{1,6}$/u.test(item.value);
    if (item.name === "open" && element.tagName === "details") allowed = true;
    if (allowed) values.push(` ${item.name}="${escapeHtml(item.value)}"`);
  }
  return values.join("");
}

export function createHtmlFallbackRenderer(files: PrdFileMap, assets: PrdAssetDeclaration[] | undefined, urls: HtmlFallbackUrls) {
  const declared = new Map((assets ?? []).map((asset) => [asset.href, asset]));
  const cached = new Map<string, Resource>();
  let retainedBytes = 0;

  return async function renderHtmlFallback(html: string, entryPath: string): Promise<string> {
    const document = await parseRestrictedHtml(html);
    const planned = new Map<string, Resource>();
    const output: OutputPart[] = [];
    let plannedBytes = 0;

    function resource(source: string | undefined, kind: ResourceKind): Resource | undefined {
      const path = source && resolveHtmlFallbackResource(entryPath, source);
      if (!path) return undefined;
      const asset = declared.get(path);
      const bytes = Object.hasOwn(files, path) ? files[path] : undefined;
      if (!asset || !bytes || bytes.byteLength > HTML_FALLBACK_LIMITS.maxResourceBytes) return undefined;
      const mime = resourceMime(bytes, asset.type);
      if (!mime?.startsWith(`${kind}/`)) return undefined;
      const existing = cached.get(path) ?? planned.get(path);
      if (existing) return existing;
      if (cached.size + planned.size >= HTML_FALLBACK_LIMITS.maxResources || retainedBytes + plannedBytes + bytes.byteLength > HTML_FALLBACK_LIMITS.maxTotalResourceBytes) return undefined;
      const result: Resource = { path, bytes, mime };
      planned.set(path, result);
      plannedBytes += bytes.byteLength;
      return result;
    }

    function write(node: HtmlNode, depth: number): void {
      if (depth > HTML_FALLBACK_LIMITS.maxDepth) throw new Error("HTML fallback exceeds the output nesting limit.");
      if (node.nodeName === "#text" && "value" in node) {
        output.push(escapeHtml(node.value));
        return;
      }
      if (!("tagName" in node)) return;
      if (node.namespaceURI !== HTML_NAMESPACE || OMIT_SUBTREES.has(node.tagName)) return;
      const tag = node.tagName;
      const attrs = safeAttributes(node);
      if (tag === "img") {
        const alt = attribute(node, "alt")?.slice(0, 2048) ?? "";
        const image = resource(attribute(node, "src"), "image");
        if (image) output.push(`<img${attrs} alt="${escapeHtml(alt)}" loading="lazy" decoding="async" src="`, image, '">');
        else output.push(`<span${attrs}>${escapeHtml(alt || "Image unavailable in restricted preview.")}</span>`);
        return;
      }
      if (tag === "audio" || tag === "video") {
        let media = resource(attribute(node, "src"), tag);
        for (const child of node.childNodes) {
          if (!media && "tagName" in child && child.namespaceURI === HTML_NAMESPACE && child.tagName === "source") {
            media = resource(attribute(child, "src"), tag);
          }
        }
        if (media) {
          output.push(`<${tag}${attrs} controls preload="none"${tag === "video" ? " playsinline" : ""} src="`, media, '"');
          const poster = tag === "video" ? resource(attribute(node, "poster"), "image") : undefined;
          if (poster) output.push(' poster="', poster, '"');
          output.push(">");
        } else {
          output.push(`<span${attrs}>Media unavailable in restricted preview. `);
        }
        for (const child of node.childNodes) write(child, depth + 1);
        output.push(media ? `</${tag}>` : "</span>");
        return;
      }
      // Links, forms and unknown HTML wrappers become inert text containers; their attributes are discarded.
      const allowed = TEXT_ELEMENTS.has(tag);
      if (allowed) output.push(`<${tag}${attrs}>`);
      else if (tag === "a") output.push(`<span${attrs}>`);
      for (const child of node.childNodes) write(child, depth + 1);
      if (allowed && tag !== "br" && tag !== "hr") output.push(`</${tag}>`);
      else if (tag === "a") output.push("</span>");
    }

    const root = document.childNodes.find((node): node is HtmlElement => "tagName" in node && node.tagName === "html");
    const body = root?.childNodes.find((node): node is HtmlElement => "tagName" in node && node.tagName === "body");
    for (const node of body?.childNodes ?? []) write(node, 0);

    // Allocate only after all parsing/output checks pass, and share URLs across default/localized previews.
    const created: string[] = [];
    try {
      for (const item of planned.values()) {
        item.url = urls.create(item.bytes, item.mime);
        created.push(item.url);
        if (!item.url.startsWith("blob:")) throw new Error("HTML fallback resources require viewer-created blob URLs.");
      }
    } catch (error) {
      for (const url of created) urls.revoke(url);
      throw error;
    }
    for (const item of planned.values()) cached.set(item.path, item);
    retainedBytes += plannedBytes;

    const policy = `default-src 'none'; base-uri 'none'; script-src 'none'; style-src 'sha256-${TRUSTED_STYLE_HASH}'; style-src-attr 'none'; img-src blob:; media-src blob:; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'`;
    const bodyHtml = output.map((part) => typeof part === "string" ? part : escapeHtml(part.url!)).join("");
    const lang = root && attribute(root, "lang");
    const dir = root && attribute(root, "dir");
    return `<!doctype html><html${lang ? ` lang="${escapeHtml(lang.slice(0, 128))}"` : ""}${dir && ["ltr", "rtl", "auto"].includes(dir) ? ` dir="${dir}"` : ""}><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(policy)}"><meta name="referrer" content="no-referrer"><title>PRD restricted HTML preview</title><style>${TRUSTED_STYLE}</style></head><body>${bodyHtml}</body></html>`;
  };
}

export type HtmlFallbackRenderer = ReturnType<typeof createHtmlFallbackRenderer>;
