/**
 * Company: EonHive Inc. | Title: PRD Markdown Import Adapter
 * Purpose: Detect bounded UTF-8 Markdown and extract the existing structured subset.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import type { ImportAdapter, ImportSource } from "../contracts.js";
import { parseMarkdown } from "./markdownParser.js";

function decodeMarkdown(source: ImportSource): string | undefined {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(source.bytes);
    // Markdown has no magic bytes. A suffix is a hint, never permission to parse a binary or HTML file.
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text)) return undefined;
    if (/^\s*(?:%PDF-|PK\u0003\u0004|<!doctype\s+html|<html\b|<\?xml|\{\s*"|\[\s*\{)/iu.test(text)) return undefined;
    return text;
  } catch {
    return undefined;
  }
}

export const markdownAdapter: ImportAdapter = {
  id: "markdown",
  async detect(source) {
    return /\.(md|markdown)$/iu.test(source.name) && decodeMarkdown(source) !== undefined;
  },
  async import(source, context) {
    const text = decodeMarkdown(source);
    if (text === undefined) throw new Error("Markdown input must contain UTF-8 text, not a binary or HTML document.");
    const parsed = await parseMarkdown(
      text,
      (reference) => context.resolveImage(reference),
      { plainParagraphs: true, maxNodes: context.limits.maxNodes }
    );
    return {
      title: parsed.title,
      content: { profile: "general-document", children: parsed.nodes },
      warnings: [
        {
          code: "markdown-subset",
          stage: "extract",
          message: "Only ATX headings, paragraphs, flat lists, blockquotes and standalone local raster images are mapped. Inline styling is flattened; links, tables, nested lists, code and HTML have no equivalent semantics. Consult the source attachment for original syntax and omitted content."
        },
        ...parsed.warnings.map((message) => ({ code: "markdown-unsupported", stage: "extract" as const, message }))
      ]
    };
  }
};
