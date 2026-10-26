/*
 * Company: EonHive Inc. | Title: Persistent Living Homepage Viewer
 * Purpose: Keep one reference Viewer mounted across inline and native modal presentation.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { isLivingViewerExitRequest } from "./livingViewerMessages.js";

export interface LivingViewerHandle {
  openFocus(): void;
}

interface LivingViewerProps {
  active: boolean;
  ready: boolean;
  sample: string;
  viewerPath: string;
  onSampleChange: (sample: string) => void;
  onFocusChange: (focused: boolean) => void;
}

export const LivingViewer = forwardRef<LivingViewerHandle, LivingViewerProps>(
  function LivingViewer(
    { active, ready, sample, viewerPath, onSampleChange, onFocusChange },
    ref,
  ) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const exitRef = useRef<HTMLButtonElement>(null);
    const invokerRef = useRef<HTMLElement | null>(null);
    const focusedRef = useRef(false);

    function pauseHiddenMedia() {
      iframeRef.current?.contentDocument
        ?.querySelectorAll<HTMLMediaElement>("audio, video")
        .forEach((media) => media.pause());
    }

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog || focusedRef.current) return;

      // Setting open displays the inline view without the focus-stealing steps of show().
      dialog.open = active && ready;
      if (!active) pauseHiddenMedia();
    }, [active, ready]);

    function exitFocus() {
      if (!focusedRef.current) return;
      focusedRef.current = false;
      const dialog = dialogRef.current;
      dialog?.close();
      if (dialog) dialog.open = active && ready;
      if (!active) pauseHiddenMedia();
      onFocusChange(false);
      invokerRef.current?.focus({ preventScroll: true });
    }

    function openFocus() {
      const dialog = dialogRef.current;
      if (!dialog || focusedRef.current) return;
      invokerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      if (dialog.open) dialog.close();
      focusedRef.current = true;
      dialog.showModal();
      onFocusChange(true);
      exitRef.current?.focus({ preventScroll: true });
    }

    useEffect(() => {
      function handleEmbeddedEscape(event: MessageEvent<unknown>) {
        if (
          isLivingViewerExitRequest(
            event,
            iframeRef.current?.contentWindow ?? null,
            window.location.origin,
          )
        ) {
          exitFocus();
        }
      }
      window.addEventListener("message", handleEmbeddedEscape);
      return () => window.removeEventListener("message", handleEmbeddedEscape);
    }, [active, ready, onFocusChange]);

    useImperativeHandle(ref, () => ({ openFocus }));

    return (
      <dialog
        ref={dialogRef}
        className="living-viewer-dialog"
        aria-labelledby="living-viewer-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          exitFocus();
        }}
        onClose={() => {
          // An inline-to-modal transition queues a close event for the previous mode.
          if (!dialogRef.current?.matches(":modal")) exitFocus();
        }}
      >
        <header className="living-viewer-focus-header">
          <div>
            <span className="living-live-dot">LIVE DOCUMENT</span>
            <h2 id="living-viewer-dialog-title">A document, opened.</h2>
          </div>
          <button
            ref={exitRef}
            type="button"
            onClick={exitFocus}
            className="living-dialog-close"
          >
            Exit viewer <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="living-viewer-toolbar">
          <label>
            Example{" "}
            <select
              aria-label="PRD example package"
              value={sample}
              onChange={(event) => onSampleChange(event.target.value)}
            >
              <option value="document-basic">Document</option>
              <option value="comic-basic">Comic</option>
              <option value="storyboard-basic">Storyboard</option>
            </select>
          </label>
          <span className="living-live-dot">Real PRD Viewer</span>
          <a
            href={`${viewerPath}?sample=${sample}`}
            target="_blank"
            rel="noreferrer"
            title="Open full viewer in a new tab"
          >
            ↗<span className="living-sr-only">Open full viewer</span>
          </a>
        </div>
        {ready && (
          <iframe
            ref={iframeRef}
            src={`${viewerPath}?embed=1&sample=${sample}`}
            title="Embedded PRD reference viewer"
            loading="lazy"
          />
        )}
        <button
          type="button"
          className="living-inline-action"
          onClick={openFocus}
        >
          Explore in focus mode <span aria-hidden="true">↗</span>
        </button>
        <footer className="living-viewer-modal-footer">
          <span>PRD REFERENCE VIEWER</span>
          <span>ESC TO RETURN TO YOUR STORY</span>
        </footer>
      </dialog>
    );
  },
);
