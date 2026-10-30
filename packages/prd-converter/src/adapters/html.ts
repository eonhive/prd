/**
 * Company: EonHive Inc. | Title: PRD HTML Import Adapter
 * Purpose: Reconstruct static HTML semantics without executing or retaining active markup in the reading view.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import type { PrdGeneralDocumentNode, PrdGeneralDocumentLinksNode } from "@eonhive/prd-types";
import type { ConversionWarning, ImportAdapter, ImportContext, ImportSource } from "../contracts.js";
import { attribute, isElement, parseHtml, type HtmlElement, type HtmlNode } from "./htmlTree.js";

const OMITTED_ELEMENTS = new Set([
  "script", "style", "iframe", "object", "embed", "template", "svg", "math",
  "canvas", "audio", "video", "input", "textarea", "select", "button", "noscript"
]);
const CONTAINERS = new Set([
  "html", "body", "main", "article", "section", "div", "header", "footer", "nav", "aside",
  "figure", "figcaption", "address", "details", "summary", "form", "label"
]);
const LIST_ELEMENTS = new Set(["ul", "ol"]);
const TABLE_ELEMENTS = new Set(["table"]);
const INLINE_TEXT_ELEMENTS = new Set([
  "span", "strong", "em", "b", "i", "u", "s", "small", "code", "kbd", "abbr",
  "cite", "time", "sup", "sub", "mark"
]);

function decodeHtml(source: ImportSource): string | undefined {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(source.bytes);
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text)) return undefined;
    if (/^\s*(?:%PDF-|<\?xml)/iu.test(text)) return undefined;
    return /<(?:!doctype\s+html\b|[a-z][a-z0-9:-]*(?:\s|\/?>))/iu.test(text) ? text : undefined;
  } catch {
    return undefined;
  }
}

function compact(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

function isOmitted(element: HtmlElement): boolean {
  return OMITTED_ELEMENTS.has(element.tagName) || attribute(element, "hidden") !== undefined ||
    attribute(element, "aria-hidden")?.toLowerCase() === "true";
}

export class HtmlExtractor {
  readonly nodes: PrdGeneralDocumentNode[] = [];
  readonly warnings: ConversionWarning[] = [];
  title?: string;
  private readonly warned = new Set<string>();
  private readonly claimedAnchors = new Set<string>();
  readonly targets = new Map<string, string>();
  private readonly fragmentLinks: Array<{ node: PrdGeneralDocumentLinksNode; fragment: string }> = [];
  private anchorCount = 0;

  constructor(
    private readonly context: ImportContext,
    private readonly resolveLink?: (href: string, label: string) => PrdGeneralDocumentNode | undefined
  ) {}

  warn(code: string, message: string, reference?: string): void {
    const key = `${code}:${reference ?? ""}`;
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.warnings.push({ code, stage: "extract", message, ...(reference ? { reference } : {}) });
  }

  private emit(node: PrdGeneralDocumentNode): void {
    if (this.nodes.length >= this.context.limits.maxNodes) {
      throw new Error("Content node count exceeds the conversion limit.");
    }
    this.nodes.push(node);
  }

  private paragraph(text: string): void {
    const cleaned = compact(text);
    if (cleaned) this.emit({ type: "paragraph", text: cleaned });
  }

  private text(node: HtmlNode): string {
    if (node.nodeName === "#text" && "value" in node) return node.value;
    if (!isElement(node) || isOmitted(node)) return "";
    if (node.tagName === "br") return "\n";
    const value = node.childNodes.map((child) => this.text(child)).join("");
    return CONTAINERS.has(node.tagName) || /^(?:p|li|tr|td|th|h[1-6])$/u.test(node.tagName)
      ? ` ${value} ` : value;
  }

  private scan(node: HtmlNode, depth = 0): void {
    if (depth > 64) throw new Error("HTML nesting exceeds the conversion limit.");
    if (isElement(node)) {
      if (isOmitted(node)) {
        this.warn("html-element-omitted", "Active, embedded or explicitly hidden content is omitted from the reading view.", node.tagName);
        return;
      }
      if (node.attrs.some((item) => item.name.startsWith("on"))) {
        this.warn("html-events-removed", "HTML event handlers are discarded and never executed.");
      }
      if (node.tagName === "link" || node.tagName === "base") {
        this.warn("html-resource-policy", "Stylesheets, base URLs and other external document resources are ignored; no network fetch is performed.");
      }
    }
    if ("childNodes" in node) node.childNodes.forEach((child) => this.scan(child, depth + 1));
  }

  async extract(document: HtmlNode): Promise<void> {
    this.scan(document);
    await this.visit(document);
    for (const { node, fragment } of this.fragmentLinks) {
      const target = this.targets.get(fragment);
      if (target) {
        node.items[0]!.href = `#${target}`;
      } else {
        const index = this.nodes.indexOf(node);
        this.nodes[index] = { type: "paragraph", text: node.items[0]!.label, ...(node.id ? { id: node.id } : {}) };
        this.warn("html-link-omitted", "A fragment link has no retained target; its label remains plain text.", `#${fragment}`);
      }
    }
  }

  private async children(nodes: HtmlNode[]): Promise<void> {
    let prose = "";
    let inlineElements: HtmlElement[] = [];
    const flush = async (): Promise<void> => {
      this.paragraph(prose);
      prose = "";
      for (const element of inlineElements) await this.embedded(element);
      inlineElements = [];
    };
    for (const node of nodes) {
      if (node.nodeName === "#text" && "value" in node) {
        prose += node.value;
        continue;
      }
      if (!isElement(node) || isOmitted(node)) continue;
      if (node.tagName === "br") {
        prose += "\n";
        continue;
      }
      if (INLINE_TEXT_ELEMENTS.has(node.tagName)) {
        prose += this.text(node);
        inlineElements.push(node);
        continue;
      }
      await flush();
      await this.visit(node);
    }
    await flush();
  }

  private async visit(node: HtmlNode): Promise<void> {
    if (!isElement(node)) {
      if ("childNodes" in node) await this.children(node.childNodes);
      return;
    }
    if (isOmitted(node)) return;
    const first = this.nodes.length;
    const sourceId = attribute(node, "id");
    const claimAnchor = sourceId && !this.claimedAnchors.has(sourceId);
    if (sourceId) {
      if (!claimAnchor) this.warn("html-duplicate-id", "Duplicate HTML IDs keep only their first readable target.", sourceId);
      this.claimedAnchors.add(sourceId);
    }
    await this.element(node);
    const target = this.nodes[first];
    if (claimAnchor && target) {
      target.id ??= `html-anchor-${++this.anchorCount}`;
      this.targets.set(sourceId, target.id);
    }
  }

  private async element(node: HtmlElement): Promise<void> {
    const tag = node.tagName;
    if (tag === "head") {
      const title = node.childNodes.find((child) => isElement(child) && child.tagName === "title");
      if (title) this.title = compact(this.text(title)) || undefined;
      return;
    }
    if (/^h[1-6]$/u.test(tag)) {
      const text = compact(this.text(node));
      if (text) {
        const level = Number(tag[1]);
        if (level === 1) this.title ??= text;
        this.emit({ type: "heading", level, text });
      }
      await this.embedded(node);
      return;
    }
    switch (tag) {
      case "p":
      case "pre":
        this.paragraph(this.text(node));
        if (tag === "pre") this.warn("html-code-flattened", "Preformatted/code content becomes plain text; original spacing and syntax remain only in the retained source.");
        await this.embedded(node);
        return;
      case "blockquote": {
        const text = compact(this.text(node));
        if (text) this.emit({ type: "quote", text });
        await this.embedded(node);
        return;
      }
      case "ul":
      case "ol":
        await this.list(node);
        return;
      case "table":
        await this.table(node);
        return;
      case "img":
        await this.image(node);
        return;
      case "a":
        this.link(node);
        await this.embedded(node);
        return;
      case "br":
      case "hr":
      case "link":
      case "base":
      case "meta":
        return;
      default:
        if (CONTAINERS.has(tag)) {
          await this.children(node.childNodes);
        } else {
          this.paragraph(this.text(node));
          await this.embedded(node);
          this.warn("html-semantics-flattened", "Inline or unsupported element semantics become plain text.", tag);
        }
    }
  }

  private async embedded(node: HtmlElement): Promise<void> {
    for (const child of node.childNodes) {
      if (!isElement(child) || isOmitted(child)) continue;
      if (child.tagName === "a" || child.tagName === "img") await this.visit(child);
      else await this.embedded(child);
    }
  }

  private link(node: HtmlElement): void {
    const href = attribute(node, "href")?.trim();
    const label = compact(this.text(node)) || href;
    if (!label) return;
    if (!href || /[\u0000-\u0020\u007f]/u.test(href)) {
      this.paragraph(label);
      this.warn("html-link-omitted", "Missing or unsafe link destination becomes plain text.");
      return;
    }
    const resolved = this.resolveLink?.(href, label);
    if (resolved) {
      this.emit(resolved);
      return;
    }
    if (href.startsWith("#")) {
      try {
        const fragment = decodeURIComponent(href.slice(1));
        const link: PrdGeneralDocumentLinksNode = { type: "links", style: "inline", items: [{ label, href: "#pending" }] };
        this.emit(link);
        this.fragmentLinks.push({ node: link, fragment });
      } catch {
        this.paragraph(label);
        this.warn("html-link-omitted", "Malformed fragment destination becomes plain text.");
      }
      return;
    }
    try {
      const url = new URL(href);
      if (!["https:", "http:", "mailto:", "tel:"].includes(url.protocol)) throw new Error("Unsupported link scheme");
      this.emit({ type: "links", style: "inline", items: [{ label, href: url.href }] });
    } catch {
      this.paragraph(label);
      this.warn("html-link-omitted", "Relative or unsupported link destinations become plain text; the original remains in the retained source.");
    }
  }

  private async image(node: HtmlElement): Promise<void> {
    const reference = attribute(node, "src");
    const alt = compact(attribute(node, "alt") ?? "");
    if (attribute(node, "srcset") || attribute(node, "sizes")) {
      this.warn("html-image-variants", "Responsive image variants are not imported; only src is considered.");
    }
    const resource = reference ? await this.context.resolveImage(reference) : undefined;
    if (resource) {
      this.emit({ type: "image", asset: resource.id, alt: alt || "Imported HTML image" });
      if (!alt) this.warn("html-image-alt", "An image has no non-empty alternative text; a generic label was generated.");
    } else {
      if (alt) this.paragraph(alt);
      if (!reference) this.warn("html-image-omitted", "An image without src is omitted; any alternative text is retained.");
    }
  }

  private async list(node: HtmlElement): Promise<void> {
    const entries = node.childNodes.filter((child): child is HtmlElement => isElement(child) && child.tagName === "li" && !isOmitted(child));
    const items = entries.map((entry) => compact(this.text(entry))).filter(Boolean);
    if (items.length) this.emit({ type: "list", style: node.tagName === "ol" ? "ordered" : "unordered", items });
    if (attribute(node, "start") || attribute(node, "reversed") !== undefined || entries.some((entry) =>
      attribute(entry, "value") !== undefined || this.containsElement(entry, LIST_ELEMENTS)
    )) {
      this.warn("html-list-flattened", "Nested list hierarchy and custom numbering are flattened into ordinary list text.");
    }
    await this.embedded(node);
  }

  private async table(node: HtmlElement): Promise<void> {
    const rows: HtmlElement[] = [];
    for (const child of node.childNodes) {
      if (!isElement(child) || isOmitted(child)) continue;
      if (child.tagName === "tr") rows.push(child);
      if (["thead", "tbody", "tfoot"].includes(child.tagName)) {
        rows.push(...child.childNodes.filter((row): row is HtmlElement => isElement(row) && row.tagName === "tr" && !isOmitted(row)));
      }
    }
    const cells = rows.map((row) => row.childNodes.filter((cell): cell is HtmlElement => isElement(cell) && ["td", "th"].includes(cell.tagName) && !isOmitted(cell)));
    const nestedOrSpanned = cells.some((row) => row.some((cell) =>
      ["rowspan", "colspan"].some((name) => attribute(cell, name) !== undefined && attribute(cell, name) !== "1") ||
      this.containsElement(cell, TABLE_ELEMENTS)
    ));
    const caption = node.childNodes.find((child) => isElement(child) && child.tagName === "caption");
    const captionText = caption ? compact(this.text(caption)) : "";
    const width = Math.max(0, ...cells.map((row) => row.length));
    const exceedsCellBudget = width * cells.length > this.context.limits.maxNodes;
    if (!width || nestedOrSpanned || exceedsCellBudget) {
      this.paragraph(this.text(node));
      this.warn("html-table-flattened", "Empty, nested, merged-cell or over-budget table grids become plain text rather than claiming equivalent table relationships.");
    } else {
      const first = cells[0]!;
      const hasHeader = first.length === width && first.every((cell) => cell.tagName === "th");
      const columns = Array.from({ length: width }, (_, index) => ({
        id: `column-${index + 1}`,
        label: hasHeader ? compact(this.text(first[index]!)) || `Column ${index + 1}` : `Column ${index + 1}`
      }));
      const data = (hasHeader ? cells.slice(1) : cells).map((row) =>
        Object.fromEntries(columns.map((column, index) => [column.id, row[index] ? compact(this.text(row[index]!)) : ""]))
      );
      this.emit({ type: "table", columns, rows: data, ...(captionText ? { caption: captionText } : {}) });
      if (!hasHeader || first.some((cell) => !compact(this.text(cell))) || cells.some((row) => row.length !== width)) {
        this.warn("html-table-normalized", "Table columns use generated labels where needed; missing cells become empty strings.");
      }
    }
    await this.embedded(node);
  }

  private containsElement(node: HtmlElement, tags: ReadonlySet<string>): boolean {
    return node.childNodes.some((child) => isElement(child) && !isOmitted(child) &&
      (tags.has(child.tagName) || this.containsElement(child, tags)));
  }
}

export const htmlAdapter: ImportAdapter = {
  id: "html",
  async detect(source) {
    return /\.html?$/iu.test(source.name) && decodeHtml(source) !== undefined;
  },
  async import(source, context) {
    const text = decodeHtml(source);
    if (text === undefined) throw new Error("HTML input must be UTF-8 HTML, not a binary or XML document.");
    const parsed = await parseHtml(text, context.limits.maxNodes);
    const extracted = new HtmlExtractor(context);
    extracted.warn("html-subset", "Static HTML semantics are reconstructed into PRD nodes. CSS, scripts, embedded applications, layout and inline styling are not preserved. Inline links and images may follow their containing block. Metadata other than title remains only in the original source, available when source retention is enabled.");
    if (parsed.parseErrors.length) {
      extracted.warn("html-parser-recovery", `HTML parser repairs were required: ${parsed.parseErrors.join(", ")}.`);
    }
    await extracted.extract(parsed.document);
    return { title: extracted.title, content: { profile: "general-document", children: extracted.nodes }, warnings: extracted.warnings };
  }
};
