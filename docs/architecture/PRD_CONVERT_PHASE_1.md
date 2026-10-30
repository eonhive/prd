# PRD Convert — Phase 1 inventory and architecture record

_October 27, 2026. Status: implemented reference pipeline; pending public release._

## Source-verified inventory at the start of Phase 1

This inventory describes the current checkout, including pre-existing uncommitted container, signature and Viewer work. It is not an assertion about deployed or published versions.

| Existing source | Verified responsibility | Reuse in Convert |
| --- | --- | --- |
| `packages/prd-types/src/index.ts` | `PrdManifest`, assets/attachments, `PrdGeneralDocumentRoot`, `PrdComicRoot`, `PrdStoryboardRoot`, canonical profile IDs | Authoritative content and manifest contracts |
| `schemas/content.schema.json`, `schemas/manifest.schema.json` | Structured roots and manifest schema | No schema changes |
| `packages/prd-validator/src/index.ts` | `validatePackageFiles`, content shape, unique IDs, declared resource and attachment checks | Validate generated logical files before packaging |
| `packages/prd-validator/src/container.ts` | ZIP/envelope identification, bounded decoding and member-path checks | Existing packager checks output through this reader |
| `packages/prd-packager/src/index.ts` | `packDirectoryToBuffer`, validation and packaging from one directory snapshot | Package a private converter-owned snapshot |
| `packages/prd-cli/src/importMarkdown.ts` | Existing subset parser, local image resolver and unpacked package writer | Move parser into converter; retain legacy command, result shape, warnings and image behavior |
| `packages/prd-cli/src/importImages.ts` | Ordered image-folder import for comic/storyboard | Retain existing command; migration into adapters is deferred |
| `packages/prd-cli/src/init.ts`, `index.ts`, `signature.ts` | Scaffold, import, pack, validate, inspect, sign and verify | Add a separate `convert` command without changing existing command contracts |
| `packages/prd-viewer-core/src/index.ts` | `openPrdDocument`, three canonical roots and support-state classification | Open converted structured roots unchanged |
| `apps/prd-viewer-web/src/App.tsx`, `viewerPackageVerification.ts` | Bounded archive read, validation, signature status, structured rendering and declared file downloads | Existing browser file chooser and rendering path |
| CLI, validator, packager, Viewer and runtime-conformance tests | Legacy command snapshots, invalid packages, containers, signatures and supported example paths | Regression coverage plus converter and real-CLI tests |

Before this change, there was no shared adapter registry or conversion intermediate representation. Importers directly constructed manifests and wrote package directories. The existing canonical semantic root types already describe the normalized document model; a second AST or manifest system is unnecessary. HTML-backed opens are legacy fallback rendering, not an HTML import adapter. Signing is independent of conversion and generated packages are unsigned.

Reviewed canon includes the foundation, decisions, glossary, roadmap, system architecture/blueprint, three profile specifications, asset/attachment rules, container contract, runtime capabilities/CLI contract, product boundaries and authoring/import matrix. Historical proposals do not override those contracts.

## Decision and alternatives

PRD Convert is the ingestion product boundary. It reconstructs existing content into PRD's semantic model; Studio owns authoring and editing. Product boundaries do not require separate deployed services. See proposed ecosystem decision [PRD-P015](../decisions/PRD_DECISIONS.md#prd-p015--prd-convert-as-a-first-class-ingestion-product).

Implement one `@eonhive/prd-converter` package, consumed by the CLI. Keep source adapters inside it. Separate format-engine packages and a new renderer would add boundaries without demonstrated need. Keeping all conversion inside the CLI would make reuse harder; replacing the existing parser would duplicate working functionality and risk legacy behavior.

The converter-owned `ImportResult` carries canonical profile content without a manifest, an optional title and extraction warnings. `PrdNormalizedContent` is a union of existing canonical roots, not a new serialized wire model. The adapter cannot write files or supply manifests. The orchestrator supplies a bounded source-relative image resolver. Adapters are trusted local code, not sandboxed plugins; resource safety applies to adapters using that resolver.

## Five-stage pipeline

1. **Ingest:** snapshot a regular source file within a byte budget. Detect one unambiguous adapter. Markdown requires `.md`/`.markdown`, valid UTF-8 and textual content; known binary/archive/HTML signatures are rejected. Markdown has no definitive magic bytes, so detection is deliberately conservative rather than claiming perfect classification.
2. **Extract:** reuse the existing subset parser. Map ATX headings, paragraphs, flat lists, quotes and standalone local raster images. Flatten supported inline emphasis/code syntax to text in the new path. Legacy paragraph extraction remains unchanged.
3. **Normalize:** wrap extracted content in the existing canonical root and assign deterministic reading-order IDs to nodes without IDs. Preserve source order; cap node count and nesting. Resource references map to collected, deduplicated manifest asset IDs.
4. **Adapt:** infer the extracted canonical family or honor a compatible explicit override. Reject incompatible overrides. Only `adaptive` is implemented; faithful/hybrid are deferred. Markdown emits `general-document`, not comic/storyboard guesses.
5. **Validate and package:** generate the normal `PrdManifest`, declare every asset/attachment, validate the logical file map, then call the existing packager on a private staging directory. Publish complete archive bytes exclusively via a same-filesystem hard link; an existing destination is never overwritten. Always clean staging directories.

The core package, Viewer, validator, packager and existing public APIs are unchanged. The CLI receives an additive command and runtime dependency. Logical output is deterministic for identical input bytes/resources/options; ZIP timestamps remain the existing packager's behavior, so byte-identical archives are not promised. Default identity hashes source bytes only and does not authenticate or identify every resource revision; callers can supply an explicit package ID.

## Information preservation and quality

Every successful new conversion includes a declared `attachments/conversion-quality.json`. It records format, chosen profile/strategy, partial semantic fidelity, unpreserved visual layout, source retention, resource mapping, warning codes/stages and validator warnings. No numeric fidelity score implies an accuracy guarantee.

By default, the exact source bytes are included as a declared attachment under `attachments/source.md` (or the original safe suffix). They are not interpreted as HTML or executable code. `--no-source` explicitly disables retention and adds a warning. Code/HTML can be omitted from the reading view but remain in the source attachment. A subset warning covers unsupported syntax, including links/tables/nested lists that may survive as literal text without equivalent structure. Resource omission gets a separate warning. Missing or blocked image bytes cannot be preserved by retaining Markdown alone; the report does not claim otherwise. Empty/all-unsupported documents fail instead of manufacturing a successful title-only conversion.

New-path resources are PNG/JPEG/GIF/WebP with matching signatures. This is signature screening, not a complete image decoder or pixel-dimension limit. SVG is deferred to a separately specified sanitization/resource policy. The existing `import markdown` SVG behavior is preserved for compatibility; its old I/O path does not acquire the new converter safety guarantees.

## Limits and filesystem boundary

| Converter policy | Default |
| --- | ---: |
| Source bytes | 4 MiB |
| One resource | 8 MiB |
| Collected resource bytes | 24 MiB |
| Collected resources | 128 |
| Content nodes / resource-reference attempts | 20,000 |
| Nested content depth | 64 |

Positive safe-integer overrides are available through the library. Resource limits omit the affected image with a warning; input/content limits fail conversion. Final output must also pass the existing packager/archive reader limits. Phase 1 accepts no input archives and performs no input archive decompression. Renamed ZIP/Office/CBZ inputs are rejected; future archive adapters must reuse bounded archive handling rather than unrestricted extraction.

Resources must resolve inside the real source directory. Reject absolute, URL, drive, backslash, control-character, traversal and escaping symlink references. Read file descriptors with no-follow/nonblocking flags, check regular-file type and both pre/post-read bounds, and reject mutation during the snapshot. Reports avoid absolute filesystem error paths. These checks do not provide a sandbox against another process concurrently replacing ancestor directories or a plugin executing arbitrary code. Output requires an existing parent directory and hard-link support on its filesystem.

## Verification and follow-up

The converter suite exercises detection, malicious paths/symlinks, invalid UTF-8, disguised archives/binaries, malformed resources, budgets, profile/strategy rejection, IDs, content order, deduplication, source retention, invalid adapter output and overwrite prevention. Built CLI tests convert/validate/inspect real archives. `scripts/converter-viewer.integration.test.ts` opens both transports through the web Viewer's existing `openViewerPackage` path and asserts fully supported structured content.

The example under `examples/conversion-markdown/` includes a real source, raster resource, generated archive and extracted quality report. Browser acceptance and final validation results are recorded in `BUILD_STATUS.md`.

Next adapters are HTML/DOCX only after their extraction/safety policies are specified. EPUB/CBZ, PDF, web conversion UI, Office semantics, OCR, batch work and bidirectional export remain later phases. Coordinate the new converter package and CLI dependency through existing release governance before publishing; this task performs no release, deployment or registry changes.


## Subsequent HTML increment

The later October 27 [HTML implementation increment](PRD_CONVERT_HTML.md) adds a second adapter through this same pipeline and updates the default registry. The Phase 1 inventory above records the initial Markdown scope; that increment established Markdown plus static UTF-8 HTML support; the subsequent CBZ increment is recorded below. DOCX and remaining formats/UI are still deferred.


## Subsequent shared-output continuation

PRD-042 and [the HTML directory workflow](PRD_CONVERT_HTML.md#directory-workflow-and-shared-output-prd-042) record the later consolidation. `prd-cli/src/importPackage.ts` now owns the reused Markdown/image manifest-content serializer and directory writes. `importHtml.ts` uses the existing converter's new `prepareConversion` seam, declares a separately versioned import report and writes through that helper. This current ownership supersedes the earlier importer-owned writing noted in the initial inventory above; no additional package or semantic model was introduced.

## Subsequent CBZ continuation

PRD-043 and [the CBZ policy](PRD_CONVERT_CBZ.md) add a third default adapter, using the existing bounded archive reader and resource collector for whole-page canonical comic content. Shared image-order/title helpers also serve the legacy image importer without changing its output. Current source formats are Markdown, HTML, CBZ, the [bounded EPUB increment](PRD_CONVERT_EPUB.md), the [bounded DOCX increment](PRD_CONVERT_DOCX.md) and the [bounded PDF increment](PRD_CONVERT_PDF.md). CBZ introduced no new dependency; PDF adds optional isolated PDF.js/native canvas import dependencies. No new PRD schema or rendering engine is introduced; later product lanes remain deferred.

## PDF continuation — October 28, 2026

PRD-047 and [PDF policy](PRD_CONVERT_PDF.md) add bounded extraction-order text paragraphs in canonical page sections and raster fallback for textless pages. A separate Node import process isolates optional PDF.js/native canvas support and enforces a deadline plus count/byte/pixel limits. This leaves the PRD schema, validator/packager authority, report contract and existing Viewer unchanged. The actual mixed-page example passes CLI, both-transport Viewer opening, security/lifecycle and local browser checks. Convert Web follows as a separately scoped product increment; OCR, faithful/hybrid output, Office execution and release onboarding remain separate.

## Convert Web continuation — October 28, 2026

PRD-048 and [the browser execution policy](PRD_CONVERT_WEB.md) add local Markdown conversion at `/convert/` inside the existing app. Shared `assembly.ts`, limits and raster screening preserve Node logical output; new explicit browser exports for converter and packager avoid filesystem/subprocess imports. The packager's directory and memory paths share one validation/ZIP/envelope writer. A cancellable/deadline-limited worker supplies real report/download actions and a handoff to the existing Viewer. Node adapters/public contracts remain unchanged. The actual browser-downloaded example and both-transport parity/opening tests prove the path. Earlier inventory/staging notes above describe Phase 1; browser byte selections and memory packaging are now an additional environment boundary.
