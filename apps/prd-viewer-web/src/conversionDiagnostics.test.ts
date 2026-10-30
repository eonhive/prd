/**
 * Company: EonHive Inc. | Title: Conversion Diagnostic Review Tests
 * Purpose: Check warning provenance, complete-report filtering and inert accessible presentation.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  ConversionQualityReport,
  ConversionWarning,
} from "@eonhive/prd-converter/browser";
import type { PrdValidationIssue } from "@eonhive/prd-types";
import { ConversionDiagnostics } from "./ConversionDiagnostics.js";
import { convertInBrowser } from "@eonhive/prd-converter/browser";
import { ConvertReview } from "./ConvertReview.js";
import {
  collectConversionDiagnostics,
  defaultDiagnosticFilters,
  filterConversionDiagnostics,
  type DiagnosticFilters,
} from "./convertDiagnosticFilters.js";

function makeReport(
  warnings: ConversionWarning[] = [],
  validationWarnings: PrdValidationIssue[] = []
): ConversionQualityReport {
  return {
    reportVersion: "1.0",
    sourceFormat: "html",
    profile: "general-document",
    strategy: "adaptive",
    semanticFidelity: "partial",
    visualFidelity: "not-preserved",
    sourcePreserved: true,
    nodeCount: 3,
    resourceCount: 0,
    resourceMap: [],
    warnings,
    validationWarnings,
  };
}

const report = makeReport(
  [
    {
      code: "image-missing",
      stage: "extract",
      message: "Image not supplied",
      reference: "assets/page[2].png",
    },
    {
      code: "heading-normalized",
      stage: "normalize",
      message: "Heading level adjusted",
    },
    {
      code: "comic-page-order-reviewed",
      stage: "adapt",
      message: "Applied the supplied order; reading order remains unassessed.",
    },
    {
      code: "same-code",
      stage: "validate",
      message: "Conversion validation detail",
      reference: "source:line-9",
    },
  ],
  [
    {
      code: "same-code",
      message: "Package validation detail",
      severity: "warning",
      path: "/manifest/assets/0",
    },
    {
      code: "package-note",
      message: "No package path supplied",
      severity: "warning",
    },
  ]
);

describe("conversion diagnostics", () => {
  it.each([
    ["source.md", "examples/conversion-markdown/source.md"],
    ["source.html", "examples/conversion-html/source.html"],
    ["sample-comic.cbz", "examples/conversion-cbz/sample-comic.cbz"],
  ])(
    "reviews an actual %s conversion without changing its archive or report",
    async (name, path) => {
      const result = await convertInBrowser({
        source: { name, bytes: new Uint8Array(readFileSync(path)) },
      });
      const archiveBefore = result.archive.slice();
      const reportBefore = JSON.stringify(result.report);
      const diagnostics = collectConversionDiagnostics(result.report);
      const html = renderToStaticMarkup(
        createElement(ConvertReview, {
          completed: {
            result,
            sourceName: name,
            sourcePreview: "",
            previewTruncated: false,
          },
          busy: false,
          onPreview() {},
        })
      );
      expect(html).toContain("Valid PRD package");
      expect(html).toContain("Warning category");
      expect(html).toContain("Preview in Viewer");
      expect(html.match(/class="convert-diagnostic-heading"/g)).toHaveLength(
        diagnostics.length
      );
      for (const diagnostic of diagnostics) {
        expect(html).toContain(`<code>${diagnostic.code}</code>`);
        expect(
          filterConversionDiagnostics(diagnostics, {
            category: diagnostic.origin,
            query: diagnostic.code,
          })
        ).toContain(diagnostic);
      }
      expect(JSON.stringify(result.report)).toBe(reportBefore);
      expect(result.archive).toEqual(archiveBefore);
    }
  );

  it("keeps conversion validation distinct from package validation and retains every location", () => {
    const diagnostics = collectConversionDiagnostics(report);
    expect(diagnostics).toHaveLength(6);
    expect(new Set(diagnostics.map((item) => item.id)).size).toBe(6);
    expect(diagnostics[3]).toMatchObject({
      origin: "conversion",
      stage: "validate",
      reference: "source:line-9",
    });
    expect(diagnostics[4]).toMatchObject({
      origin: "validator",
      severity: "warning",
      path: "/manifest/assets/0",
    });
    expect(diagnostics[4]).not.toHaveProperty("stage");
    expect(diagnostics[4]).not.toHaveProperty("reference");
    expect(diagnostics[5]).not.toHaveProperty("path");
  });

  it.each<[DiagnosticFilters["category"], number]>([
    ["all", 6],
    ["conversion", 4],
    ["extract", 1],
    ["normalize", 1],
    ["adapt", 1],
    ["validate", 1],
    ["validator", 2],
  ])(
    "filters category %s without conflating report origins",
    (category, count) => {
      const matches = filterConversionDiagnostics(
        collectConversionDiagnostics(report),
        { category, query: "" }
      );
      expect(matches).toHaveLength(count);
      if (category === "validate")
        expect(matches[0]?.origin).toBe("conversion");
      if (category === "validator")
        expect(matches.every((item) => item.origin === "validator")).toBe(true);
    }
  );

  it.each([
    ["  IMAGE-MISSING  ", "image-missing"],
    ["heading level", "heading-normalized"],
    ["PAGE[2].PNG", "image-missing"],
    ["/MANIFEST/ASSETS", "same-code"],
    ["source:line-9", "same-code"],
  ])(
    "matches literal case-insensitive code, message or location: %s",
    (query, code) => {
      const matches = filterConversionDiagnostics(
        collectConversionDiagnostics(report),
        { category: "all", query }
      );
      expect(matches).toHaveLength(1);
      expect(matches[0]?.code).toBe(code);
    }
  );

  it("combines category and query and treats regular expression characters literally", () => {
    const diagnostics = collectConversionDiagnostics(report);
    expect(
      filterConversionDiagnostics(diagnostics, {
        category: "validator",
        query: "source:line-9",
      })
    ).toEqual([]);
    expect(
      filterConversionDiagnostics(diagnostics, { category: "all", query: ".*" })
    ).toEqual([]);
    expect(
      filterConversionDiagnostics(diagnostics, {
        category: "all",
        query: "[2]",
      })
    ).toHaveLength(1);
    expect(
      filterConversionDiagnostics(diagnostics, { category: "all", query: "  " })
    ).toEqual(diagnostics);
  });

  it("keeps duplicate codes in original order without mutating the report or diagnostic records", () => {
    const before = JSON.stringify(report);
    Object.freeze(report.warnings);
    Object.freeze(report.validationWarnings);
    Object.freeze(report);
    const diagnostics = collectConversionDiagnostics(report);
    diagnostics.forEach((item) => Object.freeze(item));
    Object.freeze(diagnostics);
    expect(
      filterConversionDiagnostics(diagnostics, {
        category: "all",
        query: "same-code",
      }).map((item) => item.origin)
    ).toEqual(["conversion", "validator"]);
    filterConversionDiagnostics(diagnostics, defaultDiagnosticFilters);
    expect(JSON.stringify(report)).toBe(before);
    expect(report.reportVersion).toBe("1.0");
  });

  it("searches warnings beyond the bounded visible list and reports actual totals", () => {
    const long = makeReport(
      Array.from({ length: 65 }, (_, index) => ({
        code: `warning-${index}`,
        stage: index === 64 ? "adapt" : "extract",
        message: `Message ${index}`,
      }))
    );
    const html = renderToStaticMarkup(
      createElement(ConversionDiagnostics, { report: long })
    );
    expect(html.match(/<li>/g)).toHaveLength(50);
    expect(html).toContain("Showing 50 of 65 matching warnings · 65 total.");
    expect(html).toContain("Narrow the filters or download the full report");
    expect(html).not.toContain("<code>warning-64</code>");
    const diagnostics = collectConversionDiagnostics(long);
    expect(
      filterConversionDiagnostics(diagnostics, {
        category: "all",
        query: "warning-64",
      }).map((item) => item.code)
    ).toEqual(["warning-64"]);
    expect(
      filterConversionDiagnostics(diagnostics, { category: "adapt", query: "" })
    ).toHaveLength(1);
  });

  it("labels controls, live counts, scrollable warnings and supplied locations", () => {
    const html = renderToStaticMarkup(
      createElement(ConversionDiagnostics, { report })
    );
    expect(html).toContain("Warning category<select");
    expect(html).toContain('Search warnings<input type="search"');
    expect(html).toContain('maxLength="256"');
    expect(html).toContain('role="status" aria-atomic="true"');
    expect(html).toContain('aria-label="Matching warnings" tabindex="0"');
    expect(html).toContain("Conversion · Extraction");
    expect(html).toContain("Conversion · Validation");
    expect(html).toContain("Package validator · warning");
    expect(html).toContain("<dt>Source reference</dt>");
    expect(html).toContain("<dt>Package path</dt>");
    expect(html).toContain("reading order remains unassessed");
    expect(html).toContain("Showing 6 of 6 matching warnings · 6 total.");
  });

  it("renders hostile diagnostic strings as plain text without links or source execution", () => {
    const unsafe =
      '<img src="https://invalid.example/probe" onerror="alert(1)">';
    const hostile = makeReport(
      [
        {
          code: unsafe,
          message: unsafe,
          reference: "javascript:alert(1)",
          stage: "extract",
        },
      ],
      [
        {
          code: "validator",
          message: unsafe,
          path: unsafe,
          severity: "warning",
        },
      ]
    );
    const html = renderToStaticMarkup(
      createElement(ConversionDiagnostics, { report: hostile })
    );
    expect(html).toContain("&lt;img");
    expect(html).toContain("<code>javascript:alert(1)</code>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("href=");
    expect(html).not.toContain('src="https://');
  });

  it("shows no invented locations and makes an empty report no fidelity claim", () => {
    const html = renderToStaticMarkup(
      createElement(ConversionDiagnostics, { report: makeReport() })
    );
    expect(html).toContain("Showing 0 of 0 matching warnings · 0 total.");
    expect(html).toContain(
      "No warnings were recorded. This does not establish conversion fidelity or accessibility."
    );
    expect(html).not.toContain("Source reference");
    expect(html).not.toContain("Package path");
    expect(html.match(/disabled=""/g)).toHaveLength(3);
    expect(html).not.toContain("<li>");
  });
});
