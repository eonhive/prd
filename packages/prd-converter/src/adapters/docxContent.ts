/**
 * Company: EonHive Inc. | Title: DOCX Semantic Content Reader
 * Purpose: Map readable Word body content into canonical PRD nodes with explicit loss warnings.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { posix } from "node:path";
import type { PrdGeneralDocumentNode, PrdGeneralDocumentListNode, PrdGeneralDocumentLinksNode } from "@eonhive/prd-types";
import type { ImportContext } from "../contracts.js";
import { DocxPackage, REL_NS, WORD_NS, type DocxWarn } from "./docxPackage.js";
import { DocxStyles, enabled, wordChild, wordValue, type SimpleList } from "./docxStyles.js";
import { DocxText, compactWordText } from "./docxText.js";
import { xmlAttribute, xmlChildren, type XmlElement } from "./xml.js";

const DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const WORD_DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const RASTER_TYPES = new Map([[".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".gif", "image/gif"], [".webp", "image/webp"]]);

export class DocxContent {
  readonly nodes: PrdGeneralDocumentNode[] = [];
  private readonly reader: DocxText;
  private readonly bookmarks = new Map<string, string>();
  private readonly pending: Array<{ node: PrdGeneralDocumentLinksNode; anchor: string }> = [];
  private readonly counts = new Map<string, number>();
  private lastList?: { key: string; node: PrdGeneralDocumentListNode };
  private foldedTitle?: string;

  constructor(
    private readonly pkg: DocxPackage, private readonly styles: DocxStyles,
    private readonly context: ImportContext, private readonly warn: DocxWarn,
    public title?: string
  ) { this.reader = new DocxText(warn); }

  private emit<T extends PrdGeneralDocumentNode>(node: T): T {
    if (this.nodes.length >= this.context.limits.maxNodes) throw new Error("DOCX content node count exceeds the conversion limit.");
    node.id ??= `docx-node-${this.nodes.length + 1}`;
    this.nodes.push(node);
    this.lastList = undefined;
    return node;
  }

  private claimBookmarks(source: XmlElement, target: string, coarse = false): void {
    for (const element of this.reader.walk(source)) {
      if (element.namespace !== WORD_NS || element.name !== "bookmarkStart") continue;
      const name = xmlAttribute(element, "name", WORD_NS);
      if (!name) continue;
      if (coarse) this.warn("docx-bookmark-container", "A bookmark inside a table or grouped list targets its containing node rather than an individual cell or item.");
      if (this.bookmarks.has(name)) this.warn("docx-bookmark-duplicate", "A duplicate bookmark keeps only its first retained target.");
      else this.bookmarks.set(name, target);
    }
  }

  private listItem(list: SimpleList, text: string): PrdGeneralDocumentNode {
    const count = (this.counts.get(list.key) ?? 0) + 1;
    this.counts.set(list.key, count);
    if (this.lastList?.key === list.key) {
      this.lastList.node.items.push(text);
      return this.lastList.node;
    }
    if (list.style === "ordered" && count > 1) {
      this.warn("docx-list-continuation", "A continued simple decimal list uses explicit number text after an interruption because PRD lists do not encode a starting number.");
      return this.emit({ type: "paragraph", text: `${count}. ${text}` });
    }
    const node = this.emit({ type: "list", style: list.style, items: [text] });
    this.lastList = { key: list.key, node };
    return node;
  }

  private async paragraph(source: XmlElement): Promise<void> {
    const text = compactWordText(this.reader.text(source));
    const properties = this.styles.properties(source);
    let node: PrdGeneralDocumentNode | undefined;
    if (text && properties.title && !this.nodes.length && (!this.title || this.title === text)) {
      this.title ??= text;
      this.foldedTitle = text;
      this.claimBookmarks(source, "document");
      this.warn("docx-title-normalized", "The matching opening Word title becomes the PRD document title; its bookmark target is retained.");
    } else if (text) {
      const outline = properties.outline;
      if (outline !== undefined && /^[0-8]$/u.test(outline)) {
        const level = Math.min(Number(outline) + 1, 6);
        if (Number(outline) > 5) this.warn("docx-heading-normalized", "Heading depths beyond six are mapped to level six.");
        if (properties.numId && properties.numId !== "0") this.warn("docx-heading-numbering", "Numbered heading labels are not generated; heading text and structure are retained.");
        node = this.emit({ type: "heading", level, text });
        this.title ??= text;
      } else {
        const list = this.styles.list(properties);
        node = list ? this.listItem(list, text) : this.emit({ type: "paragraph", text });
      }
    } else if (properties.numId && properties.numId !== "0") {
      const list = this.styles.list(properties);
      if (list?.style === "ordered") this.counts.set(list.key, (this.counts.get(list.key) ?? 0) + 1);
      this.warn("docx-empty-list-item", "An empty numbered paragraph is omitted; simple decimal position is retained for following items.");
      this.lastList = undefined;
    }
    if (node?.id) this.claimBookmarks(source, node.id, node.type === "list");
    await this.embedded(source);
    if (wordChild(wordChild(source, "pPr"), "sectPr")) this.warn("docx-section-layout", "Section page sizes, breaks, columns, headers and footers are not mapped to responsive document layout.");
  }

  private cellText(cell: XmlElement): string {
    return compactWordText([...this.reader.walk(cell)]
      .filter((element) => element.namespace === WORD_NS && element.name === "p")
      .map((paragraph) => this.reader.text(paragraph)).join(" "));
  }

  private async table(source: XmlElement): Promise<void> {
    const rows = xmlChildren(source, "tr", WORD_NS);
    const cells = rows.map((row) => xmlChildren(row, "tc", WORD_NS));
    const width = cells.reduce((maximum, row) => Math.max(maximum, row.length), 0);
    const complex = !width || cells.some((row) => row.length !== width || row.some((cell) =>
      [...this.reader.walk(cell)].some((element) => element.namespace === WORD_NS &&
        (element.name === "tbl" || ["vMerge", "hMerge"].includes(element.name) || element.name === "gridSpan" && wordValue(element) !== "1"))));
    let node: PrdGeneralDocumentNode | undefined;
    if (complex) {
      const text = cells.map((row) => row.map((cell) => this.cellText(cell)).join(" | ")).join("; ");
      if (text.trim()) node = this.emit({ type: "paragraph", text });
      this.warn("docx-table-flattened", "Nested, merged or irregular tables become readable cell text rather than claiming equivalent table relationships.");
    } else {
      if (width * cells.length > this.context.limits.maxNodes) throw new Error("DOCX table cell count exceeds the conversion limit.");
      const header = enabled(wordChild(wordChild(rows[0], "trPr"), "tblHeader"));
      const columns = cells[0]!.map((cell, index) => ({ id: `column-${index + 1}`, label: header ? this.cellText(cell) || `Column ${index + 1}` : `Column ${index + 1}` }));
      const data = (header ? cells.slice(1) : cells).map((row) => Object.fromEntries(columns.map((column, index) => [column.id, this.cellText(row[index]!)])));
      node = this.emit({ type: "table", columns, rows: data });
      if (!header || cells[0]!.some((cell) => !this.cellText(cell))) this.warn("docx-table-columns", "Generated column labels replace missing header labels; a table without a declared header retains all rows as data.");
    }
    if (node?.id) this.claimBookmarks(source, node.id, true);
    await this.embedded(source);
  }

  private link(source: XmlElement): void {
    const label = compactWordText(this.reader.text(source));
    if (!label) {
      this.warn("docx-link-omitted", "A hyperlink without readable label text is not mapped; linked image navigation remains only in the retained source.");
      return;
    }
    const id = xmlAttribute(source, "id", REL_NS);
    const anchor = xmlAttribute(source, "anchor", WORD_NS);
    const relation = id ? this.pkg.relationships.get(id) : undefined;
    if ((!id && anchor) || relation?.type === `${REL_NS}/hyperlink` && relation.path === this.pkg.mainPath && relation.fragment) {
      const node = this.emit({ type: "links", style: "inline", items: [{ label, href: "#pending" }] });
      this.pending.push({ node, anchor: id ? relation!.fragment! : anchor! });
      return;
    }
    try {
      if (relation?.type !== `${REL_NS}/hyperlink` || !relation.external || /[\u0000-\u0020\u007f]/u.test(relation.external)) throw new Error("Unsupported hyperlink");
      const url = new URL(relation.external);
      if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) throw new Error("Unsupported scheme");
      this.emit({ type: "links", style: "inline", items: [{ label, href: url.href }] });
      if (anchor) this.warn("docx-external-anchor", "An external hyperlink's separate Word anchor is not mapped; its declared URL is retained.");
    } catch {
      this.warn("docx-link-omitted", "An unsafe, missing or unsupported hyperlink keeps its readable label without an active destination.");
    }
  }

  private async image(source: XmlElement): Promise<void> {
    const elements = [...this.reader.walk(source)];
    const blips = elements.filter((element) => element.namespace === DRAWING_NS && element.name === "blip");
    const description = elements.find((element) => element.namespace === WORD_DRAWING_NS && element.name === "docPr");
    const alt = compactWordText(xmlAttribute(description, "descr") ?? xmlAttribute(description, "title") ?? "");
    const id = blips.length === 1 ? xmlAttribute(blips[0], "embed", REL_NS) : undefined;
    const relation = id ? this.pkg.relationships.get(id) : undefined;
    const path = relation?.path;
    const type = path ? RASTER_TYPES.get(posix.extname(path).toLowerCase()) : undefined;
    if (relation?.type !== `${REL_NS}/image` || !path || !this.pkg.files[path] ||
      !type || type !== this.pkg.contentType(path)) {
      if (alt) this.emit({ type: "paragraph", text: alt });
      this.warn("docx-image-omitted", "An external, missing or unsupported drawing is omitted; available alternative text is retained.");
      return;
    }
    const resource = await this.context.collectImage!(path, this.pkg.files[path]!);
    if (!resource) { if (alt) this.emit({ type: "paragraph", text: alt }); return; }
    this.pkg.used.add(path);
    this.emit({ type: "image", asset: resource.id, alt: alt || "Imported Word image" });
    if (!alt) this.warn("docx-image-alt", "An image without authored alternative text uses a generic label.");
  }

  private async embedded(source: XmlElement): Promise<void> {
    for (const element of this.reader.walk(source)) {
      if (element.namespace !== WORD_NS) continue;
      if (element.name === "hyperlink") this.link(element);
      if (element.name === "drawing") await this.image(element);
    }
  }

  async blocks(parent: XmlElement): Promise<void> {
    for (const element of this.reader.children(parent)) {
      if (element.namespace === WORD_NS && element.name === "p") await this.paragraph(element);
      else if (element.namespace === WORD_NS && element.name === "tbl") await this.table(element);
      else if (element.namespace === WORD_NS && element.name === "sectPr") this.warn("docx-section-layout", "Section page sizes, breaks, columns, headers and footers are not mapped to responsive document layout.");
      else {
        this.warn("docx-container-flattened", "An unsupported body container is traversed for readable paragraphs; its specialized behavior is not retained.", element.name);
        await this.blocks(element);
      }
    }
  }

  resolveLinks(): void {
    for (const { node, anchor } of this.pending) {
      const target = this.bookmarks.get(anchor);
      if (target) node.items[0]!.href = `#${target}`;
      else {
        this.nodes.splice(this.nodes.indexOf(node), 1);
        this.warn("docx-link-omitted", "A bookmark link has no retained target; its label remains in the containing paragraph or table.");
      }
    }
    if (!this.nodes.length && this.foldedTitle) {
      this.emit({ type: "paragraph", text: this.foldedTitle });
      this.warn("docx-title-body", "A title-only document also retains its title as body text to provide a readable canonical entry.");
    }
  }
}
