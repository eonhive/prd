/**
 * Company: EonHive Inc. | Title: PRD Signature Conformance Tests
 * Purpose: Check signature coverage, independent verification, trust, and transport compatibility.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { createHash, generateKeyPairSync, verify } from "node:crypto";
import { resolve } from "node:path";
import { zipSync } from "fflate";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { validatePackageFiles, type PrdFileMap } from "@eonhive/prd-validator";
import { createPrdContainer, readPrdArchive, readPrdContainer } from "@eonhive/prd-validator/container";
import {
  applyPrdSignatureTrust, createPrdSignatureIndex, createPrdSignaturePayload,
  getPrdSignerKeyId, importPrdPublicKey, PRD_SIGNATURE_PATH, verifyPrdSignature,
  type PrdSignatureDocument
} from "@eonhive/prd-validator/signature";
import { packDirectoryToBuffer } from "./index.js";
import { signPrdArchive } from "./signing.js";

const encoder = new TextEncoder();
const keys = generateKeyPairSync("ed25519");
const privatePem = keys.privateKey.export({ format: "pem", type: "pkcs8" }).toString();
const publicPem = keys.publicKey.export({ format: "pem", type: "spki" }).toString();
const rawPublic = new Uint8Array(Buffer.from(keys.publicKey.export({ format: "jwk" }).x!, "base64url"));
let source: Uint8Array;
let signed: Uint8Array;

function metadata(files: PrdFileMap): PrdSignatureDocument {
  return JSON.parse(new TextDecoder().decode(files[PRD_SIGNATURE_PATH]));
}

function replaceMetadata(files: PrdFileMap, mutate: (document: PrdSignatureDocument) => void) {
  const document = metadata(files);
  mutate(document);
  files[PRD_SIGNATURE_PATH] = encoder.encode(JSON.stringify(document));
}

beforeAll(async () => {
  source = await packDirectoryToBuffer(resolve("examples/document-basic"));
  signed = (await signPrdArchive(source, privatePem)).archive;
});
afterEach(() => vi.unstubAllGlobals());

describe("optional package signatures", () => {
  it("requires an explicit matching public key for trusted verification", async () => {
    const files = readPrdArchive(signed);
    const result = await verifyPrdSignature(files);
    expect(result).toMatchObject({ status: "untrusted", checkedFiles: Object.keys(files).length - 1 });
    expect(await verifyPrdSignature(files, { trustedPublicKey: rawPublic })).toMatchObject({ status: "verified" });
    expect(await verifyPrdSignature(files, { trustedPublicKey: new Uint8Array(32) })).toMatchObject({ status: "untrusted" });
    expect(applyPrdSignatureTrust(result, result.keyId).status).toBe("verified");
    expect(applyPrdSignatureTrust({ ...result, status: "invalid" }, result.keyId).status).toBe("invalid");
    expect(applyPrdSignatureTrust({ ...result, status: "verified" }).status).toBe("untrusted");
    expect(validatePackageFiles(files).valid).toBe(true);
    expect(await verifyPrdSignature(readPrdArchive(source))).toMatchObject({ status: "unsigned" });
  });

  it("can be verified independently by native Ed25519 with the documented preimage", () => {
    const document = metadata(readPrdArchive(signed));
    const tuple = [document.contractVersion, "SHA-256", "Ed25519", document.publicKey,
      document.files.map((file) => [file.path, file.size, file.sha256])];
    const preimage = Buffer.from("PRD-SIGNATURE-V1\0" + JSON.stringify(tuple));
    expect(verify(null, preimage, keys.publicKey, Buffer.from(document.signature, "base64url"))).toBe(true);
    expect(verify(null, preimage.subarray(1), keys.publicKey, Buffer.from(document.signature, "base64url"))).toBe(false);
    expect(createPrdSignaturePayload(document)).toEqual(new Uint8Array(preimage));
  });

  it.each(["document-basic", "comic-basic", "storyboard-basic"])("preserves both transports and the %s profile", async (example) => {
    const zip = await packDirectoryToBuffer(resolve("examples", example));
    for (const input of [zip, createPrdContainer(zip)]) {
      const output = (await signPrdArchive(input, privatePem)).archive;
      expect(readPrdContainer(output).kind).toBe(readPrdContainer(input).kind);
      const files = readPrdArchive(output);
      const repacked = createPrdContainer(zipSync(files, { level: 0, mtime: new Date("2020-01-01T00:00:00Z") }));
      expect((await verifyPrdSignature(readPrdArchive(repacked), { trustedPublicKey: rawPublic })).status).toBe("verified");
    }
  });

  it.each([
    "manifest.json", "content/root.json", "assets/images/cover.svg", "content/locales/fr-FR.json"
  ])("rejects a byte change to %s", async (path) => {
    const files = readPrdArchive(signed);
    expect(files[path]).toBeDefined();
    files[path] = new Uint8Array([...files[path]!, 0x20]);
    expect(await verifyPrdSignature(files, { trustedPublicKey: rawPublic })).toMatchObject({ status: "invalid" });
  });

  it("covers unreferenced, profile and protected files as well as ordinary resources", async () => {
    const files = readPrdArchive(source);
    const extraPaths = ["protected/opaque.bin", "profiles/extra.json", "unreferenced.txt", "assets/😀.txt", "assets/\ue000.txt"];
    for (const path of extraPaths) files[path] = encoder.encode("covered");
    const original = await signPrdArchive(zipSync(files), privatePem);
    for (const path of extraPaths) {
      const changed = readPrdArchive(original.archive);
      changed[path] = encoder.encode("changed");
      expect((await verifyPrdSignature(changed)).status).toBe("invalid");
    }
    const paths = metadata(readPrdArchive(original.archive)).files.map((file) => file.path);
    expect(paths.indexOf("assets/\ue000.txt")).toBeLessThan(paths.indexOf("assets/😀.txt"));
  });

  it.each(["add", "delete", "rename"])("rejects a file-set %s", async (operation) => {
    const files = readPrdArchive(signed);
    if (operation !== "add") delete files["content/root.json"];
    if (operation !== "delete") files["content/extra.json"] = encoder.encode("{}");
    expect((await verifyPrdSignature(files)).status).toBe("invalid");
  });

  it.each(["zip", "prd"])("covers literal Unicode paths through signing and %s repacking", async (kind) => {
    const files = readPrdArchive(source);
    const paths = ["\uFEFFmanifest.json", "é.txt", "e\u0301.txt", "\uFFFD.txt"];
    for (const path of paths) files[path] = encoder.encode("exact literal filename");
    const zip = zipSync(files);
    const input = kind === "prd" ? createPrdContainer(zip) : zip;
    const output = (await signPrdArchive(input, privatePem)).archive;
    const opened = readPrdArchive(output);
    const covered = metadata(opened).files.map((file) => file.path);
    for (const path of paths) expect(covered).toContain(path);
    expect((await verifyPrdSignature(opened, { trustedPublicKey: rawPublic })).status).toBe("verified");
    const repacked = kind === "prd" ? zipSync(opened) : createPrdContainer(zipSync(opened));
    expect((await verifyPrdSignature(readPrdArchive(repacked), { trustedPublicKey: rawPublic })).status).toBe("verified");
    opened["\uFEFFmanifest.json"] = encoder.encode("changed");
    expect((await verifyPrdSignature(opened, { trustedPublicKey: rawPublic })).status).toBe("invalid");
  });

  it("keeps the existing metadata JSON BOM handling separate from path validation", async () => {
    const files = readPrdArchive(signed);
    const original = files[PRD_SIGNATURE_PATH]!;
    files[PRD_SIGNATURE_PATH] = new Uint8Array([0xef, 0xbb, 0xbf, ...original]);
    expect((await verifyPrdSignature(files, { trustedPublicKey: rawPublic })).status).toBe("verified");
  });

  it.each([
    ["signature", (doc: PrdSignatureDocument) => { doc.signature = Buffer.alloc(64).toString("base64url"); }],
    ["public key", (doc: PrdSignatureDocument) => { doc.publicKey = Buffer.alloc(32).toString("base64url"); }],
    ["digest", (doc: PrdSignatureDocument) => { doc.files[0]!.sha256 = "0".repeat(64); }],
    ["size", (doc: PrdSignatureDocument) => { doc.files[0]!.size = -1; }],
    ["duplicate", (doc: PrdSignatureDocument) => { doc.files.push(doc.files[0]!); }],
    ["order", (doc: PrdSignatureDocument) => { doc.files.reverse(); }],
    ["encoding", (doc: PrdSignatureDocument) => { doc.signature += "="; }],
    ["extra field", (doc: PrdSignatureDocument) => { Object.assign(doc, { identity: "not authenticated" }); }]
  ])("rejects malformed or modified %s metadata", async (_label, mutate) => {
    const files = readPrdArchive(signed);
    replaceMetadata(files, mutate);
    expect((await verifyPrdSignature(files, { trustedPublicKey: rawPublic })).status).toBe("invalid");
  });

  it("accepts metadata serialization changes without normalizing covered content", async () => {
    const files = readPrdArchive(signed);
    files[PRD_SIGNATURE_PATH] = encoder.encode(JSON.stringify(Object.fromEntries(Object.entries(metadata(files)).reverse()), null, 4));
    expect((await verifyPrdSignature(files)).status).toBe("untrusted");
  });

  it.each(["missing declaration", "missing metadata", "wrong ref", "required"])("rejects %s", async (mode) => {
    const files = readPrdArchive(signed);
    const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
    if (mode === "missing declaration") delete manifest.extensions;
    if (mode === "missing metadata") delete files[PRD_SIGNATURE_PATH];
    if (mode === "wrong ref") manifest.extensions[0].ref = "elsewhere.json";
    if (mode === "required") manifest.extensions[0].required = true;
    files["manifest.json"] = encoder.encode(JSON.stringify(manifest));
    expect((await verifyPrdSignature(files)).status).toBe("invalid");
  });

  it("reports future contracts and unavailable crypto as unsupported, never verified", async () => {
    const files = readPrdArchive(signed);
    replaceMetadata(files, (doc) => Object.assign(doc, { contractVersion: "prd-signature-v2" }));
    expect((await verifyPrdSignature(files)).status).toBe("unsupported");
    vi.stubGlobal("crypto", undefined);
    expect((await verifyPrdSignature(readPrdArchive(signed))).status).toBe("unsupported");
    expect((await verifyPrdSignature(readPrdArchive(source))).status).toBe("unsigned");
  });

  it("reports unknown algorithms and unavailable native Ed25519 as unsupported", async () => {
    const files = readPrdArchive(signed);
    replaceMetadata(files, (doc) => Object.assign(doc, { signatureAlgorithm: "future-algorithm" }));
    expect((await verifyPrdSignature(files)).status).toBe("unsupported");
    const digest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    vi.stubGlobal("crypto", { subtle: { digest, importKey: async () => { throw new DOMException("Unavailable", "NotSupportedError"); } } });
    expect((await verifyPrdSignature(readPrdArchive(signed))).status).toBe("unsupported");
  });

  it("bounds metadata and rejects non-Unicode paths", async () => {
    const files = readPrdArchive(signed);
    files[PRD_SIGNATURE_PATH] = new Uint8Array(2 * 1024 * 1024 + 1);
    expect((await verifyPrdSignature(files)).status).toBe("invalid");
    await expect(createPrdSignatureIndex({ "\ud800": encoder.encode("x") }, rawPublic)).rejects.toThrow("Unicode");
  });

  it("imports only public Ed25519 SPKI keys and uses a stable raw-key fingerprint", async () => {
    expect(await importPrdPublicKey(publicPem)).toEqual(rawPublic);
    expect(await getPrdSignerKeyId(rawPublic)).toBe(`sha256:${createHash("sha256").update(rawPublic).digest("hex")}`);
    await expect(importPrdPublicKey(privatePem)).rejects.toThrow("PUBLIC KEY");
    const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    await expect(importPrdPublicKey(ec.publicKey.export({ format: "pem", type: "spki" }).toString())).rejects.toThrow("Ed25519");
    await expect(importPrdPublicKey("x".repeat(65537))).rejects.toThrow("large");
  });

  it("refuses re-signing, invalid packages, placeholder extensions and wrong private keys", async () => {
    await expect(signPrdArchive(signed, privatePem)).rejects.toThrow("already contains");
    const files = readPrdArchive(source);
    delete files["content/root.json"];
    await expect(signPrdArchive(zipSync(files), privatePem)).rejects.toThrow("invalid");
    const original = readPrdArchive(source);
    const manifest = JSON.parse(new TextDecoder().decode(original["manifest.json"]));
    original["manifest.json"] = encoder.encode(JSON.stringify({ ...manifest, extensions: {} }));
    await expect(signPrdArchive(zipSync(original), privatePem)).rejects.toThrow("array-form");
    await expect(signPrdArchive(source, "secret-key-marker")).rejects.toThrow("Could not load");
    const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    await expect(signPrdArchive(source, ec.privateKey.export({ format: "pem", type: "pkcs8" }).toString())).rejects.toThrow("Ed25519");
  });
});
