/*
 * Company: EonHive Inc. | Title: Viewer Reading Modes
 * Purpose: Present continuous and native paginated reading around the existing structured renderer.
 * Author: Stan Nesi | Created: October 29, 2026 | Updated: October 29, 2026
 * Notes: Vibe coded with Codex.
 */

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createViewerPagination, type ViewerReadingMode, type ViewerReadingState } from "./viewerPagination.js";
import "./viewerPagination.css";

export function ViewerReadingView({
  packageIdentity, contentIdentity, children,
}: {
  packageIdentity: object;
  contentIdentity: object;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ReturnType<typeof createViewerPagination> | undefined>(undefined);
  const previousPackage = useRef<object | undefined>(undefined);
  const viewportId = useId();
  const hintId = useId();
  const [state, setState] = useState<ViewerReadingState>({ mode: "continuous", page: 1, pageCount: 1, measured: false });

  useLayoutEffect(() => {
    if (!rootRef.current || !viewportRef.current || !flowRef.current) return;
    const controller = createViewerPagination(rootRef.current, viewportRef.current, flowRef.current, (next) => {
      setState((current) => current.mode === next.mode && current.page === next.page &&
        current.pageCount === next.pageCount && current.measured === next.measured ? current : next);
    });
    controllerRef.current = controller;
    return () => { controller.dispose(); controllerRef.current = undefined; };
  }, []);

  useLayoutEffect(() => {
    controllerRef.current?.contentChanged(previousPackage.current !== packageIdentity);
    previousPackage.current = packageIdentity;
  }, [packageIdentity, contentIdentity, state.mode]);

  function turnPage(direction: number) {
    const page = state.page + direction;
    if (!state.measured || page < 1 || page > state.pageCount) return;
    controllerRef.current?.step(direction);
  }

  return (
    <section className="viewer-reading" ref={rootRef} data-reading-mode={state.mode} aria-label="Document reading">
      <div className="viewer-reading-controls">
        <div role="group" aria-label="Document reading mode">
          {(["continuous", "paginated"] as ViewerReadingMode[]).map((mode) => (
            <button key={mode} type="button" aria-pressed={state.mode === mode}
              aria-controls={viewportId} onClick={() => controllerRef.current?.setMode(mode)}>
              {mode === "continuous" ? "Continuous" : "Paginated"}
            </button>
          ))}
        </div>
        {state.mode === "paginated" && (
          <nav aria-label="Document pages">
            <button type="button" aria-disabled={!state.measured || state.page <= 1}
              aria-controls={viewportId} onClick={() => turnPage(-1)}>Previous page</button>
            <span role="status" aria-live="polite" aria-atomic="true">
              {state.measured ? `Page ${state.page} of ${state.pageCount}` : "Measuring pages…"}
            </span>
            <button type="button" aria-disabled={!state.measured || state.page >= state.pageCount}
              aria-controls={viewportId} onClick={() => turnPage(1)}>Next page</button>
          </nav>
        )}
      </div>
      {state.mode === "paginated" && <p className="viewer-reading-hint" id={hintId}>
        Focus the document to use Left/Right, Page Up/Down, Home and End. Pages adapt to this reading space.
      </p>}
      <div className="viewer-reading-page">
        <div className="viewer-reading-viewport" id={viewportId} ref={viewportRef}
          role="region" aria-label={state.mode === "paginated" ? "Paginated document" : "Continuous document"}
          aria-describedby={state.mode === "paginated" ? hintId : undefined}
          tabIndex={state.mode === "paginated" ? 0 : -1}>
          <div className="viewer-reading-flow" ref={flowRef}>{children}</div>
        </div>
      </div>
    </section>
  );
}
