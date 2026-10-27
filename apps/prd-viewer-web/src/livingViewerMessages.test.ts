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
  livingViewerLocalFileMessage,
  livingViewerReadyMessage,
  livingViewerSelectSampleMessage,
  livingViewerSampleSelectedMessage,
  readLivingViewerMessage,
} from "./livingViewerMessages.js";
import { viewerDemoExampleArchives } from "./viewerDemoContent.js";

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

describe("embedded Viewer selection boundary", () => {
  const source = {} as Window;
  const origin = "https://prd.eonhive.com";
  const event = (data: unknown) => ({ data, source, origin });

  it.each([livingViewerSelectSampleMessage, livingViewerSampleSelectedMessage])(
    "accepts every hosted example for %s",
    (type) => {
      for (const example of viewerDemoExampleArchives) {
        const message = { type, sampleId: example.id };
        expect(readLivingViewerMessage(event(message), source, origin)).toEqual(message);
      }
    },
  );

  it.each([
    "https://other.example/document.prd", "../private.prd", "resume", "", null, {},
  ])("rejects unknown sample identities: %j", (sampleId) => {
    for (const type of [livingViewerSelectSampleMessage, livingViewerSampleSelectedMessage]) {
      expect(readLivingViewerMessage(event({ type, sampleId }), source, origin)).toBeUndefined();
    }
  });

  it.each([livingViewerReadyMessage, livingViewerLocalFileMessage])(
    "normalizes %s without forwarding any file details",
    (type) => {
      const data = { type, fileName: "private.prd", content: "private content" };
      expect(readLivingViewerMessage(event(data), source, origin)).toEqual({ type });
    },
  );

  it("rejects sample commands from another origin or browsing context", () => {
    const request = event({ type: livingViewerSelectSampleMessage, sampleId: "comic-basic" });
    expect(readLivingViewerMessage({ ...request, origin: "https://other.example" }, source, origin)).toBeUndefined();
    expect(readLivingViewerMessage({ ...request, source: {} as Window }, source, origin)).toBeUndefined();
    expect(readLivingViewerMessage(request, null, origin)).toBeUndefined();
  });

  it("does not treat selection or readiness as a focus-exit request", () => {
    expect(isLivingViewerExitRequest(event({ type: livingViewerReadyMessage }), source, origin)).toBe(false);
    expect(isLivingViewerExitRequest(event({ type: livingViewerSampleSelectedMessage, sampleId: "comic-basic" }), source, origin)).toBe(false);
  });
});
