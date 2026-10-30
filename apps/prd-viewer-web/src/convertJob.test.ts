/**
 * Company: EonHive Inc. | Title: Convert Web Lifecycle Tests
 * Purpose: Verify bounded reads, cancellation, deadlines and real converter job results.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */
import { describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { convertInBrowser, convertMarkdownInBrowser, type BrowserConvertOptions } from "@eonhive/prd-converter/browser";
import { getSourceSelectionError, startComicPageReviewJob, startComicReviewJob, startConversionJob, type ConversionWorker } from "./convertJob.js";
import { readPrdArchive } from "@eonhive/prd-validator/container";

class TestWorker implements ConversionWorker {
  onmessage: ConversionWorker["onmessage"] = null;
  onerror: ConversionWorker["onerror"] = null;
  onmessageerror: ConversionWorker["onmessageerror"] = null;
  terminate = vi.fn();
  postMessage = vi.fn((_message: unknown, _transfer: Transferable[]) => {});
}
const source = () => new File(["# Portable\n\nReadable text."], "source.md");

function convertingWorker(): TestWorker {
  const worker = new TestWorker();
  worker.postMessage.mockImplementation((message) => {
    void convertInBrowser(message as BrowserConvertOptions).then(
      result => worker.onmessage?.({ data: { result } } as MessageEvent),
      error => worker.onmessage?.({ data: { error: error.message } } as MessageEvent)
    );
  });
  return worker;
}

describe("conversion job", () => {
  it("passes real files through shared conversion and completes with a readable preview", async () => {
    const worker = new TestWorker();
    worker.postMessage.mockImplementation((message) => {
      void convertMarkdownInBrowser(message as BrowserConvertOptions).then((result) => worker.onmessage?.({ data: { result } } as MessageEvent));
    });
    const output = await startConversionJob(source(), [], { preserveSource: false }, () => worker).promise;
    expect(output.result.report.sourcePreserved).toBe(false);
    expect(output.sourcePreview).toContain("Readable text");
    expect(output.sourceName).toBe("source.md");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("runs selected HTML through the generic worker contract with an inert source preview", async () => {
    const worker = new TestWorker();
    worker.postMessage.mockImplementation((message) => {
      void convertInBrowser(message as BrowserConvertOptions).then((result) => worker.onmessage?.({ data: { result } } as MessageEvent));
    });
    const file = new File(['<h1>HTML title</h1><p>Body.</p><script>unsafe()</script>'], "source.html");
    const output = await startConversionJob(file, [], {}, () => worker).promise;
    expect(output.result.report.sourceFormat).toBe("html");
    expect(output.sourcePreview).toContain("<script>");
    expect(JSON.stringify(output.result.document)).not.toContain("unsafe()");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("rejects ambiguous source drops and accepts one HTML or Markdown source", () => {
    expect(getSourceSelectionError([])).toContain("one source");
    expect(getSourceSelectionError([source(), source()])).toContain("one source");
    expect(getSourceSelectionError([new File(["<h1>Title</h1>"], "source.HTM")])).toBeUndefined();
    expect(getSourceSelectionError([source()])).toBeUndefined();
    expect(getSourceSelectionError([new File(["binary"], "comic.CBZ")])).toBeUndefined();
  });
  it("passes binary CBZ to the real converter without text decoding", async () => {
    const worker = new TestWorker();
    worker.postMessage.mockImplementation((message) => {
      void convertInBrowser(message as BrowserConvertOptions).then((result) => worker.onmessage?.({ data: { result } } as MessageEvent));
    });
    const bytes = new Uint8Array(await readFile("examples/conversion-cbz/sample-comic.cbz"));
    const output = await startConversionJob(new File([bytes], "comic.cbz"), [], { comicPageOrder: "reverse" }, () => worker).promise;
    expect(output.result.report.profile).toBe("comic");
    expect(output.sourcePreview).toBe("");
    expect(output.previewTruncated).toBe(false);
    expect(output.result.report.warnings.some(issue => issue.code === "comic-page-order-reversed")).toBe(true);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("rejects separate CBZ resources before reading or creating a worker", async () => {
    const read = vi.fn();
    const file = { name: "comic.cbz", size: 1, arrayBuffer: read } as unknown as File;
    const create = vi.fn(() => new TestWorker());
    await expect(startConversionJob(file, [new File(["extra"], "extra.png")], {}, create).promise).rejects.toThrow("do not select supporting images");
    expect(read).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([true, false])("repairs and re-repairs the retained CBZ with source retention %s", async (preserveSource) => {
    const bytes = new Uint8Array(await readFile("examples/conversion-cbz/sample-comic.cbz"));
    const file = new File([bytes], "sample-comic.cbz");
    const original = await startConversionJob(file, [], { preserveSource, comicPageOrder: "reverse", title: "Reviewed title", id: "urn:test:review-job" }, convertingWorker).promise;
    const before = new Uint8Array(original.result.archive);
    expect(original.sourceFile).toBe(file);
    const repaired = await startComicPageReviewJob(original, ["page-2", "page-3", "page-1"], convertingWorker).promise;
    const repeated = await startComicPageReviewJob(repaired, ["page-1", "page-3", "page-2"], convertingWorker).promise;
    expect(Buffer.from(original.result.archive).equals(Buffer.from(before))).toBe(true);
    expect(repeated.sourceFile).toBe(file);
    if (repeated.result.document.profile !== "comic") throw new Error("Unexpected profile");
    expect(repeated.result.document.panels.map(page => page.id)).toEqual(["page-1", "page-3", "page-2"]);
    expect(repeated.result.document.title).toBe("Reviewed title");
    expect(repeated.result.report.sourcePreserved).toBe(preserveSource);
    expect(repeated.result.report.warnings.filter(issue => issue.code === "comic-page-order-reviewed")).toHaveLength(1);
    const files = readPrdArchive(repeated.result.archive);
    if (preserveSource) expect(Buffer.from(files["attachments/source.cbz"]!).equals(Buffer.from(bytes))).toBe(true);
    else expect(files["attachments/source.cbz"]).toBeUndefined();
    expect(JSON.parse(new TextDecoder().decode(files["manifest.json"])).id).toBe("urn:test:review-job");
  });

  it("keeps the current output intact after invalid review and cancellation", async () => {
    const file = new File([new Uint8Array(await readFile("examples/conversion-cbz/sample-comic.cbz"))], "sample-comic.cbz");
    const completed = await startConversionJob(file, [], {}, convertingWorker).promise;
    const before = new Uint8Array(completed.result.archive);
    await expect(startComicPageReviewJob(completed, ["page-1"], convertingWorker).promise).rejects.toThrow("every imported page");
    const worker = new TestWorker();
    const started = new Promise<void>(resolve => worker.postMessage.mockImplementation(() => resolve()));
    const job = startComicPageReviewJob(completed, ["page-2", "page-3", "page-1"], () => worker);
    await started;
    job.cancel();
    await expect(job.promise).rejects.toThrow("canceled");
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(Buffer.from(completed.result.archive).equals(Buffer.from(before))).toBe(true);
    expect(() => startComicPageReviewJob({ ...completed, sourceFile: undefined }, ["page-1"])).toThrow("original CBZ again");
  });

  it("snapshots review settings before a pending source read", async () => {
    const bytes = new Uint8Array(await readFile("examples/conversion-cbz/sample-comic.cbz"));
    const file = new File([bytes], "comic.cbz");
    let release!: (buffer: ArrayBuffer) => void;
    vi.spyOn(file, "arrayBuffer").mockImplementationOnce(() => new Promise<ArrayBuffer>(resolve => { release = resolve; }));
    const ids = ["page-2", "page-3", "page-1"];
    const pending = startConversionJob(file, [], { comicPageIds: ids }, convertingWorker).promise;
    ids.reverse();
    release(bytes.buffer);
    const completed = await pending;
    expect(completed.settings?.comicPageIds).toEqual(["page-2", "page-3", "page-1"]);
    if (completed.result.document.profile !== "comic") throw new Error("Unexpected profile");
    expect(completed.result.document.panels[0]?.id).toBe("page-2");
  });

  it.each([true, false])("retains descriptions through order-only repair with source retention %s", async preserveSource => {
    const bytes = new Uint8Array(await readFile("examples/conversion-cbz/sample-comic.cbz"));
    const file = new File([bytes], "sample-comic.cbz");
    const original = await startConversionJob(file, [], { preserveSource, comicPageIds: ["page-2", "page-3", "page-1"], comicPageDescriptions: [{ pageId: "page-1", text: "First provided description." }] }, convertingWorker).promise;
    const draft = {
      pageIds: ["page-2", "page-3", "page-1"],
      descriptions: [{ pageId: "page-1", text: "First provided description." }, { pageId: "page-2", text: "Second provided description." }]
    };
    const reviewed = await startComicReviewJob({ ...original, reviewDraft: draft }, draft, convertingWorker).promise;
    expect(reviewed.reviewDraft).toBeUndefined();
    const reordered = await startComicPageReviewJob(reviewed, ["page-3", "page-2", "page-1"], convertingWorker).promise;
    if (reordered.result.document.profile !== "comic") throw new Error("Unexpected profile");
    expect(reordered.result.document.panels.map(page => [page.id, page.alt])).toEqual([
      ["page-3", "Page 10 comic page"], ["page-2", "Second provided description."], ["page-1", "First provided description."]
    ]);
    expect(reordered.result.report.sourcePreserved).toBe(preserveSource);
    expect(reordered.sourceFile).toBe(file);
    expect(reordered.settings?.comicPageDescriptions).toEqual(reviewed.settings?.comicPageDescriptions);
    expect(reordered.result.report.warnings.filter(issue => issue.code === "comic-page-descriptions-reviewed")).toHaveLength(1);
    if (original.result.document.profile !== "comic") throw new Error("Unexpected profile");
    expect(original.result.document.panels[0]?.alt).toBe("Page 2 comic page");
  });

  it("snapshots description record values before source reads and bounds metadata before copying", async () => {
    const bytes = new Uint8Array(await readFile("examples/conversion-cbz/sample-comic.cbz"));
    const file = new File([bytes], "comic.cbz");
    let release!: (buffer: ArrayBuffer) => void;
    vi.spyOn(file, "arrayBuffer").mockImplementationOnce(() => new Promise<ArrayBuffer>(resolve => { release = resolve; }));
    const descriptions = [{ pageId: "page-1", text: "Before reading." }];
    const pending = startConversionJob(file, [], { comicPageDescriptions: descriptions }, convertingWorker).promise;
    descriptions[0]!.text = "After reading.";
    release(bytes.buffer);
    const completed = await pending;
    expect(completed.settings?.comicPageDescriptions?.[0]?.text).toBe("Before reading.");
    if (completed.result.document.profile !== "comic") throw new Error("Unexpected profile");
    expect(completed.result.document.panels[0]?.alt).toBe("Before reading.");
    const read = vi.fn();
    const unread = { name: "comic.cbz", size: 1, arrayBuffer: read } as unknown as File;
    await expect(startConversionJob(unread, [], { comicPageDescriptions: Array(20_001).fill(descriptions[0]) }, convertingWorker).promise).rejects.toThrow("review limit");
    expect(read).not.toHaveBeenCalled();
  });

  it("keeps applied descriptions intact after invalid or cancelled review", async () => {
    const file = new File([new Uint8Array(await readFile("examples/conversion-cbz/sample-comic.cbz"))], "comic.cbz");
    const completed = await startConversionJob(file, [], { comicPageDescriptions: [{ pageId: "page-1", text: "Keep this description." }] }, convertingWorker).promise;
    const before = Buffer.from(completed.result.archive);
    const draft = { pageIds: ["page-1", "page-2", "page-3"], descriptions: [{ pageId: "page-1", text: " " }] };
    await expect(startComicReviewJob(completed, draft, convertingWorker).promise).rejects.toThrow("nonblank plain text");
    const worker = new TestWorker();
    const started = new Promise<void>(resolve => worker.postMessage.mockImplementation(() => resolve()));
    const dirty = { ...completed, reviewDraft: { ...draft, descriptions: [{ pageId: "page-1", text: "New draft." }] } };
    const job = startComicReviewJob(dirty, dirty.reviewDraft, () => worker);
    await started;
    job.cancel();
    await expect(job.promise).rejects.toThrow("canceled");
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(Buffer.from(completed.result.archive).equals(before)).toBe(true);
    expect(completed.settings?.comicPageDescriptions?.[0]?.text).toBe("Keep this description.");
    expect(dirty.reviewDraft.descriptions[0]?.text).toBe("New draft.");
  });
  it("rejects unsupported/oversized files and duplicate images before reading bytes", async () => {
    const read = vi.fn();
    const create = vi.fn(() => new TestWorker());
    const big = { name: "large.md", size: 4 * 1024 * 1024 + 1, arrayBuffer: read } as unknown as File;
    await expect(startConversionJob(big, [], {}, create).promise).rejects.toThrow("4 MiB");
    await expect(startConversionJob(new File(["PDF"], "source.pdf"), [], {}, create).promise).rejects.toThrow("Markdown");
    const image = new File(["a"], "same.png");
    await expect(startConversionJob(source(), [image, image], {}, create).promise).rejects.toThrow("unique");
    const hugeImage = { name: "large.png", size: 8 * 1024 * 1024 + 1, arrayBuffer: read } as unknown as File;
    await expect(startConversionJob(source(), [hugeImage], {}, create).promise).rejects.toThrow("8 MiB");
    expect(read).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
  it.each(["replace", "append", "clear", "reverse"] as const)("retains the validated image selection when the caller mutates it during a source read: %s", async mutation => {
    const png = new Uint8Array(await readFile("examples/conversion-markdown/flow.png"));
    const text = "# Selected images\n\n![First](first.png)\n\n![Second](second.png)";
    const bytes = new TextEncoder().encode(text);
    const file = new File([text], "source.md");
    let release!: (buffer: ArrayBuffer) => void;
    vi.spyOn(file, "arrayBuffer").mockImplementationOnce(() => new Promise<ArrayBuffer>(resolve => { release = resolve; }));
    const first = new File([png], "first.png");
    const second = new File([png], "second.png");
    const firstRead = vi.spyOn(first, "arrayBuffer");
    const secondRead = vi.spyOn(second, "arrayBuffer");
    const unexpectedRead = vi.fn(async () => png.buffer);
    const oversized = { name: "unvalidated.png", size: 8 * 1024 * 1024 + 1, arrayBuffer: unexpectedRead } as unknown as File;
    const images = [first, second];
    const worker = convertingWorker();
    const job = startConversionJob(file, images, {}, () => worker);
    if (mutation === "replace") images.splice(0, images.length, oversized);
    if (mutation === "append") images.push(oversized);
    if (mutation === "clear") images.length = 0;
    if (mutation === "reverse") images.reverse();
    release(bytes.buffer);
    const completed = await job.promise;
    expect(unexpectedRead).not.toHaveBeenCalled();
    expect(firstRead).toHaveBeenCalledOnce();
    expect(secondRead).toHaveBeenCalledOnce();
    const submitted = worker.postMessage.mock.calls[0]?.[0] as BrowserConvertOptions;
    expect(submitted.resources?.map(image => image.name)).toEqual(["first.png", "second.png"]);
    expect(completed.result.report.resourceMap.map(resource => resource.source)).toEqual(["first.png", "second.png"]);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("retains unread validated images while an earlier image read is pending", async () => {
    const png = new Uint8Array(await readFile("examples/conversion-markdown/flow.png"));
    const file = new File(["# Images\n\n![First](first.png)\n\n![Second](second.png)"], "source.md");
    const first = new File([png], "first.png");
    const second = new File([png], "second.png");
    let release!: (buffer: ArrayBuffer) => void;
    let started!: () => void;
    const reading = new Promise<void>(resolve => { started = resolve; });
    vi.spyOn(first, "arrayBuffer").mockImplementationOnce(() => new Promise<ArrayBuffer>(resolve => {
      release = resolve;
      started();
    }));
    const secondRead = vi.spyOn(second, "arrayBuffer");
    const unexpectedRead = vi.fn(async () => png.buffer);
    const added = { name: "unvalidated.png", size: 8 * 1024 * 1024 + 1, arrayBuffer: unexpectedRead } as unknown as File;
    const images = [first, second];
    const worker = convertingWorker();
    const job = startConversionJob(file, images, {}, () => worker);
    await reading;
    images.splice(1, 1, added);
    release(png.buffer);
    const completed = await job.promise;
    expect(unexpectedRead).not.toHaveBeenCalled();
    expect(secondRead).toHaveBeenCalledOnce();
    expect(completed.result.report.resourceMap.map(resource => resource.source)).toEqual(["first.png", "second.png"]);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("stops before unread validated images after cancellation during an image read", async () => {
    const first = new File(["first"], "first.png");
    const second = new File(["second"], "second.png");
    let release!: (buffer: ArrayBuffer) => void;
    let started!: () => void;
    const reading = new Promise<void>(resolve => { started = resolve; });
    vi.spyOn(first, "arrayBuffer").mockImplementationOnce(() => new Promise<ArrayBuffer>(resolve => {
      release = resolve;
      started();
    }));
    const secondRead = vi.spyOn(second, "arrayBuffer");
    const create = vi.fn(() => new TestWorker());
    const job = startConversionJob(source(), [first, second], {}, create);
    await reading;
    job.cancel();
    await expect(job.promise).rejects.toThrow("canceled");
    release(new ArrayBuffer(5));
    await Promise.resolve();
    expect(secondRead).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
  it("does not create a worker after cancellation during a file read", async () => {
    let release!: (buffer: ArrayBuffer) => void;
    const file = { name: "source.md", size: 1, arrayBuffer: () => new Promise<ArrayBuffer>((resolve) => { release = resolve; }) } as File;
    const create = vi.fn(() => new TestWorker());
    const job = startConversionJob(file, [], {}, create);
    job.cancel();
    await expect(job.promise).rejects.toThrow("canceled");
    release(new ArrayBuffer(1));
    await Promise.resolve();
    expect(create).not.toHaveBeenCalled();
  });
  it("terminates a canceled worker and ignores a late success", async () => {
    const worker = new TestWorker();
    const started = new Promise<void>((resolve) => worker.postMessage.mockImplementation(() => resolve()));
    const job = startConversionJob(source(), [], {}, () => worker);
    await started;
    job.cancel();
    await expect(job.promise).rejects.toThrow("canceled");
    worker.onmessage?.({ data: { result: { archive: new Uint8Array(), report: { reportVersion: "1.0" } } } } as MessageEvent);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("terminates a stalled worker on its deadline", async () => {
    const worker = new TestWorker();
    await expect(startConversionJob(source(), [], {}, () => worker, 30).promise).rejects.toThrow("processing limit");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it.each(["error", "messageerror", "invalid", "reported"])("cleans up after %s", async (mode) => {
    const worker = new TestWorker();
    worker.postMessage.mockImplementation(() => {
      if (mode === "error") worker.onerror?.({} as ErrorEvent);
      else if (mode === "messageerror") worker.onmessageerror?.({} as MessageEvent);
      else worker.onmessage?.({ data: mode === "reported" ? { error: "No readable content." } : { result: {} } } as MessageEvent);
    });
    await expect(startConversionJob(source(), [], {}, () => worker).promise).rejects.toThrow();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("handles blocked workers and invalid UTF-8 without publishing a result", async () => {
    await expect(startConversionJob(source(), [], {}, () => { throw new Error("Worker blocked"); }).promise).rejects.toThrow("Worker blocked");
    await expect(startConversionJob(new File([new Uint8Array([255])], "bad.md"), [], {}).promise).rejects.toThrow();
  });
});
