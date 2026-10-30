/**
 * Company: EonHive Inc. | Title: PRD Archive Signing
 * Purpose: Sign a validated package with a caller-provided Ed25519 key while preserving its transport.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */

import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { zipSync } from "fflate";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { createPrdContainer, readPrdArchive, readPrdContainer } from "@eonhive/prd-validator/container";
import {
  createPrdSignatureIndex, createPrdSignaturePayload, PRD_SIGNATURE_EXTENSION_ID,
  PRD_SIGNATURE_MAX_METADATA_BYTES, PRD_SIGNATURE_PATH, verifyPrdSignature
} from "@eonhive/prd-validator/signature";

export async function signPrdArchive(
  bytes: Uint8Array,
  privateKeyPem: string
): Promise<{ archive: Uint8Array; keyId: string }> {
  const { kind } = readPrdContainer(bytes);
  const files = readPrdArchive(bytes);
  const validation = validatePackageFiles(files);
  if (!validation.valid) throw new Error("Cannot sign a structurally invalid PRD package.");
  if (privateKeyPem.length > 64 * 1024) throw new Error("The private-key file is too large.");
  let privateKey;
  try {
    privateKey = createPrivateKey(privateKeyPem);
    if (privateKey.asymmetricKeyType !== "ed25519") throw new Error();
  } catch {
    throw new Error("Could not load an unencrypted Ed25519 private key. Key material is never included in diagnostics.");
  }
  const publicJwk = createPublicKey(privateKey).export({ format: "jwk" });
  if (typeof publicJwk.x !== "string") throw new Error("Could not export the Ed25519 public key.");
  const publicKey = new Uint8Array(Buffer.from(publicJwk.x, "base64url"));
  const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  if (manifest.extensions !== undefined && !Array.isArray(manifest.extensions)) {
    throw new Error("Signing requires array-form extension declarations; migrate placeholder metadata explicitly first.");
  }
  const extensions = manifest.extensions ?? [];
  if (Object.hasOwn(files, PRD_SIGNATURE_PATH) || extensions.some((extension: { id?: string }) => extension.id === PRD_SIGNATURE_EXTENSION_ID)) {
    throw new Error("This package already contains signature metadata. Existing signatures are not overwritten.");
  }
  const encoder = new TextEncoder();
  files["manifest.json"] = encoder.encode(JSON.stringify({
    ...manifest,
    extensions: [...extensions, { id: PRD_SIGNATURE_EXTENSION_ID, version: "1.0", required: false, ref: PRD_SIGNATURE_PATH }]
  }, null, 2) + "\n");
  const index = await createPrdSignatureIndex(files, publicKey);
  const signature = sign(null, createPrdSignaturePayload(index), privateKey).toString("base64url");
  files[PRD_SIGNATURE_PATH] = encoder.encode(JSON.stringify({ ...index, signature }, null, 2) + "\n");
  if (files[PRD_SIGNATURE_PATH]!.byteLength > PRD_SIGNATURE_MAX_METADATA_BYTES) throw new Error("Signature metadata exceeds the 2 MiB limit.");
  const zip = zipSync(files);
  const archive = kind === "prd" ? createPrdContainer(zip) : zip;
  // Verify the emitted package, so ZIP encoding cannot silently drop a covered member.
  const verified = await verifyPrdSignature(readPrdArchive(archive), { trustedPublicKey: publicKey });
  if (verified.status !== "verified" || !verified.keyId) throw new Error("The emitted signed package did not pass self-verification.");
  return { archive, keyId: verified.keyId };
}
