/**
 * Company: EonHive Inc. | Title: PDF Import Adapter
 * Purpose: Map isolated PDF text extraction and textless-page images into canonical PRD sections.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import type { PrdGeneralDocumentInlineSectionNode } from "@eonhive/prd-types";
import type { ConversionWarning, ImportAdapter } from "../contracts.js";
import { extractPdfInProcess } from "./pdfBridge.js";
import { pdfLines } from "./pdfText.js";

export const pdfAdapter: ImportAdapter = {
  id: "pdf",
  async detect(source) {
    return /\.pdf$/iu.test(source.name) && /^%PDF-(?:1\.[0-7]|2\.0)[\r\n\t ]/u.test(Buffer.from(source.bytes.subarray(0, 9)).toString("ascii"));
  },
  async import(source, context) {
    if (!context.collectImage) throw new Error("PDF import requires bounded image collection.");
    if (!/%%EOF[\x00\x09\x0a\x0c\x0d\x20]*$/u.test(Buffer.from(source.bytes.subarray(-1024)).toString("latin1"))) throw new Error("PDF input has no complete end marker.");
    const extracted = await extractPdfInProcess(source.bytes, context.limits);
    const warnings: ConversionWarning[] = [
      { code: "pdf-reading-order", stage: "extract", message: "Text follows PDF extraction order and line grouping, which may differ from logical reading order. Headings, columns, tables, footnotes and semantic roles are not inferred; review every page." },
      { code: "pdf-subset", stage: "extract", message: "Text-bearing pages become responsive line paragraphs; non-text content on those pages remains only in retained source. Textless pages use bounded raster fallback without OCR or authored descriptions. Original layout, links, annotations, forms, scripts, attachments and metadata beyond title are not reconstructed." }
    ];
    const sections: PrdGeneralDocumentInlineSectionNode[] = [];
    let nodes = 0;
    for (const page of extracted.pages) {
      const id = `pdf-page-${page.number}`;
      const section: PrdGeneralDocumentInlineSectionNode = { type: "section", id, title: `Page ${page.number}`, children: [] };
      const { lines, repaired } = pdfLines(page.items);
      for (const [index, text] of lines.entries()) section.children.push({ type: "paragraph", id: `${id}-line-${index + 1}`, text });
      if (page.png) {
        const image = await context.collectImage(`pdf-pages/page-${page.number}.png`, page.png);
        if (!image) throw new Error("PDF page raster could not be collected within resource limits.");
        section.children.push({ type: "image", id: `${id}-image`, asset: image.id, alt: `PDF page ${page.number} rendered without extractable text; inspect its visual content.` });
        warnings.push({ code: "pdf-page-image-fallback", stage: "extract", reference: id, message: "This page has no extractable text and is retained as a rendered image. No OCR or image-content description was generated." });
      }
      if (!section.children.length) throw new Error("PDF page has no retained readable content or page image.");
      nodes += 1 + section.children.length;
      if (nodes > context.limits.maxNodes) throw new Error("PDF content node count exceeds the conversion limit.");
      if (repaired) warnings.push({ code: "pdf-text-repaired", stage: "extract", reference: id, message: "Control characters in extracted text were replaced with visible replacement characters." });
      if (page.items.some((item) => item.nonHorizontal)) warnings.push({ code: "pdf-layout-review", stage: "extract", reference: id, message: "Rotated, vertical or non-left-to-right text requires manual order review; direction/layout is not reconstructed." });
      sections.push(section);
    }
    if (extracted.titleTruncated) warnings.push({ code: "pdf-title-truncated", stage: "extract", message: "The source title exceeded the import limit and was truncated; full metadata remains only in retained source." });
    if (extracted.diagnostics) warnings.push({ code: "pdf-parser-diagnostics", stage: "extract", message: `The parser emitted ${extracted.diagnostics} diagnostic messages. Source review is required; raw parser paths and snippets are not exported.` });
    return { title: extracted.title, content: { profile: "general-document", children: sections }, warnings };
  }
};
