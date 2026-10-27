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
  for (const id of ["document-basic", "comic-basic", "storyboard-basic"]) {
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

describe("embedded archive loading", () => {
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
    const sample = [...container.querySelectorAll<HTMLLIElement>(".example-archive-list li")]
      .find((item) => item.textContent?.includes("Comic Basic"))!;
    await act(async () => sample.querySelector("button")!.click());
    expect(parentPost).toHaveBeenCalledWith({ type: livingViewerSampleSelectedMessage, sampleId: "comic-basic" }, window.location.origin);
    expect(title()).toBe("PRD Comic Fixture");
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
