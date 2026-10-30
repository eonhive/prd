/**
 * Company: EonHive Inc. | Title: Shared Markdown Extraction
 * Purpose: Reuse the existing CLI Markdown subset without constructing PRD manifests.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import type { PrdGeneralDocumentNode } from "@eonhive/prd-types";

type ParsedMarkdown = {
  title?: string;
  nodes: PrdGeneralDocumentNode[];
  warnings: string[];
};

export async function parseMarkdown(
  markdown: string,
  resolveImage: (href: string, warnings: string[]) => Promise<{ id: string } | undefined>,
  options: { plainParagraphs?: boolean; maxNodes?: number } = {}
): Promise<ParsedMarkdown> {
  const state: ParsedMarkdown = {
    nodes: [],
    warnings: []
  };
  const lines = markdown.replace(/\r\n?/gu, "\n").split("\n");
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listStyle: "ordered" | "unordered" | undefined;
  let quoteLines: string[] = [];
  let inFence = false;

  function pushNode(node: PrdGeneralDocumentNode): void {
    if (options.maxNodes !== undefined && state.nodes.length >= options.maxNodes) {
      throw new Error("Content node count exceeds the conversion limit.");
    }
    state.nodes.push(node);
  }

  function flushParagraph(): void {
    if (paragraphLines.length === 0) {
      return;
    }

    const text = paragraphLines.join(" ").trim();
    pushNode({
      type: "paragraph",
      text: options.plainParagraphs ? cleanInlineText(text) : text
    });
    paragraphLines = [];
  }

  function flushList(): void {
    if (!listStyle || listItems.length === 0) {
      return;
    }

    pushNode({
      type: "list",
      style: listStyle,
      items: listItems
    });
    listItems = [];
    listStyle = undefined;
  }

  function flushQuote(): void {
    if (quoteLines.length === 0) {
      return;
    }

    pushNode({
      type: "quote",
      text: quoteLines.join(" ").trim()
    });
    quoteLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      flushParagraph();
      flushList();
      flushQuote();
      if (!inFence) {
        state.warnings.push(
          "Skipped fenced code block; code nodes are not supported by markdown import v0.1."
        );
      }
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    if (trimmed.length === 0) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const heading = parseHeading(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();
      if (!state.title && heading.level === 1) {
        state.title = heading.text;
      }
      pushNode({
        type: "heading",
        level: heading.level,
        text: heading.text
      });
      continue;
    }

    const listItem = parseListItem(trimmed);
    if (listItem) {
      flushParagraph();
      flushQuote();
      if (listStyle && listStyle !== listItem.style) {
        flushList();
      }
      listStyle = listItem.style;
      listItems.push(listItem.text);
      continue;
    }

    const quote = parseQuote(trimmed);
    if (quote) {
      flushParagraph();
      flushList();
      quoteLines.push(quote);
      continue;
    }

    const image = parseStandaloneImage(trimmed);
    if (image) {
      flushParagraph();
      flushList();
      flushQuote();
      const asset = await resolveImage(image.href, state.warnings);
      if (!asset) {
        continue;
      }

      pushNode({
        type: "image",
        asset: asset.id,
        alt: image.alt,
        caption: image.title
      });
      continue;
    }

    if (looksLikeRawHtml(trimmed)) {
      flushParagraph();
      flushList();
      flushQuote();
      state.warnings.push("Skipped raw HTML; HTML import is not supported by markdown import v0.1.");
      continue;
    }

    flushList();
    flushQuote();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushQuote();

  return state;
}

function parseHeading(line: string): { level: number; text: string } | undefined {
  const match = /^(#{1,6})\s+(.+?)\s*#*$/u.exec(line);
  const marker = match?.[1];
  const text = match?.[2];
  if (!marker || !text) {
    return undefined;
  }

  const cleanedText = cleanInlineText(text);
  if (cleanedText.length === 0) {
    return undefined;
  }

  return {
    level: marker.length,
    text: cleanedText
  };
}

function parseListItem(
  line: string
): { style: "ordered" | "unordered"; text: string } | undefined {
  const unordered = /^[-*+]\s+(.+)$/u.exec(line);
  const unorderedText = unordered?.[1];
  if (unorderedText) {
    const cleanedText = cleanInlineText(unorderedText);
    if (cleanedText.length === 0) {
      return undefined;
    }

    return {
      style: "unordered",
      text: cleanedText
    };
  }

  const ordered = /^\d+[.)]\s+(.+)$/u.exec(line);
  const orderedText = ordered?.[1];
  if (orderedText) {
    const cleanedText = cleanInlineText(orderedText);
    if (cleanedText.length === 0) {
      return undefined;
    }

    return {
      style: "ordered",
      text: cleanedText
    };
  }

  return undefined;
}

function parseQuote(line: string): string | undefined {
  const match = /^>\s?(.+)$/u.exec(line);
  const text = match?.[1];
  const cleanedText = text ? cleanInlineText(text) : "";
  return cleanedText.length > 0 ? cleanedText : undefined;
}

function parseStandaloneImage(
  line: string
): { alt: string; href: string; title?: string } | undefined {
  const match = /^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]+)")?\)$/u.exec(line);
  const alt = match?.[1];
  const href = match?.[2];
  const title = match?.[3];
  if (alt === undefined || !href) {
    return undefined;
  }

  const parsed = {
    alt: cleanInlineText(alt) || "Imported Markdown image",
    href
  };

  return title
    ? {
        ...parsed,
        title: cleanInlineText(title)
      }
    : parsed;
}

function cleanInlineText(value: string): string {
  return value
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\*\*([^*]+)\*\*/gu, "$1")
    .replace(/__([^_]+)__/gu, "$1")
    .replace(/\*([^*]+)\*/gu, "$1")
    .replace(/_([^_]+)_/gu, "$1")
    .trim();
}

function looksLikeRawHtml(line: string): boolean {
  return /^<\/?[a-z][\s\S]*>$/iu.test(line);
}
