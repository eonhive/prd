// @vitest-environment jsdom
/*
 * Company: EonHive Inc. | Title: Viewer Archive Loading Integration Tests
 * Purpose: Exercise real sample rendering, selection messages, and superseded asynchronous loads.
 * Author: Stan Nesi | Created: October 27, 2026 | Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { File as NodeFile } from "node:buffer";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { zipSync } from "fflate";
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";
import { getViewerContentTargetId } from "./viewerDocumentTargets.js";
import {
  livingViewerLocalFileMessage,
  livingViewerSampleSelectedMessage,
  livingViewerSelectSampleMessage,
} from "./livingViewerMessages.js";

const archives = new Map<string, Uint8Array>();
let root: Root;
let container: HTMLDivElement;
let parentFrame: HTMLIFrameElement;
let parentPost: ReturnType<typeof vi.spyOn>;
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;

beforeAll(async () => {
  for (const id of ["document-basic", "document-segmented-basic", "resume-basic", "comic-basic", "storyboard-basic"]) {
    archives.set(id, zipSync(await readFixture(resolve(process.cwd(), "examples", id))));
  }
});

async function readFixture(directory: string, prefix = ""): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {};
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(files, await readFixture(directory, path));
    else files[path] = new Uint8Array(await readFile(join(directory, path)));
  }
  return files;
}

function response(id: string): Response {
  return {
    ok: true,
    arrayBuffer: async () => Uint8Array.from(archives.get(id)!).buffer,
  } as Response;
}

beforeEach(() => {
  window.history.replaceState(null, "", "/viewer/?embed=1");
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("File", NodeFile);
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  let resourceId = 0;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => `blob:fixture-${++resourceId}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  parentFrame = document.createElement("iframe");
  document.body.appendChild(parentFrame);
  vi.spyOn(window, "parent", "get").mockReturnValue(parentFrame.contentWindow!);
  parentPost = vi.spyOn(parentFrame.contentWindow!, "postMessage");
  fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
    const id = String(url).split("/").pop()!.replace(".prd", "");
    return response(id);
  });
  vi.stubGlobal("fetch", fetcher);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  parentFrame.remove();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount() {
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))));
}

async function request(sampleId: string) {
  await act(async () => {
    window.dispatchEvent(new MessageEvent("message", {
      origin: window.location.origin, source: parentFrame.contentWindow,
      data: { type: livingViewerSelectSampleMessage, sampleId },
    }));
  });
}

function title() {
  return container.querySelector(".viewer-document-heading h1")?.textContent;
}

function installPaginationGeometry() {
  // jsdom does not fragment CSS columns. Model three columns around the actual rendered package.
  const viewport = container.querySelector<HTMLElement>(".viewer-reading-viewport")!;
  const flow = container.querySelector<HTMLElement>(".viewer-reading-flow")!;
  Object.defineProperties(viewport, {
    clientWidth: { get: () => 500 },
    scrollWidth: { get: () => 1564 },
  });
  flow.style.columnGap = "32px";
  vi.spyOn(flow, "getBoundingClientRect").mockImplementation(() => ({ left: -viewport.scrollLeft }) as DOMRect);
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(function (this: HTMLElement) {
    if (!flow.contains(this)) return [] as unknown as DOMRectList;
    const section = this.closest(".structured-section");
    const lastSection = ["why-this-exists", "scaling-path"].some((id) =>
      section?.id === getViewerContentTargetId("node", id),
    );
    const page = lastSection ? 2 : this.closest(".structured-document-header") ? 0 : 1;
    return [{ left: page * 532 - viewport.scrollLeft }] as unknown as DOMRectList;
  });
  return viewport;
}

async function chooseReadingMode(mode: string) {
  const button = [...container.querySelectorAll<HTMLButtonElement>('[aria-label="Document reading mode"] button')]
    .find((candidate) => candidate.textContent === mode)!;
  await act(async () => button.click());
}

async function dispatchViewerDrag(
  target: Element,
  type: string,
  transfer: { types: string[]; files: NodeFile[]; dropEffect: string },
  relatedTarget: EventTarget | null = null
) {
  // jsdom supplies mouse events; the transfer fixture exercises React's real drag handlers.
  const event = new MouseEvent(type, { bubbles: true, cancelable: type !== "dragleave", relatedTarget });
  Object.defineProperty(event, "dataTransfer", { value: transfer });
  await act(async () => { target.dispatchEvent(event); });
  return event;
}

describe("embedded archive loading", () => {
  it.each(["document-basic", "document-segmented-basic"])(
    "paginates the real %s renderer and keeps resources, targets and document ownership intact", async (sample) => {
      await mount();
      await request(sample);
      const article = container.querySelector(".structured-document");
      const image = container.querySelector<HTMLImageElement>(".structured-document img");
      const source = image?.src;
      const calls = fetcher.mock.calls.length;
      const targets = [...container.querySelectorAll('[id^="prd-content-"]')].map((node) => node.id);
      const viewport = installPaginationGeometry();
      await chooseReadingMode("Paginated");
      expect(container.querySelector('[aria-label="Document pages"]')!.textContent).toContain("Page 1 of 3");
      const section = sample === "document-basic" ? "why-this-exists" : "scaling-path";
      const link = container.querySelector<HTMLAnchorElement>(`.viewer-outline-list a[href="#${getViewerContentTargetId("node", section)}"]`)!;
      await act(async () => link.click());
      expect(viewport.scrollLeft).toBe(1064);
      expect(container.querySelector('[aria-label="Document pages"]')!.textContent).toContain("Page 3 of 3");
      expect(document.activeElement?.id).toBe(getViewerContentTargetId("node", section));
      const next = [...container.querySelectorAll<HTMLButtonElement>('[aria-label="Document pages"] button')]
        .find((button) => button.textContent === "Next page")!;
      next.focus();
      await act(async () => next.click());
      expect(next.getAttribute("aria-disabled")).toBe("true");
      expect(document.activeElement).toBe(next);
      expect(viewport.scrollLeft).toBe(1064);
      await chooseReadingMode("Continuous");
      expect(container.querySelector(".structured-document")).toBe(article);
      expect([...container.querySelectorAll('[id^="prd-content-"]')].map((node) => node.id)).toEqual(targets);
      expect(new Set(targets).size).toBe(targets.length);
      expect(container.querySelector(".structured-document img")).toBe(image);
      expect(image?.src).toBe(source);
      expect(fetcher).toHaveBeenCalledTimes(calls);
      expect(container.querySelector('[aria-label="Document pages"]')).toBeNull();
    },
  );

  it("offers both modes for a real local resume package without replacing its renderer", async () => {
    await mount();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { value: [new NodeFile([Uint8Array.from(archives.get("resume-basic")!)], "resume.prd")] });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    const article = container.querySelector(".resume-document");
    expect(article).not.toBeNull();
    installPaginationGeometry();
    await chooseReadingMode("Paginated");
    expect(container.querySelector('[aria-label="Document pages"]')!.textContent).toContain("Page 1 of 3");
    expect(container.querySelector(".resume-document")).toBe(article);
    await chooseReadingMode("Continuous");
    expect(container.querySelector(".resume-document")).toBe(article);
  });

  it("retains the paginated reading section across real locale changes and resets a new package to page one", async () => {
    await mount();
    await request("document-basic");
    const viewport = installPaginationGeometry();
    await chooseReadingMode("Paginated");
    const link = container.querySelector<HTMLAnchorElement>(`.viewer-outline-list a[href="#${getViewerContentTargetId("node", "why-this-exists")}"]`)!;
    await act(async () => link.click());
    const article = container.querySelector(".structured-document");
    const image = container.querySelector(".structured-document img");
    const calls = fetcher.mock.calls.length;
    const locale = container.querySelector<HTMLSelectElement>("#viewer-locale-select")!;
    await act(async () => {
      locale.value = "fr-FR";
      locale.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(title()).toBe("Exemple de document PRD");
    expect(viewport.scrollLeft).toBe(1064);
    expect(container.querySelector('[aria-label="Document pages"]')!.textContent).toContain("Page 3 of 3");
    expect(container.querySelector(".structured-document")).toBe(article);
    expect(container.querySelector(".structured-document img")).toBe(image);
    expect(fetcher).toHaveBeenCalledTimes(calls);
    await request("document-segmented-basic");
    expect(container.querySelector('[aria-label="Document pages"]')!.textContent).toContain("Page 1 of 3");
    expect(viewport.scrollLeft).toBe(0);
    await request("comic-basic");
    expect(container.querySelector('[aria-label="Document reading mode"]')).toBeNull();
    expect(container.querySelector(".comic-panel-navigation")).not.toBeNull();
  });

  it.each([true, false])("keeps nested file feedback active with related target available: %s", async (hasRelatedTarget) => {
    await mount();
    const zone = container.querySelector(".upload-dropzone")!;
    const heading = zone.querySelector("strong")!;
    const button = zone.querySelector("button")!;
    const transfer = { types: ["Files"], files: [], dropEffect: "none" };
    await dispatchViewerDrag(heading, "dragenter", transfer);
    const over = await dispatchViewerDrag(heading, "dragover", transfer);
    expect(over.defaultPrevented).toBe(true);
    expect(zone.classList.contains("upload-dropzone-active")).toBe(true);
    await dispatchViewerDrag(button, "dragenter", transfer);
    await dispatchViewerDrag(heading, "dragleave", transfer, hasRelatedTarget ? button : null);
    expect(zone.classList.contains("upload-dropzone-active")).toBe(true);
    expect(transfer.dropEffect).toBe("copy");
    await dispatchViewerDrag(button, "dragleave", transfer, container);
    expect(zone.classList.contains("upload-dropzone-active")).toBe(false);
  });

  it("ignores text drags without showing an archive error or changing localized content", async () => {
    await mount();
    await request("document-basic");
    const locale = container.querySelector<HTMLSelectElement>("#viewer-locale-select")!;
    await act(async () => {
      locale.value = "fr-FR";
      locale.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const image = container.querySelector("#document-stage img")!;
    const source = image.getAttribute("src");
    const requests = fetcher.mock.calls.length;
    const zone = container.querySelector(".upload-dropzone")!;
    const transfer = { types: ["text/plain"], files: [], dropEffect: "none" };
    const over = await dispatchViewerDrag(zone, "dragover", transfer);
    const drop = await dispatchViewerDrag(zone, "drop", transfer);
    expect(container.querySelector(".status.error")).toBeNull();
    expect(over.defaultPrevented).toBe(false);
    expect(drop.defaultPrevented).toBe(false);
    expect(zone.classList.contains("upload-dropzone-active")).toBe(false);
    expect(locale.value).toBe("fr-FR");
    expect(container.querySelector("#document-stage img")).toBe(image);
    expect(image.getAttribute("src")).toBe(source);
    expect(fetcher).toHaveBeenCalledTimes(requests);
  });

  it("opens a dropped archive through the existing local-file path and clears its highlight", async () => {
    await mount();
    const zone = container.querySelector(".upload-dropzone")!;
    const transfer = {
      types: ["Files"], dropEffect: "none",
      files: [new NodeFile([Uint8Array.from(archives.get("storyboard-basic")!)], "private-project.PRD")]
    };
    await dispatchViewerDrag(zone, "dragover", transfer);
    const drop = await dispatchViewerDrag(zone, "drop", transfer);
    expect(drop.defaultPrevented).toBe(true);
    expect(zone.classList.contains("upload-dropzone-active")).toBe(false);
    expect(title()).toBe("PRD Storyboard Fixture");
    expect(parentPost).toHaveBeenCalledWith({ type: livingViewerLocalFileMessage }, window.location.origin);
    expect(JSON.stringify(parentPost.mock.calls)).not.toContain("private-project");
  });

  it("retains the current document after an unsupported file drop and recovers on a valid drop", async () => {
    await mount();
    await request("document-basic");
    const zone = container.querySelector(".upload-dropzone")!;
    const unsupported = { types: ["Files"], files: [new NodeFile(["source"], "source.md")], dropEffect: "none" };
    await dispatchViewerDrag(zone, "drop", unsupported);
    expect(container.querySelector(".status.error")?.textContent).toContain("No .prd archive found");
    expect(title()).toBe("PRD Document Example");
    const valid = {
      types: ["Files"], dropEffect: "none",
      files: [new NodeFile([Uint8Array.from(archives.get("comic-basic")!)], "comic.prd")]
    };
    await dispatchViewerDrag(zone, "drop", valid);
    expect(container.querySelector(".status.error")).toBeNull();
    expect(title()).toBe("PRD Comic Fixture");
  });

  it.each([
    ["viewer-navigation", "Close document navigation"],
    ["package-details", "Close package details"]
  ])("returns keyboard focus from the closed desktop %s panel without reloading", async (panelId, label) => {
    await mount();
    await request("document-basic");
    const locale = container.querySelector<HTMLSelectElement>("#viewer-locale-select")!;
    await act(async () => {
      locale.value = "fr-FR";
      locale.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const image = container.querySelector("#document-stage img")!;
    const source = image.getAttribute("src");
    const requests = fetcher.mock.calls.length;
    const close = container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
    close.focus();
    await act(async () => close.click());
    const trigger = container.querySelector<HTMLButtonElement>(`[aria-controls="${panelId}"]`)!;
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(`#${panelId}`)?.hasAttribute("hidden")).toBe(true);
    expect(locale.value).toBe("fr-FR");
    expect(container.querySelector("#document-stage img")).toBe(image);
    expect(image.getAttribute("src")).toBe(source);
    expect(fetcher).toHaveBeenCalledTimes(requests);
  });

  it("reports filtered, empty and restored outline counts beside the search field", async () => {
    await mount();
    await request("document-basic");
    const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    const results = document.getElementById(search.getAttribute("aria-describedby")!)!;
    expect(results).not.toBeNull();
    expect(results.getAttribute("role")).toBe("status");
    expect(results.textContent).toBe("3 items");
    async function filter(value: string) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search, value);
        search.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    await filter("why");
    expect(results.textContent).toBe("1 of 3 items");
    expect(container.querySelectorAll(".viewer-outline-list li")).toHaveLength(1);
    await filter("no matching section");
    expect(results.textContent).toBe("0 of 3 items");
    expect(container.querySelector(".viewer-outline-list")).toBeNull();
    await filter("  ");
    expect(results.textContent).toBe("3 items");
    expect(container.querySelectorAll(".viewer-outline-list li")).toHaveLength(3);
  });

  it("announces the newly opened package title after its busy state ends", async () => {
    let finish!: (value: Response) => void;
    fetcher.mockReturnValue(new Promise<Response>((resolvePromise) => { finish = resolvePromise; }));
    await mount();
    await request("comic-basic");
    const dashboard = container.querySelector(".viewer-dashboard")!;
    const status = container.querySelector('.viewer-dashboard-status [role="status"]')!;
    expect(dashboard.getAttribute("aria-busy")).toBe("true");
    expect(status.textContent).toBe("Opening package...");
    await act(async () => finish(response("comic-basic")));
    expect(dashboard.getAttribute("aria-busy")).toBe("false");
    expect(status.getAttribute("aria-atomic")).toBe("true");
    expect(status.textContent).toBe("Valid package: PRD Comic Fixture");
  });

  it.each(["resolve", "reject"])("keeps a superseded fetch from changing a newer package when it later %s", async (outcome) => {
    let finishComic!: (value: Response) => void;
    let failComic!: (error: Error) => void;
    const pendingComic = new Promise<Response>((resolvePromise, rejectPromise) => {
      finishComic = resolvePromise;
      failComic = rejectPromise;
    });
    fetcher.mockImplementation(async (url) => String(url).endsWith("comic-basic.prd") ? pendingComic : response("storyboard-basic"));
    await mount();
    await request("comic-basic");
    const signal = fetcher.mock.calls[0]![1]!.signal!;
    await request("storyboard-basic");
    expect(signal.aborted).toBe(true);
    expect(title()).toBe("PRD Storyboard Fixture");
    await act(async () => {
      if (outcome === "resolve") finishComic(response("comic-basic"));
      else failComic(new Error("superseded request failed"));
    });
    expect(title()).toBe("PRD Storyboard Fixture");
    expect(container.textContent).not.toContain("superseded request failed");
  });

  it("ignores a stale file read even when the earlier response already arrived", async () => {
    let finishRead!: (value: ArrayBuffer) => void;
    const pendingRead = new Promise<ArrayBuffer>((resolvePromise) => { finishRead = resolvePromise; });
    const readFile = NodeFile.prototype.arrayBuffer;
    vi.spyOn(NodeFile.prototype, "arrayBuffer").mockImplementation(function (this: NodeFile) {
      return this.name === "comic-basic.prd" ? pendingRead : readFile.call(this);
    });
    await mount();
    await request("comic-basic");
    await request("storyboard-basic");
    expect(title()).toBe("PRD Storyboard Fixture");
    await act(async () => finishRead(Uint8Array.from(archives.get("comic-basic")!).buffer));
    expect(title()).toBe("PRD Storyboard Fixture");
  });

  it("retains an opened package and resource URLs when the parent repeats the same command", async () => {
    await mount();
    await request("document-basic");
    expect(title()).toBe("PRD Document Example");
    const locale = container.querySelector<HTMLSelectElement>("#viewer-locale-select")!;
    await act(async () => {
      locale.value = "fr-FR";
      locale.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const stage = container.querySelector("#document-stage")!;
    const image = stage.querySelector("img")!;
    const source = image.getAttribute("src");
    const requests = fetcher.mock.calls.length;
    await request("document-basic");
    expect(fetcher).toHaveBeenCalledTimes(requests);
    expect(container.querySelector("#document-stage")).toBe(stage);
    expect(stage.querySelector("img")!.getAttribute("src")).toBe(source);
    expect(locale.value).toBe("fr-FR");
  });

  it("reports a sample explicitly selected inside the Viewer", async () => {
    await mount();
    const examples = [...container.querySelectorAll<HTMLButtonElement>(".viewer-panel-switcher button")]
      .find((button) => button.textContent?.includes("Examples"))!;
    await act(async () => examples.click());
    const sample = [...container.querySelectorAll<HTMLButtonElement>(".viewer-example-shortcuts button")]
      .find((button) => button.textContent?.includes("Comic Basic"))!;
    await act(async () => sample.click());
    expect(parentPost).toHaveBeenCalledWith({ type: livingViewerSampleSelectedMessage, sampleId: "comic-basic" }, window.location.origin);
    expect(title()).toBe("PRD Comic Fixture");
  });

  it("receives a theme change without reloading localized content or echoing storage writes", async () => {
    window.localStorage.setItem("prd-viewer-theme", "dark");
    await mount();
    await request("document-basic");
    const locale = container.querySelector<HTMLSelectElement>("#viewer-locale-select")!;
    await act(async () => {
      locale.value = "fr-FR";
      locale.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const image = container.querySelector("#document-stage img")!;
    const source = image.getAttribute("src");
    const requests = fetcher.mock.calls.length;
    const write = vi.spyOn(Storage.prototype, "setItem");

    await act(async () => window.dispatchEvent(new StorageEvent("storage", {
      key: "prd-viewer-theme", newValue: "light"
    })));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(locale.value).toBe("fr-FR");
    expect(container.querySelector("#document-stage img")).toBe(image);
    expect(image.getAttribute("src")).toBe(source);
    expect(fetcher).toHaveBeenCalledTimes(requests);
    expect(write).not.toHaveBeenCalled();
  });

  it.each([
    ["comic-basic", "panel"], ["storyboard-basic", "frame"]
  ] as const)("closes the mobile outline and focuses the namespaced %s selection", async (sample, scope) => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(max-width: 1000px)", addEventListener() {}, removeEventListener() {}
    }));
    await mount();
    await request(sample);
    const dialog = container.querySelector<HTMLDialogElement>("#viewer-navigation")!;
    // jsdom has no native dialog top layer; browser QA covers its real focus containment.
    dialog.showModal = function () { this.open = true; };
    dialog.close = function () { this.open = false; };
    const visual = document.getElementById(getViewerContentTargetId(scope, `${scope}-1`))!;
    visual.scrollIntoView = vi.fn();
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-controls="viewer-navigation"]')!.click());
    expect(dialog.open).toBe(true);
    const selection = container.querySelectorAll<HTMLButtonElement>("#document-outline button")[1]!;
    await act(async () => selection.click());
    expect(dialog.open).toBe(false);
    expect(document.activeElement?.id).toBe(getViewerContentTargetId(scope, `${scope}-2`));
    await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowRight", bubbles: true
    })));
    expect(document.activeElement?.id).toBe(getViewerContentTargetId(scope, `${scope}-3`));
  });

  it("announces a local open without sending its filename or content", async () => {
    await mount();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { configurable: true, value: [new NodeFile([Uint8Array.from(archives.get("storyboard-basic")!)], "private-project.prd")] });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(parentPost).toHaveBeenCalledWith({ type: livingViewerLocalFileMessage }, window.location.origin);
    expect(JSON.stringify(parentPost.mock.calls)).not.toContain("private-project");
    expect(title()).toBe("PRD Storyboard Fixture");
  });

  it("recovers from a failed requested sample and rejects foreign parent commands", async () => {
    await mount();
    await act(async () => {
      window.dispatchEvent(new MessageEvent("message", {
        origin: "https://other.example", source: parentFrame.contentWindow,
        data: { type: livingViewerSelectSampleMessage, sampleId: "comic-basic" },
      }));
    });
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockRejectedValueOnce(new Error("fixture request failed"));
    await request("comic-basic");
    expect(container.textContent).toContain("fixture request failed");
    await request("comic-basic");
    expect(title()).toBe("PRD Comic Fixture");
  });

  it("finishes the initial sample after Strict Mode cleanup and replay", async () => {
    window.history.replaceState(null, "", "/viewer/?embed=1&sample=document-basic");
    await mount();
    expect(title()).toBe("PRD Document Example");
  });
});
