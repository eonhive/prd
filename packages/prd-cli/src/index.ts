import { basename } from "node:path";
import { packDirectoryToFile } from "@eonhive/prd-packager";
import { type PrdPackageValidationResult } from "@eonhive/prd-validator";
import {
  inspectPackage,
  type PrdPackageInspectionResult,
  validatePackage
} from "@eonhive/prd-validator/node";

type CommandHandler = (args: string[]) => Promise<number>;
type CliIssue = { code: string; message: string };

/**
 * Stable CLI validation output shape used for both text and JSON rendering.
 *
 * Notes:
 * - `manifest` and `profileInfo` are nullable when validation cannot parse them.
 * - `entry` is repeated at the top level to provide a consistent lookup key for scripts.
 */
type CliValidationOutput = {
  valid: boolean;
  manifest: {
    profile: string;
    entry: string;
    localizationDefaultLocale: string | null;
  } | null;
  profileInfo: {
    supportClass: string;
  } | null;
  entry: string | null;
  errors: CliIssue[];
  warnings: CliIssue[];
};

/**
 * Stable CLI inspection output shape.
 * This extends validation output with deterministic inspection metrics.
 */
type CliInspectionOutput = CliValidationOutput & {
  inspection: {
    sourceKind: string;
    fileCount: number;
    totalBytes: number;
    assetCount: number;
    attachmentCount: number;
    localeCount: number;
    hasSeriesMembership: boolean;
    collectionCount: number;
    entryKind: string;
    segmentation: string;
    localizedResources: boolean;
    localizedAlternateEntries: boolean;
    referenceLoadMode: string;
  };
};

function parseFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function toCliValidationOutput(
  result: PrdPackageValidationResult
): CliValidationOutput {
  return {
    valid: result.valid,
    manifest: result.manifest
      ? {
          profile: result.manifest.profile,
          entry: result.manifest.entry,
          localizationDefaultLocale:
            result.manifest.localization?.defaultLocale ?? null
        }
      : null,
    profileInfo: result.profileInfo
      ? {
          supportClass: result.profileInfo.supportClass
        }
      : null,
    entry: result.manifest?.entry ?? null,
    errors: result.errors.map((issue) => ({
      code: issue.code,
      message: issue.message
    })),
    warnings: result.warnings.map((issue) => ({
      code: issue.code,
      message: issue.message
    }))
  };
}

function formatIssueSection(lines: string[], label: "errors" | "warnings", issues: CliIssue[]): void {
  lines.push(`${label}:`);
  if (issues.length === 0) {
    lines.push("- none");
    return;
  }

  for (const issue of issues) {
    lines.push(`- [${issue.code}] ${issue.message}`);
  }
}

function formatValidationResult(payload: CliValidationOutput, jsonOutput: boolean): string {
  if (jsonOutput) {
    return JSON.stringify(payload, null, 2);
  }

  const lines = [
    `valid: ${payload.valid ? "yes" : "no"}`,
    payload.manifest ? `profile: ${payload.manifest.profile}` : "profile: n/a",
    payload.profileInfo
      ? `profileStatus: ${payload.profileInfo.supportClass}`
      : "profileStatus: n/a",
    payload.entry ? `entry: ${payload.entry}` : "entry: n/a",
    payload.manifest?.localizationDefaultLocale
      ? `localization: ${payload.manifest.localizationDefaultLocale}`
      : "localization: none"
  ];

  formatIssueSection(lines, "errors", payload.errors);
  formatIssueSection(lines, "warnings", payload.warnings);

  return lines.join("\n");
}

function formatInspectionResult(
  payload: CliInspectionOutput,
  jsonOutput: boolean
): string {
  if (jsonOutput) {
    return JSON.stringify(payload, null, 2);
  }

  const lines = [formatValidationResult(payload, false), "inspection:"];

  lines.push(`- source: ${payload.inspection.sourceKind}`);
  lines.push(`- files: ${payload.inspection.fileCount}`);
  lines.push(`- bytes: ${payload.inspection.totalBytes}`);
  lines.push(`- assets: ${payload.inspection.assetCount}`);
  lines.push(`- attachments: ${payload.inspection.attachmentCount}`);
  lines.push(`- locales: ${payload.inspection.localeCount}`);
  lines.push(`- series: ${payload.inspection.hasSeriesMembership ? "yes" : "no"}`);
  lines.push(`- collections: ${payload.inspection.collectionCount}`);
  lines.push(`- entry mode: ${payload.inspection.entryKind}`);
  lines.push(`- segmentation: ${payload.inspection.segmentation}`);
  lines.push(
    `- localized resources: ${payload.inspection.localizedResources ? "yes" : "no"}`
  );
  lines.push(
    `- localized alternate entries: ${payload.inspection.localizedAlternateEntries ? "yes" : "no"}`
  );
  lines.push(`- reference load mode: ${payload.inspection.referenceLoadMode}`);

  return lines.join("\n");
}

function toCliInspectionOutput(
  result: PrdPackageInspectionResult
): CliInspectionOutput {
  return {
    ...toCliValidationOutput(result),
    inspection: {
      sourceKind: result.sourceKind,
      fileCount: result.fileCount,
      totalBytes: result.totalBytes,
      assetCount: result.assetCount,
      attachmentCount: result.attachmentCount,
      localeCount: result.localeCount,
      hasSeriesMembership: result.hasSeriesMembership,
      collectionCount: result.collectionCount,
      entryKind: result.entryKind,
      segmentation: result.segmentation,
      localizedResources: result.localizedResources,
      localizedAlternateEntries: result.localizedAlternateEntries,
      referenceLoadMode: result.referenceLoadMode
    }
  };
}

const handlers: Record<string, CommandHandler> = {
  async pack(args) {
    const sourceDir = args[0];
    const outFile = parseFlag(args, "--out");

    if (!sourceDir || !outFile) {
      console.error("Usage: prd pack <sourceDir> --out <file.prd>");
      return 1;
    }

    const outputPath = await packDirectoryToFile(sourceDir, outFile);
    console.log(`Packed ${basename(sourceDir)} -> ${outputPath}`);
    return 0;
  },

  async validate(args) {
    const target = args[0];
    const jsonOutput = hasFlag(args, "--json");

    if (!target) {
      console.error("Usage: prd validate <path> [--json]");
      return 1;
    }

    const result = await validatePackage(target);
    const payload = toCliValidationOutput(result);
    console.log(formatValidationResult(payload, jsonOutput));
    return payload.valid ? 0 : 1;
  },

  async inspect(args) {
    const target = args[0];
    const jsonOutput = hasFlag(args, "--json");

    if (!target) {
      console.error("Usage: prd inspect <path> [--json]");
      return 1;
    }

    const result = await inspectPackage(target);
    const payload = toCliInspectionOutput(result);
    console.log(formatInspectionResult(payload, jsonOutput));
    return payload.valid ? 0 : 1;
  }
};

export async function runCli(argv: string[]): Promise<number> {
  const [command, ...args] = argv;
  const handler = command ? handlers[command] : undefined;

  if (!handler) {
    console.error("Usage: prd <pack|validate|inspect> ...");
    return 1;
  }

  return handler(args);
}
