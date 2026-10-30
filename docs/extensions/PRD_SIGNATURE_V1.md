# PRD optional digital signature, version 1

_Status: accepted reference contract under PRD-041; repository implementation pending a Changesets release._

This extension authenticates the logical packaged files against a reader-supplied Ed25519 public key. It works with both legacy ZIP and the [PRD 1.0 envelope](../core/PRD_CONTAINER_FORMAT.md). Ordinary unsigned documents remain valid and readable. A file header identifies transport; structural validation checks format rules; neither substitutes for signature verification.

## Declaration and ownership

The manifest remains authoritative. Signing adds one optional array-form declaration:

```json
{
  "id": "eonhive.signature",
  "version": "1.0",
  "required": false,
  "ref": "extensions/eonhive/signature.json"
}
```

Exactly one matching declaration and its metadata file must occur together. The reference signer refuses existing signatures and object-form placeholder extension metadata rather than silently migrating it. The verifier reports missing/malformed declarations or metadata as invalid, and unknown declared versions as unsupported.

The browser-safe `@eonhive/prd-validator/signature` subpath owns verification, payload encoding, public-key import and result types. The Node-only `@eonhive/prd-packager/signing` subpath owns private-key signing. The CLI delegates to those modules. No new package, dependency, profile, manifest core field, container flag or rendering system is introduced.

## Coverage

Every logical file is covered except `extensions/eonhive/signature.json` itself. Coverage includes the exact updated `manifest.json` bytes, content, localized content/indexes, assets, attachments, profile data, protected files and unreferenced files. A file addition, removal, rename, size change or byte change invalidates verification. JSON whitespace in a covered file is significant.

Container headers, ZIP metadata, entry ordering, compression and explicit directory records are excluded. A package may be recompressed or moved between supported transports without invalidating its logical signature. Container and archive safety checks still apply independently. This is not an exact-archive-byte signature or a replacement for archive CRC checks.

Only bytes inside the package are covered. An external URL's literal bytes may be signed, but the remotely served content is not authenticated by this extension. A valid signature does not grant scripts, remote loading or other capabilities, and does not prove that content is safe.

## Metadata and signed bytes

The metadata file is UTF-8 JSON with exactly these properties:

| Property | Value |
| --- | --- |
| `contractVersion` | `"prd-signature-v1"` |
| `digestAlgorithm` | `"SHA-256"` |
| `signatureAlgorithm` | `"Ed25519"` |
| `publicKey` | 32 raw public-key bytes encoded as unpadded canonical base64url |
| `files` | Ordered array of exact `{ "path", "size", "sha256" }` records |
| `signature` | 64 signature bytes encoded as unpadded canonical base64url |

Paths are the exact safe package-relative file names emitted by the shared archive reader, using `/`. They must be valid Unicode, unique, and sorted lexicographically by their UTF-8 bytes. No Unicode normalization is applied. Each size is a nonnegative safe integer byte count; each digest is 64 lowercase hexadecimal characters representing SHA-256 of the entire file. Records have exactly the three named properties. The metadata cannot cover itself.

Unicode round-trip checks preserve any literal leading U+FEFF in a path. A file named `\uFEFFmanifest.json` remains distinct from `manifest.json` and receives its own signed record. This is filename data inside the preimage, not a BOM prefixed to the signature message. Path validation has its own decoder; existing manifest/metadata JSON decoding and the v1 preimage below remain unchanged. See the [archive filename policy](../core/PRD_CONTAINER_FORMAT.md#member-filename-encoding).

Build a compact JSON array in this exact order, using `JSON.stringify` semantics with no added whitespace:

```js
[
  "prd-signature-v1",
  "SHA-256",
  "Ed25519",
  publicKey,
  files.map(({ path, size, sha256 }) => [path, size, sha256])
]
```

The Ed25519 message is the UTF-8 encoding of the ASCII domain prefix `PRD-SIGNATURE-V1` followed by one NUL byte, immediately followed by that compact JSON serialization. There is no trailing newline, BOM, prehash mode or additional hashing of this message before Ed25519 signing. The metadata's JSON property order and whitespace are irrelevant because the verifier reconstructs this tuple from parsed values. Covered file bytes are never normalized.

Native Node signing uses `crypto.sign(null, message, privateKey)`. Verification uses native Web Crypto SHA-256 and Ed25519. The primitives follow [Node's signing API](https://nodejs.org/api/crypto.html#cryptosignalgorithm-data-key-callback), [Web Crypto](https://www.w3.org/TR/webcrypto/) and [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032.html); this project supplies packaging rules, not a custom cryptographic primitive.

Reference limits: metadata at most 2 MiB; 1–9,999 covered files, leaving one archive member for metadata; key files at most 64 KiB. Shared archive budgets also apply. Native Web Crypto/Ed25519 availability is required for checking signatures; runtimes without it report unsupported rather than verified. Runtime support and a trust policy are separate requirements.

## Verification and trust

Callers must apply archive safety checks and `validatePackageFiles` before signature verification. Verification then checks declaration/metadata shape, exact file coverage, sizes, all file digests and the Ed25519 signature. A key ID is `sha256:` followed by lowercase SHA-256 hex of the raw 32-byte public key.

| Status | Meaning |
| --- | --- |
| `unsigned` | Neither the declaration nor the metadata file exists |
| `untrusted` | Coverage, digests and signature pass; no matching independently supplied public key |
| `verified` | All checks pass and the supplied trusted public key matches the signing key |
| `invalid` | Malformed metadata, coverage/digest mismatch or failed cryptographic verification |
| `unsupported` | Unknown extension/contract/algorithm or unavailable cryptographic runtime |

The embedded public key never establishes trust by itself. A matching fingerprint only identifies a key; the reader must obtain and trust that key independently. The optional `keyId` and `checkedFiles` result fields are returned after successful cryptographic verification. Messages are human-readable and are not stable automation identifiers.

`applyPrdSignatureTrust(result, trustedKeyId)` changes only a previously successful `untrusted`/`verified` result. Its precondition is a fresh, genuine verifier result for the same immutable file snapshot. It does not perform cryptography. Consumers should normally use `verifyPrdSignature(files, { trustedPublicKey })` rather than promote a serialized result from an untrusted source.

The reference Viewer shows unsigned/untrusted/unsupported results truthfully and blocks known-invalid signed contents before preparing content, locale variants or resource URLs. Selecting an independently trusted SPKI `PUBLIC KEY` PEM pins that key to the current successful verification result. Switching documents or clearing the pin removes that trust. No key is silently persisted. Existing viewers that ignore this optional extension remain able to read the underlying document, but cannot claim signature verification.

If an attacker removes both the declaration and metadata, the result is unsigned. The signature cannot prove that a package used to be signed. Workflows that require authenticity must require `verified` and the expected public key; the CLI does exactly that through its exit code.

## CLI and library use

```bash
prd sign ./document.prd --key ./private.pem --out ./signed.prd --json
prd verify ./signed.prd --trusted-key ./public.pem --json
```

The caller supplies an unencrypted Ed25519 private key readable by Node (`PKCS8 PRIVATE KEY` PEM recommended). Public verification accepts only Ed25519 SPKI `PUBLIC KEY` PEM. Private-key diagnostics omit key material. The reference code neither generates production keys nor stores them in packages. Keep private keys outside source/package directories; the packager includes ordinary source files.

Signing validates the input, adds the declaration, hashes the resulting logical file snapshot, signs, preserves input transport, and verifies the emitted archive before returning it. The CLI requires a separate output path and creates it exclusively, refusing existing files/symlinks. It does not replace signatures or modify the source archive. To sign a revision, build it from its unsigned authoring source and produce a new signed output.

`verify` exits **0 only for `verified`**, and **1** for unsigned/untrusted/invalid/unsupported results or command errors. `--json` uses the separate `prd-cli-signature-v1` contract described in [CLI JSON contracts](../runtime/PRD_CLI_JSON_CONTRACT.md). Existing `validate`/`inspect` stay structural and their JSON shapes do not change; successful `validate` is not signature verification.

```ts
import { readFile } from "node:fs/promises";
import { signPrdArchive } from "@eonhive/prd-packager/signing";
import { readPrdArchive } from "@eonhive/prd-validator/container";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { importPrdPublicKey, verifyPrdSignature } from "@eonhive/prd-validator/signature";

const signed = await signPrdArchive(new Uint8Array(await readFile("document.prd")), await readFile("private.pem", "utf8"));
const files = readPrdArchive(signed.archive);
if (!validatePackageFiles(files).valid) throw new Error("Invalid package");
const trustedPublicKey = await importPrdPublicKey(await readFile("public.pem", "utf8"));
const result = await verifyPrdSignature(files, { trustedPublicKey });
if (result.status !== "verified") throw new Error(result.message);
```

## Deliberate limits and acceptance

Version 1 has one signature and an explicit public-key pin. It supplies no certificate authority, publisher account binding, timestamps, key rotation, revocation, expiry, multiple signers, encryption, ownership, wallet integration or signing service. It neither requires URK nor changes static-document reading. Those would require separate extension decisions.

Executable tests cover independent native verification of the specified preimage, all three profiles, both transports/repacking, exact covered-file tampering, extra/missing files, malformed metadata, wrong/missing keys, unknown contracts, unavailable crypto, refused re-signing, CLI exit/output safety and truthful Viewer trust labels. A host integration test proves structurally valid tampered content cannot reach the semantic interpreter. Live browser acceptance must additionally check public-key selection, pin reset and recovery; that check was unavailable on October 27 because local browser use was disabled in Work settings. No claim of a third-party cryptographic audit or every-browser support follows from these checks.
