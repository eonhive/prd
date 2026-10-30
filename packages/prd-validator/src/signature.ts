/**
 * Company: EonHive Inc. | Title: PRD Signature Verification
 * Purpose: Verify exact packaged-file coverage and optional signatures without trusting embedded keys.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import type { PrdFileMap } from "./index.js";

export const PRD_SIGNATURE_EXTENSION_ID = "eonhive.signature";
export const PRD_SIGNATURE_PATH = "extensions/eonhive/signature.json";
export const PRD_SIGNATURE_CONTRACT = "prd-signature-v1";
export const PRD_SIGNATURE_MAX_METADATA_BYTES = 2 * 1024 * 1024;

export type PrdSignatureStatus = "unsigned" | "verified" | "untrusted" | "invalid" | "unsupported";

export interface PrdSignatureResult {
  status: PrdSignatureStatus;
  message: string;
  keyId?: string;
  checkedFiles?: number;
}

export interface PrdSignedFileRecord {
  path: string;
  size: number;
  sha256: string;
}

export interface PrdSignatureIndex {
  contractVersion: typeof PRD_SIGNATURE_CONTRACT;
  digestAlgorithm: "SHA-256";
  signatureAlgorithm: "Ed25519";
  publicKey: string;
  files: PrdSignedFileRecord[];
}

export interface PrdSignatureDocument extends PrdSignatureIndex {
  signature: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
// Path identifiers retain a literal leading U+FEFF; JSON keeps its existing decoder.
const pathDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const domain = "PRD-SIGNATURE-V1\u0000";

class UnsupportedSignatureError extends Error {}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function subtleCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable.");
  return globalThis.crypto.subtle;
}

function encodePrdBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string, length: number): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("Invalid signature encoding.");
  const bytes = Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (character) => character.charCodeAt(0));
  if (bytes.length !== length || encodePrdBase64Url(bytes) !== value) throw new Error("Invalid signature encoding or length.");
  return bytes;
}

function comparePaths(left: string, right: string): number {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    const difference = a[index]! - b[index]!;
    if (difference !== 0) return difference;
  }
  return a.length - b.length;
}

function coveredPaths(files: PrdFileMap): string[] {
  return Object.keys(files).filter((path) => path !== PRD_SIGNATURE_PATH).sort(comparePaths);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await subtleCrypto().digest("SHA-256", arrayBuffer(bytes)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getPrdSignerKeyId(publicKey: Uint8Array): Promise<string> {
  if (publicKey.length !== 32) throw new Error("An Ed25519 public key must contain 32 bytes.");
  return `sha256:${await sha256(publicKey)}`;
}

export async function importPrdPublicKey(pem: string): Promise<Uint8Array> {
  if (pem.length > 64 * 1024) throw new Error("The public-key file is too large.");
  const match = pem.trim().match(/^-----BEGIN PUBLIC KEY-----\s+([A-Za-z0-9+/=\s]+)-----END PUBLIC KEY-----$/u);
  if (!match?.[1]) throw new Error("Expected an Ed25519 SPKI PUBLIC KEY PEM file.");
  try {
    const bytes = Uint8Array.from(atob(match[1].replace(/\s/gu, "")), (character) => character.charCodeAt(0));
    const key = await subtleCrypto().importKey("spki", arrayBuffer(bytes), "Ed25519", true, ["verify"]);
    return new Uint8Array(await subtleCrypto().exportKey("raw", key));
  } catch {
    throw new Error("Could not import an Ed25519 public key in this runtime.");
  }
}

export async function createPrdSignatureIndex(files: PrdFileMap, publicKey: Uint8Array): Promise<PrdSignatureIndex> {
  if (publicKey.length !== 32) throw new Error("An Ed25519 public key must contain 32 bytes.");
  const paths = coveredPaths(files);
  if (paths.length < 1 || paths.length >= 10_000) throw new Error("Signature coverage must contain between 1 and 9,999 files.");
  const records: PrdSignedFileRecord[] = [];
  for (const path of paths) {
    if (pathDecoder.decode(encoder.encode(path)) !== path) throw new Error("Signature paths must be valid Unicode.");
    const bytes = files[path]!;
    records.push({ path, size: bytes.byteLength, sha256: await sha256(bytes) });
  }
  return {
    contractVersion: PRD_SIGNATURE_CONTRACT,
    digestAlgorithm: "SHA-256",
    signatureAlgorithm: "Ed25519",
    publicKey: encodePrdBase64Url(publicKey),
    files: records
  };
}

export function createPrdSignaturePayload(index: PrdSignatureIndex): Uint8Array {
  // Fixed tuples avoid JSON property-order ambiguity. File bytes themselves are never normalized.
  return encoder.encode(domain + JSON.stringify([
    index.contractVersion, index.digestAlgorithm, index.signatureAlgorithm, index.publicKey,
    index.files.map(({ path, size, sha256: digest }) => [path, size, digest])
  ]));
}

function signatureDeclaration(files: PrdFileMap): "unsigned" | "declared" {
  const manifest = JSON.parse(decoder.decode(files["manifest.json"]));
  const extensions: unknown = manifest?.extensions;
  const declarations = Array.isArray(extensions)
    ? extensions.filter((extension) => isObject(extension) && extension.id === PRD_SIGNATURE_EXTENSION_ID)
    : [];
  const hasMetadata = Object.hasOwn(files, PRD_SIGNATURE_PATH);
  if (declarations.length === 0 && !hasMetadata) return "unsigned";
  if (declarations.length !== 1 || !hasMetadata) throw new Error("Signature declaration and metadata must both be present exactly once.");
  const declaration = declarations[0] as Record<string, unknown>;
  if (declaration.ref !== PRD_SIGNATURE_PATH || declaration.required !== false) throw new Error("Malformed PRD signature extension declaration.");
  if (declaration.version !== "1.0") throw new UnsupportedSignatureError("This PRD signature extension version is not supported. Contents are not verified.");
  return "declared";
}

function parseSignature(bytes: Uint8Array): PrdSignatureDocument {
  if (bytes.byteLength > PRD_SIGNATURE_MAX_METADATA_BYTES) throw new Error("Signature metadata exceeds the 2 MiB limit.");
  const document: unknown = JSON.parse(decoder.decode(bytes));
  if (isObject(document) && typeof document.contractVersion === "string" && document.contractVersion !== PRD_SIGNATURE_CONTRACT) {
    throw new UnsupportedSignatureError("This PRD signature contract is not supported. Contents are not verified.");
  }
  if (!isObject(document) || !hasExactKeys(document, ["contractVersion", "digestAlgorithm", "signatureAlgorithm", "publicKey", "files", "signature"])) {
    throw new Error("Malformed PRD signature metadata.");
  }
  if (document.contractVersion !== PRD_SIGNATURE_CONTRACT || document.digestAlgorithm !== "SHA-256" || document.signatureAlgorithm !== "Ed25519") {
    throw new UnsupportedSignatureError("This PRD signature algorithm is not supported. Contents are not verified.");
  }
  if (typeof document.publicKey !== "string" || typeof document.signature !== "string") throw new Error("Missing signature or public key.");
  decodeBase64Url(document.publicKey, 32);
  decodeBase64Url(document.signature, 64);
  if (!Array.isArray(document.files) || document.files.length < 1 || document.files.length >= 10_000) throw new Error("Invalid signature file count.");
  let previous: string | undefined;
  for (const record of document.files) {
    if (!isObject(record) || !hasExactKeys(record, ["path", "size", "sha256"])) throw new Error("Malformed signature file record.");
    if (typeof record.path !== "string" || record.path === PRD_SIGNATURE_PATH || pathDecoder.decode(encoder.encode(record.path)) !== record.path) {
      throw new Error("Invalid signature file path.");
    }
    if (previous !== undefined && comparePaths(previous, record.path) >= 0) throw new Error("Signature file records must be unique and sorted by UTF-8 bytes.");
    if (!Number.isSafeInteger(record.size) || (record.size as number) < 0 || typeof record.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(record.sha256)) {
      throw new Error("Invalid signed file size or digest.");
    }
    previous = record.path;
  }
  return document as unknown as PrdSignatureDocument;
}

export function applyPrdSignatureTrust(result: PrdSignatureResult, trustedKeyId?: string): PrdSignatureResult {
  if (result.status !== "untrusted" && result.status !== "verified") return result;
  const trusted = result.keyId !== undefined && result.keyId === trustedKeyId;
  return {
    ...result,
    status: trusted ? "verified" : "untrusted",
    message: trusted
      ? "Packaged contents verified with the selected public key."
      : "Packaged contents match the signature, but the signing key is not trusted."
  };
}

export async function verifyPrdSignature(
  files: PrdFileMap,
  options: { trustedPublicKey?: Uint8Array } = {}
): Promise<PrdSignatureResult> {
  let document: PrdSignatureDocument;
  try {
    if (signatureDeclaration(files) === "unsigned") return { status: "unsigned", message: "This document has no PRD digital signature." };
    document = parseSignature(files[PRD_SIGNATURE_PATH]!);
  } catch (error) {
    if (error instanceof UnsupportedSignatureError) return { status: "unsupported", message: error.message };
    return { status: "invalid", message: error instanceof Error ? error.message : "Invalid signature metadata." };
  }
  if (!globalThis.crypto?.subtle) return { status: "unsupported", message: "Signature checking is unavailable in this runtime. Contents are not verified." };
  try {
    const paths = coveredPaths(files);
    if (paths.length !== document.files.length || paths.some((path, index) => path !== document.files[index]?.path)) {
      return { status: "invalid", message: "Signed file coverage does not match the packaged files." };
    }
    for (const record of document.files) {
      const bytes = files[record.path]!;
      if (bytes.byteLength !== record.size || await sha256(bytes) !== record.sha256) {
        return { status: "invalid", message: `Signed content changed: ${JSON.stringify(record.path)}.` };
      }
    }
    const rawKey = decodeBase64Url(document.publicKey, 32);
    const key = await subtleCrypto().importKey("raw", arrayBuffer(rawKey), "Ed25519", false, ["verify"]);
    const valid = await subtleCrypto().verify("Ed25519", key, arrayBuffer(decodeBase64Url(document.signature, 64)), arrayBuffer(createPrdSignaturePayload(document)));
    if (!valid) return { status: "invalid", message: "The PRD digital signature is invalid." };
    const result: PrdSignatureResult = {
      status: "untrusted", message: "Packaged contents match the signature, but the signing key is not trusted.",
      keyId: await getPrdSignerKeyId(rawKey), checkedFiles: paths.length
    };
    return options.trustedPublicKey
      ? applyPrdSignatureTrust(result, await getPrdSignerKeyId(options.trustedPublicKey))
      : result;
  } catch (error) {
    if (error instanceof Error && error.name === "NotSupportedError") {
      return { status: "unsupported", message: "Ed25519 verification is unavailable in this runtime. Contents are not verified." };
    }
    return { status: "invalid", message: "Signature verification could not complete." };
  }
}
