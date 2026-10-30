/**
 * Company: EonHive Inc. | Title: PDF Text Normalization
 * Purpose: Group bounded extraction items into readable lines without claiming logical reading order.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import type { PdfTextItem } from "./pdfProtocol.js";

export function pdfLines(items: readonly PdfTextItem[]): { lines: string[]; repaired: boolean } {
  const lines: string[] = [];
  let line = "";
  let previous: PdfTextItem | undefined;
  let repaired = false;
  const flush = (): void => {
    const text = line.replace(/\s+/gu, " ").trim();
    if (text) lines.push(text);
    line = "";
    previous = undefined;
  };
  for (const item of items) {
    const text = item.text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "\ufffd");
    repaired ||= text !== item.text;
    const height = Math.max(item.height, previous?.height ?? 0, 1);
    if (previous && Math.abs(previous.y - item.y) > height * 0.55) flush();
    if (previous && item.x - (previous.x + previous.width) > height * 0.15 && !/\s$/u.test(line) && !/^\s/u.test(text)) line += " ";
    line += text;
    previous = item;
    if (item.eol) flush();
  }
  flush();
  return { lines, repaired };
}
