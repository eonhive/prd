/**
 * Company: EonHive Inc. | Title: Convert Web Worker
 * Purpose: Run bounded Markdown conversion away from the interface thread.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import { convertInBrowser, type BrowserConvertOptions } from "@eonhive/prd-converter/browser";

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<BrowserConvertOptions>) => void;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};
scope.onmessage = async ({ data }) => {
  try {
    const result = await convertInBrowser(data);
    scope.postMessage({ result }, [result.archive.buffer as ArrayBuffer]);
  } catch (error) {
    scope.postMessage({ error: error instanceof Error ? error.message : "Conversion failed." });
  }
};
