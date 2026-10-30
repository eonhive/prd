/**
 * Company: EonHive Inc. | Title: PRD Convert Contracts
 * Purpose: Define adapter and conversion results using canonical PRD content types.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import type {
  PrdComicRoot, PrdGeneralDocumentRoot, PrdStoryboardRoot,
  PrdValidationIssue
} from "@eonhive/prd-types";

export type PrdNormalizedContent = PrdGeneralDocumentRoot | PrdComicRoot | PrdStoryboardRoot;
export type PrdExtractedContent =
  | Pick<PrdGeneralDocumentRoot, "profile" | "children">
  | Pick<PrdComicRoot, "profile" | "panels">
  | Pick<PrdStoryboardRoot, "profile" | "frames">;

export interface ImportSource {
  name: string;
  bytes: Uint8Array;
}

export interface ConversionWarning {
  code: string;
  stage: "extract" | "normalize" | "adapt" | "validate";
  message: string;
  reference?: string;
}

export interface ImportContext {
  readonly limits: Readonly<ConversionLimits>;
  /** Only this bounded resolver may read source-relative resources. */
  resolveImage(reference: string): Promise<{ id: string } | undefined>;
  /** Collect bytes from an already bounded/validated archive member without filesystem extraction. */
  collectImage?(reference: string, bytes: Uint8Array): Promise<{ id: string } | undefined>;
}

export interface ImportResult {
  title?: string;
  content: PrdExtractedContent;
  warnings: ConversionWarning[];
}

export interface ImportAdapter {
  readonly id: string;
  detect(source: ImportSource): Promise<boolean>;
  import(source: ImportSource, context: ImportContext): Promise<ImportResult>;
}

export interface ConversionLimits {
  maxInputBytes: number;
  maxResourceBytes: number;
  maxTotalResourceBytes: number;
  maxResources: number;
  maxNodes: number;
}

export interface ConversionQualityReport {
  reportVersion: "1.0";
  sourceFormat: string;
  profile: PrdNormalizedContent["profile"];
  strategy: "adaptive";
  semanticFidelity: "partial";
  visualFidelity: "not-preserved";
  sourcePreserved: boolean;
  nodeCount: number;
  resourceCount: number;
  resourceMap: Array<{ source: string; asset: string; href: string }>;
  warnings: ConversionWarning[];
  validationWarnings: PrdValidationIssue[];
}
