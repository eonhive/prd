# PRD Convert — bounded PDF extraction and page fallback

_October 28, 2026. Implemented in the repository; pending release. Decision: PRD-047._

This increment adds one PDF adapter to the existing converter. It maps extracted text and textless-page images to canonical `general-document` sections, then reuses resource collection, the validator, packager and existing Viewer. PDF.js is an optional import dependency; it does not become a PRD rendering engine or a browser Viewer dependency.

## Usage and supported result

```sh
prd convert ./source.pdf --out ./document.prd --json
prd validate ./document.prd --json
```

Use the repository-built CLI until release onboarding is complete. PDF conversion requires Node.js 22.13+ and installed optional `pdfjs-dist@6.4.299` / working `@napi-rs/canvas@1.0.10` native support. Other adapters retain their existing requirements and do not load these libraries. Missing PDF support produces a PDF-specific error. No `import pdf` directory command, password interface or new CLI limit flags are introduced.

Detection requires a `.pdf` name and a PDF 1.0–1.7 or 2.0 opening signature at byte zero. A final EOF marker is required. PDF.js then parses actual structure. It may recover malformed content with diagnostics; successful parsing is not full PDF conformance validation. All encrypted sources are refused, including sources with an empty user password. Compatible profile, title/ID, source-retention and existing ZIP/envelope options work through the shared pipeline; only adaptive conversion is supported.

| Source | Canonical output |
| --- | --- |
| PDF title | Root title, capped at 512 characters with a truncation warning; filename is the fallback |
| Each source page | Ordered section with stable `pdf-page-N` ID and `Page N` title |
| Extractable text | Responsive paragraph nodes grouped by extraction order, end-of-line markers and vertical proximity |
| Textless page, including a blank page | Bounded PNG page image with a generic label and explicit no-OCR warning |
| Original PDF | Exact bytes in a declared opaque attachment by default |

Text is not sorted into an invented logical order. Headings, columns, lists, table relationships, footnotes and semantic roles are not inferred. Gaps between extracted runs can become spaces; control characters become visible replacement characters and warn. Rotated, vertical or non-left-to-right runs receive a layout-review warning. Text that PDF.js does not expose cannot be reconstructed by this adapter.

Non-text illustrations on text-bearing pages are not separately copied into canonical content; they remain only in retained source. A page containing some text is not proof that all visible text or illustrations were captured. Scans with an existing OCR layer may use that imperfect layer. The fallback performs no OCR or authored image description and is a raster approximation rather than preservation of every original visual property. Fonts/codecs/annotations can differ. Inspect the result before distribution.

## Isolation, budgets and failure behavior

The parent sends a bounded byte snapshot to a separate Node process. It accepts a complete result only after clean process shutdown. Deadline, abnormal exit, invalid response and excessive diagnostic output reject conversion before output publication. Existing no-overwrite/private-staging behavior remains authoritative.

| Bound | PDF reference policy |
| --- | --- |
| Parent deadline | 20 seconds, including dependency loading and extraction |
| JavaScript old-space heap | 128 MiB in the child |
| Page count | At most 64 and no more than configured resource/node count limits |
| Page geometry at scale 1 | Each dimension at most 8,192; area at most 16,000,000 pixels |
| Embedded raster parser limit during fallback rendering | 4,000,000 pixels per image |
| Generated page raster | At most 2,000,000 pixels; also bounded by per-resource RGBA budget |
| Extracted text | At most 8 MiB, additionally bounded by total resource byte limit |
| Installed auxiliary file | At most 8 MiB each |
| Child stdout/stderr | 64 KiB total |

Existing defaults remain 4 MiB source, 8 MiB per resource, 24 MiB combined resources, 128 resources and 20,000 output nodes. Extracted item count is also bounded by `maxNodes`. Positive library limit overrides cannot relax the fixed PDF caps. PNG output still obeys per-resource/aggregate byte limits. Raster scale never exceeds 1.5; dimensions are rounded down.

The heap flag does **not** cap native allocations or total process RSS. Process isolation, pixel/count/byte caps and a kill deadline are not an OS sandbox or a guarantee against every malicious PDF. Native canvas and parser behavior remains a dependency risk. Larger-file/worker-pool/OS-isolation policies need separate work; these are reference converter limits, not PRD format limits.

Document JavaScript/actions are never invoked, XFA is disabled, annotations/widgets are excluded from page rendering, and no source URL is passed to PDF.js. Fetch is denied. Font/CMap data may only be read by a restricted factory from real paths under installed PDF.js data directories; document paths cannot select arbitrary filesystem files. System-font lookup, WASM and GPU/image-decoder acceleration are disabled in this path. No external link, embedded file, remote script or source relationship is followed.

PDF.js 6 can return an empty operator list in strict mode after some image errors. The adapter therefore uses observable parser recovery diagnostics and rejects raster fallback whenever that page emitted a diagnostic during extraction/rendering. The oversized-image regression test exercises this case. Text-bearing recovered pages retain diagnostics in the report; they are not represented as lossless conversions. Unsupported content can fail even if another PDF reader opens it.

## Quality and provenance

The existing `reportVersion: "1.0"` and CLI JSON contracts are unchanged. Counts and resource mappings come from generated content. Warnings always identify uncertain reading order and the supported subset, with page references for actual image fallbacks, repaired text and layout review. Parser diagnostic counts are factual; raw paths and arbitrary source snippets are not exported. Semantic fidelity remains `partial`; visual fidelity remains `not-preserved`. Structural validation does not measure reading quality or source fidelity, and no confidence percentage is invented.

Links, annotations, forms, scripts, embedded attachments and metadata beyond title are not reconstructed. Source bytes and quality JSON are declared attachments by default; `--no-source` explicitly opts out and warns. Retained PDFs can contain private metadata, active content or other original material. Opaque retention is not sanitization, redaction or authenticity verification. Reports use generated page/resource references rather than absolute workstation paths.

## Evidence and follow-up

The [real mixed PDF example](../../examples/conversion-pdf/README.md) contains an extractable first page and an image-only second page. Its actual PRD has 14 nodes, one PNG and exact original/report attachments. Both existing transports pass validator and Viewer-opening tests. Local browser acceptance verifies responsive text, decoded fallback, outline navigation, byte-exact attachments and clean warning/error logs. Source pages and generated fallback were also rendered and visually inspected.

Tests cover malformed/truncated/disguised inputs, encrypted and empty-password sources, input/page/geometry/text/raster limits, oversized source images, deterministic semantics, incompatible profiles, inactive document actions and process deadline/exit/diagnostic/protocol failures. Installed-tarball checks cover the child runtime and isolated optional dependencies. The implementation follows [Mozilla's API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html) and [Node rendering example](https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/pdf2png.mjs), reviewed against pinned version 6.4.299.

Convert Web is the next product increment after the completed adapter sequence, with real local conversion, preview, quality review and download. It needs its own browser execution/dependency policy; this Node child process is not a browser worker. OCR, faithful/hybrid page preservation, semantic layout reconstruction, Office execution, cloud conversion and public release remain separate work.
