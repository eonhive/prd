# @eonhive/prd-converter

PRD Convert's Node.js foundation and explicit browser entry for Markdown, HTML and bounded CBZ comics. Reuses `prd-types`, `prd-validator` and `prd-packager`. Implemented in the repository; not yet published.

```ts
import { convertFileToPrd } from "@eonhive/prd-converter";

const { report } = await convertFileToPrd({
  sourcePath: "./source.md",
  outputPath: "./converted.prd",
  profile: "auto",
  strategy: "adaptive"
});
console.log(report.warnings);
```

`convertDocument(options)` returns `{ archive, document, report }` without publishing a file. `convertFileToPrd` also writes the completed archive without overwriting existing files. The output parent directory must exist and support hard links. `title`, `id`, `container: "zip" | "prd"`, `preserveSource`, positive `limits` overrides and a custom `registry` are optional. Default transport remains ZIP.

`createDefaultImportRegistry()` registers Markdown, HTML, CBZ, EPUB, DOCX and PDF. `ImportAdapterRegistry.register` rejects duplicate IDs; `detect` rejects unsupported/ambiguous inputs. `ImportAdapter` provides `id`, `detect(source)` and `import(source, context)`. Adapters return canonical profile content, title and warnings; the converter owns root normalization, resources, manifest construction, validation and packaging. Use `context.resolveImage` for bounded local raster reads. The optional `context.collectImage` callback collects bounded in-memory archive images through the same resource map. Adapters are trusted code.

Phase 1 supports a Markdown subset and adaptive `general-document` output. Compatible explicit profiles are honored; incompatible profiles and unimplemented strategies fail. The original source and versioned JSON quality report are declared attachments. Retention opt-out is explicit and warned. Read [the architecture record](../../docs/architecture/PRD_CONVERT_PHASE_1.md) for safety limits, fidelity behavior, legacy boundaries, source inventory and deferred work.

The `./markdown` export contains the shared parser used by the legacy CLI importer. It intentionally does no filesystem reading or manifest construction.


## HTML import increment

The same API also accepts `.html`/`.htm` UTF-8 source. `htmlAdapter` maps static semantic content into `general-document`, reuses bounded raster collection and reports unsafe/unsupported structures. The optional `parse5` dependency is loaded only for HTML import; missing it does not prevent Markdown conversion. Use the normal installation with optional dependencies and Node.js 20.19+ to enable HTML. Original HTML is retained as a declared `application/octet-stream` attachment and is never used as the reading entry. See [the exact mapping, parser limits and safety policy](../../docs/architecture/PRD_CONVERT_HTML.md).


## Preparing a validated directory snapshot

`prepareConversion(options)` returns `{ files, manifest, document, report, validation }` after the existing detection/extraction/normalization/validation stages, without creating a ZIP. The CLI's `import html` wrapper uses this seam and its shared directory writer. `convertDocument` uses the same preparation stage before calling the existing packager; its result and report contracts are unchanged. See [PRD-042 and the HTML directory workflow](../../docs/architecture/PRD_CONVERT_HTML.md#directory-workflow-and-shared-output-prd-042).

## CBZ comic import

The same API accepts plain ZIP `.cbz` sources and selects `comic`. `cbzAdapter` reuses the existing bounded archive reader without disk extraction, orders supported raster members naturally, and emits whole-page canonical panels. Reports warn about inferred order, filename alternative text and omitted metadata. Default source retention preserves the exact original archive. Only `adaptive` is supported; incompatible profiles fail.

The `./image-sequence` export shares natural filename comparison and filename-derived titles with the legacy image-folder importer. Its existing ordering/output contracts are preserved. CBZ adds a deterministic tie-break for equivalent names. No optional HTML parser is needed. See [CBZ limits, mapping and fidelity](../../docs/architecture/PRD_CONVERT_CBZ.md) and [the real example](../../examples/conversion-cbz/README.md). Defaults include a 4 MiB source and 128 archive-entry cap; library `limits` overrides are available, while CLI limit flags remain unimplemented.

## EPUB chapter import

The same API accepts `.epub` sources and selects `general-document`. `epubAdapter` reads bounded container/OPF/XHTML XML with optional, lazily loaded `saxes`, then reuses the existing HTML semantic extractor. It preserves spine order as canonical chapter sections, maps chapter/fragment links, shares declared raster assets and reports unsupported navigation/styles/metadata. Matching opening headings become section titles with their anchors retained.

Only a reflowable UTF-8 XML subset is supported. DTDs/custom entities, encryption/obfuscation, recognized fixed layouts, unsafe relationships and foreign spine fallbacks fail explicitly. EPUB needs `saxes@^6.0.0`, not `parse5`; missing XML parsing does not block Markdown, HTML or CBZ. Source/report retention and existing limits/CLI contracts are unchanged. See [EPUB policy](../../docs/architecture/PRD_CONVERT_EPUB.md) and [the real book example](../../examples/conversion-epub/README.md). The DOCX increment below now has a separate ZIP/XML/relationships policy.

## DOCX body import

The same API accepts a bounded transitional `.docx` subset and selects `general-document`. `docxAdapter` resolves OPC content types/relationships, then maps inherited outline headings, paragraphs, simple lists, tables, bookmark/hyperlinks and declared raster images. It shares the existing optional XML parser and resource/validator/packager pipeline. No additional dependency is needed; `parse5` is not required.

Word's shared style definitions use a cumulative XML-work allowance of twice `maxNodes` (40,000 by default); output nodes still use 20,000 and existing archive budgets remain unchanged. DTDs, unsafe/ambiguous relationships, cyclic styles, recognized macros and unsupported encodings fail. Layout, headers/footers, notes/comments, equations, field execution and full Word styling/visibility semantics are not reproduced and are reported. Original source/report retention and public contracts are unchanged. See [DOCX policy](../../docs/architecture/PRD_CONVERT_DOCX.md) and [the real Word example](../../examples/conversion-docx/README.md). Local browser acceptance completed on October 28: lists/table/image, bookmark navigation and exact source/report retrieval passed.

## PDF text and page fallback

The same API accepts `.pdf` sources and selects `general-document`. `pdfAdapter` maps extraction-order text to page sections and line paragraphs, with PNG fallback for textless pages. It requires Node.js 22.13+ and pinned optional `pdfjs-dist@6.4.299` / working `@napi-rs/canvas@1.0.10`; dependencies load only in a separate PDF child process. Other adapters do not require them. Encrypted sources, including empty-password encryption, are refused.

The PDF process has a 20-second deadline, a 128 MiB JavaScript heap setting and fixed page/pixel/text caps in addition to existing source/resource/node limits. This is not a total native-memory cap or OS sandbox. No source script/action, XFA, annotation widget or remote retrieval is activated. Reading order and semantics require review; text-page illustrations remain only in retained source, and image-only pages receive no OCR. Existing API/report/CLI contracts and PRD rendering stay unchanged. See [PDF policy](../../docs/architecture/PRD_CONVERT_PDF.md) and [the real mixed-page example](../../examples/conversion-pdf/README.md). The local Markdown Convert Web increment is documented below; publication remains pending.

## Browser Markdown entry

```ts
import { convertMarkdownInBrowser } from "@eonhive/prd-converter/browser";

const result = await convertMarkdownInBrowser({
  source: { name: "article.md", bytes: markdownBytes },
  resources: [{ name: "flow.png", bytes: imageBytes }],
  preserveSource: true,
  profile: "auto"
});
```

Use this export for browser code; the root export retains Node filesystem/subprocess adapters. The browser entry registers only the existing Markdown adapter and shares canonical `assembly.ts`, limits, raster screening, validation and the packager memory path. It requires secure-context Web Crypto; run expensive work in a worker as the web app does. Selected byte arrays are snapshotted. Relative explicit resources only, no automatic filesystem/network retrieval; missing/unused resources warn. Reference byte/count/node limits can be tightened, not raised. Result/report and logical files match Node conversion for the same Markdown/resources/options; no ZIP timestamp equality is promised.

The web app now has a real `/convert/` workflow with source/images, optional title, profile/source-retention settings, worker cancellation/deadline, actual quality report, PRD download and existing Viewer handoff. See [browser boundary and safety policy](../../docs/architecture/PRD_CONVERT_WEB.md) and [the actual browser-downloaded example](../../examples/conversion-web/README.md). Other browser formats and public deployment remain separate work.

## Browser HTML and generic dispatch

`convertInBrowser(options)` accepts the existing browser options and detects Markdown, static UTF-8 `.html`/`.htm`, or plain ZIP `.cbz` sources. The original `convertMarkdownInBrowser` stays Markdown-only. HTML lazily loads the existing bounded adapter and optional parse5 parser, then shares the same selected-resource collector, assembly, validator and packager. CBZ lazily loads the existing comic adapter and collects bounded archive members. No new manifest/schema/renderer or source network access is introduced. Distribute the generated ES worker/adapter/parser chunks for browser use; Node HTML dependency behavior remains unchanged.

The web workspace now supports HTML/Markdown browsing, one-source drag/drop, removable selected files, real options and quality/assets/plain-source views based on the owner's reference. It has no PSD/AI/layer/history capability. See [HTML browser/workspace policy](../../docs/architecture/PRD_CONVERT_WEB_HTML.md) and [actual browser-entry HTML output](../../examples/conversion-web/html/README.md). Live browser interaction review is pending because automation is disabled; build/API/Viewer checks are separate evidence.

### Browser CBZ continuation

`convertInBrowser({ source: { name: "comic.cbz", bytes }, profile: "comic", comicPageOrder: "reverse" })` imports pages from the archive itself; do not supply `resources` for CBZ. Defaults remain 4 MiB compressed / 8 MiB member / 24 MiB expanded / 128 entries, including ignored members. Browser limits can only tighten. No HTML/XML/PDF dependency is needed for CBZ.

`comicPageOrder` is additive on both Node and browser settings: omitted/`"natural"` preserves existing output, while `"reverse"` reverses the panel sequence and reports it. IDs and asset mappings stay attached to the same source page; the setting applies only to comics and does not encode manga direction. CLI flags/defaults are unchanged. The workspace exposes compatible Comic selection, real sequence choices, factual page counts and a binary-source explanation. See [browser archive/sequence policy](../../docs/architecture/PRD_CONVERT_WEB_CBZ.md) and [actual output](../../examples/conversion-web/cbz/README.md). Fresh live interaction acceptance remains open.

### Explicit comic page review

Node and browser conversion accept `comicPageIds: ["page-2", "page-3", "page-1"]` instead of `comicPageOrder`. Supply every imported page ID exactly once; omitted/duplicate/foreign IDs, non-comic sources and conflicting filename-order settings fail. IDs are snapshotted before async extraction, bounded by `maxNodes` and 255 code units each. The output keeps source page IDs, asset references and descriptions, and adds `comic-page-order-reviewed` to report v1. Default output and CLI flags are unchanged.

The web result offers a filename-based move/reset/apply workflow. Apply reruns the existing pipeline from the selected CBZ File retained in session memory, including when package source retention is off. Failure/cancel leaves the previous result; source context is not persisted or exported and reload ends the session. See [page-review boundary](../../docs/architecture/PRD_CONVERT_PAGE_REVIEW.md) and [actual reviewed output](../../examples/conversion-web/cbz-review/README.md). Live UI/download/focus acceptance remains pending.

### Supplied comic page descriptions

Node/browser settings accept `comicPageDescriptions: [{ pageId: "page-1", text: "A plain-text description of the page." }]`. This defines the overrides for that conversion call; other pages keep their extracted text and an empty list preserves default output. It can accompany explicit or filename ordering. Duplicate/foreign IDs, non-comic overrides, blank text, unsafe controls and oversized inputs fail. Records are copied before asynchronous work. IDs are at most 255 code units, records at most `maxNodes`, and text at most exported `MAX_COMIC_PAGE_DESCRIPTION_LENGTH` (2,048 code units). The exported `ComicPageDescription` type describes each record.

The result uses existing canonical panel `alt`, preserving IDs/images/source and existing validation/packaging. Literal markup/URLs stay plain text and are never executed/fetched. Quality v1 records supplied counts and remaining filename-derived descriptions, with accuracy/completeness unassessed. Defaults, CLI flags and format contracts remain unchanged.

The web list now supports **Apply review** for order and descriptions. Applied descriptions carry forward through order-only changes; unapplied drafts remain in the local result context across Viewer return and are not exported. Reload or changing source/conversion settings ends the session; package source opt-out is separate. See [description/draft policy](../../docs/architecture/PRD_CONVERT_COMIC_DESCRIPTIONS.md) and [actual described output](../../examples/conversion-web/comic-descriptions/README.md). Full live acceptance remains pending after browser access stopped during the native-source check.
