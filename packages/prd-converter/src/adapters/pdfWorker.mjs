/**
 * Company: EonHive Inc. | Title: Bounded PDF Extraction Process
 * Purpose: Parse PDF bytes and rasterize textless pages without executing document actions.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import { createRequire } from "node:module";
import { readFile, realpath } from "node:fs/promises";
import { dirname, join, relative, isAbsolute } from "node:path";

function fail(message) {
  const error = new Error(message);
  error.name = "PdfImportError";
  throw error;
}

async function dependencies() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || major === 22 && minor < 13) fail("PDF conversion requires Node.js 22.13 or later.");
  try {
    const canvas = await import("@napi-rs/canvas");
    const pdf = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const require = createRequire(import.meta.url);
    return { pdf, canvas, root: dirname(require.resolve("pdfjs-dist/package.json")) };
  } catch {
    fail("PDF conversion requires optional pdfjs-dist@6.4.299 and working @napi-rs/canvas@1.0.10 support. Install optional dependencies for this platform.");
  }
}

function localDataFactory(root, policy) {
  const directories = { cMapUrl: "cmaps", standardFontDataUrl: "standard_fonts", wasmUrl: "wasm" };
  return class LocalPdfData {
    async fetch({ kind, filename }) {
      if (!Object.hasOwn(directories, kind) || !/^[a-z0-9_.-]+$/iu.test(filename) || [".", ".."].includes(filename)) fail("PDF requested an unsupported auxiliary resource.");
      const base = await realpath(join(root, directories[kind]));
      const path = await realpath(join(base, filename));
      const rel = relative(base, path);
      if (rel === ".." || rel.startsWith("../") || rel.startsWith("..\\") || isAbsolute(rel)) fail("PDF auxiliary resource leaves its installed data directory.");
      const bytes = await readFile(path);
      if (bytes.byteLength > policy.maxAuxiliaryBytes) fail("PDF auxiliary resource exceeds its byte limit.");
      return new Uint8Array(bytes);
    }
  };
}

async function openDocument(pdf, root, bytes, policy) {
  const task = pdf.getDocument({
    // PDF.js 6 can return an empty operator list in strict mode after an image error.
    // Recovery diagnostics are observable; any page diagnostic rejects raster fallback below.
    data: new Uint8Array(bytes), verbosity: 1, stopAtErrors: false,
    enableXfa: false, useWorkerFetch: false, useSystemFonts: false,
    disableFontFace: true, useWasm: false, isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false, enableHWA: false, enableWebGPU: false,
    disableAutoFetch: true, disableRange: true, disableStream: true,
    maxImageSize: policy.maxImagePixels, canvasMaxAreaInBytes: policy.maxRasterPixels * 4,
    cMapUrl: `${join(root, "cmaps")}/`, standardFontDataUrl: `${join(root, "standard_fonts")}/`,
    BinaryDataFactory: localDataFactory(root, policy)
  });
  try {
    const document = await new Promise((resolve, reject) => {
      task.onPassword = () => {
        const error = new Error("Encrypted or password-protected PDFs are unsupported.");
        error.name = "PdfImportError";
        reject(error);
        void task.destroy().catch(() => {});
      };
      task.promise.then(resolve, reject);
    });
    return { document, task };
  } catch (error) {
    await task.destroy().catch(() => {});
    throw error;
  }
}

async function textItems(page, limits, policy, budget) {
  const reader = page.streamTextContent({ includeMarkedContent: false, disableNormalization: false }).getReader();
  const items = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const item of value.items) {
        if (++budget.items > limits.maxNodes) fail("PDF text-item count exceeds the conversion limit.");
        if (typeof item.str !== "string") continue;
        budget.textBytes += Buffer.byteLength(item.str);
        if (budget.textBytes > Math.min(policy.maxTextBytes, limits.maxTotalResourceBytes)) fail("PDF extracted text exceeds its byte limit.");
        const transform = item.transform;
        if (!Array.isArray(transform) || transform.length !== 6 || !transform.every(Number.isFinite) ||
          !Number.isFinite(item.width) || !Number.isFinite(item.height)) fail("PDF text geometry is invalid or unsupported.");
        items.push({ text: item.str, x: transform[4], y: transform[5], width: item.width,
          height: item.height, eol: item.hasEOL === true,
          nonHorizontal: Math.abs(transform[1]) > 0.001 || Math.abs(transform[2]) > 0.001 || item.dir !== "ltr" });
      }
    }
    return items;
  } finally { await reader.cancel().catch(() => {}); }
}

async function raster(page, pdf, canvasLibrary, limits, policy, budget, diagnostics, pageDiagnostics) {
  const viewport = page.getViewport({ scale: 1 });
  const pixels = Math.min(policy.maxRasterPixels, Math.floor(limits.maxResourceBytes / 4));
  if (pixels < 1) fail("PDF raster byte budget is too small.");
  const scale = Math.min(1.5, Math.sqrt(pixels / (viewport.width * viewport.height)));
  const rendered = page.getViewport({ scale });
  const width = Math.max(1, Math.floor(rendered.width));
  const height = Math.max(1, Math.floor(rendered.height));
  const canvas = canvasLibrary.createCanvas(width, height);
  try {
    await page.render({ canvas, viewport: rendered, annotationMode: pdf.AnnotationMode.DISABLE, background: "rgb(255,255,255)" }).promise;
    // Text extraction can populate the operator cache and emit image errors before rendering.
    if (diagnostics.count > pageDiagnostics) fail("PDF page rasterization emitted diagnostics and could not be preserved safely.");
    const png = new Uint8Array(canvas.toBuffer("image/png"));
    budget.imageBytes += png.byteLength;
    if (png.byteLength > limits.maxResourceBytes || budget.imageBytes > limits.maxTotalResourceBytes) fail("PDF raster resources exceed the conversion byte limit.");
    return { png, rasterWidth: width, rasterHeight: height };
  } finally { canvas.width = 1; canvas.height = 1; }
}

async function extract({ bytes, limits, policy }, diagnostics) {
  const { pdf, canvas, root } = await dependencies();
  const { document, task } = await openDocument(pdf, root, bytes, policy);
  try {
    if (document.numPages < 1 || document.numPages > Math.min(policy.maxPages, limits.maxResources, limits.maxNodes)) fail("PDF page count exceeds the conversion limit.");
    const metadata = await document.getMetadata();
    if (metadata.info.EncryptFilterName || await document.getPermissions() !== null) fail("Encrypted or password-protected PDFs are unsupported.");
    const rawTitle = typeof metadata.info.Title === "string" ? metadata.info.Title.trim() : "";
    const result = { pages: [], diagnostics: 0, titleTruncated: rawTitle.length > policy.maxTitleCharacters,
      ...(rawTitle ? { title: rawTitle.slice(0, policy.maxTitleCharacters) } : {}) };
    const budget = { items: 0, textBytes: 0, imageBytes: 0 };
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      if (![viewport.width, viewport.height].every((value) => Number.isFinite(value) && value > 0 && value <= policy.maxPageDimension) ||
        viewport.width * viewport.height > policy.maxPagePixels) fail("PDF page dimensions exceed the conversion limit.");
      const pageDiagnostics = diagnostics.count;
      const items = await textItems(page, limits, policy, budget);
      const fallback = items.some((item) => item.text.trim()) ? {} : await raster(page, pdf, canvas, limits, policy, budget, diagnostics, pageDiagnostics);
      result.pages.push({ number, items, ...fallback });
      page.cleanup();
    }
    result.diagnostics = diagnostics.count;
    return result;
  } finally { await task.destroy(); }
}

process.once("message", async (job) => {
  const diagnostics = { count: 0 };
  // Diagnostics stay factual without exporting parser paths or arbitrary document snippets.
  for (const method of ["log", "warn", "error"]) console[method] = () => { diagnostics.count++; };
  globalThis.fetch = async () => { fail("Network retrieval is disabled during PDF import."); };
  try {
    const result = await extract(job, diagnostics);
    process.send({ ok: true, result }, () => process.exit(0));
  } catch (error) {
    const message = error?.name === "PdfImportError" ? error.message : "PDF parsing or rasterization failed for invalid or unsupported content.";
    process.send({ ok: false, error: message }, () => process.exit(1));
  }
});
