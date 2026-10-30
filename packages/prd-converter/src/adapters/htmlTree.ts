/**
 * Company: EonHive Inc. | Title: Bounded HTML Parsing
 * Purpose: Load the optional HTML parser and limit its tree-building work.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import type { DefaultTreeAdapterMap, TreeAdapter } from "parse5";

export type HtmlNode = DefaultTreeAdapterMap["node"];
export type HtmlElement = DefaultTreeAdapterMap["element"];
export type HtmlDocument = DefaultTreeAdapterMap["document"];

export function isElement(node: HtmlNode): node is HtmlElement {
  return "tagName" in node;
}

export function attribute(element: HtmlElement, name: string): string | undefined {
  return element.attrs.find((item) => item.name === name)?.value;
}

export async function parseHtml(text: string, maxNodes: number): Promise<{
  document: HtmlDocument;
  parseErrors: string[];
}> {
  let parser: typeof import("parse5");
  try {
    parser = await import("parse5");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error("HTML conversion requires the optional parse5 dependency. Install parse5@^8.0.1 in the converter's environment.");
    }
    throw error;
  }
  const base = parser.defaultTreeAdapter;
  let operations = 0;
  let depth = 0;
  function consume(): void {
    operations += 1;
    if (operations > maxNodes) throw new Error("HTML parse node budget exceeds the conversion limit.");
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
      depth += 1;
      if (depth > 64) throw new Error("HTML nesting exceeds the conversion limit.");
    },
    onItemPop() { depth -= 1; }
  };
  const errors = new Set<string>();
  const document = parser.parse(text, {
    treeAdapter,
    scriptingEnabled: false,
    onParseError(error) {
      // Fragments intentionally omit a doctype. Other parser repairs remain visible in the report.
      if (error.code !== "missing-doctype") errors.add(error.code);
    }
  });
  return { document, parseErrors: [...errors].sort() };
}
