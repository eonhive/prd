/**
 * Company: EonHive Inc. | Title: PRD CLI HTML Import
 * Purpose: Reuse HTML extraction for a validated package directory and a separately versioned diagnostic report.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { lstat } from "node:fs/promises";
import type { PrdGeneralDocumentNode, PrdValidationIssue } from "@eonhive/prd-types";
import { validatePackageFiles } from "@eonhive/prd-validator";
import {
  htmlAdapter, ImportAdapterRegistry, prepareConversion,
  type ConversionWarning, type PreparedConversion
} from "@eonhive/prd-converter";
import { IMPORT_ENTRY_PATH, writeImportPackage } from "./importPackage.js";

const REPORT_PATH = "attachments/import-report.json";
const ELEMENT_WARNING_CODES = new Set(["html-element-omitted", "html-semantics-flattened"]);
const usage = "Usage: prd import html <source.html> --out <targetDir> [--title <title>] [--id <id>] [--json]";

export interface PrdHtmlImportReport {
  contractVersion: "prd-import-report-v1";
  sourceFormat: "html";
  targetProfile: "general-document";
  content: { nodeCount: number; nodeTypes: Record<string, number> };
  resources: { assetCount: number; byteCount: number; items: Array<{ id?: string; href: string; type?: string }> };
  sourcePreserved: false;
  semanticFidelity: "partial";
  visualFidelity: "not-preserved";
  readingQuality: "not-assessed";
  warnings: ConversionWarning[];
  errors: PrdValidationIssue[];
  unsupportedElements: string[];
  validation: { valid: boolean; errors: PrdValidationIssue[]; warnings: PrdValidationIssue[] };
}

export interface PrdHtmlImportResult {
  contractVersion: "prd-cli-html-import-v1";
  imported: true;
  sourcePath: string;
  targetDir: string;
  profile: "general-document";
  title: string;
  id: string;
  entry: typeof IMPORT_ENTRY_PATH;
  files: string[];
  nodeCount: number;
  assetCount: number;
  warnings: string[];
  report: PrdHtmlImportReport;
}

function buildReport(prepared: PreparedConversion): PrdHtmlImportReport {
  const nodeTypes: Record<string, number> = {};
  function count(nodes: PrdGeneralDocumentNode[]): void {
    for (const node of nodes) {
      nodeTypes[node.type] = (nodeTypes[node.type] ?? 0) + 1;
      if (node.type === "section" && node.children) count(node.children);
    }
  }
  if (prepared.document.profile === "general-document") count(prepared.document.children);
  const assets = prepared.manifest.assets ?? [];
  const unsupported = prepared.report.warnings.filter((warning) => ELEMENT_WARNING_CODES.has(warning.code));
  return {
    contractVersion: "prd-import-report-v1",
    sourceFormat: "html",
    targetProfile: "general-document",
    content: { nodeCount: prepared.report.nodeCount, nodeTypes },
    resources: {
      assetCount: assets.length,
      byteCount: assets.reduce((total, asset) => total + (prepared.files[asset.href]?.byteLength ?? 0), 0),
      items: assets.map(({ id, href, type }) => ({ id, href, type }))
    },
    sourcePreserved: false,
    semanticFidelity: "partial",
    visualFidelity: "not-preserved",
    readingQuality: "not-assessed",
    // Keep source paths/URLs out of exported provenance; only element names remain as references.
    warnings: prepared.report.warnings.map(({ code, stage, message, reference }) => ({
      code, stage, message,
      ...(reference && ELEMENT_WARNING_CODES.has(code) ? { reference } : {})
    })),
    errors: prepared.validation.errors,
    unsupportedElements: [...new Set(unsupported.flatMap((warning) => warning.reference ? [warning.reference] : []))],
    validation: { valid: prepared.validation.valid, errors: prepared.validation.errors, warnings: prepared.validation.warnings }
  };
}

export async function importHtmlToPrdPackage(options: {
  sourcePath: string; targetDir: string; title?: string; id?: string;
}): Promise<PrdHtmlImportResult> {
  const prepared = await prepareConversion({
    sourcePath: options.sourcePath, title: options.title, id: options.id,
    registry: new ImportAdapterRegistry().register(htmlAdapter),
    preserveSource: false
  });
  if (prepared.document.profile !== "general-document") throw new Error("HTML import must produce general-document content.");
  const report = buildReport(prepared);
  const manifest = {
    ...prepared.manifest,
    attachments: [{ id: "import-report", href: REPORT_PATH, type: "application/json" }]
  };
  const files = { ...prepared.files };
  delete files["attachments/conversion-quality.json"];
  files["manifest.json"] = new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
  files[REPORT_PATH] = new TextEncoder().encode(`${JSON.stringify(report, null, 2)}\n`);
  const validation = validatePackageFiles(files);
  if (!validation.valid) throw new Error(`Cannot import invalid PRD content: ${validation.errors.map((issue) => issue.message).join("; ")}`);
  report.validation = { valid: validation.valid, errors: validation.errors, warnings: validation.warnings };
  report.errors = validation.errors;
  files[REPORT_PATH] = new TextEncoder().encode(`${JSON.stringify(report, null, 2)}\n`);
  try {
    if ((await lstat(options.targetDir)).isSymbolicLink()) throw new Error("HTML import target must not be a symbolic link.");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  await writeImportPackage(options.targetDir, Object.entries(files).map(([path, contents]) => ({ path, contents })));
  return {
    contractVersion: "prd-cli-html-import-v1", imported: true,
    sourcePath: options.sourcePath, targetDir: options.targetDir,
    profile: "general-document", title: manifest.title, id: manifest.id, entry: IMPORT_ENTRY_PATH,
    files: Object.keys(files), nodeCount: report.content.nodeCount, assetCount: report.resources.assetCount,
    warnings: report.warnings.map((warning) => `[${warning.code}] ${warning.message}`), report
  };
}

export async function runHtmlImportCommand(args: string[]): Promise<number> {
  const jsonOutput = args.includes("--json");
  try {
    const sourcePath = args[0];
    if (!sourcePath || sourcePath.startsWith("--")) throw new Error(usage);
    const values = new Map<string, string>();
    let hasJson = false;
    for (let index = 1; index < args.length; index += 1) {
      const flag = args[index]!;
      if (flag === "--json") {
        if (hasJson) throw new Error("Duplicate option: --json");
        hasJson = true;
        continue;
      }
      if (!["--out", "--title", "--id"].includes(flag)) throw new Error(`Unknown HTML import option: ${flag}`);
      if (values.has(flag)) throw new Error(`Duplicate option: ${flag}`);
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
      values.set(flag, value);
    }
    const targetDir = values.get("--out");
    if (!targetDir) throw new Error(usage);
    const result = await importHtmlToPrdPackage({ sourcePath, targetDir, title: values.get("--title"), id: values.get("--id") });
    console.log(jsonOutput ? JSON.stringify(result, null, 2) : [
      `Imported PRD package: ${result.targetDir}`,
      `profile: ${result.profile}`, `title: ${result.title}`, `entry: ${result.entry}`,
      `nodes: ${result.nodeCount}`, `assets: ${result.assetCount}`, "valid: yes", "warnings:",
      ...result.warnings.map((warning) => `- ${warning}`),
      "next:", `- prd validate ${targetDir}`, `- prd pack ${targetDir} --out ${targetDir}.prd`
    ].join("\n"));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(jsonOutput ? JSON.stringify({
      contractVersion: "prd-cli-html-import-v1", imported: false,
      error: { code: "html-import-failed", message }
    }) : message);
    return 1;
  }
}
