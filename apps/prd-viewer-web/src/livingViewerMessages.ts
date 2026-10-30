/*
 * Company: EonHive Inc. | Title: Embedded Viewer Keyboard Messages
 * Purpose: Authenticate bounded app-only requests across the Viewer iframe boundary.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { viewerDemoExampleArchives } from "./viewerDemoContent.js";

export const livingViewerExitFocusMessage = "prd-viewer:exit-focus";
export const livingViewerReadyMessage = "prd-viewer:ready";
export const livingViewerSelectSampleMessage = "prd-viewer:select-sample";
export const livingViewerSampleSelectedMessage = "prd-viewer:sample-selected";
export const livingViewerLocalFileMessage = "prd-viewer:local-file";

export type LivingViewerMessage =
  | { type: typeof livingViewerExitFocusMessage }
  | { type: typeof livingViewerReadyMessage }
  | { type: typeof livingViewerLocalFileMessage }
  | { type: typeof livingViewerSelectSampleMessage; sampleId: string }
  | { type: typeof livingViewerSampleSelectedMessage; sampleId: string };

export function readLivingViewerMessage(
  event: Pick<MessageEvent<unknown>, "source" | "origin" | "data">,
  expectedSource: Window | null,
  expectedOrigin: string,
): LivingViewerMessage | undefined {
  if (
    !expectedSource ||
    event.source !== expectedSource ||
    event.origin !== expectedOrigin
  )
    return undefined;
  const data: unknown = event.data;
  if (
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data) ||
    !("type" in data)
  )
    return undefined;
  if (
    data.type === livingViewerExitFocusMessage ||
    data.type === livingViewerReadyMessage ||
    data.type === livingViewerLocalFileMessage
  ) {
    return { type: data.type };
  }
  if (
    (data.type === livingViewerSelectSampleMessage ||
      data.type === livingViewerSampleSelectedMessage) &&
    "sampleId" in data &&
    typeof data.sampleId === "string" &&
    viewerDemoExampleArchives.some((example) => example.id === data.sampleId)
  ) {
    return { type: data.type, sampleId: data.sampleId };
  }
  return undefined;
}

export function isLivingViewerExitRequest(
  event: Pick<MessageEvent<unknown>, "source" | "origin" | "data">,
  expectedSource: Window | null,
  expectedOrigin: string,
): boolean {
  return (
    readLivingViewerMessage(event, expectedSource, expectedOrigin)?.type ===
    livingViewerExitFocusMessage
  );
}
