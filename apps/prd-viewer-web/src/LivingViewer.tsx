/*
 * Company: EonHive Inc. | Title: Persistent Living Homepage Viewer
 * Purpose: Keep one reference Viewer mounted across inline and native modal presentation.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  livingViewerExitFocusMessage,
  livingViewerLocalFileMessage,
  livingViewerReadyMessage,
  livingViewerSampleSelectedMessage,
  livingViewerSelectSampleMessage,
  readLivingViewerMessage,
} from "./livingViewerMessages.js";
import { viewerDemoExampleArchives } from "./viewerDemoContent.js";

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
    const connectedRef = useRef(false);
    const initialSampleRef = useRef<string | undefined>(undefined);
    const requestedSampleRef = useRef<string | undefined>(undefined);
    const currentSampleRef = useRef(sample);
    const [localFile, setLocalFile] = useState(false);
    currentSampleRef.current = sample;
    // The source stays stable after the first mount; commands change its package in place.
    if (ready && initialSampleRef.current === undefined) initialSampleRef.current = sample;

    function requestSample(sampleId: string) {
      currentSampleRef.current = sampleId;
      setLocalFile(false);
      if (!connectedRef.current) return;
      requestedSampleRef.current = sampleId;
      iframeRef.current?.contentWindow?.postMessage(
        { type: livingViewerSelectSampleMessage, sampleId },
        window.location.origin,
      );
    }

    useEffect(() => {
      if (ready && sample !== requestedSampleRef.current) requestSample(sample);
    }, [ready, sample]);

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
      function handleEmbeddedMessage(event: MessageEvent<unknown>) {
        const message = readLivingViewerMessage(
          event,
          iframeRef.current?.contentWindow ?? null,
          window.location.origin,
        );
        if (message?.type === livingViewerExitFocusMessage) {
          exitFocus();
        } else if (message?.type === livingViewerReadyMessage) {
          connectedRef.current = true;
          requestSample(currentSampleRef.current);
        } else if (message?.type === livingViewerSampleSelectedMessage) {
          requestedSampleRef.current = message.sampleId;
          currentSampleRef.current = message.sampleId;
          setLocalFile(false);
          if (message.sampleId !== sample) onSampleChange(message.sampleId);
        } else if (message?.type === livingViewerLocalFileMessage) {
          setLocalFile(true);
        }
      }
      window.addEventListener("message", handleEmbeddedMessage);
      return () => window.removeEventListener("message", handleEmbeddedMessage);
    }, [active, ready, sample, onFocusChange, onSampleChange]);

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
              value={localFile ? "" : sample}
              onChange={(event) => {
                onSampleChange(event.target.value);
                requestSample(event.target.value);
              }}
            >
              {localFile && <option value="" disabled>Local file open</option>}
              {viewerDemoExampleArchives.map((example) => (
                <option key={example.id} value={example.id}>{example.label}</option>
              ))}
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
        {localFile && (
          <p className="living-viewer-local-note" role="status">
            Your local file stays in this Viewer. Choose an example to return to the demo.
          </p>
        )}
        {ready && (
          <iframe
            ref={iframeRef}
            src={`${viewerPath}?embed=1&sample=${initialSampleRef.current}`}
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
