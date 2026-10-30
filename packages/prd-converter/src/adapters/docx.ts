/**
 * Company: EonHive Inc. | Title: DOCX Import Adapter
 * Purpose: Convert a bounded transitional Word body through canonical PRD validation and packaging.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { readPrdArchive } from "@eonhive/prd-validator/container";
import type { ConversionWarning, ImportAdapter } from "../contracts.js";
import { DocxPackage, WORD_NS } from "./docxPackage.js";
import { DocxStyles } from "./docxStyles.js";
import { DocxContent } from "./docxContent.js";
import { xmlChildren } from "./xml.js";

export const docxAdapter: ImportAdapter = {
  id: "docx",
  async detect(source) {
    return /\.docx$/iu.test(source.name) && source.bytes[0] === 0x50 && source.bytes[1] === 0x4b && source.bytes[2] === 3 && source.bytes[3] === 4;
  },
  async import(source, context) {
    if (!context.collectImage) throw new Error("DOCX import requires bounded archive-image collection.");
    const limits = context.limits;
    const files = readPrdArchive(source.bytes, {
      maxArchiveBytes: limits.maxInputBytes, maxFileBytes: limits.maxResourceBytes,
      maxExpandedBytes: limits.maxTotalResourceBytes, maxEntries: limits.maxResources
    });
    const warnings: ConversionWarning[] = [];
    const warned = new Set<string>();
    const warn = (code: string, message: string, reference?: string): void => {
      const key = `${code}:${reference ?? ""}`;
      if (warned.has(key)) return;
      warned.add(key);
      warnings.push({ code, stage: "extract", message, ...(reference ? { reference } : {}) });
    };
    const pkg = new DocxPackage(files, limits.maxNodes);
    const document = await pkg.open();
    const bodies = xmlChildren(document, "body", WORD_NS);
    if (bodies.length !== 1) throw new Error("DOCX requires exactly one document body.");
    const styles = new DocxStyles(warn);
    await styles.load(pkg);
    const content = new DocxContent(pkg, styles, context, warn, await pkg.title());
    warn("docx-subset", "Word body semantics are reconstructed. Inline emphasis, style-based visibility, typography, page layout, sections, headers/footers, notes/comments, equations, charts and metadata beyond title are not fully mapped. Links and images may follow their containing block. Original material is available only with source retention.");
    await content.blocks(bodies[0]!);
    content.resolveLinks();
    if (!content.nodes.length) throw new Error("DOCX has no supported readable body content.");
    const omitted = Object.keys(files).filter((path) => !pkg.used.has(path)).length;
    if (omitted) warn("docx-members-omitted", `${omitted} archive members are not mapped into reading, including unused media, metadata or unsupported Word parts. They remain available only with source retention.`);
    return { title: content.title, content: { profile: "general-document", children: content.nodes }, warnings };
  }
};
