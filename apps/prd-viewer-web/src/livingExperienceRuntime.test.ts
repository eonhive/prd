/*
 * Company: EonHive Inc. | Title: Living Homepage Runtime Tests
 * Purpose: Exercise the real uRK scheduler with deterministic browser frame and visibility boundaries.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLivingExperienceRuntime,
  type LivingExperienceRuntime,
} from "./livingExperienceRuntime.js";

let active: LivingExperienceRuntime | undefined;
afterEach(() => {
  active?.dispose();
  active = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function browserFixture(reduced = false) {
  vi.useFakeTimers();
  const preference = Object.assign(new EventTarget(), { matches: reduced });
  const finePointer = Object.assign(new EventTarget(), { matches: true });
  const browser = Object.assign(new EventTarget(), {
    scrollY: 0,
    innerWidth: 1280,
    innerHeight: 800,
    matchMedia: (query: string) =>
      query === "(pointer: fine)" ? finePointer : preference,
  });
  const document = Object.assign(new EventTarget(), { hidden: false });
  let frameId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const style = () => ({ setProperty: vi.fn(), transform: "" });
  const chapters = Array.from({ length: 6 }, (_, index) => ({
    offsetHeight: 800,
    getBoundingClientRect: vi.fn(() => ({
      top: index * 800 - browser.scrollY,
    })),
  }));
  const root = {
    dataset: {} as Record<string, string>,
    style: style(),
    querySelectorAll: () => chapters,
  };
  const stage = { style: style() };
  const sheet = { style: style() };
  let setIntersection: ((visible: boolean) => void) | undefined;
  class Observer {
    observe() {}
    disconnect() {}
  }
  class IntersectionObserverMock extends Observer {
    constructor(callback: IntersectionObserverCallback) {
      super();
      setIntersection = (visible) =>
        callback(
          [{ isIntersecting: visible } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
    }
  }
  vi.stubGlobal("window", browser);
  vi.stubGlobal("document", document);
  vi.stubGlobal("navigator", { hardwareConcurrency: 8 });
  vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
  vi.stubGlobal("ResizeObserver", Observer);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  const paint = (time = 100) => {
    const admitted = [...frames.values()];
    frames.clear();
    admitted.forEach((callback) => callback(time));
  };
  return {
    root,
    stage,
    sheet,
    browser,
    document,
    preference,
    frames,
    paint,
    setVisible: (visible: boolean) => setIntersection?.(visible),
    chapters,
  };
}

async function start(fixture: ReturnType<typeof browserFixture>) {
  const onChapter = vi.fn();
  active = await createLivingExperienceRuntime(
    fixture.root as unknown as HTMLElement,
    fixture.stage as unknown as HTMLElement,
    fixture.sheet as unknown as HTMLElement,
    onChapter,
    vi.fn(),
  );
  return { runtime: active, onChapter };
}

describe("uRK homepage frame ownership", () => {
  it("reuses measured chapter geometry during scroll and pointer bursts", async () => {
    const fixture = browserFixture();
    await start(fixture);
    fixture.paint();
    fixture.browser.scrollY = 1000;
    for (let index = 0; index < 20; index++) {
      fixture.browser.dispatchEvent(new Event("scroll"));
      fixture.browser.dispatchEvent(
        Object.assign(new Event("pointermove"), { clientX: 100, clientY: 100 }),
      );
    }
    fixture.paint(200);
    for (const chapter of fixture.chapters)
      expect(chapter.getBoundingClientRect).toHaveBeenCalledTimes(1);
    fixture.browser.dispatchEvent(new Event("resize"));
    for (const chapter of fixture.chapters)
      expect(chapter.getBoundingClientRect).toHaveBeenCalledTimes(2);
  });

  it("ignores pointer work beyond the story and resumes when the visitor returns", async () => {
    const fixture = browserFixture();
    await start(fixture);
    fixture.browser.scrollY = 5000;
    fixture.browser.dispatchEvent(new Event("scroll"));
    fixture.paint();
    const movePointer = () =>
      fixture.browser.dispatchEvent(
        Object.assign(new Event("pointermove"), { clientX: 100, clientY: 100 }),
      );
    for (let index = 0; index < 20; index++) movePointer();
    vi.advanceTimersByTime(1000);
    expect(fixture.frames.size).toBe(0);

    fixture.browser.scrollY = 800;
    fixture.browser.dispatchEvent(new Event("scroll"));
    fixture.paint(1200);
    movePointer();
    expect(fixture.frames.size).toBe(1);
  });

  it("stops ambient and pointer work while the experience is offscreen", async () => {
    const fixture = browserFixture();
    await start(fixture);
    fixture.paint();
    fixture.setVisible(false);
    fixture.browser.dispatchEvent(
      Object.assign(new Event("pointermove"), { clientX: 100, clientY: 100 }),
    );
    vi.advanceTimersByTime(1000);
    expect(fixture.frames.size).toBe(0);
    fixture.setVisible(true);
    expect(fixture.frames.size).toBe(1);
  });

  it("keeps scroll navigation usable when advanced observers are unavailable", async () => {
    const fixture = browserFixture();
    vi.stubGlobal("IntersectionObserver", undefined);
    vi.stubGlobal("ResizeObserver", undefined);
    const { runtime, onChapter } = await start(fixture);
    runtime.update({ motion: "off", quality: "auto", focused: false });
    fixture.browser.scrollY = 3400;
    fixture.browser.dispatchEvent(new Event("scroll"));
    fixture.paint();
    expect(onChapter).toHaveBeenLastCalledWith(4);
    expect(fixture.frames.size).toBe(0);
  });

  it("releases every idle frame with motion off, and coalesces scroll updates", async () => {
    const fixture = browserFixture();
    const { runtime, onChapter } = await start(fixture);
    runtime.update({ motion: "off", quality: "auto", focused: false });
    fixture.paint();
    expect(fixture.root.dataset.scheduler).toBe("urk-auto");
    expect(fixture.frames.size).toBe(0);
    vi.advanceTimersByTime(3000);
    expect(fixture.frames.size).toBe(0);
    fixture.browser.scrollY = 1700;
    for (let index = 0; index < 20; index++)
      fixture.browser.dispatchEvent(new Event("scroll"));
    expect(fixture.frames.size).toBe(1);
    fixture.paint(3200);
    expect(onChapter).toHaveBeenLastCalledWith(2);
    expect(fixture.frames.size).toBe(0);
  });

  it("respects the system preference even when full motion is selected", async () => {
    const fixture = browserFixture(true);
    const { runtime } = await start(fixture);
    runtime.update({ motion: "full", quality: "high", focused: false });
    runtime.setDevice("mobile");
    fixture.paint();
    expect(fixture.root.dataset.reduced).toBe("true");
    expect(fixture.sheet.style.setProperty).toHaveBeenCalledWith(
      "--document-width",
      "236px",
    );
    vi.advanceTimersByTime(500);
    expect(fixture.frames.size).toBe(0);
  });

  it("uses a low-rate ambient wake-up and stops it while the viewer has control", async () => {
    const fixture = browserFixture();
    const { runtime } = await start(fixture);
    runtime.setDevice("desktop");
    fixture.paint();
    expect(fixture.frames.size).toBe(0);
    vi.advanceTimersByTime(80);
    expect(fixture.frames.size).toBe(1);
    runtime.update({ motion: "full", quality: "auto", focused: true });
    fixture.paint(200);
    vi.advanceTimersByTime(1000);
    expect(fixture.frames.size).toBe(0);
  });

  it("stops on hidden pages and removes frames and listeners on disposal", async () => {
    const fixture = browserFixture();
    const { runtime } = await start(fixture);
    fixture.paint();
    fixture.document.hidden = true;
    fixture.document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(1000);
    expect(fixture.frames.size).toBe(0);
    fixture.document.hidden = false;
    fixture.document.dispatchEvent(new Event("visibilitychange"));
    expect(fixture.frames.size).toBe(1);
    runtime.dispose();
    active = undefined;
    expect(fixture.frames.size).toBe(0);
    fixture.browser.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(1000);
    expect(fixture.frames.size).toBe(0);
  });
});
