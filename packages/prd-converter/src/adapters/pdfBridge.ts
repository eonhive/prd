/**
 * Company: EonHive Inc. | Title: Isolated PDF Import Bridge
 * Purpose: Enforce a deadline and diagnostic cap before accepting a complete PDF process result.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import { fork } from "node:child_process";
import type { ConversionLimits } from "../contracts.js";
import { PDF_IMPORT_POLICY, type PdfExtraction } from "./pdfProtocol.js";

interface ProcessOptions { runtime?: URL; timeoutMs?: number }

export function extractPdfInProcess(
  bytes: Uint8Array, limits: Readonly<ConversionLimits>, options: ProcessOptions = {}
): Promise<PdfExtraction> {
  if (bytes.byteLength > limits.maxInputBytes) return Promise.reject(new Error("PDF input exceeds the conversion byte limit."));
  return new Promise((resolve, reject) => {
    const child = fork(options.runtime ?? new URL("./pdfWorker.mjs", import.meta.url), [], {
      execArgv: [`--max-old-space-size=${PDF_IMPORT_POLICY.heapMegabytes}`],
      serialization: "advanced", stdio: ["ignore", "pipe", "pipe", "ipc"]
    });
    let failure: Error | undefined;
    let result: PdfExtraction | undefined;
    let diagnosticBytes = 0;
    const stop = (message: string): void => {
      failure ??= new Error(message);
      child.kill("SIGKILL");
    };
    const timer = setTimeout(() => stop("PDF conversion exceeded its processing deadline."), options.timeoutMs ?? PDF_IMPORT_POLICY.timeoutMs);
    const observe = (chunk: Buffer): void => {
      diagnosticBytes += chunk.byteLength;
      if (diagnosticBytes > PDF_IMPORT_POLICY.maxDiagnosticBytes) stop("PDF processing exceeded its diagnostic output limit.");
    };
    child.stdout?.on("data", observe);
    child.stderr?.on("data", observe);
    child.on("message", (message: unknown) => {
      if (!message || typeof message !== "object" || !("ok" in message)) { stop("PDF process returned an invalid response."); return; }
      if (message.ok === false && "error" in message && typeof message.error === "string") {
        stop(message.error.slice(0, 1024));
      } else if (message.ok === true && "result" in message && message.result && typeof message.result === "object" &&
        "pages" in message.result && Array.isArray(message.result.pages)) {
        if (result) stop("PDF process returned multiple results.");
        else result = message.result as PdfExtraction;
      } else stop("PDF process returned an invalid response.");
    });
    child.on("error", () => {
      failure ??= new Error("Unable to start or communicate with the isolated PDF import process.");
      child.kill("SIGKILL");
    });
    // A result alone is insufficient: wait for process shutdown before packaging any output.
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0 || !result) reject(new Error("PDF processing failed before producing a complete result."));
      else resolve(result);
    });
    child.send({ bytes, limits, policy: PDF_IMPORT_POLICY }, (error) => {
      if (error) stop("Unable to send data to the isolated PDF import process.");
    });
  });
}
