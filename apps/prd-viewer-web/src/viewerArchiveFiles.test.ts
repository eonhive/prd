/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Archive File Helper Tests
 * Purpose: Verify PRD archive filtering, selection errors, and hosted sample URLs.
 * Author: Stan Nesi
 * Created: June 5, 2026
 * Updated: June 5, 2026
 * Notes: Vibe coded with Codex.
 */

import { describe, expect, it } from "vitest";
import {
  findFirstPrdArchive,
  getPrdArchiveSelectionError,
  getViewerDemoSampleArchiveUrl,
  isPrdArchiveFile,
  isPrdArchiveName
} from "./viewerArchiveFiles.js";

describe("viewer archive file helpers", () => {
  it("detects PRD archive names case-insensitively", () => {
    expect(isPrdArchiveName("document.prd")).toBe(true);
    expect(isPrdArchiveName("DOCUMENT.PRD")).toBe(true);
    expect(isPrdArchiveName("document.zip")).toBe(false);
  });

  it("selects the first PRD archive from mixed files", () => {
    const files = [
      { name: "notes.txt" },
      { name: "comic.PRD" },
      { name: "document.prd" }
    ];

    expect(findFirstPrdArchive(files)).toEqual({ name: "comic.PRD" });
    expect(isPrdArchiveFile(files[1]!)).toBe(true);
  });

  it("returns clear archive selection errors", () => {
    expect(getPrdArchiveSelectionError(null)).toContain("Choose or drop");
    expect(getPrdArchiveSelectionError([])).toContain("Choose or drop");
    expect(getPrdArchiveSelectionError([{ name: "source.md" }])).toContain(
      "No .prd archive found"
    );
    expect(getPrdArchiveSelectionError([{ name: "ready.prd" }])).toBeUndefined();
  });

  it("builds hosted sample archive URLs under a deployment base path", () => {
    expect(
      getViewerDemoSampleArchiveUrl(
        "examples/document-basic.prd",
        "https://eonhive.github.io/prd/"
      )
    ).toBe("https://eonhive.github.io/prd/examples/document-basic.prd");

    expect(
      getViewerDemoSampleArchiveUrl(
        "/examples/comic-basic.prd",
        "https://eonhive.github.io/prd"
      )
    ).toBe("https://eonhive.github.io/prd/examples/comic-basic.prd");
  });
});
