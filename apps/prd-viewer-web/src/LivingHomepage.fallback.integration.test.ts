// @vitest-environment jsdom
/*
 * Company: EonHive Inc. | Title: Homepage Runtime Fallback Tests
 * Purpose: Keep native chapter navigation and the real Viewer usable when motion cannot start.
 * Author: Stan Nesi | Created: October 29, 2026 | Updated: October 29, 2026
 * Notes: Vibe coded with Codex.
 */

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LivingHomepage } from "./LivingHomepage.js";

const runtime = vi.hoisted(() => ({
  create: vi.fn(), update: vi.fn(), setDevice: vi.fn(), setProfile: vi.fn(), dispose: vi.fn(),
}));
vi.mock("./livingExperienceRuntime.js", () => ({ createLivingExperienceRuntime: runtime.create }));
vi.mock("./LivingPackageInspector.js", () => ({ LivingPackageInspector: () => null }));

let root: Root;
let container: HTMLDivElement;
let copyHeight: number;
let measure: (() => void) | undefined;
let geometry: ReturnType<typeof vi.spyOn>;
const disconnect = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  runtime.create.mockRejectedValue(new Error("Motion chunk unavailable"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("IntersectionObserver", undefined);
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { measure = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.stubGlobal("scrollY", 0);
  vi.stubGlobal("innerHeight", 800);
  copyHeight = 550;
  measure = undefined;
  geometry = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const section = this.matches("[data-living-chapter]") ? this : this.closest("[data-living-chapter]");
    const index = Number(section?.className.match(/living-chapter-(\d)/)?.[1] ?? 0);
    const top = index * 1000 - window.scrollY;
    return { top, bottom: top + copyHeight } as DOMRect;
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(1000);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount() {
  await act(async () => root.render(createElement(LivingHomepage, {
    basePath: "/prd/", theme: "dark", onToggleTheme() {}, children: null,
  })));
}

async function scrollTo(y: number) {
  vi.stubGlobal("scrollY", y);
  await act(async () => window.dispatchEvent(new Event("scroll")));
}

function experience() { return container.querySelector<HTMLElement>(".living-experience")!; }

describe("homepage without the motion runtime", () => {
  it("follows all chapters in both directions and exposes the same inline Viewer", async () => {
    await mount();
    expect(container.textContent).toContain("Motion is unavailable");
    const frame = container.querySelector("iframe");
    for (const chapter of [1, 2, 3, 4, 5, 4, 3, 2, 1, 0]) {
      await scrollTo(chapter * 1000);
      expect(experience().dataset.chapter).toBe(String(chapter));
      expect(container.querySelector('[aria-current="step"]')!.getAttribute("href"))
        .toBe(["#awakening", "#responsive", "#structure", "#profiles", "#viewer", "#portable"][chapter]);
      expect(container.querySelector<HTMLDialogElement>("dialog")!.open).toBe(chapter === 4);
      expect(container.querySelector("iframe")).toBe(frame);
    }
    expect(frame?.getAttribute("src")).toBe("/prd/viewer/?embed=1&sample=document-basic");
  });

  it("applies device selections immediately without loading another runtime or scheduler", async () => {
    const frame = vi.spyOn(window, "requestAnimationFrame");
    await mount();
    const paper = container.querySelector<HTMLElement>(".living-document-object")!;
    for (const [device, width] of [["mobile", "236px"], ["tablet", "340px"], ["desktop", "420px"]]) {
      const button = container.querySelector<HTMLButtonElement>(`.living-device-controls button:nth-child(${device === "desktop" ? 1 : device === "tablet" ? 2 : 3})`)!;
      await act(async () => button.click());
      expect(paper.dataset.device).toBe(device);
      expect(paper.style.getPropertyValue("--document-width")).toBe(width);
      expect(button.getAttribute("aria-pressed")).toBe("true");
    }
    expect(runtime.create).toHaveBeenCalledOnce();
    expect(frame).not.toHaveBeenCalled();
    const sound = container.querySelector<HTMLButtonElement>(".living-sound")!;
    expect(sound.disabled).toBe(true);
    expect(sound.getAttribute("aria-label")).toBe("Ambient sound unavailable");
    expect(paper.style.transform).toBe("none");
  });

  it("caches geometry during scrolling and remeasures expanded copy for the mobile stage", async () => {
    await mount();
    expect(experience().style.getPropertyValue("--chapter-stage-3")).toBe("3620px");
    geometry.mockClear();
    await scrollTo(3000);
    await scrollTo(3100);
    expect(geometry).not.toHaveBeenCalled();
    copyHeight = 750;
    await act(async () => measure?.());
    expect(experience().style.getPropertyValue("--chapter-stage-3")).toBe("3820px");
    await scrollTo(5900);
    expect(experience().dataset.storyComplete).toBe("true");
    await scrollTo(4000);
    expect(experience().dataset.storyComplete).toBe("false");
  });

  it("supports initial deep positions and window resizing without ResizeObserver", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    vi.stubGlobal("scrollY", 4000);
    await mount();
    expect(experience().dataset.chapter).toBe("4");
    expect(container.querySelector<HTMLDialogElement>("dialog")!.open).toBe(true);
    copyHeight = 700;
    await act(async () => window.dispatchEvent(new Event("resize")));
    expect(experience().style.getPropertyValue("--chapter-stage-4")).toBe("4770px");
  });

  it("disconnects fallback input and geometry observers when leaving Home", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    await mount();
    await act(async () => root.render(null));
    expect(disconnect).toHaveBeenCalledOnce();
    expect(remove.mock.calls.some(([type]) => type === "scroll")).toBe(true);
    expect(remove.mock.calls.some(([type]) => type === "resize")).toBe(true);
    geometry.mockClear();
    await scrollTo(3000);
    window.dispatchEvent(new Event("resize"));
    measure?.();
    expect(geometry).not.toHaveBeenCalled();
  });

  it("keeps profile keyboard controls and Viewer focus/return functional after failure", async () => {
    await mount();
    await scrollTo(3000);
    const paper = container.querySelector(".living-paper");
    const tab = container.querySelector<HTMLButtonElement>("#living-profile-tab-document")!;
    await act(async () => tab.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true })));
    expect(document.activeElement?.id).toBe("living-profile-tab-magazine");
    expect(container.querySelector('[role="tabpanel"]')!.getAttribute("aria-labelledby")).toBe("living-profile-tab-magazine");
    expect(container.querySelector(".living-profile-artwork")!.getAttribute("data-layout")).toBe("magazine");
    const dialog = container.querySelector<HTMLDialogElement>("dialog")!;
    dialog.showModal = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; };
    const enter = container.querySelector<HTMLButtonElement>("#viewer .living-primary")!;
    enter.focus();
    const frame = container.querySelector("iframe");
    await act(async () => enter.click());
    expect(experience().dataset.focused).toBe("true");
    expect(document.activeElement).toBe(container.querySelector(".living-dialog-close"));
    await act(async () => dialog.dispatchEvent(new Event("cancel", { cancelable: true })));
    expect(experience().dataset.focused).toBe("false");
    expect(document.activeElement).toBe(enter);
    expect(window.scrollY).toBe(3000);
    expect(container.querySelector(".living-paper")).toBe(paper);
    expect(container.querySelector("iframe")).toBe(frame);
  });

  it("ignores a delayed runtime rejection after leaving Home", async () => {
    let reject!: (error: Error) => void;
    runtime.create.mockReturnValue(new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    await mount();
    await act(async () => root.render(null));
    await act(async () => reject(new Error("Late load failure")));
    expect(measure).toBeUndefined();
    expect(disconnect).not.toHaveBeenCalled();
    expect(container.childElementCount).toBe(0);
  });

  it("leaves chapter and device ownership with a healthy uRK runtime", async () => {
    runtime.create.mockResolvedValue(runtime);
    await mount();
    expect(experience().dataset.runtime).not.toBe("unavailable");
    expect(measure).toBeUndefined();
    await scrollTo(4000);
    expect(experience().dataset.chapter).toBe("0");
    expect(experience().style.getPropertyValue("--chapter-stage-4")).toBe("");
    expect(runtime.setDevice).toHaveBeenCalledWith("desktop");
  });
});
