# PRD container identification and compatibility

_Updated: October 30, 2026_
_Status: Reference container 1.0 contract; additive rollout under PRD-040_

## Purpose and source audit

PRD file identification, document interpretation and cryptographic authenticity are separate concerns. This contract implements the binary layout supplied by the owner while retaining the existing ZIP-based package contract and three canonical profiles.

Before this slice, `prd-packager` emitted `zipSync` output directly, the Node validator and browser Viewer independently called `unzipSync`, and no PRD-specific magic/header existed. `.prd` extension checks, ZIP parsing and manifest validation provided identification. The current source also exposed unsafe unreferenced member acceptance and unbounded decompression, recorded in the [architecture assessment](../architecture/PRD_ARCHITECTURE_ASSESSMENT_2026-10-26.md).

Both transport alternatives were evaluated:

| Alternative | Advantage | Trade-off |
| --- | --- | --- |
| ZIP-native marker entry plus manifest | Direct ZIP-tool compatibility | No unique PRD bytes at offset zero; requires ZIP-member inspection to identify PRD |
| Fixed PRD header followed by ZIP | Unique signature and early container-version detection; retains ZIP/content tooling internally | Requires a PRD-aware reader to slice the payload; older PRD readers and ordinary ZIP tools cannot be assumed compatible |

The owner's requested unique magic uses the second alternative. To preserve existing public behavior, default writers continue emitting ordinary ZIP. New readers accept both, and `--container prd` explicitly selects the envelope. A future default migration requires its own release decision; this slice does not silently migrate files or existing outputs.

## Transport and header

Both forms use the `.prd` extension:

- `zip`: the existing ZIP archive containing root `manifest.json`; default output and supported compatibility form.
- `prd`: the 16-byte header below followed immediately by one ZIP payload.

| Offset | Bytes | Field | Container 1.0 rule |
| --- | ---: | --- | --- |
| `0x00` | 4 | Magic | `50 52 44 00` (`PRD` followed by NUL) |
| `0x04` | 1 | Major | Unsigned byte, exactly `1` |
| `0x05` | 1 | Minor | Unsigned byte, exactly `0` |
| `0x06` | 2 | Flags | Unsigned 16-bit little-endian, exactly zero |
| `0x08` | 8 | Payload length | Unsigned 64-bit little-endian; equals file length minus 16 |
| `0x10` | variable | Payload | ZIP bytes with ZIP-relative offsets measured from this position |

For a 1,024-byte payload, the header is:

```text
50 52 44 00 01 00 00 00
00 04 00 00 00 00 00 00
```

Container version is independent of manifest `prdVersion`, `manifestVersion`, optional profile/extension versions, runtime versions and npm versions. All three profiles use the same header. No compression/encryption/signing flag is defined. Unknown major/minor versions or nonzero flags are rejected rather than guessed.

The length is compared using `bigint` before any numeric conversion or allocation based on that field. Truncation and appended bytes produce length mismatch. The header does not supply an alternate entry path or override manifest fields. An envelope does not wrap another envelope.

## Reader behavior

1. Check compressed file size before reading a local file into memory when size metadata is available; recheck actual bytes afterward.
2. Recognize `PRD\0` and validate the entire header before selecting its ZIP payload. A partial PRD prefix is a truncated header, not a legacy retry.
3. Otherwise require ZIP magic for the legacy candidate. Current file APIs still enforce the `.prd` extension; byte-level helpers identify containers independently of names.
4. Inspect bounded ZIP end, central, local and descriptor records without inflating members. Require consistent extents, offsets, counts, names, flags, sizes and checksums; reject overlapping/missing/unlisted records, unsupported flags, unsafe/conflicting paths and policy-limit violations.
5. Decode only indexed member slices in bounded compressed chunks. Enforce actual output counts and declared-size consistency, then verify each decoded member's CRC-32 before returning its bytes; forged sizes or checksums cannot authorize unchecked output.
6. Apply existing manifest, content, profile and referenced-resource validation. An ordinary ZIP without `manifest.json` is not a valid PRD. Magic recognition alone is not package validation.

Development directories remain supported with root `manifest.json` and no binary header. Under PRD-049, Node validation, inspection and packaging share a bounded directory reader as specified below; archive and directory inputs still use the same semantic validator.

The Node adapter and web Viewer share `@eonhive/prd-validator/container`. The module is browser-safe and has no Node dependency. Node archive APIs preserve diagnostic objects; the Viewer presents the same reader's error message. Semantic validity stays in the existing validator, and rendering stays in viewer-core/web.

## Reference reader resource policy

These are configurable implementation defaults, not universal format maxima:

| Policy | Default |
| --- | ---: |
| Entire compressed file, including envelope if present | 64 MiB |
| Sum of expanded member bytes | 128 MiB |
| One expanded member | 32 MiB |
| ZIP members, including explicit directories | 10,000 |

`readPrdArchive(bytes, limits)`, `validatePrdArchive(path, limits)` and `inspectPrdArchive(path, limits)` accept partial overrides. Generic Node `validatePackage` / `inspectPackage` also accept and forward limits. Limit values must be positive safe integers. The web Viewer uses defaults; packager `options.limits` overrides source directory and emitted archive checks. Reference validation returns `valid: false` plus a policy-specific issue when its budget is exceeded; that does not imply every conforming implementation must use that budget. A small compressed file may still exceed expanded limits.

Member paths must be package-relative, use `/`, and contain no empty, `.` or `..` segments, backslashes, colon/drive/URL forms, leading `/` or C0 control characters (`U+0000`–`U+001F`). Empty directory members are supported, then omitted from the logical file map. Duplicate members, file/directory collisions and central/local disagreement fail explicitly. Case and Unicode spelling are not silently rewritten. Decoded members use a null-prototype file map so special property names remain inert.

### Member filename encoding

General-purpose bit 11 declares UTF-8 name bytes under [PKWARE APPNOTE 6.3.10, Appendix D.2](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT). The reference reader decodes those names strictly before decompression. Malformed sequences fail with the existing `archive-read-invalid` diagnostic; invalid bytes are not replaced with U+FFFD. An explicitly encoded, well-formed U+FFFD character remains a valid name character.

Member names are exact identifiers. A leading U+FEFF is retained literally, never consumed as a text encoding marker or promoted into a reserved filename. Thus `\uFEFFmanifest.json` is a separate name and cannot satisfy the required root `manifest.json`. Composed/decomposed Unicode forms stay distinct. Local and central raw names still must match byte-for-byte. These corrections preserve valid UTF-8 spelling and prevent the former replacement/BOM-stripping behavior from redefining logical package identity.

Unflagged names retain the existing single-byte reference interpretation. Legacy code-page negotiation and Unicode Path extra-field interpretation remain separate compatibility work. Content/JSON decoding, container headers, signature algorithms/contracts and manifest versions are unchanged. Signature path round-trip validation also retains literal U+FEFF using a separate path decoder, preserving coverage through repacking while keeping JSON decoder behavior. The filename fix has a validator patch Changeset; formerly accepted malformed names now reject, while literal filenames from valid source directories remain intact.

Stored and DEFLATE members are supported through existing `fflate`; split archives are rejected. The internal record inspector checks metadata without inflation, then passes indexed DEFLATE slices to `Inflate` with 1,024-byte compressed pushes. Stored members use 64 KiB source windows after their sizes are checked to match; they cannot expand. Both paths use the same actual-output and checksum checks. Record-like bytes within member data are never scanned as descriptors. Checks run before retaining output chunks and before assembling an independent complete member buffer. See the [current loader measurements](PRD_PERFORMANCE_AND_LOADING.md#13-current-loader-measurements-and-stored-windows-october-29-2026). Decoder chunks, retained buffers, ZIP metadata and browser Blob/image allocations still consume memory: these limits are not a promise of an exact process-heap ceiling or CPU deadline.

The package still loads eagerly into memory. Internal chunked decompression is an implementation safety measure, not network streaming, range requests, lazy section fetching or a new runtime capability.

The [October 30 allocation experiment](PRD_PERFORMANCE_AND_LOADING.md#14-allocation-investigation-and-viewer-blob-preparation-october-30-2026) retained chunk-based output assembly. Full declared-size preallocation was rejected because malformed short output could reserve a large advertised buffer before length rejection, despite staying inside configured limits. Actual output checks precede retention; final length/CRC checks precede the complete independent file allocation. This reference behavior adds no format-wide allocation contract or exact process-memory ceiling.

### ZIP integrity policy

PRD-050 checks CRC-32 for all decoded members, including files not referenced by the manifest and empty directory members. Local and central CRC/size declarations must agree. When bit 3 defers metadata, local placeholders may be zero; the required descriptor must supply the matching CRC and sizes. Both descriptor signature forms are supported, including the case where a signatureless CRC equals the optional marker. CRC covers member data and does not authenticate names, timestamps, comments, publishers or every compressed byte representation.

The reader follows ZIP field layouts and CRC/descriptor rules in [PKWARE APPNOTE 6.3.10](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT), especially sections 4.1.5, 4.3.9, 4.3.12–16 and 4.5.3. Safe single-disk ZIP64 end/locator/extra fields and wide descriptors are supported, including small files whose writers force ZIP64 local headers. Wide values are checked before conversion/allocation. Entry/expanded-byte limits still apply. Central records may differ from physical order; comments and bounded unknown extra fields remain metadata.

General-purpose flags are limited to existing DEFLATE level hints, descriptors and UTF-8 names (`0x080e` mask). Encryption, patching and reserved features are rejected before decode rather than silently ignored. Compression remains stored/DEFLATE only. Optional ZIP central-directory signature records are bounded opaque metadata; only the separate PRD signature extension establishes its own verification result. Record gaps cannot conceal unlisted local members. This is bounded record and decoded-member integrity checking, not exhaustive ZIP conformance, whole-archive authentication or a fuzz-audit claim.

### Unpacked directory policy

`readPackageDirectory(path, limits)` and `PRD_DEFAULT_DIRECTORY_LIMITS` are exported from `@eonhive/prd-validator/node`. `PrdDirectoryLimits` selects `maxFileBytes`, `maxExpandedBytes` and `maxEntries` from archive policy: 32 MiB per retained file, 128 MiB total retained file bytes and 10,000 visited entries. `maxArchiveBytes` applies only to archive bytes, not directories. Direct Node directory validation/inspection accepts partial directory limits; the packager uses `options.limits` for both source and output. An explicit increase is needed for source files exceeding defaults.

Each enumerated entry counts before exclusions, including folders, hidden names, symlinks and special entries. The supplied root is not counted. Hidden directories are skipped without visiting their descendants; dotfiles and non-regular entries remain excluded from file contents. Directory and archive entry counts therefore differ: directory traversal includes all visited entries, while ZIP policy counts actual archive members. Empty folders cannot evade the traversal budget.

The reader enumerates directories incrementally with an iterative queue, checks sizes on opened regular-file handles before data reads, and reads at most 64 KiB at a time with remaining-budget-plus-one probes. Actual per-file and aggregate checks run before retaining chunks, including when a file grows after stat. File handles close on success/failure. Collected files use a null-prototype map; no partial map is returned after a reader failure. Semantic validation and packaging use the collected bytes. Direct directory I/O failures now become `directory-read-invalid` issues in validation/inspection; generic missing-target diagnostics remain unchanged.

Retained chunks and assembled buffers can overlap in memory. Directory limits are not exact heap ceilings or deadlines. The filesystem is not atomically snapshotted: callers must supply stable source trees. Existing symlinks are skipped; leaf no-follow/nonblocking flags are used where supported, but concurrent ancestor replacement is not isolated. These checks add no sandbox claim or arbitrary filesystem import feature.

## APIs and CLI

```ts
import { packDirectoryToBuffer, packDirectoryToFile } from "@eonhive/prd-packager";
import { readPrdArchive, readPrdContainer } from "@eonhive/prd-validator/container";
import { validatePackageFiles } from "@eonhive/prd-validator";

const legacy = await packDirectoryToBuffer("./document");
const enveloped = await packDirectoryToBuffer("./document", { container: "prd" });
const bounded = await packDirectoryToBuffer("./document", { limits: { maxEntries: 1000 } });
await packDirectoryToFile("./document", "./document.prd", { container: "prd" });
const kind = readPrdContainer(enveloped).kind; // "prd"; header identification only
const validation = validatePackageFiles(readPrdArchive(enveloped));
```

```sh
prd pack ./document --out ./legacy.prd
prd pack ./document --out ./identified.prd --container prd
prd validate ./identified.prd --json
prd inspect ./identified.prd --json
```

`container: "zip"` explicitly selects the existing default. Unknown/missing `--container` values fail without creating output. Packager option arguments are additive; existing two-argument file packing and one-argument buffer packing retain ZIP output. The packager validates and packs one source snapshot and applies the shared archive policy to emitted bytes.

`createPrdContainer(payload)` wraps already-built ZIP bytes after magic/size checks; it does not itself verify the entire ZIP or document. `readPrdContainer` identifies/unwraps without decompressing. Use `readPrdArchive` and semantic validation for a full reference open.

Validate/inspect JSON shapes and `prd-cli-json-v0.1` are unchanged. Error codes remain strings; new codes below are additive. Inspection `totalBytes` counts expanded logical files, not header/compressed bytes, and `sourceKind` stays `archive` for both forms.

## Diagnostics

| Code | Meaning |
| --- | --- |
| `archive-magic-invalid` | Unknown container or non-ZIP payload |
| `container-header-truncated` | Incomplete PRD header |
| `container-version-unsupported` | Unsupported major/minor |
| `container-flags-unsupported` | Nonzero reserved flags |
| `container-length-mismatch` | Declared and actual payload lengths differ |
| `archive-size-limit` | Compressed file budget exceeded |
| `archive-entry-limit` | Member count budget exceeded |
| `archive-file-size-limit` | Declared or actual member budget exceeded |
| `archive-expanded-size-limit` | Declared or actual aggregate budget exceeded |
| `archive-member-path-invalid` | Unsafe member path |
| `archive-member-duplicate` | Duplicate or conflicting path |
| `archive-read-invalid` | ZIP decode, termination or local/central consistency failure |
| `archive-checksum-mismatch` | Decoded member bytes do not match the declared CRC-32 |
| `directory-entry-limit` | Visited directory entries exceed the traversal budget |
| `directory-file-size-limit` | Declared or actual source file exceeds its byte budget |
| `directory-total-size-limit` | Declared or actual total source bytes exceed the byte budget |
| `directory-limit-invalid` | Directory budget is not a positive safe integer |
| `directory-read-invalid` | Directory/file I/O failed or an opened entry is no longer a regular file |

The existing `archive-extension-invalid`, `package-directory-invalid`, `package-path-missing` and semantic issue codes remain in use. `PrdDirectoryError` is exported through `/node`; validation/inspection converts it into the existing error structure. Reader errors do not expose an unsupported version to the legacy parser as a fallback.

## Signing and integrity boundary

Magic bytes identify a container. Manifest validation establishes structural correctness within the current contracts. CRC-32 verifies decoded ZIP member integrity under PRD-050. None of these authenticates a publisher or protects every header/compressed representation. The container reader does not provide encryption; the existing `fflate` decoder is not a signature verifier.

The separate optional [signature-v1 extension](../extensions/PRD_SIGNATURE_V1.md), accepted in PRD-041, authenticates all logical file bytes except its own metadata using SHA-256 and Ed25519 with explicit public-key trust. ZIP metadata and this container header are excluded, so repacking between supported transports preserves logical verification. Unsigned documents remain readable. No cryptographic flag or algorithm is standardized in the container header itself.

## Acceptance and rollout

- Header vector, offset byte views, both transports, zero flags, unsupported versions, truncated/mismatched/huge lengths and invalid payloads have executable tests.
- Bounded hostile ZIP tests cover unreferenced unsafe paths, duplicates, local/central disagreement, policy limits, high-ratio expansion, forged lengths and streaming data descriptors.
- Node validation/inspection and built CLI round trips cover both forms, while existing example/snapshot tests retain default ZIP and JSON behavior.
- A public-package minor Changeset includes validator, packager and CLI. No release/version bump or default migration happens in this slice. Published npm command availability must not be claimed until the normal release path completes.
- PRD-049 covers bounded directory loading and packager policy overrides; Changesets and installed-consumer tests cover the additive public API. Directory and archive entry-count semantics are documented separately.
- PRD-050 adds bounded ZIP/ZIP64 record checks and per-member CRC verification, with a patch Changeset. Regression fixtures cover descriptors, offsets/counts/extents, unsupported flags, malformed wide fields, CRC vectors, multi-chunk data and bounded mutation/truncation. Independent Python compatibility fixtures exercise stored/DEFLATE, seekable/streamed and forced-ZIP64 writers.
- Default migration, live HTML containment acceptance under PRD-051 and deeper ZIP fuzzing remain explicit follow-up work. Optional signing is specified separately in PRD-041. Live browser checksum rejection/recovery still needs acceptance when browser access is available; library/CLI/build checks do not replace it.

## Bounded mutation checks (October 30, 2026)

Run the developer checker after its automatic validator/dependency build:

```sh
pnpm archive:mutations -- --seed 12648430 --iterations 2000 --out examples/dist/archive-mutations.json
```

The fixed corpus has eight valid archive families in both transports: stored, DEFLATE, stored/DEFLATE descriptors, small ZIP64, literal Unicode names, existing unflagged byte names and reordered central records. Fifty controls include exact-source positives and malformed UTF-8, path, entry/byte budget, forged expansion and CRC negatives. Some archive controls contain no PRD manifest; archive acceptance is separate from semantic package validity.

Seeded operators flip bits, truncate, insert/delete spans, overwrite narrow/wide fields, append bytes and generate bounded noise. Mutants can remain valid. Every case is read twice; checks require deterministic accepted-file/rejection results, unchanged input, public error classes, safe null-prototype maps, owned output buffers and returned byte/count bounds. Valid controls must retain their complete logical file set. Tests deliberately inject faulty readers to verify that the checker detects unsafe output, native exceptions, input mutation and nondeterminism.

Campaign limits are 16 KiB compressed/member bytes, 32 KiB total expanded and 16 entries, with 0–10,000 mutations allowed. The CLI uses a child with a 20-second deadline and 96 MiB JavaScript old-space setting; native/ArrayBuffer memory is not an OS sandbox. Input digests, seeds, operator IDs and failure bytes support reproduction. Successful summaries include Node/OS facts and reader/harness hashes, and a built-code change during execution fails the check. Summaries and failures are written to the requested path; the command exits nonzero on failure. Small fixed campaigns and oracle tests run in the normal test gate without timing thresholds.

Recorded [three-seed evidence](../architecture/baselines/2026-10-30-archive-mutations.json): seeds 0, 1 and 12,648,430, each with 2,000 mutations plus 50 controls, total **6,150 inputs / 12,300 reader calls**. The campaign exposed no additional unexpected reader outcomes after the filename correction. This is bounded regression coverage, not exhaustive fuzzing, full ZIP conformance, cross-engine/browser acceptance, publisher authentication or an independent security audit. Item 54 / PRD-P010 remains open for live acceptance and further hostile-input assurance.
