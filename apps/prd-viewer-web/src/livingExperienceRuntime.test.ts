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
  const chapterCopies = Array.from({ length: 6 }, (_, index) => ({
    getBoundingClientRect: vi.fn(() => ({ bottom: index * 800 + 600 - browser.scrollY })),
  }));
  const chapters = Array.from({ length: 6 }, (_, index) => ({
    offsetHeight: 800,
    getBoundingClientRect: vi.fn(() => ({
      top: index * 800 - browser.scrollY,
    })),
    querySelector: () => chapterCopies[index],
  }));
  const root = {
    dataset: {} as Record<string, string>,
    style: style(),
    querySelectorAll: () => chapters,
  };
  const stage = { style: style() };
  const sheet = { style: style() };
  let setIntersection: ((visible: boolean) => void) | undefined;
  let measureResize: (() => void) | undefined;
  class Observer {
    observe() {}
    disconnect() {}
  }
  class ResizeObserverMock extends Observer {
    constructor(callback: ResizeObserverCallback) {
      super();
      measureResize = () => callback([], this as unknown as ResizeObserver);
    }
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
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
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
    chapterCopies,
    measureResize: () => measureResize?.(),
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
  it.each(["focus", "offscreen", "hidden", "finished"])(
    "settles device motion and releases frame work when %s suspends the presentation",
    async (boundary) => {
      const fixture = browserFixture();
      const { runtime } = await start(fixture);
      fixture.paint(100);
      runtime.setDevice("mobile");
      fixture.paint(116);
      expect(fixture.frames.size).toBe(1);

      if (boundary === "focus") runtime.update({ motion: "full", quality: "auto", focused: true });
      if (boundary === "offscreen") fixture.setVisible(false);
      if (boundary === "hidden") {
        fixture.document.hidden = true;
        fixture.document.dispatchEvent(new Event("visibilitychange"));
      }
      if (boundary === "finished") {
        fixture.browser.scrollY = 5000;
        fixture.browser.dispatchEvent(new Event("scroll"));
      }
      fixture.paint(132);
      expect(fixture.sheet.style.setProperty).toHaveBeenCalledWith("--document-width", "236px");
      const writes = fixture.sheet.style.setProperty.mock.calls.length;
      vi.advanceTimersByTime(3000);
      expect(fixture.frames.size).toBe(0);
      fixture.paint(3200);
      expect(fixture.sheet.style.setProperty).toHaveBeenCalledTimes(writes);
    },
  );

  it("settles offscreen selections, then returns with the latest device and scroll position", async () => {
    const fixture = browserFixture();
    const { runtime, onChapter } = await start(fixture);
    fixture.paint();
    fixture.setVisible(false);
    runtime.setDevice("mobile");
    runtime.setProfile("comic");
    fixture.browser.scrollY = 2400;
    for (let index = 0; index < 30; index++) {
      fixture.browser.dispatchEvent(new Event("scroll"));
      fixture.browser.dispatchEvent(new Event("resize"));
    }
    vi.advanceTimersByTime(1000);
    expect(fixture.frames.size).toBe(0);
    expect(fixture.sheet.style.setProperty).toHaveBeenCalledWith("--document-width", "236px");
    fixture.setVisible(true);
    expect(fixture.frames.size).toBe(1);
    fixture.paint(1200);
    expect(onChapter).toHaveBeenLastCalledWith(3);
    expect(fixture.sheet.style.setProperty).toHaveBeenCalledWith("--profile-reveal", "1");
    runtime.setDevice("tablet");
    for (let time = 1216; time <= 2000; time += 16) fixture.paint(time);
    expect(fixture.sheet.style.setProperty).toHaveBeenLastCalledWith("--document-width", "340px");
  });

  it.each(["focus", "offscreen", "hidden", "finished"])(
    "applies new device selections without frame demand while %s suspends the presentation",
    async (boundary) => {
      const fixture = browserFixture();
      const { runtime } = await start(fixture);
      fixture.paint();
      if (boundary === "focus") runtime.update({ motion: "full", quality: "auto", focused: true });
      if (boundary === "offscreen") fixture.setVisible(false);
      if (boundary === "hidden") {
        fixture.document.hidden = true;
        fixture.document.dispatchEvent(new Event("visibilitychange"));
      }
      if (boundary === "finished") {
        fixture.browser.scrollY = 5000;
        fixture.browser.dispatchEvent(new Event("scroll"));
      }
      fixture.paint(200);
      runtime.setDevice("mobile");
      expect(fixture.sheet.style.setProperty).toHaveBeenLastCalledWith("--document-width", "236px");
      vi.advanceTimersByTime(3000);
      expect(fixture.frames.size).toBe(0);
    },
  );

  it("releases pending ambient paints immediately when the story leaves view", async () => {
    const fixture = browserFixture();
    await start(fixture);
    fixture.paint();
    vi.advanceTimersByTime(80);
    expect(fixture.frames.size).toBe(1);
    fixture.setVisible(false);
    expect(fixture.frames.size).toBe(0);
    vi.advanceTimersByTime(3000);
    expect(fixture.frames.size).toBe(0);
  });

  it("ignores all runtime commands after disposal and tolerates repeated cleanup", async () => {
    const fixture = browserFixture();
    const { runtime } = await start(fixture);
    fixture.paint();
    runtime.setDevice("mobile");
    runtime.dispose();
    const writes = fixture.sheet.style.setProperty.mock.calls.length;
    runtime.update({ motion: "off", quality: "low", focused: false });
    runtime.setDevice("tablet");
    runtime.setProfile("comic");
    expect(await runtime.toggleAudio()).toBe(false);
    runtime.dispose();
    active = undefined;
    vi.advanceTimersByTime(3000);
    expect(fixture.frames.size).toBe(0);
    expect(fixture.sheet.style.setProperty).toHaveBeenCalledTimes(writes);
  });

  it("retains no frame or timer work across repeated mount/dispose cycles", async () => {
    const fixture = browserFixture();
    for (let cycle = 0; cycle < 30; cycle++) {
      const { runtime } = await start(fixture);
      fixture.paint(cycle * 1000);
      runtime.setDevice("mobile");
      runtime.dispose();
      expect(fixture.frames.size).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    }
    active = undefined;
    fixture.browser.dispatchEvent(new Event("scroll"));
    fixture.measureResize();
    fixture.setVisible(true);
    vi.advanceTimersByTime(3000);
    expect(fixture.frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("runs a finite profile reveal on the existing kernel", async () => {
    const fixture = browserFixture();
    const { runtime } = await start(fixture);
    fixture.browser.scrollY = 2400;
    fixture.browser.dispatchEvent(new Event("scroll"));
    fixture.paint(100);
    runtime.setProfile("comic");
    expect(fixture.sheet.style.setProperty).toHaveBeenCalledWith("--profile-reveal", "0");
    for (let time = 116; time <= 900; time += 16) fixture.paint(time);
    expect(fixture.sheet.style.setProperty).toHaveBeenLastCalledWith("--profile-reveal", "1");
    expect(fixture.frames.size).toBe(0);
  });

  it("settles an interrupted profile reveal when reduced motion is requested", async () => {
    const fixture = browserFixture();
    const { runtime } = await start(fixture);
    fixture.browser.scrollY = 2400;
    fixture.browser.dispatchEvent(new Event("scroll"));
    fixture.paint(100);
    runtime.setProfile("comic");
    fixture.preference.matches = true;
    fixture.preference.dispatchEvent(new Event("change"));
    fixture.paint(200);
    vi.advanceTimersByTime(1000);
    expect(fixture.sheet.style.setProperty).toHaveBeenCalledWith("--profile-reveal", "1");
    expect(fixture.frames.size).toBe(0);
  });

  it("does not animate profiles outside their visible chapter or after disposal", async () => {
    const fixture = browserFixture();
    const { runtime } = await start(fixture);
    fixture.paint();
    runtime.setProfile("comic");
    expect(fixture.frames.size).toBe(0);
    fixture.setVisible(false);
    runtime.setProfile("resume");
    vi.advanceTimersByTime(1000);
    expect(fixture.frames.size).toBe(0);
    runtime.dispose();
    active = undefined;
    runtime.setProfile("magazine");
    expect(fixture.frames.size).toBe(0);
  });

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
    for (const copy of fixture.chapterCopies)
      expect(copy.getBoundingClientRect).toHaveBeenCalledTimes(1);
    fixture.browser.dispatchEvent(new Event("resize"));
    for (const chapter of fixture.chapters)
      expect(chapter.getBoundingClientRect).toHaveBeenCalledTimes(2);
  });

  it("positions the mobile sheet after expanded content and remeasures on content resize", async () => {
    const fixture = browserFixture();
    await start(fixture);
    expect(fixture.root.style.setProperty).toHaveBeenCalledWith("--chapter-stage-2", "2270px");
    fixture.chapterCopies[2]!.getBoundingClientRect.mockReturnValue({ bottom: 2600 });
    fixture.measureResize();
    expect(fixture.root.style.setProperty).toHaveBeenCalledWith("--chapter-stage-2", "2670px");
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
