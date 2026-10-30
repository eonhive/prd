/**
 * Company: EonHive Inc. | Title: Conversion Diagnostic Filtering
 * Purpose: Filter existing report facts without changing their meaning or exported contract.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */
import type {
  ConversionQualityReport,
  ConversionWarning,
} from "@eonhive/prd-converter/browser";
import type { PrdValidationIssue } from "@eonhive/prd-types";

export type ConversionDiagnostic =
  | (ConversionWarning & { id: string; origin: "conversion" })
  | (PrdValidationIssue & { id: string; origin: "validator" });

export const conversionStageLabels = {
  extract: "Extraction",
  normalize: "Normalization",
  adapt: "Adaptation",
  validate: "Validation",
} satisfies Record<ConversionWarning["stage"], string>;

export const diagnosticCategories = [
  { value: "all", label: "All warnings" },
  { value: "conversion", label: "Conversion — all stages" },
  { value: "extract", label: "Conversion — extraction" },
  { value: "normalize", label: "Conversion — normalization" },
  { value: "adapt", label: "Conversion — adaptation" },
  { value: "validate", label: "Conversion — validation" },
  { value: "validator", label: "Package validator" },
] as const;

export interface DiagnosticFilters {
  category: (typeof diagnosticCategories)[number]["value"];
  query: string;
}

export const defaultDiagnosticFilters: Readonly<DiagnosticFilters> = {
  category: "all",
  query: "",
};
export const MAX_VISIBLE_DIAGNOSTICS = 50;

export function collectConversionDiagnostics(
  report: Pick<ConversionQualityReport, "warnings" | "validationWarnings">
): ConversionDiagnostic[] {
  return [
    ...report.warnings.map((warning, index) => ({
      ...warning,
      id: `conversion-${index}`,
      origin: "conversion" as const,
    })),
    ...report.validationWarnings.map((warning, index) => ({
      ...warning,
      id: `validator-${index}`,
      origin: "validator" as const,
    })),
  ];
}

export function filterConversionDiagnostics(
  diagnostics: readonly ConversionDiagnostic[],
  filters: Readonly<DiagnosticFilters>
): ConversionDiagnostic[] {
  const query = filters.query.trim().toLowerCase();
  return diagnostics.filter((diagnostic) => {
    const matchesCategory =
      filters.category === "all" ||
      filters.category === diagnostic.origin ||
      (diagnostic.origin === "conversion" &&
        filters.category === diagnostic.stage);
    if (!matchesCategory) return false;
    const location =
      diagnostic.origin === "conversion"
        ? diagnostic.reference
        : diagnostic.path;
    return (
      !query ||
      [diagnostic.code, diagnostic.message, location].some((value) =>
        value?.toLowerCase().includes(query)
      )
    );
  });
}
