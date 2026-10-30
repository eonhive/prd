# @eonhive/prd-validator

Validate PRD manifest, structured profiles and referenced resources. These examples describe the repository build; container/signature entry points and directory limits are queued for the normal Changesets release.

## Node

```ts
import { validatePackage, inspectPackage, validatePrdArchive } from "@eonhive/prd-validator/node";

const validation = await validatePackage("./document.prd"); // or an unpacked directory
const facts = await inspectPackage("./document.prd");
const withBudget = await validatePrdArchive("./document.prd", { maxArchiveBytes: 16 * 1024 * 1024 });
const directory = await validatePackage("./document", { maxFileBytes: 8 * 1024 * 1024, maxEntries: 1000 });
```

Node archive entry points check file size before reading and accept legacy ZIP or a PRD 1.0 envelope. File targets retain the `.prd` extension policy. Generic `validatePackage` / `inspectPackage` now accept partial `PrdArchiveLimits` as a second argument and forward them to the appropriate reader.

Unpacked directories use the shared `readPackageDirectory(path, limits)` reader exported from `/node`, also used by the packager. Direct `validatePackageDirectory` / `inspectPackageDirectory` functions accept partial `PrdDirectoryLimits`: `maxFileBytes` (32 MiB), `maxExpandedBytes` (128 MiB total file bytes) and `maxEntries` (10,000 visited entries). The compressed-only `maxArchiveBytes` policy does not apply to directories. Values must be positive safe integers. Each visited directory, file, dotfile, symlink or special entry counts once, excluding the supplied root. Dotfiles, hidden subtrees and non-file/non-directory entries remain omitted from the returned map; hidden-subtree descendants are not visited or counted.

The reader uses incremental directory enumeration and bounded file reads, checks opened-file sizes before reading data and checks actual bytes before retaining each chunk. A growing file can read at most one byte beyond the remaining byte allowance before failing. Empty directories count toward traversal limits. Returned maps have a null prototype; exact retained file bytes feed the existing semantic validator. Limits do not provide a process-memory ceiling, deadline or atomic filesystem snapshot. Source trees must remain stable; skipped symlinks and leaf no-follow checks where supported are not a guarantee against concurrent ancestor replacement.

Directory helpers throw `PrdDirectoryError` with `directory-entry-limit`, `directory-file-size-limit`, `directory-total-size-limit`, `directory-limit-invalid`, `directory-read-invalid` or the existing `package-directory-invalid`. Node validation/inspection turns these into existing coded issue objects; failed inspection has no partial file counts. Direct directory I/O failures now return an invalid result instead of escaping as filesystem exceptions. Generic missing-target behavior stays `package-path-missing`.

## Browser / in-memory

```ts
import { validatePackageFiles } from "@eonhive/prd-validator";
import { assertPrdArchiveSize, readPrdArchive, readPrdContainer } from "@eonhive/prd-validator/container";

async function validateFile(file: File) {
  assertPrdArchiveSize(file.size);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const transport = readPrdContainer(bytes).kind; // identification only
  const validation = validatePackageFiles(readPrdArchive(bytes));
  return { transport, validation };
}
```

`readPrdArchive` preflights bounded ZIP/ZIP64 records, screens archive members and enforces declared/actual output budgets before returning the logical file map. Every decoded member must match CRC-32, including unreferenced files and empty directories. Local/central/descriptor inconsistencies, unsupported encryption/patch/reserved flags and unsafe wide fields fail before decode. Stored/DEFLATE data and signed/signatureless descriptors remain supported. Container helpers throw `PrdContainerError`; bad data checksums use `archive-checksum-mismatch`, other record defects use `archive-read-invalid`, and existing budget/path codes remain. Node validation/inspection converts reader failures into the existing issue structure.

Semantic validation remains a separate step; a ZIP or PRD header alone never establishes a valid document. CRC verifies decoded member data, not publisher authenticity or every ZIP metadata/compressed representation. The reader remains browser-safe and uses the existing fflate inflater; it adds no dependency or new public function. These checks are queued for the normal Changesets release.

Stored members use 64 KiB input windows after size preflight; DEFLATE keeps 1 KiB compressed pushes. Both enforce the same actual-byte/CRC checks and return independently owned file buffers. See [loader benchmarks and measurement limits](../../docs/core/PRD_PERFORMANCE_AND_LOADING.md#13-current-loader-measurements-and-stored-windows-october-29-2026); eager loading and reader budgets are unchanged.

UTF-8-flagged member names decode strictly; malformed bytes produce `archive-read-invalid` before decompression. Literal leading U+FEFF, valid U+FFFD and distinct Unicode normalization forms are preserved. A BOM-prefixed name cannot become the required `manifest.json`. Unflagged byte names keep their existing interpretation. See [filename encoding](../../docs/core/PRD_CONTAINER_FORMAT.md#member-filename-encoding) and [bounded mutation checks](../../docs/core/PRD_CONTAINER_FORMAT.md#bounded-mutation-checks-october-30-2026). This changes no public API/JSON shape, content decoder, format version or default writer.

Defaults: 64 MiB entire archive, 128 MiB expanded total, 32 MiB per file and 10,000 members. Byte readers and direct Node archive functions accept partial `PrdArchiveLimits` overrides. These are reference implementation policies, not universal format maxima.

## Optional signature verification

```ts
import { importPrdPublicKey, verifyPrdSignature } from "@eonhive/prd-validator/signature";

// First use readPrdArchive and validatePackageFiles on this same immutable snapshot.
const trustedPublicKey = await importPrdPublicKey(publicKeyPem); // Ed25519 SPKI PUBLIC KEY PEM
const signature = await verifyPrdSignature(files, { trustedPublicKey });
if (signature.status !== "verified") throw new Error(signature.message);
```

Without a matching explicit key, a cryptographically correct signature is `untrusted`. Other results are `unsigned`, `invalid` and `unsupported`; key fingerprints and checked-file counts are optional result fields. Native Web Crypto/Ed25519 is required for signed verification. Existing validation/inspection APIs remain structural and never establish authenticity. Private-key signing lives in the packager's Node-only `signing` subpath.

## Content schema and semantic checks

The repository's `schemas/content.schema.json` now covers the canonical general-document node set, optional IDs and packaged section references. Its default target validates document roots; `#/$defs/documentSectionRoot` validates referenced section files. It keeps the existing schema ID and JSON Schema 2020-12 dialect. Canonical examples and positive/negative shape parity tests run with the existing development AJV dependency.

The runtime validator continues to use handwritten semantic checks without loading AJV or the schema. Always use package validation for resource existence/IDs, unique node/table IDs, table row columns, chart series lengths, section-file matching and locale relationships; a schema-valid file alone is insufficient. Unknown properties remain compatible and do not imply executable support. Sections must use inline children or `src`, never both, even when `children` is null/non-array. Declared-version string acceptance is unchanged; viewer support and `minViewer` enforcement follow the separate reference versioning policy.

See [general-document validation](../../docs/profiles/PRD_PROFILE_GENERAL_DOCUMENT.md#111-content-schema-and-semantic-validation), [versioning policy](../../docs/core/PRD_VERSIONING_POLICY.md), [signature contract](../../docs/extensions/PRD_SIGNATURE_V1.md), [container contract](../../docs/core/PRD_CONTAINER_FORMAT.md), [minimal-valid spec](../../docs/core/PRD_MINIMAL_VALID_SPEC.md) and [runtime conformance](../../docs/runtime/PRD_CONFORMANCE.md). Encryption, whole-archive authentication and exhaustive hostile-input assurance remain outside this module.

MIT licensed.
