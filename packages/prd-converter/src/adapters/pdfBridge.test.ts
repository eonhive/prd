/**
 * Company: EonHive Inc. | Title: PDF Process Lifecycle Tests
 * Purpose: Prove deadlines, diagnostic limits and clean-exit requirements without hostile PDFs.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractPdfInProcess } from "./pdfBridge.js";
import { DEFAULT_CONVERSION_LIMITS } from "../resources.js";

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "prd-pdf-process-")); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
async function runtime(code: string): Promise<URL> {
  const path = join(root, "process.mjs");
  await writeFile(path, "/** Company: EonHive Inc. | Title: PDF Process Test | Purpose: Exercise lifecycle bounds. Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28 | Notes: Vibe coded with Codex. */\n" + code);
  return pathToFileURL(path);
}
const bytes = new Uint8Array([1]);

describe("PDF process lifecycle", () => {
  it("terminates a stalled import on its deadline", async () => {
    const url = await runtime('process.on("message", () => {});');
    await expect(extractPdfInProcess(bytes, DEFAULT_CONVERSION_LIMITS, { runtime: url, timeoutMs: 100 })).rejects.toThrow("processing deadline");
  });
  it("rejects an incomplete or failed process rather than returning partial data", async () => {
    const url = await runtime('process.on("message", () => process.exit(1));');
    await expect(extractPdfInProcess(bytes, DEFAULT_CONVERSION_LIMITS, { runtime: url })).rejects.toThrow("before producing a complete result");
  });
  it("caps diagnostic output from the import process", async () => {
    const url = await runtime('process.on("message", () => { process.stderr.write("x".repeat(100000)); setInterval(() => {}, 1000); });');
    await expect(extractPdfInProcess(bytes, DEFAULT_CONVERSION_LIMITS, { runtime: url })).rejects.toThrow("diagnostic output limit");
  });
  it("rejects malformed responses", async () => {
    const url = await runtime('process.on("message", () => process.send({ok:true,result:{pages:42}}));');
    await expect(extractPdfInProcess(bytes, DEFAULT_CONVERSION_LIMITS, { runtime: url })).rejects.toThrow("invalid response");
  });
});
