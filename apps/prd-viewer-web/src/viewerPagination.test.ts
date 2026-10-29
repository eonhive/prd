// @vitest-environment jsdom
/*
 * Company: EonHive Inc. | Title: Viewer Pagination Tests
 * Purpose: Verify measured page navigation, semantic anchors, keyboard boundaries and lifecycle cleanup.
 * Author: Stan Nesi | Created: October 29, 2026 | Updated: October 29, 2026
 * Notes: Vibe coded with Codex.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createViewerPagination, getPaginationMetrics, getPaginationPage, type ViewerReadingState } from "./viewerPagination.js";

let active: ReturnType<typeof createViewerPagination> | undefined;
afterEach(() => {
  active?.dispose();
  active = undefined;
  document.body.replaceChildren();
  Reflect.deleteProperty(document, "fonts");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function fixture(withObserver = true) {
  document.body.innerHTML = `<a id="outline" href="#paragraph-4">Later section</a>
    <section data-reading-mode="continuous"><div class="viewport"><div class="flow" style="column-gap:32px">
      <article id="document">${Array.from({ length: 6 }, (_, index) => `<p id="paragraph-${index}">Paragraph ${index} <a href="#paragraph-4">Jump</a></p>`).join("")}</article>
    </div></div></section>`;
  const root = document.querySelector<HTMLElement>("section")!;
  const viewport = root.querySelector<HTMLElement>(".viewport")!;
  const flow = root.querySelector<HTMLElement>(".flow")!;
  let width = 500;
  let count = 3;
  let pages = [0, 0, 1, 1, 2, 2];
  let hidden = false;
  let resize: (() => void) | undefined;
  const disconnect = vi.fn();
  const fonts = Object.assign(new EventTarget(), { ready: Promise.resolve() });
  Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
  vi.stubGlobal("scrollY", 0);
  vi.stubGlobal("innerHeight", 800);
  vi.stubGlobal("ResizeObserver", withObserver ? class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect = disconnect;
  } : undefined);
  vi.spyOn(window, "scrollTo").mockImplementation((options) => {
    vi.stubGlobal("scrollY", (options as ScrollToOptions).top ?? 0);
  });
  Object.defineProperty(viewport, "clientWidth", { get: () => hidden ? 0 : width });
  Object.defineProperty(viewport, "scrollWidth", { get: () => count * (width + 32) - 32 });
  const rect = (left: number, top: number, height = 300): DOMRect => ({
    left, right: left + width, top, bottom: top + height, width, height, x: left, y: top, toJSON() {},
  });
  vi.spyOn(viewport, "getBoundingClientRect").mockImplementation(() => rect(100, 200 - window.scrollY, 600));
  vi.spyOn(flow, "getBoundingClientRect").mockImplementation(() => rect(100 - viewport.scrollLeft, 200 - window.scrollY, 600));
  const nodes = [...flow.querySelectorAll<HTMLParagraphElement>("p")];
  nodes.forEach((node, index) => {
    const position = () => root.dataset.readingMode === "paginated"
      ? rect(100 + pages[index]! * (width + 32) - viewport.scrollLeft, 200 + (index % 2) * 300 - window.scrollY)
      : rect(100, 200 + index * 300 - window.scrollY);
    vi.spyOn(node, "getBoundingClientRect").mockImplementation(position);
    vi.spyOn(node, "getClientRects").mockImplementation(() => [position()] as unknown as DOMRectList);
    vi.spyOn(node.querySelector("a")!, "getClientRects").mockImplementation(() => [position()] as unknown as DOMRectList);
  });
  const changes = vi.fn<(state: ViewerReadingState) => void>();
  active = createViewerPagination(root, viewport, flow, changes);
  active.contentChanged(true);
  const controller = active;
  return {
    root, viewport, flow, nodes, controller, disconnect, fonts, changes,
    state: () => changes.mock.calls.at(-1)![0],
    resize: () => resize?.(),
    layout(nextWidth: number, nextPages: number[], nextCount: number) { width = nextWidth; pages = nextPages; count = nextCount; },
    hide(value: boolean) { hidden = value; resize?.(); },
    scroll(y: number) { vi.stubGlobal("scrollY", y); window.dispatchEvent(new Event("scroll")); },
  };
}

describe("pagination measurements", () => {
  it.each([[500, 1564, 32, 3], [500, 500, 32, 1], [500, 1032.4, 32, 2], [320, 1376, 32, 4]])(
    "counts native columns at width %s and extent %s", (width, extent, gap, count) => {
      expect(getPaginationMetrics(width, extent, gap).pageCount).toBe(count);
    },
  );
  it("clamps native scrolling and overscroll to actual page bounds", () => {
    expect(getPaginationPage(-100, 532, 3)).toBe(1);
    expect(getPaginationPage(540, 532, 3)).toBe(2);
    expect(getPaginationPage(2000, 532, 3)).toBe(3);
  });
});

describe("native document pagination", () => {
  it("changes modes and clamps previous/next while retaining all semantic nodes", () => {
    const f = fixture();
    const article = f.flow.firstElementChild;
    f.controller.setMode("paginated");
    expect(f.state()).toMatchObject({ mode: "paginated", page: 1, pageCount: 3, measured: true });
    f.controller.step(-1);
    f.controller.step(1);
    expect(f.viewport.scrollLeft).toBe(532);
    expect(f.state().page).toBe(2);
    f.controller.step(100);
    expect(f.state().page).toBe(3);
    f.controller.setMode("continuous");
    expect(f.viewport.scrollLeft).toBe(0);
    expect(window.scrollY).toBe(1280);
    expect(f.flow.firstElementChild).toBe(article);
    expect(f.flow.querySelectorAll("p")).toHaveLength(6);
    expect(f.flow.querySelector("[aria-hidden]" )).toBeNull();
  });

  it("keeps a continuous reading section when entering pages and reflowing width", () => {
    const f = fixture();
    f.scroll(700);
    f.controller.setMode("paginated");
    expect(f.state().page).toBe(2);
    f.layout(320, [0, 1, 2, 3, 4, 5], 6);
    f.resize();
    expect(f.state()).toMatchObject({ page: 3, pageCount: 6 });
    expect(f.viewport.scrollLeft).toBe(704);
    f.controller.setMode("continuous");
    expect(window.scrollY).toBe(700);
  });

  it("retains anchors through content changes, hidden/reopened reading panes and resource reflow", async () => {
    const f = fixture();
    f.controller.setMode("paginated");
    f.controller.step(2);
    f.hide(true);
    expect(f.state().page).toBe(3);
    f.layout(320, [0, 1, 2, 3, 4, 5], 6);
    f.hide(false);
    expect(f.state().page).toBe(5);
    f.nodes[4]!.textContent = "Localized section";
    f.controller.contentChanged(false);
    expect(f.state().page).toBe(5);
    f.flow.dispatchEvent(new Event("load"));
    f.fonts.dispatchEvent(new Event("loadingdone"));
    await Promise.resolve();
    expect(f.state().page).toBe(5);
    f.controller.contentChanged(true);
    expect(f.state().page).toBe(1);
  });

  it("handles native horizontal scrolling without allocating animation frames", () => {
    const frames = vi.spyOn(window, "requestAnimationFrame");
    const f = fixture();
    f.controller.setMode("paginated");
    f.viewport.scrollLeft = 1064;
    f.viewport.dispatchEvent(new Event("scroll"));
    expect(f.state().page).toBe(3);
    expect(frames).not.toHaveBeenCalled();
  });

  it("preserves a paragraph fragment when a long paragraph reflows across more pages", () => {
    const f = fixture();
    let fragments = 2;
    vi.mocked(f.nodes[2]!.getClientRects).mockImplementation(() => Array.from({ length: fragments }, (_, index) => ({
      left: 100 + (index + (fragments === 2 ? 1 : 2)) * (fragments === 2 ? 532 : 352) - f.viewport.scrollLeft,
    })) as unknown as DOMRectList);
    f.controller.setMode("paginated");
    f.controller.step(2);
    expect(f.state().page).toBe(3);
    fragments = 4;
    f.layout(320, [0, 1, 2, 3, 4, 5], 6);
    f.resize();
    expect(f.state().page).toBe(5);
  });

  it("remeasures on window resize when ResizeObserver is unavailable", () => {
    const f = fixture(false);
    f.controller.setMode("paginated");
    f.controller.step(1);
    f.layout(320, [0, 1, 2, 3, 4, 5], 6);
    window.dispatchEvent(new Event("resize"));
    expect(f.state()).toMatchObject({ page: 3, pageCount: 6 });
  });

  it("keeps the continuous viewport position through font completion without an initial jump", async () => {
    const f = fixture();
    await Promise.resolve();
    expect(window.scrollY).toBe(0);
    f.scroll(700);
    f.fonts.dispatchEvent(new Event("loadingdone"));
    expect(window.scrollY).toBe(700);
  });

  it("scopes paging keys to the viewport and leaves links, modifiers, selection and ordinary scrolling native", () => {
    const f = fixture();
    f.controller.setMode("paginated");
    function key(target: HTMLElement, value: string, extra: KeyboardEventInit = {}) {
      const event = new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true, ...extra });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    }
    expect(key(f.viewport, "PageDown")).toBe(true);
    expect(f.state().page).toBe(2);
    expect(key(f.viewport, "End")).toBe(true);
    expect(f.state().page).toBe(3);
    expect(key(f.viewport, "Home")).toBe(true);
    for (const value of ["Tab", "ArrowDown", "ArrowUp", "Escape", " "]) expect(key(f.viewport, value)).toBe(false);
    expect(key(f.viewport, "ArrowRight", { shiftKey: true })).toBe(false);
    expect(key(f.nodes[0]!.querySelector("a")!, "ArrowRight")).toBe(false);
    vi.spyOn(window, "getSelection").mockReturnValue({ isCollapsed: false } as Selection);
    expect(key(f.viewport, "ArrowRight")).toBe(false);
    f.controller.setMode("continuous");
    expect(key(f.viewport, "PageDown")).toBe(false);
  });

  it("reveals outline and content fragments, follows history, and reveals keyboard-focused links", () => {
    const f = fixture();
    f.controller.setMode("paginated");
    document.getElementById("outline")!.click();
    expect(f.state().page).toBe(3);
    expect(document.activeElement).toBe(f.nodes[4]);
    expect(window.location.hash).toBe("#paragraph-4");
    window.history.replaceState(null, "", "#paragraph-2");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(f.state().page).toBe(2);
    f.nodes[0]!.querySelector("a")!.focus();
    expect(f.state().page).toBe(1);
    f.nodes[0]!.querySelector("a")!.click();
    expect(f.state().page).toBe(3);
  });

  it("leaves modified and new-tab fragment links alone", () => {
    const f = fixture();
    f.controller.setMode("paginated");
    const link = document.getElementById("outline")! as HTMLAnchorElement;
    const modified = new MouseEvent("click", { ctrlKey: true, bubbles: true, cancelable: true });
    link.dispatchEvent(modified);
    expect(modified.defaultPrevented).toBe(false);
    link.target = "_blank";
    const external = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(external);
    expect(external.defaultPrevented).toBe(false);
    expect(f.state().page).toBe(1);
  });

  it("keeps an explicitly selected target through repeated reflow even when an earlier paragraph shared its page", () => {
    const f = fixture();
    f.controller.setMode("paginated");
    const link = document.getElementById("outline")! as HTMLAnchorElement;
    link.href = "#paragraph-3";
    link.click();
    f.viewport.dispatchEvent(new Event("scroll"));
    expect(f.state().page).toBe(2);
    f.layout(320, [0, 1, 2, 3, 4, 5], 6);
    f.resize();
    f.viewport.dispatchEvent(new Event("scroll"));
    expect(f.state().page).toBe(4);
    f.resize();
    expect(f.state().page).toBe(4);
  });

  it("removes observers and listeners and ignores delayed font completion on disposal", async () => {
    const f = fixture();
    f.controller.setMode("paginated");
    f.controller.dispose();
    f.changes.mockClear();
    f.resize();
    f.flow.dispatchEvent(new Event("load"));
    window.dispatchEvent(new Event("resize"));
    f.viewport.dispatchEvent(new Event("scroll"));
    f.controller.step(1);
    await Promise.resolve();
    expect(f.disconnect).toHaveBeenCalledOnce();
    expect(f.changes).not.toHaveBeenCalled();
  });
});
