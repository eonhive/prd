/*
 * Company: EonHive Inc. | Title: Embedded Viewer Message Tests
 * Purpose: Verify only the intended Viewer window can request a focus-mode exit.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { describe, expect, it } from "vitest";
import {
  isLivingViewerExitRequest,
  livingViewerExitFocusMessage,
} from "./livingViewerMessages.js";

describe("embedded Viewer Escape boundary", () => {
  const frameWindow = {} as Window;
  const origin = "https://prd.eonhive.com";
  const request = {
    source: frameWindow,
    origin,
    data: { type: livingViewerExitFocusMessage },
  };

  it("accepts the defined request from the current same-origin Viewer", () => {
    expect(isLivingViewerExitRequest(request, frameWindow, origin)).toBe(true);
  });

  it("rejects foreign origins and other windows, including a missing iframe", () => {
    expect(
      isLivingViewerExitRequest(
        { ...request, origin: "https://example.com" },
        frameWindow,
        origin,
      ),
    ).toBe(false);
    expect(
      isLivingViewerExitRequest(
        { ...request, source: {} as Window },
        frameWindow,
        origin,
      ),
    ).toBe(false);
    expect(
      isLivingViewerExitRequest({ ...request, source: null }, null, origin),
    ).toBe(false);
  });

  it.each([
    null,
    undefined,
    "prd-viewer:exit-focus",
    [],
    {},
    { type: "open-package" },
  ])("rejects malformed or unrelated message data: %j", (data) => {
    expect(
      isLivingViewerExitRequest({ ...request, data }, frameWindow, origin),
    ).toBe(false);
  });
});
