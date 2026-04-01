import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { packDirectoryToFile } from "@prd/packager";
import { type PrdPackageValidationResult } from "@prd/validator";
import { validatePackageDirectory, validatePrdArchive } from "@prd/validator/node";

type CommandHandler = (args: string[]) => Promise<number>;

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

async function validateTarget(target: string): Promise<PrdPackageValidationResult> {
  const stats = await stat(target);
  if (stats.isDirectory()) {
    return validatePackageDirectory(target);
  }

  return validatePrdArchive(target);
}

function formatResult(
  result: PrdPackageValidationResult,
  jsonOutput: boolean
): string {
  if (jsonOutput) {
    return JSON.stringify(result, null, 2);
  }

  const lines = [
    `valid: ${result.valid ? "yes" : "no"}`,
    result.manifest ? `profile: ${result.manifest.profile}` : "profile: n/a",
    result.profileInfo
      ? `profileStatus: ${result.profileInfo.supportClass}`
      : "profileStatus: n/a",
    result.manifest ? `entry: ${result.manifest.entry}` : "entry: n/a",
    result.manifest?.localization
      ? `localization: ${result.manifest.localization.defaultLocale}`
      : "localization: none"
  ];

  if (result.errors.length > 0) {
    lines.push("errors:");
    for (const issue of result.errors) {
      lines.push(`- [${issue.code}] ${issue.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push("warnings:");
    for (const issue of result.warnings) {
      lines.push(`- [${issue.code}] ${issue.message}`);
    }
  }

  return lines.join("\n");
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
      console.error("Usage: prd validate <sourceDir|file.prd> [--json]");
      return 1;
    }

    const result = await validateTarget(target);
    console.log(formatResult(result, jsonOutput));
    return result.valid ? 0 : 1;
  },

  async inspect(args) {
    const target = args[0];
    const jsonOutput = hasFlag(args, "--json");

    if (!target) {
      console.error("Usage: prd inspect <sourceDir|file.prd> [--json]");
      return 1;
    }

    const result = await validateTarget(target);
    console.log(formatResult(result, jsonOutput));
    return result.valid ? 0 : 1;
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

