/**
 * Company: EonHive Inc. | Title: DOCX Visible Text Reader
 * Purpose: Keep stored readable text while reporting revisions, fields and unsupported objects.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { WORD_NS, type DocxWarn } from "./docxPackage.js";
import { enabled, wordChild } from "./docxStyles.js";
import { xmlChildren, type XmlElement } from "./xml.js";

export const compactWordText = (text: string): string => text.replace(/\s+/gu, " ").trim();
const MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006";

export class DocxText {
  constructor(private readonly warn: DocxWarn) {}

  children(element: XmlElement): XmlElement[] {
    const children = element.children.filter((child): child is XmlElement => typeof child !== "string");
    if (element.namespace === "http://schemas.openxmlformats.org/officeDocument/2006/math") {
      this.warn("docx-equation-omitted", "Native Word equations are not reconstructed; their original notation remains only in the retained source.");
      return [];
    }
    if (element.namespace === MC_NS && element.name === "AlternateContent") {
      this.warn("docx-alternate-content", "Only the fallback, or first available alternate-content branch, is read.");
      const branch = xmlChildren(element, "Fallback", MC_NS)[0] ?? xmlChildren(element, "Choice", MC_NS)[0];
      return branch ? this.children(branch) : [];
    }
    if (element.namespace !== WORD_NS) return children;
    if (["del", "moveFrom", "delText"].includes(element.name)) {
      this.warn("docx-revisions", "Inserted/current content is read; deleted/moved-from content is omitted. Review history remains in the retained source.");
      return [];
    }
    if (["ins", "moveTo"].includes(element.name)) this.warn("docx-revisions", "Inserted/current content is read; deleted/moved-from content is omitted. Review history remains in the retained source.");
    if (["object", "pict", "altChunk", "txbxContent"].includes(element.name)) {
      this.warn("docx-object-omitted", "Embedded objects, VML, text boxes or alternate imported content are omitted from reading.", element.name);
      return [];
    }
    if (["instrText", "fldChar", "fldSimple"].includes(element.name)) {
      this.warn("docx-fields", "Field instructions are never evaluated; only stored result text, where present, is retained.");
      if (element.name !== "fldSimple") return [];
    }
    if (element.name === "r") {
      const properties = wordChild(element, "rPr");
      if (enabled(wordChild(properties, "vanish")) || enabled(wordChild(properties, "specVanish"))) {
        this.warn("docx-hidden-run", "A run explicitly marked hidden is omitted from reading; style-based visibility is not evaluated.");
        return [];
      }
    }
    return children;
  }

  *walk(element: XmlElement): Generator<XmlElement> {
    yield element;
    for (const child of this.children(element)) yield* this.walk(child);
  }

  text(element: XmlElement): string {
    if (element.namespace === WORD_NS) {
      if (element.name === "t") return element.children.filter((child): child is string => typeof child === "string").join("");
      if (["tab", "br", "cr"].includes(element.name)) return " ";
      if (element.name === "noBreakHyphen") return "\u2011";
      if (element.name === "softHyphen") return "\u00ad";
      if (["footnoteReference", "endnoteReference", "commentReference", "sym"].includes(element.name)) this.warn("docx-reference-omitted", "Notes, comments and font-symbol references are not reconstructed; their source material remains in the original archive.", element.name);
    }
    return this.children(element).map((child) => this.text(child)).join("");
  }
}
