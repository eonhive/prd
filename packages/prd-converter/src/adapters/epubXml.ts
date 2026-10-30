/**
 * Company: EonHive Inc. | Title: Bounded EPUB XML Reader
 * Purpose: Read namespace-aware XML without DTDs, external entities or filesystem access.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import type { HtmlDocument, HtmlElement } from "./htmlTree.js";

import { parseXml, type XmlBudget, type XmlElement } from "./xml.js";
export { xmlChildren, xmlText, type XmlBudget, type XmlElement } from "./xml.js";

export function parseEpubXml(bytes: Uint8Array, budget: XmlBudget): Promise<XmlElement> {
  return parseXml(bytes, budget, "EPUB");
}

export function xhtmlTree(root: XmlElement): HtmlDocument {
  const document: HtmlDocument = { nodeName: "#document", mode: "no-quirks" as HtmlDocument["mode"], childNodes: [] };
  function append(source: XmlElement | string, parent: HtmlDocument | HtmlElement): void {
    if (typeof source === "string") {
      parent.childNodes.push({ nodeName: "#text", value: source, parentNode: parent });
      return;
    }
    // Reuse the HTML extractor's tree shape. Foreign content keeps no HTML-specific semantics.
    const local = source.name.toLowerCase();
    const tagName = source.namespace === "http://www.w3.org/1999/xhtml" || ["svg", "math", "script", "style"].includes(local)
      ? local : `foreign-${local}`;
    const element: HtmlElement = {
      nodeName: tagName, tagName, namespaceURI: source.namespace as HtmlElement["namespaceURI"],
      attrs: Object.entries(source.attributes).map(([name, value]) => ({ name, value })),
      childNodes: [], parentNode: parent
    };
    parent.childNodes.push(element);
    for (const child of source.children) append(child, element);
  }
  append(root, document);
  return document;
}
