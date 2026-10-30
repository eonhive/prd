/**
 * @vitest-environment jsdom
 * Company: EonHive Inc. | Title: Mounted Convert Interaction Tests
 * Purpose: Exercise review controls and URL ownership in a simulated DOM, separately from browser acceptance.
 * Author: Stan Nesi | Created: 2026-10-30 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */
import { Blob as NodeBlob, Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import {
  act,
  createElement,
  Fragment,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversionQualityReport } from "@eonhive/prd-converter/browser";
import type { PrdComicRoot } from "@eonhive/prd-types";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import { ComicPageReview } from "./ComicPageReview.js";
import { ConversionDiagnostics } from "./ConversionDiagnostics.js";
import { ConvertReview } from "./ConvertReview.js";
import { ConvertWeb } from "./ConvertWeb.js";
import * as jobs from "./convertJob.js";
import type { ComicReviewDraft, WebConversion } from "./convertJob.js";

let host: HTMLDivElement;
let root: Root | undefined;
let urls: Map<string, NodeBlob>;
let createUrl: ReturnType<typeof vi.fn>;
let revokeUrl: ReturnType<typeof vi.fn>;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  urls = new Map();
  let sequence = 0;
  createUrl = vi.fn((blob: NodeBlob) => {
    const url = `blob:convert-unit-${++sequence}`;
    urls.set(url, blob);
    return url;
  });
  revokeUrl = vi.fn((url: string) => urls.delete(url));
  class TestURL extends URL {
    static createObjectURL = createUrl;
    static revokeObjectURL = revokeUrl;
  }
  vi.stubGlobal("URL", TestURL);
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(node: ReactNode): Promise<void> {
  await act(async () => root?.render(node));
}

function element<T extends Element>(
  selector: string,
  scope: ParentNode = host
): T {
  const found = scope.querySelector<T>(selector);
  if (!found) throw new Error(`Missing test element: ${selector}`);
  return found;
}

function button(name: string): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === name
  );
  if (!found) throw new Error(`Missing test button: ${name}`);
  return found;
}

async function click(target: HTMLElement): Promise<void> {
  await act(async () => target.click());
}

async function fill(
  target: HTMLInputElement | HTMLTextAreaElement,
  value: string
): Promise<void> {
  // Use the native setter so React observes a DOM change rather than its own tracked assignment.
  const prototype =
    target instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")!.set!;
  await act(async () => {
    setter.call(target, value);
    target.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function select(value: string): Promise<void> {
  const category = element<HTMLSelectElement>(
    ".convert-diagnostic-filters select"
  );
  await act(async () => {
    category.value = value;
    category.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function completedExample(described = false): WebConversion {
  const directory = described ? "comic-descriptions" : "cbz";
  const archive = new Uint8Array(
    readFileSync(`examples/conversion-web/${directory}/converted.prd`)
  );
  const files = readPrdArchive(archive);
  return {
    result: {
      archive,
      document: JSON.parse(
        new TextDecoder().decode(files["content/root.json"])
      ) as PrdComicRoot,
      report: JSON.parse(
        new TextDecoder().decode(files["attachments/conversion-quality.json"])
      ) as ConversionQualityReport,
    },
    sourceName: "sample-comic.cbz",
    sourcePreview: "",
    previewTruncated: false,
    sourceFile: new File(
      [
        new Uint8Array(
          readFileSync("examples/conversion-cbz/sample-comic.cbz")
        ),
      ],
      "sample-comic.cbz"
    ),
    settings: described
      ? JSON.parse(
          readFileSync(
            "examples/conversion-web/comic-descriptions/review.json",
            "utf8"
          )
        )
      : {},
  };
}

function longReport(): ConversionQualityReport {
  const original = completedExample().result.report;
  return {
    ...original,
    warnings: Array.from({ length: 60 }, (_, index) => ({
      code: `source-${index}`,
      stage: index === 59 ? "adapt" : "extract",
      message: `Warning ${index}`,
      reference: `pages/page[${index}].png`,
    })),
    validationWarnings: [
      {
        code: "package-note",
        message: "Package warning",
        severity: "warning",
        path: "/manifest/assets/0",
      },
    ],
  };
}

describe("mounted quality filters", () => {
  it("finds a warning past the visible cap, combines categories, and clears an empty result", async () => {
    await render(
      createElement(ConversionDiagnostics, { report: longReport() })
    );
    expect(host.querySelectorAll(".convert-warnings li")).toHaveLength(50);
    await fill(element("input[type=search]"), "PAGE[59].PNG");
    expect(host.querySelectorAll(".convert-warnings li")).toHaveLength(1);
    expect(element("[role=status]").textContent).toContain(
      "Showing 1 of 1 matching warnings · 61 total."
    );
    await select("validator");
    expect(host.textContent).toContain("No warnings match these filters");
    await click(button("Clear filters"));
    expect(element<HTMLInputElement>("input[type=search]").value).toBe("");
    expect(element<HTMLSelectElement>("select").value).toBe("all");
    expect(host.querySelectorAll(".convert-warnings li")).toHaveLength(50);
    expect(button("Clear filters").disabled).toBe(true);
  });

  it("keeps filters for the current report and resets them for a replacement report", async () => {
    const report = longReport();
    await render(createElement(ConversionDiagnostics, { report }));
    await select("adapt");
    await fill(element("input[type=search]"), "source-59");
    await render(createElement(ConversionDiagnostics, { report }));
    expect(element<HTMLInputElement>("input[type=search]").value).toBe(
      "source-59"
    );
    expect(element<HTMLSelectElement>("select").value).toBe("adapt");
    await render(
      createElement(ConversionDiagnostics, {
        report: { ...report, warnings: [] },
      })
    );
    expect(element<HTMLInputElement>("input[type=search]").value).toBe("");
    expect(element<HTMLSelectElement>("select").value).toBe("all");
    expect(element("[role=status]").textContent).toContain(
      "Showing 1 of 1 matching warnings · 1 total."
    );
  });
});

describe("mounted comic review", () => {
  function harness(completed: WebConversion, onApply = vi.fn(), busy = false) {
    if (completed.result.document.profile !== "comic")
      throw new Error("Expected Comic fixture");
    const comic = completed.result.document;
    function ReviewHarness() {
      const [draft, setDraft] = useState<ComicReviewDraft | undefined>(
        completed.reviewDraft
      );
      return createElement(ComicPageReview, {
        document: comic,
        resources: completed.result.report.resourceMap,
        draft,
        providedDescriptions: completed.settings?.comicPageDescriptions,
        busy,
        canApply: true,
        onDraftChange: setDraft,
        onApply,
      });
    }
    return createElement(ReviewHarness);
  }

  it("moves and resets rows with focus while retaining a typed description", async () => {
    const completed = completedExample();
    const onApply = vi.fn();
    const before = JSON.stringify(completed.result);
    await render(harness(completed, onApply));
    const first = element<HTMLTextAreaElement>("textarea");
    first.focus();
    await fill(first, "A supplied description.");
    expect(document.activeElement).toBe(first);
    await click(element("button[aria-label='Move pages/page-1.png later']"));
    expect(element(".convert-page-list li strong").textContent).toBe(
      "pages/page-2.png"
    );
    const moved = [...host.querySelectorAll(".convert-page-list li")][1];
    expect(document.activeElement).toBe(moved);
    expect(element<HTMLTextAreaElement>("textarea", moved).value).toBe(
      "A supplied description."
    );
    await click(button("Apply review"));
    expect(onApply).toHaveBeenCalledWith({
      pageIds: ["page-2", "page-1", "page-3"],
      descriptions: [{ pageId: "page-1", text: "A supplied description." }],
    });
    await click(button("Reset changes"));
    expect(document.activeElement).toBe(element(".convert-page-list li"));
    expect(button("Apply review").disabled).toBe(true);
    expect(element<HTMLTextAreaElement>("textarea").value).toBe(
      (completed.result.document as PrdComicRoot).panels[0]?.alt
    );
    expect(JSON.stringify(completed.result)).toBe(before);
  });

  it("blocks blank descriptions, retains literal text and allows correction", async () => {
    await render(harness(completedExample()));
    const field = element<HTMLTextAreaElement>("textarea");
    field.focus();
    await fill(field, " ");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(button("Apply review").disabled).toBe(true);
    expect(
      document.getElementById(field.getAttribute("aria-describedby")!)
        ?.textContent
    ).toContain("Enter a page description");
    const text = '</textarea><img src="https://invalid.example/probe">';
    await fill(field, text);
    expect(field.value).toBe(text);
    expect(field.getAttribute("aria-invalid")).toBe("false");
    expect(button("Apply review").disabled).toBe(false);
    expect(host.querySelector("img")).toBeNull();
    expect(document.activeElement).toBe(field);
  });

  it.each([
    ["x".repeat(2048), false],
    ["x".repeat(2049), true],
    ["Unsafe\u0000description", true],
  ] as const)(
    "applies the shared description policy for input case %#",
    async (text, invalid) => {
      await render(harness(completedExample()));
      const field = element<HTMLTextAreaElement>("textarea");
      await fill(field, text);
      expect(field.maxLength).toBe(2048);
      expect(field.getAttribute("aria-invalid")).toBe(String(invalid));
      expect(button("Apply review").disabled).toBe(invalid);
    }
  );

  it("retains already provided descriptions in an order-only apply", async () => {
    const completed = completedExample();
    if (completed.result.document.profile !== "comic")
      throw new Error("Expected Comic fixture");
    completed.result.document.panels[0]!.alt =
      "Previously supplied description.";
    completed.settings = {
      comicPageDescriptions: [
        { pageId: "page-1", text: "Previously supplied description." },
      ],
    };
    const onApply = vi.fn();
    await render(harness(completed, onApply));
    await click(element("button[aria-label='Move pages/page-1.png later']"));
    await click(button("Apply review"));
    expect(onApply.mock.calls[0]?.[0].descriptions).toEqual([
      { pageId: "page-1", text: "Previously supplied description." },
    ]);
  });

  it("disables draft changes during an active job", async () => {
    const completed = completedExample();
    completed.reviewDraft = { pageIds: ["page-2", "page-1", "page-3"] };
    const onApply = vi.fn();
    await render(harness(completed, onApply, true));
    expect(
      [...host.querySelectorAll("button, textarea")].every(
        (item) => (item as HTMLButtonElement).disabled
      )
    ).toBe(true);
    await click(button("Apply review"));
    expect(onApply).not.toHaveBeenCalled();
  });

  it("focuses the current first row and announces a successful replacement", async () => {
    const completed = completedExample();
    const next = completedExample(true);
    if (
      completed.result.document.profile !== "comic" ||
      next.result.document.profile !== "comic"
    )
      throw new Error("Expected Comic fixtures");
    const props = {
      resources: completed.result.report.resourceMap,
      canApply: true,
      busy: false,
      onDraftChange() {},
      onApply() {},
    };
    await render(
      createElement(ComicPageReview, {
        ...props,
        document: completed.result.document,
      })
    );
    await render(
      createElement(ComicPageReview, {
        ...props,
        document: next.result.document,
      })
    );
    expect(document.activeElement).toBe(element(".convert-page-list li"));
    expect(element("[role=status]").textContent).toContain(
      "Comic review applied"
    );
  });
});

describe("mounted conversion result and downloads", () => {
  function review(
    completed: WebConversion | null,
    onPreview = vi.fn(),
    onDraftChange = vi.fn()
  ) {
    return createElement(ConvertReview, {
      completed,
      busy: false,
      onPreview,
      onDraftChange,
      onApplyComicReview() {},
    });
  }

  function download(name: string): string {
    return element<HTMLAnchorElement>(`a[download='${name}']`).href;
  }

  it("preserves review view, filters and download URLs on a draft-only update", async () => {
    const completed = completedExample();
    const before = JSON.stringify(completed.result.report);
    await render(review(completed));
    const archiveUrl = download("converted.prd");
    const reportUrl = download("conversion-quality.json");
    await select("extract");
    await fill(element("input[type=search]"), "cbz-generated-alt");
    await click(button("Assets"));
    const draft = {
      ...completed,
      reviewDraft: { pageIds: ["page-2", "page-1", "page-3"] },
    };
    await render(review(draft));
    expect(button("Assets").getAttribute("aria-pressed")).toBe("true");
    await click(button("Quality report"));
    expect(element<HTMLInputElement>("input[type=search]").value).toBe(
      "cbz-generated-alt"
    );
    expect(element<HTMLSelectElement>("select").value).toBe("extract");
    expect(download("converted.prd")).toBe(archiveUrl);
    expect(download("conversion-quality.json")).toBe(reportUrl);
    expect(createUrl).toHaveBeenCalledTimes(2);
    expect(revokeUrl).not.toHaveBeenCalled();
    expect(JSON.stringify(completed.result.report)).toBe(before);
  });

  it("downloads the complete report even while filtered and previews the current completed result", async () => {
    const completed = completedExample();
    const onPreview = vi.fn();
    await render(review(completed, onPreview));
    await fill(element("input[type=search]"), "no-such-warning");
    const report = urls.get(download("conversion-quality.json"))!;
    expect(JSON.parse(await report.text())).toEqual(completed.result.report);
    const archive = urls.get(download("converted.prd"))!;
    expect(
      Buffer.from(await archive.arrayBuffer()).equals(
        Buffer.from(completed.result.archive)
      )
    ).toBe(true);
    await click(button("Preview in Viewer"));
    expect(onPreview).toHaveBeenCalledWith(completed);
  });

  it("never exposes old links during replacement and releases obsolete URLs", async () => {
    const snapshots: Array<Array<string | null>> = [];
    function CommitSnapshot() {
      useLayoutEffect(() => {
        snapshots.push([
          host
            .querySelector("a[download='converted.prd']")
            ?.getAttribute("href") ?? null,
          host
            .querySelector("a[download='conversion-quality.json']")
            ?.getAttribute("href") ?? null,
        ]);
      });
      return null;
    }
    const initial = completedExample();
    const next = completedExample(true);
    await render(
      createElement(
        Fragment,
        null,
        review(initial),
        createElement(CommitSnapshot)
      )
    );
    const oldArchive = download("converted.prd");
    const oldReport = download("conversion-quality.json");
    await fill(element("input[type=search]"), "no-such-warning");
    await click(button("Assets"));
    await render(
      createElement(Fragment, null, review(next), createElement(CommitSnapshot))
    );
    expect(snapshots.at(-1)).toEqual([null, null]);
    expect(download("converted.prd")).not.toBe(oldArchive);
    expect(download("conversion-quality.json")).not.toBe(oldReport);
    expect(urls.has(oldArchive)).toBe(false);
    expect(urls.has(oldReport)).toBe(false);
    expect(revokeUrl).toHaveBeenCalledTimes(2);
    expect(button("Quality report").getAttribute("aria-pressed")).toBe("true");
    expect(element<HTMLInputElement>("input[type=search]").value).toBe("");
    expect(
      JSON.parse(await urls.get(download("conversion-quality.json"))!.text())
    ).toEqual(next.result.report);
  });

  it("removes downloads when the result clears and disposes URLs on unmount", async () => {
    const completed = completedExample();
    await render(review(completed));
    expect(urls.size).toBe(2);
    await render(review(null));
    expect(host.querySelector("a[download]")).toBeNull();
    expect(urls.size).toBe(0);
    await render(review(completed));
    await act(async () => root?.unmount());
    root = undefined;
    expect(urls.size).toBe(0);
    expect(revokeUrl).toHaveBeenCalledTimes(4);
  });
});

describe("mounted comic apply lifecycle", () => {
  function deferredJob() {
    let resolve!: (result: WebConversion) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<WebConversion>((succeed, fail) => {
      resolve = succeed;
      reject = fail;
    });
    const cancel = vi.fn(() =>
      reject(
        new Error("Conversion canceled. You can retry with the same files.")
      )
    );
    return { promise, cancel, resolve, reject };
  }

  function flow(initial: WebConversion, onComplete = vi.fn()) {
    function FlowHarness() {
      const [completed, setCompleted] = useState<WebConversion | null>(initial);
      return createElement(ConvertWeb, {
        completed,
        onPreview() {},
        onComplete(next) {
          onComplete(next);
          setCompleted(next);
        },
      });
    }
    return createElement(FlowHarness);
  }

  it("keeps the package and draft after failed apply, then replaces them on a successful retry", async () => {
    const initial = completedExample();
    const next = completedExample(true);
    const failing = deferredJob();
    const retry = deferredJob();
    const start = vi
      .spyOn(jobs, "startComicReviewJob")
      .mockReturnValueOnce(failing)
      .mockReturnValueOnce(retry);
    const onComplete = vi.fn();
    await render(flow(initial, onComplete));
    const archiveLink = element<HTMLAnchorElement>(
      "a[download='converted.prd']"
    ).href;
    const field = element<HTMLTextAreaElement>("textarea");
    await fill(field, "Keep this draft for retry.");
    await click(button("Apply review"));
    expect(field.disabled).toBe(true);
    expect(button("Cancel conversion").disabled).toBe(false);
    expect(element<HTMLAnchorElement>("a[download='converted.prd']").href).toBe(
      archiveLink
    );
    await act(async () =>
      failing.reject(new Error("A recoverable conversion failure."))
    );
    expect(element("[role=alert]").textContent).toContain(
      "recoverable conversion failure"
    );
    expect(field.disabled).toBe(false);
    expect(field.value).toBe("Keep this draft for retry.");
    expect(element<HTMLAnchorElement>("a[download='converted.prd']").href).toBe(
      archiveLink
    );
    expect(onComplete.mock.calls).toHaveLength(1);
    expect(start.mock.calls[0]?.[1].descriptions).toEqual([
      { pageId: "page-1", text: "Keep this draft for retry." },
    ]);
    await click(button("Apply review"));
    await act(async () => retry.resolve(next));
    expect(onComplete.mock.lastCall?.[0]).toBe(next);
    expect(
      element<HTMLAnchorElement>("a[download='converted.prd']").href
    ).not.toBe(archiveLink);
    expect(host.querySelector("[role=alert]")).toBeNull();
    expect(button("Apply review").disabled).toBe(true);
  });

  it("cancels apply without dropping the draft or current download", async () => {
    const current = completedExample();
    const job = deferredJob();
    vi.spyOn(jobs, "startComicReviewJob").mockReturnValue(job);
    await render(flow(current));
    const field = element<HTMLTextAreaElement>("textarea");
    await fill(field, "Still available after cancellation.");
    const archiveLink = element<HTMLAnchorElement>(
      "a[download='converted.prd']"
    ).href;
    await click(button("Apply review"));
    await click(button("Cancel conversion"));
    expect(job.cancel).toHaveBeenCalledOnce();
    expect(field.value).toBe("Still available after cancellation.");
    expect(field.disabled).toBe(false);
    expect(element<HTMLAnchorElement>("a[download='converted.prd']").href).toBe(
      archiveLink
    );
    expect(element("[role=alert]").textContent).toContain("canceled");
    await click(button("Reset changes"));
    expect(host.querySelector("[role=alert]")).toBeNull();
    expect(button("Apply review").disabled).toBe(true);
  });

  it("cancels on unmount and ignores a late completion", async () => {
    const current = completedExample();
    current.reviewDraft = { pageIds: ["page-2", "page-1", "page-3"] };
    const pending = deferredJob();
    const cancel = vi.fn();
    vi.spyOn(jobs, "startComicReviewJob").mockReturnValue({
      promise: pending.promise,
      cancel,
    });
    const onComplete = vi.fn();
    await render(flow(current, onComplete));
    await click(button("Apply review"));
    await act(async () => root?.unmount());
    root = undefined;
    expect(cancel).toHaveBeenCalledOnce();
    await act(async () => pending.resolve(completedExample(true)));
    expect(onComplete).not.toHaveBeenCalled();
    expect(urls.size).toBe(0);
  });

  it("restores an unapplied session draft after a simulated route remount", async () => {
    const current = completedExample();
    const onComplete = vi.fn();
    await render(flow(current, onComplete));
    await fill(element("textarea"), "Session description retained.");
    await click(element("button[aria-label='Move pages/page-1.png later']"));
    const session = onComplete.mock.lastCall?.[0] as WebConversion;
    expect(session.result).toBe(current.result);
    expect(session.sourceFile).toBe(current.sourceFile);
    await act(async () => root?.unmount());
    root = createRoot(host);
    await render(flow(session));
    expect(element(".convert-page-list li strong").textContent).toBe(
      "pages/page-2.png"
    );
    const fields = [...host.querySelectorAll("textarea")];
    expect(fields[1]?.value).toBe("Session description retained.");
    expect(button("Apply review").disabled).toBe(false);
    expect(session.result.document).toBe(current.result.document);
  });
});
