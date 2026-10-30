# PRD_IMPORT_EXPORT_MATRIX.md
_Last updated: October 27, 2026_
_Status: Phase 5 import/export matrix baseline v0.3_

## 1. Purpose

This document sequences PRD import and export work after the `prd init` starter command.

The goal is to define what should be implemented first, what should remain deferred, and what must not be bundled into a fake all-purpose conversion platform.

---

## 2. Matrix Principles

Import and export work should follow these rules:

- preserve PRD's structured, profile-based package model
- prefer deterministic mappings before high-fidelity visual conversion
- keep generated packages validator-valid
- report lossy mappings honestly
- avoid hidden Cloud, Studio, payment, rights, or PRDc dependencies
- keep broad conversion infrastructure out of the core format

---

## 3. Import Matrix

| Source | Target PRD profile | Priority | Current status | Notes |
| --- | --- | --- | --- | --- |
| Markdown | `general-document` | First implementation lane | Supported v0.1 | Maps ATX headings, paragraphs, lists, blockquotes, and standalone local relative images to structured content. |
| HTML | `general-document` | Phase 2 increment | Supported in repository; pending release | Static UTF-8 HTML semantics through `prd import html` (directory) or `prd convert` (archive); unsafe/unsupported content is omitted and reported. See the HTML conversion policy. |
| CBZ | `comic` | Archive conversion increment | Supported in repository; pending release | Bounded ZIP raster pages through `prd convert`; natural path order, omitted metadata and generated alt text are reported. See the CBZ conversion policy. |
| DOCX | `general-document` | Word body increment | Supported in repository; pending release | Bounded transitional Word body via `prd convert`: structural styles, simple lists/tables, bookmarks/links and declared raster images. Unsupported Word behavior is reported. |
| EPUB | `general-document` | Archive chapter increment | Supported in repository; pending release | Bounded reflowable UTF-8 XML subset through `prd convert`; spine sections, chapter links and declared raster assets. Navigation/layout/metadata losses are reported. See the EPUB policy. |
| PDF | `general-document` | Text/page fallback increment | Supported in repository; pending release | Bounded text extraction into page sections and PNG fallback for textless pages via `prd convert`. Node 22.13+ and optional PDF.js/native canvas required; reading order is uncertain and no OCR is performed. |
| Image folder | `comic` | Early visual-profile lane | Supported v0.1 | Maps ordered top-level image files to panels with generated manifest asset declarations. |
| Comic pages | `comic` | Early visual-profile lane | Supported v0.1 | Same core path as image folder, with comic-specific naming and series metadata prompts later. |
| Storyboard frames | `storyboard` | Early visual-profile lane | Supported v0.1 | Maps ordered top-level image files to frames with notes placeholders. |
| Existing PRD archive | same as source | Utility lane | Already supported indirectly | Use validation, inspection, and unpack/pack tooling later; do not treat this as conversion. |

---

## 4. Export Matrix

| Export target | Source PRD profile | Priority | Current status | Notes |
| --- | --- | --- | --- | --- |
| `.prd` archive | all valid profiles | Current executable path | Supported through `prd pack` | Canonical interchange output. |
| Unpacked package directory | all valid profiles | Current authoring path | Supported through `prd init` and manual editing | Authoring/CI form, not interchange form. |
| HTML preview | `general-document`, `comic`, `storyboard` | Later reference lane | Deferred | Should be viewer/render output, not a replacement format contract. |
| PDF export | selected profiles | Later export lane | Deferred | Useful for compatibility, but not part of current MVP executable surface. |
| Markdown export | `general-document` | Later utility lane | Deferred | Potentially lossy; should preserve basic text structure only. |
| Asset folder export | visual profiles | Later utility lane | Deferred | Useful for review/production, but not a core authoring blocker. |

---

## 5. Current Markdown Import Lane

The first real import implementation is:

```text
Markdown -> structured general-document package directory
```

Recommended command shape:

```bash
prd import markdown ./source.md --out ./my-document
```

Supported v0.1 mapping:

- document title from the first level-1 heading or source filename
- headings to structured heading nodes
- paragraphs to paragraph nodes
- unordered and ordered lists to list nodes
- block quotes to quote nodes
- images only when they can be copied into `assets/` and declared in the manifest

The first lane does not attempt full Markdown extension coverage, links-to-structured-link conversion, fenced code block conversion, HTML passthrough, PDF-like layout preservation, or Cloud-hosted asset resolution.

## 6. Current Ordered Image Import Lane

The second real import implementation is:

```text
ordered image folder -> comic or storyboard package directory
```

Command shape:

```bash
prd import images ./pages --profile comic --out ./my-comic
prd import images ./frames --profile storyboard --out ./my-board
```

Supported v0.1 mapping:

- top-level `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, and `.svg` files only
- deterministic natural filename order, so `page-2.png` sorts before `page-10.png`
- `comic` outputs `panels[]` and copies images into `assets/panels/`
- `storyboard` outputs `frames[]` and copies images into `assets/frames/`
- non-image files and nested directories are skipped with warnings
- generated assets are declared in `manifest.assets`

This lane does not attempt image processing, optimization, OCR, panel detection, frame timing, series metadata prompts, hosted fetches, Cloud conversion, or visual editing.

## 7. Current Hosted Viewer Demo Lane

The current public-product implementation is the hosted PRD Home page, public docs index, and reference web viewer demo that demonstrates the now-real authoring loop:

```text
init/import -> validate -> inspect -> pack -> open in the reference viewer
```

That keeps the product story focused on usable PRD creation before adding broad conversion. The web demo separates `/` Home, `/viewer/` workspace, and `/docs/` public docs navigation. It can load generated hosted sample archives, but those samples are demo assets only and do not change PRD's packaged-first, eager whole-package reference loading baseline.

The next public-product lane should deploy and launch-QA the hosted demo through Cloudflare Workers Static Assets at `prd.eonhive.com`, keep GitHub Pages as staging/fallback until that passes, and then choose the next viewer/product polish step. Hosting does not add a server-side conversion or upload lane.

---

## 8. Deferred Work

Deferred work includes:

- full visual Studio
- hosted conversion jobs
- DOCX/PDF/EPUB fidelity guarantees
- batch import pipelines
- collaborative authoring
- paid/pro conversion tiers
- PRDc archive workflows
- rights, payment, crypto, or protected-content conversion behavior

These may become product or extension lanes later, but they should not block the first public authoring path.


## 9. PRD Convert Phase 1

The repository now also supports `prd convert ./source.md --out ./converted.prd`. It uses a registered Markdown adapter, shared canonical normalized roots and the existing validator/packager. The older `prd import markdown` directory workflow remains compatible. See [the architecture record](../architecture/PRD_CONVERT_PHASE_1.md) for the verified inventory, limits and preservation policy.

The new lane supports adaptive `general-document` output and standalone PNG/JPEG/GIF/WebP resources with matching signatures. SVG requires a future safety policy; the legacy import command retains its existing SVG behavior. Both the original source (unless explicitly disabled) and a JSON quality report are declared attachments. Semantic fidelity is partial and visual layout is not preserved. Unsupported/inaccessible images are warned; source Markdown cannot preserve missing image bytes. This describes the original Phase 1 scope. Subsequent HTML and CBZ increments are recorded below; faithful/hybrid conversion, PDF/XLSX/PPTX adapters, conversion UI and executable spreadsheet behavior remain deferred.


## 10. HTML conversion increment

`prd convert ./source.html --out ./converted.prd` now uses an optional, lazily loaded HTML parser and reconstructs canonical headings, prose, flat lists, quotes, links, simple tables and local raster images. It retains original HTML as an inert attachment and reports active/embedded content, CSS/layout, unsupported links and lossy mappings. It does not use HTML fallback rendering. See [HTML policy and mapping](../architecture/PRD_CONVERT_HTML.md) and [the real example](../../examples/conversion-html/README.md). This advanced Phase 2; the later DOCX increment is recorded below.


## 11. Shared importer output and HTML directories

`prd import html ./source.html --out ./my-document` now produces a validator-valid package directory using the existing HTML adapter and shared CLI output helpers. Markdown/image output bytes, JSON, resource declarations, warning behavior and ordering remain compatible. HTML directory output contains canonical JSON, safe local raster assets and a declared `prd-import-report-v1` diagnostic attachment, with no raw source HTML. Existing `prd convert` behavior remains available. See [PRD-042's mapping and report details](../architecture/PRD_CONVERT_HTML.md#directory-workflow-and-shared-output-prd-042).

The revised sequence selects EPUB/CBZ before DOCX. CBZ and EPUB are now implemented as recorded below; DOCX is implemented in the subsequent increment below; **PDF is implemented under its bounded policy below**; conversion web UI follows and later Office/advanced lanes. Recipes, repair queue, richer source-location provenance and remote processing remain future product work.

## 12. CBZ archive increment

`prd convert ./sample-comic.cbz --out ./comic.prd` now reconstructs whole-page canonical comic panels from bounded raster ZIP members, without filesystem extraction or another ZIP implementation. Source and quality attachments use the existing conversion report contract. Reading order, generated alternative text and omitted metadata are explicit warnings. See [CBZ mapping and limits](../architecture/PRD_CONVERT_CBZ.md) and [the real example](../../examples/conversion-cbz/README.md). Existing Markdown/image/HTML workflows remain compatible. This is repository functionality pending release.

## 13. EPUB chapter increment

`prd convert ./book.epub --out ./book.prd` now reconstructs canonical chapter sections in spine order through bounded XML and the existing HTML extractor. It maps same-book anchors, collects declared raster members and retains original source/report attachments by default. DTDs, encryption, recognized fixed layouts and unsafe/unsupported spine relationships fail explicitly. No original navigation hierarchy or layout-equivalence claim is made. See [EPUB policy](../architecture/PRD_CONVERT_EPUB.md) and [the actual source/archive/report](../../examples/conversion-epub/README.md). DOCX is now implemented in the next recorded increment; release onboarding remains open.

## 14. DOCX body increment

`prd convert ./source.docx --out ./document.prd` now maps a bounded transitional WordprocessingML body to canonical content through OPC relationship checks, shared XML parsing, resource collection and existing validation/packaging. It includes heading style inheritance, simple lists/tables, bookmarks/safe links and embedded raster assets. Original source and factual quality diagnostics are declared attachments. Word pagination, full styling/visibility, notes, fields, equations and embedded-object behavior are not reproduced. See [DOCX mapping and limits](../architecture/PRD_CONVERT_DOCX.md) and [the real Word example](../../examples/conversion-docx/README.md). Automated Viewer opening and October 28 local browser interaction acceptance pass. The PDF increment is documented below.

## 15. PDF extraction and fallback increment

`prd convert ./source.pdf --out ./pages.prd` produces page sections, extraction-order line paragraphs and bounded PNG fallback for textless pages. It shares canonical content, resources, validator and packager. Original source/report attachments are declared by default. Optional PDF.js/native canvas loads only in a separate Node process; Node.js 22.13+ is required for this format. Encrypted PDFs are refused. Reading order, text-page graphics, layout/semantic omissions and no-OCR fallbacks are explicit diagnostics. See [PDF policy](../architecture/PRD_CONVERT_PDF.md) and [the actual example](../../examples/conversion-pdf/README.md). Existing Viewer opening and local browser acceptance pass. Convert Web now supports local Markdown as recorded below; public release onboarding remains open.

## 16. Browser Markdown conversion increment

The `/convert/` web route now completes real local Markdown → shared canonical assembly → validator → memory packager → download → existing Viewer. The initial browser increment enables Markdown and explicitly selected raster resources; the later HTML increment is recorded below. The Node adapter matrix above does not imply browser support for the other formats. Existing quality/source-retention contracts remain, including omitted/missing resource warnings. See [Convert Web policy](../architecture/PRD_CONVERT_WEB.md) and [the browser-downloaded example](../../examples/conversion-web/README.md). HTML is now supported under the browser parser/worker policy below. Publication and production deployment remain open.

## 17. Browser HTML and workspace increment — October 29, 2026

`convertInBrowser` adds static UTF-8 `.html`/`.htm` alongside Markdown with the same HTML extraction, bounded optional parsing, explicit raster resources, manifest/report and packager authority as Node. The Markdown-only browser export stays compatible. The web worker is emitted as ES modules with lazy HTML/parser chunks. See [exact browser policy](../architecture/PRD_CONVERT_WEB_HTML.md) and [actual HTML output](../../examples/conversion-web/html/README.md).

The reference-inspired workspace exposes browse/single-source drop, actual options and quality/assets/plain-source review. PSD/AI/layer/batch/history capabilities are not inferred from the mockup. Live browser acceptance and deployment remain pending; Node/browser-entry parity and both-transport Viewer opening are automated.

## 18. Browser CBZ increment — October 29, 2026

`convertInBrowser` and `/convert/` now accept bounded `.cbz` ZIP image archives and select `comic`. They share the existing adapter, archive checks/limits, canonical assembly and packager. The browser takes pages from the archive, shows factual page/resource counts and offers natural or reversed filename sequence. Binary source is never decoded into text preview. Shared additive `comicPageOrder` preserves page IDs/assets and default output; it does not encode manga direction or add CLI flags. See [browser CBZ policy](../architecture/PRD_CONVERT_WEB_CBZ.md) and [actual browser-entry output](../../examples/conversion-web/cbz/README.md). Fresh live interaction acceptance, release and deployment remain pending.

## 19. Comic page-order review — October 29, 2026

The same workspace offers filename move/reset/apply for completed CBZ conversions. Shared Node/browser `comicPageIds` supplies a complete, snapshotted source-ID permutation instead of filename order. The web session retains its selected File/settings and reruns the existing pipeline; every imported page/image is retained, explicit review is reported, and failed/cancelled repair keeps the previous output. Source packaging opt-out still applies; session memory is separate. See [repair policy](../architecture/PRD_CONVERT_PAGE_REVIEW.md) and [actual reviewed output](../../examples/conversion-web/cbz-review/README.md). CLI/report/default-output contracts and canonical schemas are unchanged. Live interaction acceptance remains pending.

## 20. Supplied comic descriptions and drafts — October 29, 2026

Shared `comicPageDescriptions` accepts bounded plain text for selected source page IDs, mapping to existing canonical `alt` and preserving all IDs/images/order. Defaults and CLI/report contracts remain unchanged. Web **Apply review** submits current order and provided/changed text through the existing pipeline; order-only review retains applied descriptions. Unapplied drafts survive Viewer return in session memory and never enter current downloads. Source packaging is independent. See [policy/limits](../architecture/PRD_CONVERT_COMIC_DESCRIPTIONS.md) and [actual described output](../../examples/conversion-web/comic-descriptions/README.md). Reports state supplied/remaining filename-derived counts with accuracy unassessed. Native source selection was observed; full live UI acceptance remains open after browser access stopped.

## 21. Quality diagnostic review — October 29, 2026

Convert Web now exposes existing warning codes, conversion stages/source references and distinct package-validator severities/paths. Category and literal text filters search every report row before the 50-match display limit, with visible/matching/total counts and the unchanged full JSON download. No source format, public/report contract, package bytes or fidelity claim changes. See [quality-review policy](../architecture/PRD_CONVERT_QUALITY_REVIEW.md). Actual Markdown/HTML/CBZ report rendering and both-transport Viewer integration are automated evidence; fresh live filtering and earlier workspace acceptance remain open.
