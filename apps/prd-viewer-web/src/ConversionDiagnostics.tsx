/**
 * Company: EonHive Inc. | Title: Convert Quality Diagnostics
 * Purpose: Make report codes, stages and locations reviewable with local warning filters.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */
import { useEffect, useId, useMemo, useState } from "react";
import type { ConversionQualityReport } from "@eonhive/prd-converter/browser";
import {
  collectConversionDiagnostics,
  conversionStageLabels,
  defaultDiagnosticFilters,
  diagnosticCategories,
  filterConversionDiagnostics,
  MAX_VISIBLE_DIAGNOSTICS,
  type DiagnosticFilters,
} from "./convertDiagnosticFilters.js";

export function ConversionDiagnostics({
  report,
}: {
  report: ConversionQualityReport;
}) {
  const id = useId();
  const diagnostics = useMemo(
    () => collectConversionDiagnostics(report),
    [report]
  );
  const [selection, setSelection] = useState<{
    report: ConversionQualityReport;
    filters: Readonly<DiagnosticFilters>;
  }>({ report, filters: defaultDiagnosticFilters });
  // A replacement package starts unfiltered; draft-only updates keep this report object.
  const filters =
    selection.report === report ? selection.filters : defaultDiagnosticFilters;
  useEffect(() => {
    setSelection((current) =>
      current.report === report
        ? current
        : { report, filters: defaultDiagnosticFilters }
    );
  }, [report]);
  const matches = useMemo(
    () => filterConversionDiagnostics(diagnostics, filters),
    [diagnostics, filters]
  );
  const visible = matches.slice(0, MAX_VISIBLE_DIAGNOSTICS);
  const filtered = filters.category !== "all" || filters.query !== "";
  const updateFilters = (next: Readonly<DiagnosticFilters>) =>
    setSelection({ report, filters: next });

  return (
    <section className="convert-diagnostics" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Warnings</h3>
      <p>
        {report.warnings.length} conversion warnings ·{" "}
        {report.validationWarnings.length} validator warnings
      </p>
      <p id={`${id}-help`}>
        Extraction warnings describe the imported source; adaptation warnings
        describe conversion choices. Check both after a review.
      </p>
      <div className="convert-diagnostic-filters">
        <label>
          Warning category
          <select
            value={filters.category}
            disabled={!diagnostics.length}
            aria-controls={`${id}-list`}
            onChange={(event) => {
              const category =
                diagnosticCategories.find(
                  (item) => item.value === event.target.value
                )?.value ?? "all";
              updateFilters({ ...filters, category });
            }}
          >
            {diagnosticCategories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search warnings
          <input
            type="search"
            value={filters.query}
            maxLength={256}
            placeholder="Code, message or location"
            disabled={!diagnostics.length}
            aria-controls={`${id}-list`}
            onChange={(event) =>
              updateFilters({ ...filters, query: event.target.value })
            }
          />
        </label>
        <button
          type="button"
          disabled={!filtered}
          onClick={() => updateFilters(defaultDiagnosticFilters)}
        >
          Clear filters
        </button>
      </div>
      <p role="status" aria-atomic="true">
        Showing {visible.length} of {matches.length} matching warnings ·{" "}
        {diagnostics.length} total.
      </p>
      <div id={`${id}-list`}>
        {visible.length ? (
          <ul
            className="convert-warnings"
            aria-label="Matching warnings"
            tabIndex={0}
            aria-describedby={`${id}-help`}
          >
            {visible.map((diagnostic) => (
              <li key={diagnostic.id}>
                <div className="convert-diagnostic-heading">
                  <code>{diagnostic.code}</code>
                  <span>
                    {diagnostic.origin === "conversion"
                      ? `Conversion · ${
                          conversionStageLabels[diagnostic.stage]
                        }`
                      : `Package validator · ${diagnostic.severity}`}
                  </span>
                </div>
                <p>{diagnostic.message}</p>
                {diagnostic.origin === "conversion" &&
                  diagnostic.reference !== undefined && (
                    <dl>
                      <dt>Source reference</dt>
                      <dd>
                        <code>{diagnostic.reference}</code>
                      </dd>
                    </dl>
                  )}
                {diagnostic.origin === "validator" &&
                  diagnostic.path !== undefined && (
                    <dl>
                      <dt>Package path</dt>
                      <dd>
                        <code>{diagnostic.path}</code>
                      </dd>
                    </dl>
                  )}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {diagnostics.length
              ? "No warnings match these filters. Clear filters to review all warnings."
              : "No warnings were recorded. This does not establish conversion fidelity or accessibility."}
          </p>
        )}
      </div>
      {matches.length > visible.length && (
        <p>
          Showing the first {MAX_VISIBLE_DIAGNOSTICS} matches. Narrow the
          filters or download the full report for every issue.
        </p>
      )}
    </section>
  );
}
