/*
 * Company: EonHive Inc. | Title: Living Homepage Model Tests
 * Purpose: Verify chapter boundaries, reversible interpolation, quality selection, and profile identity.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { describe, expect, it } from "vitest";
import {
  getProfileForKey,
  getChapterPosition,
  sampleDocumentPose,
  resolveRenderingQuality,
  getCanonicalDemoProfile,
} from "./livingExperienceModel.js";

describe("profile keyboard order", () => {
  it.each([
    ["document", "ArrowLeft", "magazine"], ["magazine", "ArrowRight", "document"],
    ["comic", "Home", "document"], ["report", "End", "magazine"],
    ["resume", "ArrowRight", "comic"],
  ] as const)("moves from %s with %s to %s", (profile, key, expected) => {
    expect(getProfileForKey(profile, key)).toBe(expected);
  });
  it.each(["Tab", "ArrowDown", "ArrowUp", "Escape", " "])("leaves %s to native browser behavior", (key) => {
    expect(getProfileForKey("document", key)).toBeUndefined();
  });
});

describe("native scroll chapter sampling", () => {
  it("handles unequal section heights and clamps both ends", () => {
    const starts = [0, 800, 1700, 2900, 3900, 4800];
    expect(getChapterPosition(-80, starts)).toBe(0);
    expect(getChapterPosition(1250, starts)).toBe(1.5);
    expect(getChapterPosition(2900, starts)).toBe(3);
    expect(getChapterPosition(9000, starts)).toBe(5);
    expect(getChapterPosition(120, [])).toBe(0);
  });

  it("retains exact endpoints and does not accumulate history when scrolling back", () => {
    const original = sampleDocumentPose(1);
    expect(original).toEqual({
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      spread: 0,
      scale: 1,
    });
    expect(sampleDocumentPose(2).spread).toBe(1);
    expect(sampleDocumentPose(1.5).spread).toBe(0.5);
    for (const position of [2, 4.2, 5, 1.5, 0]) sampleDocumentPose(position);
    expect(sampleDocumentPose(1)).toEqual(original);
    expect(sampleDocumentPose(-3)).toEqual(sampleDocumentPose(0));
    expect(sampleDocumentPose(99)).toEqual(sampleDocumentPose(5));
  });
});

describe("presentation does not change format identity", () => {
  it.each(["document", "report", "resume", "magazine"] as const)(
    "keeps %s inside general-document",
    (profile) => {
      expect(getCanonicalDemoProfile(profile)).toBe("general-document");
    },
  );
  it("preserves comic and storyboard as first-class profiles", () => {
    expect(getCanonicalDemoProfile("comic")).toBe("comic");
    expect(getCanonicalDemoProfile("storyboard")).toBe("storyboard");
  });
});

describe("automatic presentation quality", () => {
  const desktop = { width: 1440, cores: 8, memory: 8 };
  it("uses conservative defaults for mobile, memory limits, and data saving", () => {
    expect(resolveRenderingQuality("auto", desktop)).toBe("high");
    expect(resolveRenderingQuality("auto", { ...desktop, width: 390 })).toBe(
      "low",
    );
    expect(resolveRenderingQuality("auto", { ...desktop, memory: 2 })).toBe(
      "low",
    );
    expect(
      resolveRenderingQuality("auto", { ...desktop, saveData: true }),
    ).toBe("low");
    expect(resolveRenderingQuality("auto", { width: 1440, cores: 4 })).toBe(
      "low",
    );
  });
  it("respects an explicit quality choice", () => {
    expect(resolveRenderingQuality("high", { width: 320, cores: 2 })).toBe(
      "high",
    );
    expect(resolveRenderingQuality("low", desktop)).toBe("low");
  });
});
