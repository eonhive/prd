/*
 * Company: EonHive Inc. | Title: Viewer Pagination Controller
 * Purpose: Navigate native CSS columns while retaining semantic reading anchors and one document tree.
 * Author: Stan Nesi | Created: October 29, 2026 | Updated: October 29, 2026
 * Notes: Vibe coded with Codex.
 */

export type ViewerReadingMode = "continuous" | "paginated";
export interface ViewerReadingState {
  mode: ViewerReadingMode;
  page: number;
  pageCount: number;
  measured: boolean;
}

export function getPaginationMetrics(width: number, extent: number, gap: number) {
  const stride = Math.max(1, width + gap);
  // Ignore subpixel rounding at the end of a native column, not a partial page.
  const pageCount = Math.max(1, Math.ceil((extent + gap - 1) / stride));
  return { stride, pageCount };
}

export function getPaginationPage(offset: number, stride: number, count: number) {
  return Math.max(1, Math.min(count, Math.round(offset / Math.max(1, stride)) + 1));
}

interface ReadingAnchor {
  id?: string;
  scopeId?: string;
  index: number;
  progress: number;
  viewportOffset?: number;
}
const readingNodes = "h1,h2,h3,h4,h5,h6,p,li,figure,table,video,audio";

function anchorFor(node: HTMLElement, index: number, progress = 0): ReadingAnchor {
  return {
    id: node.id || undefined,
    scopeId: node.closest("section[id],article[id]")?.id,
    index,
    progress,
  };
}

function resolveAnchor(flow: HTMLElement, nodes: HTMLElement[], anchor: ReadingAnchor) {
  const target = anchor.id ? flow.ownerDocument.getElementById(anchor.id) : null;
  if (target && flow.contains(target)) return target;
  const node = nodes[Math.min(anchor.index, nodes.length - 1)];
  const scope = anchor.scopeId ? flow.ownerDocument.getElementById(anchor.scopeId) : null;
  if (scope && flow.contains(scope) && (!node || !scope.contains(node))) {
    return scope.querySelector<HTMLElement>(readingNodes) ?? scope;
  }
  return node;
}

export function createViewerPagination(
  root: HTMLElement,
  viewport: HTMLElement,
  flow: HTMLElement,
  onChange: (state: ViewerReadingState) => void,
) {
  let state: ViewerReadingState = { mode: "continuous", page: 1, pageCount: 1, measured: false };
  let disposed = false;
  let stride = 1;
  let nodes: HTMLElement[] = [];
  let pageAnchors: ReadingAnchor[] = [];
  let bounds: { top: number; bottom: number; node: HTMLElement; index: number }[] = [];
  let anchor: ReadingAnchor | undefined;
  const controls = root.querySelector<HTMLElement>(".viewer-reading-controls");
  const controlsBottom = () => controls?.getBoundingClientRect().bottom ?? 0;

  function publish(next: Partial<ViewerReadingState>) {
    state = { ...state, ...next };
    onChange(state);
  }

  function rememberContinuous() {
    if (disposed || state.mode !== "continuous") return;
    const viewportRect = viewport.getBoundingClientRect();
    if (viewportRect.bottom <= 0 || viewportRect.top >= window.innerHeight) return;
    const line = window.scrollY + Math.max(Math.min(160, window.innerHeight * 0.2), controlsBottom() + 8);
    const current = bounds.find((item) => item.bottom > line);
    if (!current) return;
    const progress = Math.max(0, Math.min(0.99, (line - current.top) / Math.max(1, current.bottom - current.top)));
    anchor = anchorFor(current.node, current.index, progress);
    anchor.viewportOffset = current.top + progress * (current.bottom - current.top) - window.scrollY;
  }

  function goToPage(page: number) {
    if (disposed || state.mode !== "paginated" || !state.measured) return;
    const next = Math.max(1, Math.min(state.pageCount, page));
    viewport.scrollLeft = (next - 1) * stride;
    viewport.scrollTop = 0;
    anchor = pageAnchors[next - 1] ?? anchor;
    publish({ page: next });
  }

  function pageForRect(rect: DOMRect, origin = flow.getBoundingClientRect().left) {
    const offset = rect.left - origin;
    return Math.max(1, Math.min(state.pageCount, Math.floor((offset + 1) / stride) + 1));
  }

  function measure(restore = true) {
    if (disposed || viewport.clientWidth <= 0) return;
    nodes = [...flow.querySelectorAll<HTMLElement>(readingNodes)];
    if (state.mode === "continuous") {
      viewport.scrollLeft = 0;
      bounds = nodes.map((node, index) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY, node, index };
      });
      if (restore && anchor) {
        const target = resolveAnchor(flow, nodes, anchor);
        const rect = target?.getBoundingClientRect();
        if (rect) window.scrollTo({
          top: Math.max(0, window.scrollY + rect.top + anchor.progress * rect.height - (anchor.viewportOffset ?? Math.max(120, controlsBottom() + 8))),
          behavior: "instant",
        });
      }
      publish({ page: 1, pageCount: 1, measured: true });
      rememberContinuous();
      return;
    }

    const gap = parseFloat(getComputedStyle(flow).columnGap) || 0;
    const metrics = getPaginationMetrics(viewport.clientWidth, viewport.scrollWidth, gap);
    stride = metrics.stride;
    state = { ...state, pageCount: metrics.pageCount, measured: true };
    pageAnchors = [];
    const origin = flow.getBoundingClientRect().left;
    nodes.forEach((node, index) => {
      const rects = [...node.getClientRects()];
      rects.forEach((rect, fragment) => {
        const page = pageForRect(rect, origin) - 1;
        pageAnchors[page] ??= anchorFor(node, index, fragment / rects.length);
      });
    });
    const target = anchor && resolveAnchor(flow, nodes, anchor);
    const rects = target ? [...target.getClientRects()] : [];
    const rect = rects[Math.min(rects.length - 1, Math.floor((anchor?.progress ?? 0) * rects.length))];
    const previousAnchor = anchor;
    goToPage(restore && rect ? pageForRect(rect) : 1);
    // Reflow keeps the chosen semantic target; a page turn deliberately chooses a new anchor.
    if (restore && rect) anchor = previousAnchor;
  }

  function reveal(target: HTMLElement) {
    if (disposed || state.mode !== "paginated" || !state.measured || !flow.contains(target)) return false;
    const rect = target.getClientRects()[0];
    if (!rect) return false;
    goToPage(pageForRect(rect));
    const node = target.id ? target : target.closest<HTMLElement>(readingNodes) ?? target;
    const index = nodes.findIndex((candidate) => candidate === node || node.contains(candidate));
    anchor = anchorFor(node, Math.max(0, index));
    return true;
  }

  function handleScroll() {
    if (disposed || state.mode !== "paginated" || !state.measured) return;
    const page = getPaginationPage(viewport.scrollLeft, stride, state.pageCount);
    if (page === state.page) return;
    anchor = pageAnchors[page - 1] ?? anchor;
    publish({ page });
  }

  function handleKey(event: KeyboardEvent) {
    if (event.target !== viewport || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (state.mode !== "paginated" || window.getSelection()?.isCollapsed === false) return;
    const pages: Record<string, number> = {
      ArrowRight: state.page + 1, PageDown: state.page + 1,
      ArrowLeft: state.page - 1, PageUp: state.page - 1,
      Home: 1, End: state.pageCount,
    };
    const page = pages[event.key];
    if (page === undefined) return;
    event.preventDefault();
    goToPage(page);
  }

  function handleFocus(event: FocusEvent) {
    if (event.target instanceof HTMLElement) reveal(event.target);
  }

  function hashTarget(hash: string) {
    try { return flow.ownerDocument.getElementById(decodeURIComponent(hash.slice(1))); }
    catch { return null; }
  }

  function handleHash() {
    const target = hashTarget(window.location.hash);
    if (target) reveal(target);
  }

  function handleLink(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href^='#']") : null;
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const target = hashTarget(link.hash);
    if (!target || !reveal(target)) return;
    event.preventDefault();
    if (window.location.hash !== link.hash) window.history.pushState(null, "", link.hash);
    if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }

  const reflow = () => measure();
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(reflow);
  observer?.observe(viewport);
  observer?.observe(flow);
  viewport.addEventListener("scroll", handleScroll, { passive: true });
  viewport.addEventListener("keydown", handleKey);
  flow.addEventListener("focusin", handleFocus);
  flow.addEventListener("load", reflow, true);
  flow.addEventListener("loadedmetadata", reflow, true);
  flow.ownerDocument.addEventListener("click", handleLink);
  window.addEventListener("scroll", rememberContinuous, { passive: true });
  window.addEventListener("resize", reflow);
  window.addEventListener("hashchange", handleHash);
  flow.ownerDocument.fonts?.addEventListener("loadingdone", reflow);
  void flow.ownerDocument.fonts?.ready.then(reflow).catch(() => {});

  return {
    setMode(mode: ViewerReadingMode) {
      if (disposed || state.mode === mode) return;
      rememberContinuous();
      state = { ...state, mode, measured: false };
      root.dataset.readingMode = mode;
      publish({});
      measure();
    },
    contentChanged(reset: boolean) {
      if (disposed) return;
      if (reset) anchor = undefined;
      measure(!reset);
    },
    step(direction: number) { goToPage(state.page + direction); },
    dispose() {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      viewport.removeEventListener("scroll", handleScroll);
      viewport.removeEventListener("keydown", handleKey);
      flow.removeEventListener("focusin", handleFocus);
      flow.removeEventListener("load", reflow, true);
      flow.removeEventListener("loadedmetadata", reflow, true);
      flow.ownerDocument.removeEventListener("click", handleLink);
      window.removeEventListener("scroll", rememberContinuous);
      window.removeEventListener("resize", reflow);
      window.removeEventListener("hashchange", handleHash);
      flow.ownerDocument.fonts?.removeEventListener("loadingdone", reflow);
    },
  };
}
