/**
 * Company: EonHive Inc. | Title: PRD Convert Command
 * Purpose: Expose real conversion with strict arguments and machine-readable quality output.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { convertFileToPrd, type ConvertOptions } from "@eonhive/prd-converter";

const usage = "Usage: prd convert <source.md|source.html|source.cbz|source.epub|source.docx|source.pdf> --out <file.prd> [--profile <auto|general-document|comic>] [--strategy adaptive] [--title <title>] [--id <id>] [--container <zip|prd>] [--no-source] [--json]";

export async function runConvertCommand(args: string[]): Promise<number> {
  try {
    const sourcePath = args[0];
    if (!sourcePath || sourcePath.startsWith("--")) throw new Error(usage);
    const values = new Map<string, string>();
    const flags = new Set<string>();
    const valueFlags = ["--out", "--profile", "--strategy", "--title", "--id", "--container"];
    for (let index = 1; index < args.length; index += 1) {
      const flag = args[index]!;
      if (values.has(flag) || flags.has(flag)) throw new Error(`Duplicate option: ${flag}`);
      if (flag === "--json" || flag === "--no-source") {
        flags.add(flag);
        continue;
      }
      if (!valueFlags.includes(flag)) throw new Error(`Unknown conversion option: ${flag}`);
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
      values.set(flag, value);
    }
    const outputPath = values.get("--out");
    if (!outputPath) throw new Error(usage);
    const profile = values.get("--profile") ?? "auto";
    if (!["auto", "general-document", "comic", "storyboard"].includes(profile)) throw new Error(`Unknown canonical profile: ${profile}`);
    if (values.has("--strategy") && values.get("--strategy") !== "adaptive") throw new Error("Only adaptive conversion is implemented in Phase 1.");
    const container = values.get("--container") ?? "zip";
    if (container !== "zip" && container !== "prd") throw new Error("`--container` must be `zip` or `prd`.");
    const result = await convertFileToPrd({
      sourcePath, outputPath, profile: profile as ConvertOptions["profile"],
      title: values.get("--title"), id: values.get("--id"), container,
      preserveSource: !flags.has("--no-source")
    });
    const payload = { converted: true, sourcePath, outputPath, quality: result.report };
    if (flags.has("--json")) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log([
        `Converted ${sourcePath} -> ${outputPath}`,
        `format: ${result.report.sourceFormat}`,
        `profile: ${result.report.profile}`,
        `strategy: ${result.report.strategy}`,
        `source preserved: ${result.report.sourcePreserved ? "yes" : "no"}`,
        "warnings:",
        ...result.report.warnings.map((warning) => `- [${warning.code}] ${warning.message}`),
        ...result.report.validationWarnings.map((warning) => `- [${warning.code}] ${warning.message}`)
      ].join("\n"));
    }
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
