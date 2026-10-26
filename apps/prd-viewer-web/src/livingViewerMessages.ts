/*
 * Company: EonHive Inc. | Title: Embedded Viewer Keyboard Messages
 * Purpose: Authenticate the app-only Escape request across the Viewer iframe boundary.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

export const livingViewerExitFocusMessage = "prd-viewer:exit-focus";

export function isLivingViewerExitRequest(
  event: Pick<MessageEvent<unknown>, "source" | "origin" | "data">,
  expectedSource: Window | null,
  expectedOrigin: string,
): boolean {
  if (
    !expectedSource ||
    event.source !== expectedSource ||
    event.origin !== expectedOrigin
  )
    return false;
  const data: unknown = event.data;
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    "type" in data &&
    data.type === livingViewerExitFocusMessage
  );
}
