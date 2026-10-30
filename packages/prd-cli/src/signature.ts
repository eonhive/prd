/**
 * Company: EonHive Inc. | Title: PRD Signature Commands
 * Purpose: Sign archives without overwriting files and verify signatures against explicitly supplied public keys.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { signPrdArchive } from "@eonhive/prd-packager/signing";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { assertPrdArchiveSize, readPrdArchive } from "@eonhive/prd-validator/container";
import { importPrdPublicKey, verifyPrdSignature } from "@eonhive/prd-validator/signature";

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function readArchive(path: string): Promise<Uint8Array> {
  if (!path.endsWith(".prd")) throw new Error("Signature commands require a .prd archive.");
  assertPrdArchiveSize((await stat(path)).size);
  return new Uint8Array(await readFile(path));
}

async function readKey(path: string): Promise<string> {
  if ((await stat(path)).size > 64 * 1024) throw new Error("The key file exceeds the 64 KiB limit.");
  const bytes = await readFile(path);
  if (bytes.byteLength > 64 * 1024) throw new Error("The key file exceeds the 64 KiB limit.");
  return bytes.toString("utf8");
}

function reportError(error: unknown): number {
  console.error(error instanceof Error ? error.message : "Signature command failed.");
  return 1;
}

export async function runSignCommand(args: string[]): Promise<number> {
  const source = args[0];
  const keyPath = flag(args, "--key");
  const output = flag(args, "--out");
  if (!source || !keyPath || !output || keyPath.startsWith("--") || output.startsWith("--")) {
    console.error("Usage: prd sign <source.prd> --key <private-key.pem> --out <signed.prd> [--json]");
    return 1;
  }
  try {
    if (!output.endsWith(".prd")) throw new Error("Signed output must use the .prd extension.");
    if (resolve(source) === resolve(output)) throw new Error("Signing requires a separate output file.");
    const { archive, keyId } = await signPrdArchive(await readArchive(source), await readKey(keyPath));
    await mkdir(dirname(resolve(output)), { recursive: true });
    // Exclusive creation also protects existing files and symlinks from accidental replacement.
    await writeFile(output, archive, { flag: "wx" });
    const result = { contractVersion: "prd-cli-signature-v1", signed: true, outputPath: resolve(output), keyId };
    console.log(args.includes("--json") ? JSON.stringify(result, null, 2) : `Signed package: ${output}\nSigning key: ${keyId}`);
    return 0;
  } catch (error) {
    return reportError(error);
  }
}

export async function runVerifyCommand(args: string[]): Promise<number> {
  const source = args[0];
  const keyPath = flag(args, "--trusted-key");
  if (!source || (args.includes("--trusted-key") && (!keyPath || keyPath.startsWith("--")))) {
    console.error("Usage: prd verify <source.prd> [--trusted-key <public-key.pem>] [--json]");
    return 1;
  }
  try {
    const files = readPrdArchive(await readArchive(source));
    if (!validatePackageFiles(files).valid) throw new Error("Cannot verify a structurally invalid PRD package.");
    const trustedPublicKey = keyPath ? await importPrdPublicKey(await readKey(keyPath)) : undefined;
    const result = { contractVersion: "prd-cli-signature-v1", ...await verifyPrdSignature(files, { trustedPublicKey }) };
    console.log(args.includes("--json") ? JSON.stringify(result, null, 2) : [
      `Signature: ${result.status}`, result.message,
      ...(result.keyId ? [`Signing key: ${result.keyId}`] : [])
    ].join("\n"));
    // Automation must never confuse unsigned or an unpinned embedded key with trusted verification.
    return result.status === "verified" ? 0 : 1;
  } catch (error) {
    return reportError(error);
  }
}
