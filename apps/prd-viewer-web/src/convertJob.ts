/**
 * Company: EonHive Inc. | Title: Convert Web Job Lifecycle
 * Purpose: Bound file reads, cancel worker jobs and accept only the current complete result.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */
import { DEFAULT_CONVERSION_LIMITS, type ComicPageDescription, type ConversionResult, type ConversionSettings } from "@eonhive/prd-converter/browser";

export interface ComicReviewDraft {
  pageIds: readonly string[];
  descriptions?: readonly ComicPageDescription[];
}

export interface WebConversion {
  result: ConversionResult;
  sourceName: string;
  sourcePreview: string;
  previewTruncated: boolean;
  /** Explicitly selected CBZ, retained only in this in-memory conversion session. */
  sourceFile?: File;
  settings?: Readonly<ConversionSettings>;
  /** Unapplied review stays in app memory and never enters downloads. */
  reviewDraft?: ComicReviewDraft;
}
export interface ConversionWorker {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
  terminate(): void;
}

export function createConversionWorker(): ConversionWorker {
  return new Worker(new URL("./convert.worker.ts", import.meta.url), { type: "module" });
}

export function isCbzFilename(name: string): boolean {
  return /\.cbz$/iu.test(name);
}

export function getSourceSelectionError(files: readonly File[]): string | undefined {
  if (files.length !== 1) return "Choose one source document at a time.";
  const source = files[0]!;
  if (!/\.(?:md|markdown|html?|cbz)$/iu.test(source.name)) return "Choose a Markdown, HTML or CBZ source (.md, .markdown, .html, .htm or .cbz). Other formats currently use the CLI.";
  if (source.size > DEFAULT_CONVERSION_LIMITS.maxInputBytes) return "Source exceeds the 4 MiB browser limit.";
  return undefined;
}

export function getImageSelectionError(images: readonly File[]): string | undefined {
  const limits = DEFAULT_CONVERSION_LIMITS;
  if (images.length > limits.maxResources) return "Select at most 128 supporting images.";
  let total = 0;
  const names = new Set<string>();
  for (const file of images) {
    if (names.has(file.name)) return "Supporting images must have unique filenames.";
    names.add(file.name);
    if (file.size > limits.maxResourceBytes || (total += file.size) > limits.maxTotalResourceBytes) return "Images exceed the 8 MiB per-file or 24 MiB combined limit.";
  }
  return undefined;
}

export function startConversionJob(
  source: File, images: readonly File[], settings: ConversionSettings,
  createWorker = createConversionWorker, timeoutMs = 20_000
): { promise: Promise<WebConversion>; cancel(): void } {
  let cancel = () => {};
  const promise = new Promise<WebConversion>((resolve, reject) => {
    let finished = false;
    let worker: ConversionWorker | undefined;
    const timer = setTimeout(() => finish(new Error("Conversion exceeded its 20-second processing limit.")), timeoutMs);
    function finish(error?: Error, result?: WebConversion): void {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      worker?.terminate();
      if (error) reject(error);
      else resolve(result!);
    }
    cancel = () => finish(new Error("Conversion canceled. You can retry with the same files."));
    void (async () => {
      try {
        const selectionError = getSourceSelectionError([source]) ?? getImageSelectionError(images);
        if (selectionError) throw new Error(selectionError);
        // Snapshot the bounded selection before any await so later edits cannot bypass its checks.
        const selectedImages = [...images];
        const comicArchive = isCbzFilename(source.name);
        if (comicArchive && selectedImages.length > 0) throw new Error("CBZ pages are read from the archive; do not select supporting images.");
        const selectedSettings = { ...settings };
        if (settings.comicPageIds !== undefined) {
          if (!Array.isArray(settings.comicPageIds) || settings.comicPageIds.length > DEFAULT_CONVERSION_LIMITS.maxNodes) throw new Error("Comic page IDs exceed the conversion review limit.");
          selectedSettings.comicPageIds = [...settings.comicPageIds];
        }
        if (settings.comicPageDescriptions !== undefined) {
          if (!Array.isArray(settings.comicPageDescriptions) || settings.comicPageDescriptions.length > DEFAULT_CONVERSION_LIMITS.maxNodes) throw new Error("Comic descriptions exceed the conversion review limit.");
          selectedSettings.comicPageDescriptions = settings.comicPageDescriptions.map(value => ({ pageId: value.pageId, text: value.text }));
        }
        const bytes = new Uint8Array(await source.arrayBuffer());
        if (finished) return;
        const resources = [];
        // Read sequentially so cancellation stops additional file reads and allocations.
        for (const file of selectedImages) {
          if (finished) return;
          resources.push({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
        }
        if (finished) return;
        // Binary archives must reach the adapter without a text decoding pass.
        const text = comicArchive ? "" : new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        const sourcePreview = text.slice(0, 64 * 1024);
        worker = createWorker();
        worker.onerror = () => finish(new Error("The conversion worker stopped unexpectedly. Retry or use the local CLI."));
        worker.onmessageerror = () => finish(new Error("The conversion worker returned unreadable data."));
        worker.onmessage = ({ data }) => {
          if (data?.error && typeof data.error === "string") { finish(new Error(data.error)); return; }
          const result = data?.result as ConversionResult | undefined;
          if (!(result?.archive instanceof Uint8Array) || result.report?.reportVersion !== "1.0") {
            finish(new Error("The conversion worker returned an incomplete result.")); return;
          }
          finish(undefined, {
            result, sourceName: source.name, sourcePreview, previewTruncated: text.length > sourcePreview.length,
            ...(comicArchive ? { sourceFile: source, settings: selectedSettings } : {})
          });
        };
        worker.postMessage({ source: { name: source.name, bytes }, resources, ...selectedSettings },
          [bytes.buffer as ArrayBuffer, ...resources.map((item) => item.bytes.buffer as ArrayBuffer)]);
      } catch (error) {
        finish(error instanceof Error ? error : new Error("Selected files could not be read."));
      }
    })();
  });
  return { promise, cancel: () => cancel() };
}

export function startComicPageReviewJob(
  completed: WebConversion, pageIds: readonly string[],
  createWorker = createConversionWorker, timeoutMs = 20_000
): ReturnType<typeof startConversionJob> {
  return startComicReviewJob(completed, { pageIds }, createWorker, timeoutMs);
}

export function startComicReviewJob(
  completed: WebConversion, draft: ComicReviewDraft,
  createWorker = createConversionWorker, timeoutMs = 20_000
): ReturnType<typeof startConversionJob> {
  if (!completed.sourceFile || !completed.settings || completed.result.report.sourceFormat !== "cbz" || completed.result.document.profile !== "comic") {
    throw new Error("Convert the original CBZ again to enable comic review.");
  }
  // Re-extract the immutable selected File. The existing pipeline remains the sole output writer.
  return startConversionJob(completed.sourceFile, [], {
    ...completed.settings,
    profile: "comic", title: completed.result.document.title,
    preserveSource: completed.result.report.sourcePreserved,
    comicPageOrder: undefined, comicPageIds: draft.pageIds,
    ...(draft.descriptions === undefined ? {} : { comicPageDescriptions: draft.descriptions })
  }, createWorker, timeoutMs);
}
