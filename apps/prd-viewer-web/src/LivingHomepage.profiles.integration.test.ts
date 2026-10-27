// @vitest-environment jsdom
/*
 * Company: EonHive Inc. | Title: Homepage Profile Interaction Tests
 * Purpose: Verify keyboard selection, stable document ownership, lazy source media, and recovery.
 * Author: Stan Nesi | Created: October 27, 2026 | Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LivingHomepage } from "./LivingHomepage.js";

const runtime = vi.hoisted(() => ({
  update: vi.fn(), setDevice: vi.fn(), setProfile: vi.fn(), dispose: vi.fn(),
  toggleAudio: vi.fn(), chapter: undefined as ((chapter: number) => void) | undefined,
}));
vi.mock("./livingExperienceRuntime.js", () => ({
  createLivingExperienceRuntime: vi.fn(async (_root, _stage, _sheet, onChapter) => {
    runtime.chapter = onChapter;
    onChapter(3);
    return runtime;
  }),
}));
vi.mock("./LivingPackageInspector.js", () => ({ LivingPackageInspector: () => null }));

let root: Root;
let container: HTMLDivElement;
let approachProfiles: (() => void) | undefined;
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;

function metadata(sampleId: string) {
  const comic = sampleId === "comic-basic";
  return {
    contractVersion: "prd-home-profile-preview-v0.1", sampleId,
    profile: comic ? "comic" : "storyboard", title: comic ? "Comic source" : "Storyboard source",
    sourceEntry: "content/root.json",
    items: [{ id: "first", imagePath: `examples/previews/${sampleId}/1.${comic ? "png" : "svg"}`, alt: "Authored source art", caption: "The first beat." }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("IntersectionObserver", class {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      const enter = () => this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      if (target.id === "profiles") approachProfiles = enter;
      else enter();
    }
    unobserve() {}
    disconnect() {}
  });
  fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
    const id = String(url).includes("comic-basic") ? "comic-basic" : "storyboard-basic";
    return new Response(JSON.stringify(metadata(id)));
  });
  vi.stubGlobal("fetch", fetcher);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function mount(ready = true) {
  await act(async () => root.render(createElement(LivingHomepage, {
    basePath: "/prd/", theme: "dark", onToggleTheme() {}, children: null,
  })));
  if (ready) await act(async () => approachProfiles?.());
}

function tab(id: string) {
  return container.querySelector<HTMLButtonElement>(`#living-profile-tab-${id}`)!;
}

async function select(id: string) {
  await act(async () => tab(id).click());
}

describe("homepage profile chapter", () => {
  it("changes all six presentations while retaining the document shell and one Viewer", async () => {
    await mount();
    const paper = container.querySelector(".living-paper");
    const frame = container.querySelector("iframe");
    const heading = container.querySelector(".living-profile-artwork h3");
    for (const id of ["report", "resume", "magazine", "comic", "storyboard", "document"]) {
      await select(id);
      expect(container.querySelector(".living-paper")).toBe(paper);
      expect(container.querySelector("iframe")).toBe(frame);
      expect(container.querySelector(".living-profile-artwork h3")).toBe(heading);
      expect(container.querySelector(".living-profile-artwork")!.getAttribute("data-layout")).toBe(id);
      expect(tab(id).getAttribute("aria-selected")).toBe("true");
      expect(runtime.setProfile).toHaveBeenLastCalledWith(id);
    }
  });

  it("supports arrow/Home/End tab navigation without intercepting ordinary page keys", async () => {
    await mount();
    const keys = [["document", "ArrowRight", "report"], ["report", "End", "magazine"], ["magazine", "ArrowRight", "document"], ["document", "ArrowLeft", "magazine"], ["magazine", "Home", "document"]];
    for (const [from, key, to] of keys) {
      await act(async () => tab(from!).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })));
      expect(document.activeElement).toBe(tab(to!));
      expect(tab(to!).tabIndex).toBe(0);
      expect(container.querySelector('[role="tabpanel"]')!.getAttribute("aria-labelledby")).toBe(tab(to!).id);
    }
    for (const key of ["Tab", "ArrowDown", "ArrowUp"]) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      await act(async () => { tab("document").dispatchEvent(event); });
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it("loads media only near the chapter and keeps the chosen sample connected to the Viewer/download", async () => {
    await mount(false);
    await select("comic");
    expect(fetcher).not.toHaveBeenCalled();
    await act(async () => approachProfiles?.());
    expect(fetcher).toHaveBeenCalledOnce();
    expect(container.querySelector(".living-profile-artwork img")!.getAttribute("src")).toBe("/prd/examples/previews/comic-basic/1.png");
    expect(container.querySelector<HTMLAnchorElement>('a[download]')!.getAttribute("href")).toBe("/prd/examples/comic-basic.prd");
    expect(container.querySelector<HTMLSelectElement>('[aria-label="PRD example package"]')!.value).toBe("comic-basic");
    await act(async () => runtime.chapter?.(4));
    expect(container.querySelector(".living-profile-artwork img")).toBeNull();
  });

  it("offers retry and keeps Viewer access when metadata returns the HTML shell", async () => {
    await mount();
    fetcher.mockResolvedValueOnce(new Response("<html>missing preview</html>"));
    await select("comic");
    const panel = container.querySelector("#living-profile-panel")!;
    expect(panel.textContent).toContain("unavailable in this build");
    expect(panel.textContent).toContain("Open this package in the Viewer");
    const retry = [...panel.querySelectorAll("button")].find((button) => button.textContent === "Retry media preview")!;
    await act(async () => retry.click());
    expect(panel.textContent).toContain("Comic source");
    expect(container.querySelector(".living-profile-artwork img")).not.toBeNull();
  });

  it("does not replace the new profile artwork with a late result from the previous sample", async () => {
    await mount();
    let finish!: (response: Response) => void;
    const pending = new Promise<Response>((resolvePromise) => { finish = resolvePromise; });
    fetcher.mockReturnValueOnce(pending);
    await select("comic");
    const signal = fetcher.mock.calls[0]![1]!.signal!;
    await select("storyboard");
    expect(signal.aborted).toBe(true);
    await act(async () => finish(new Response(JSON.stringify(metadata("comic-basic")))));
    expect(container.querySelector(".living-profile-artwork h3")!.textContent).toBe("Storyboard source");
    expect(container.querySelector(".living-profile-artwork img")!.getAttribute("src")).toContain("storyboard-basic");
  });

  it("remounts failed images on retry and keeps the accessible descriptions available", async () => {
    await mount();
    await select("comic");
    const image = container.querySelector(".living-profile-artwork img")!;
    await act(async () => image.dispatchEvent(new Event("error")));
    const panel = container.querySelector("#living-profile-panel")!;
    expect(panel.textContent).toContain("An example image could not display");
    expect(panel.textContent).toContain("Authored source art");
    const retry = [...panel.querySelectorAll("button")].find((button) => button.textContent === "Retry media preview")!;
    await act(async () => retry.click());
    expect(container.querySelector(".living-profile-artwork img")).not.toBe(image);
    expect(panel.textContent).not.toContain("An example image could not display");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
