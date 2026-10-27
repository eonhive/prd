// @vitest-environment jsdom
/*
 * Company: EonHive Inc. | Title: Living Viewer Selection Integration Tests
 * Purpose: Verify one-frame ownership and message handoff across real React updates.
 * Author: Stan Nesi | Created: October 27, 2026 | Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LivingViewer } from "./LivingViewer.js";
import {
  livingViewerLocalFileMessage,
  livingViewerReadyMessage,
  livingViewerSampleSelectedMessage,
  livingViewerSelectSampleMessage,
} from "./livingViewerMessages.js";

let root: Root;
let container: HTMLDivElement;
let sample: string;
const onSampleChange = vi.fn();

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  sample = "document-basic";
  onSampleChange.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () => {
    root.render(createElement(LivingViewer, {
      active: true, ready: true, sample, viewerPath: "/prd/viewer/",
      onSampleChange, onFocusChange() {},
    }));
  });
}

async function fromViewer(type: string, sampleId?: string) {
  await act(async () => {
    window.dispatchEvent(new MessageEvent("message", {
      origin: window.location.origin,
      source: container.querySelector("iframe")!.contentWindow,
      data: { type, sampleId },
    }));
  });
}

describe("persistent Viewer selection", () => {
  it("loads the latest requested example after readiness without changing the iframe source", async () => {
    await render();
    const frame = container.querySelector("iframe")!;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    sample = "storyboard-basic";
    await render();
    expect(post).not.toHaveBeenCalled();
    await fromViewer(livingViewerReadyMessage);
    expect(post).toHaveBeenLastCalledWith({ type: livingViewerSelectSampleMessage, sampleId: "storyboard-basic" }, window.location.origin);
    expect(container.querySelector("iframe")).toBe(frame);
    expect(frame.getAttribute("src")).toBe("/prd/viewer/?embed=1&sample=document-basic");
    expect(container.querySelector("a")!.href).toContain("?sample=storyboard-basic");
  });

  it("accepts an in-Viewer selection and avoids a command echo that would reset reading state", async () => {
    await render();
    const frame = container.querySelector("iframe")!;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    await fromViewer(livingViewerReadyMessage);
    post.mockClear();
    await fromViewer(livingViewerSampleSelectedMessage, "comic-basic");
    expect(onSampleChange).toHaveBeenCalledWith("comic-basic");
    sample = "comic-basic";
    await render();
    expect(post).not.toHaveBeenCalled();
    expect(container.querySelector("iframe")).toBe(frame);
  });

  it("marks a local open without exposing file details and can return to the same canonical example", async () => {
    await render();
    const frame = container.querySelector("iframe")!;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    await fromViewer(livingViewerReadyMessage);
    await fromViewer(livingViewerLocalFileMessage);
    const select = container.querySelector("select")!;
    expect(select.value).toBe("");
    expect(container.textContent).toContain("Your local file stays in this Viewer");
    expect(onSampleChange).not.toHaveBeenCalled();
    post.mockClear();
    await act(async () => {
      select.value = "document-basic";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(post).toHaveBeenLastCalledWith({ type: livingViewerSelectSampleMessage, sampleId: "document-basic" }, window.location.origin);
    expect(container.textContent).not.toContain("Your local file stays in this Viewer");
    expect(container.querySelector("iframe")).toBe(frame);
  });

  it("resynchronizes the current selection when the same frame boots again", async () => {
    await render();
    const frame = container.querySelector("iframe")!;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    await fromViewer(livingViewerReadyMessage);
    sample = "comic-basic";
    await render();
    post.mockClear();
    await fromViewer(livingViewerReadyMessage);
    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith({ type: livingViewerSelectSampleMessage, sampleId: "comic-basic" }, window.location.origin);
  });
});
