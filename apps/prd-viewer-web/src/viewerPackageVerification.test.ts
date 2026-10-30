/**
 * Company: EonHive Inc. | Title: Viewer Signature Boundary Tests
 * Purpose: Prove tampering blocks interpretation while unsigned and untrusted content retain supported opening behavior.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */

import { generateKeyPairSync, sign } from "node:crypto";
import type { PrdExtensionDeclaration, PrdManifest } from "@eonhive/prd-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validatePackageFiles, type PrdFileMap } from "@eonhive/prd-validator";
import { createPrdSignatureIndex, createPrdSignaturePayload, PRD_SIGNATURE_PATH } from "@eonhive/prd-validator/signature";
import * as viewerCore from "@eonhive/prd-viewer-core";
import { openViewerPackage } from "./viewerPackageVerification.js";

const encoder = new TextEncoder();
function fixture(): PrdFileMap {
  return {
    "manifest.json": encoder.encode(JSON.stringify({
      prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:signature-boundary", profile: "general-document",
      title: "Signed document", entry: "content/root.json"
    })),
    "content/root.json": encoder.encode(JSON.stringify({
      schemaVersion: "1.0", profile: "general-document", type: "document", id: "signed", title: "Signed document",
      children: [{ type: "paragraph", text: "Original content" }]
    }))
  };
}

async function signedFixture(extensions: PrdExtensionDeclaration[] = [], manifestOverrides: Partial<PrdManifest> = {}): Promise<PrdFileMap> {
  const files = fixture();
  const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  Object.assign(manifest, manifestOverrides);
  manifest.extensions = [...extensions, { id: "eonhive.signature", version: "1.0", required: false, ref: PRD_SIGNATURE_PATH }];
  files["manifest.json"] = encoder.encode(JSON.stringify(manifest));
  const keys = generateKeyPairSync("ed25519");
  const rawKey = new Uint8Array(Buffer.from(keys.publicKey.export({ format: "jwk" }).x!, "base64url"));
  const index = await createPrdSignatureIndex(files, rawKey);
  files[PRD_SIGNATURE_PATH] = encoder.encode(JSON.stringify({
    ...index, signature: sign(null, createPrdSignaturePayload(index), keys.privateKey).toString("base64url")
  }));
  return files;
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("viewer package verification boundary", () => {
  it("does not let a valid signature bypass an unsupported minimum viewer", async () => {
    const files = await signedFixture([], { compatibility: { minViewer: "999.0" } });
    expect(validatePackageFiles(files).valid).toBe(true);
    const result = await openViewerPackage(files);
    expect(result.signature.status).toBe("untrusted");
    expect(result.opened?.supportState).toBe("unsupported-required-capability");
    expect(result.opened?.message).toContain('minViewer "999.0"');
    expect(result.opened?.entryDocument).toBeUndefined();
  });

  it("does not let a valid signature bypass an unsupported required extension", async () => {
    const files = await signedFixture([{ id: "custom.renderer", required: true }]);
    expect(validatePackageFiles(files).valid).toBe(true);
    const result = await openViewerPackage(files);
    expect(result.signature.status).toBe("untrusted");
    expect(result.opened?.supportState).toBe("unsupported-required-capability");
    expect(result.opened?.message).toContain("required extensions: custom.renderer");
    expect(result.opened?.entryDocument).toBeUndefined();
  });

  it("blocks structurally valid tampered content before calling the semantic interpreter", async () => {
    const files = await signedFixture();
    files["content/root.json"] = encoder.encode(new TextDecoder().decode(files["content/root.json"]).replace("Original content", "Tampered content"));
    expect(validatePackageFiles(files).valid).toBe(true);
    const open = vi.spyOn(viewerCore, "openPrdDocument");
    const result = await openViewerPackage(files);
    expect(result.signature.status).toBe("invalid");
    expect(result.opened).toBeUndefined();
    expect(open).not.toHaveBeenCalled();
  });

  it("opens unsigned and cryptographically valid untrusted content without inventing trust", async () => {
    for (const [files, status] of [[fixture(), "unsigned"], [await signedFixture(), "untrusted"]] as const) {
      expect(validatePackageFiles(files).valid).toBe(true);
      const result = await openViewerPackage(files);
      expect(result.signature.status).toBe(status);
      expect(result.opened?.entryDocument?.children[0]).toMatchObject({ text: "Original content" });
    }
  });

  it("retains readable content with explicit unsupported status if crypto is unavailable", async () => {
    const files = await signedFixture();
    vi.stubGlobal("crypto", undefined);
    const result = await openViewerPackage(files);
    expect(result.signature.status).toBe("unsupported");
    expect(result.opened?.supportState).toBe("fully-supported");
  });
});
