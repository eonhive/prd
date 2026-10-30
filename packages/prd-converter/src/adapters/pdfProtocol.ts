/**
 * Company: EonHive Inc. | Title: PDF Import Process Contract
 * Purpose: Bound isolated PDF work and describe its private extraction result.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
export const PDF_IMPORT_POLICY = Object.freeze({
  timeoutMs: 20_000,
  heapMegabytes: 128,
  maxPages: 64,
  maxRasterPixels: 2_000_000,
  maxImagePixels: 4_000_000,
  maxPagePixels: 16_000_000,
  maxPageDimension: 8192,
  maxTextBytes: 8 * 1024 * 1024,
  maxAuxiliaryBytes: 8 * 1024 * 1024,
  maxDiagnosticBytes: 64 * 1024,
  maxTitleCharacters: 512
});

export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  eol: boolean;
  nonHorizontal: boolean;
}

export interface PdfPageResult {
  number: number;
  items: PdfTextItem[];
  png?: Uint8Array;
  rasterWidth?: number;
  rasterHeight?: number;
}

export interface PdfExtraction {
  pages: PdfPageResult[];
  title?: string;
  titleTruncated: boolean;
  diagnostics: number;
}
