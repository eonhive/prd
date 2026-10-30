# PRD Convert — HTML implementation increment

_October 27, 2026. Status: implemented repository increment toward Phase 2; pending release._

This extends the [Phase 1 foundation](PRD_CONVERT_PHASE_1.md) with one HTML adapter. DOCX and the conversion web app remain separate work. The existing PRD semantic types, validator, packager and Viewer remain authoritative.

## Parsing and dependency boundary

`adapters/html.ts` detects UTF-8 `.html`/`.htm` documents or fragments containing HTML markup. Binary/control-byte, invalid UTF-8, PDF and XML inputs are rejected rather than treated as HTML. No charset transcoding, XML/XHTML support or content-type guessing from arbitrary plain text is implemented.

`adapters/htmlTree.ts` dynamically loads optional `parse5` only when HTML import runs. Its tree adapter caps element creation, comment/fragment/doctype creation and text-insertion operations using the configured `maxNodes` budget. This conservative parsing-work budget includes implied HTML nodes and can be exhausted before the output-node budget. Open-element depth and extracted tree depth are limited to 64. Missing-doctype diagnostics are ignored for supported fragments; other parser-reported errors appear in the quality report. Browser-compatible recovery does not imply every source correction receives an individual parser diagnostic.

The parser produces a tree; it does not open the source in a browser, execute scripts or retrieve remote resources. The conversion layer then reconstructs allowlisted PRD structures from text and selected attributes. It never emits sanitized HTML for the Viewer to execute. Parser behavior and hooks were verified against the installed dependency and [official options](https://parse5.js.org/interfaces/parse5.ParserOptions.html) / [tree-adapter documentation](https://parse5.js.org/interfaces/parse5.TreeAdapter.html).

The installed parser dependency chain requires Node.js 20.19 or later; the repository continues to use its existing Node 22+ build baseline. Markdown retains the converter's existing Node 20 minimum and does not require the optional parser.

Markdown and legacy import paths do not load `parse5`. A missing optional parser gives an actionable HTML-only diagnostic. The local tarball smoke proves HTML conversion with the parser installed, then removes the optional dependency from its disposable install and verifies Markdown still converts while HTML fails clearly.

## Semantic mapping

| Source | Canonical output and limitations |
| --- | --- |
| `title`, then first H1, then filename | Document title; other metadata, including language, remains only in retained source |
| H1–H6 | Heading with original level |
| Paragraphs and text | Plain text with decoded entities and collapsed whitespace; inline emphasis is flattened |
| UL / OL / LI | Flat string lists; nested hierarchy and custom numbering are flattened and reported |
| Blockquote | Quote text; internal block layout is flattened |
| PRE | Plain paragraph text with a warning about code/whitespace semantics |
| Simple tables | Canonical columns/rows; a full first TH row supplies labels, otherwise labels are generated; short rows are padded with empty strings |
| Merged/nested/oversized tables | Plain text plus a warning; no equivalent table relationships are claimed |
| Links | `http`, `https`, `mailto`, `tel` and retained fragment targets only; unsafe/relative/missing destinations become plain labels with warnings |
| Local raster images | Existing bounded image resolver; alternate text retained, or a warned generic label if missing |
| Containers | Readable children in DOM order; layout and container semantics are not recreated |

Inline links/images can follow their containing paragraph, heading, quote, list or table because the current PRD model has string-based text fields rather than rich inline spans. Prose retains link labels, so a separate actionable link can repeat a label. The quality report states this layout adaptation. Local fragment IDs are mapped to stable generated IDs on retained nodes; forward references resolve after extraction. Wrapper IDs can map to the first retained descendant. Duplicate IDs keep their first readable target. Unretained inline/hidden targets degrade to plain link labels with warnings.

Table padding is bounded separately: `columnCount × sourceRowCount` cannot exceed `maxNodes`. Wider expansion falls back to text. This prevents a small but uneven input from constructing an unexpectedly large rectangular grid.

## Resource and active-content policy

- Script, style, frame/object/embed, template, SVG/MathML/canvas, audio/video, form-control and noscript subtrees are omitted with warnings. Event attributes are never copied into output. Form labels and other ordinary readable text may survive.
- `hidden` and `aria-hidden="true"` subtrees are omitted. CSS is not evaluated, so CSS-only visibility rules are not reproduced; source styling must not be treated as an access boundary.
- Stylesheets, base URLs, metadata refresh and remote resources do not trigger retrieval or navigation. Relative links are not rebased. Image `srcset`/`sizes` alternatives are reported; only `src` is considered.
- Images reuse the existing source-directory containment, realpath/symlink, file-signature, count and byte checks. Unsafe/missing images retain non-empty alternative text and emit resource warnings.
- The original HTML bytes are, by default, a declared `attachments/source.html` or `.htm` attachment with `application/octet-stream`, not an executable HTML entry. The Viewer renders only `content/root.json`. Explicit source opt-out still warns. Source retention does not preserve missing external resources.

This is a static semantic importer, not a browser engine, full HTML sanitizer product, CSS layout renderer, active application migration or fidelity guarantee. Semantic fidelity stays partial; visual layout stays unpreserved. Existing archive/output limits and exclusive publication behavior remain unchanged.

## Verification

HTML tests cover title precedence, entities, headings, tables, list flattening, anchors, local images, deterministic logical files, source retention, unsafe URLs, script/embedded/hidden content, remote-fetch prevention, malformed input, parse/node/depth/size limits, path/symlink escapes and table-expansion limits. Built CLI tests convert/validate/inspect a real source. Viewer integration reopens both container forms as fully supported structured content, with no HTML fallback path.

`examples/conversion-html/` contains the actual HTML/image input, generated `.prd` and extracted report. The fixture deliberately includes CSS and a harmless script marker so its reported omission can be checked. Final command and browser results are recorded in `BUILD_STATUS.md`; publication and deployment remain separate.


## Directory workflow and shared output (PRD-042)

The current checkout also supports:

```sh
prd import html ./source.html --out ./my-document --json
prd validate ./my-document
prd pack ./my-document --out ./my-document.prd
```

`packages/prd-cli/src/importPackage.ts` shares canonical manifest/content serialization, target-directory checks, directory creation, resource copying and file writes for the existing Markdown/image importers. Parsing, resource names, natural image order, profile-specific content, warning strings and result shapes remain in those importers. Four captured before/after cases (Markdown with resources/warnings, empty Markdown, comic images and storyboard images) match exact directory bytes and CLI JSON. Existing snapshots and end-to-end tests remain regression protection; legacy I/O policies are not silently replaced by the newer converter policies.

`prepareConversion` exposes the existing extract/normalize/resource/validate stage without creating an archive. The HTML directory wrapper selects only the HTML adapter and uses that stage, then the shared CLI writer. The already-present converter package from earlier work is reused; this continuation adds no package boundary or parser dependency. Nonempty/file/symlink targets are refused for HTML; existing empty directories are supported. Unsafe, duplicate and file/directory-conflicting generated output paths are rejected before writing.

Unlike the earlier direct `convert` workflow's optional retained binary source, **`import html` never bundles raw source HTML**. It exports structured JSON, collected raster assets and one declared `attachments/import-report.json`. Original input is untouched on disk. Losses remain explicit. Converter preparation and direct `convert` behavior stay compatible.

### New report contracts

`prd-cli-html-import-v1` success is the normal directory-import summary (`imported`, source/target, profile/title/id/entry/files, node/asset counts, string warnings) plus `contractVersion` and `report`. It prints to stdout only after validation and writing succeed. With `--json`, failure prints `{ contractVersion, imported: false, error: { code, message } }` to stderr and exits 1; it does not fabricate metrics for a failed extraction. Operational paths in command output are not inserted into the diagnostic attachment.

The report's separate identifier is `prd-import-report-v1` and it includes:

- actual `sourceFormat` / `targetProfile`
- generated node counts by canonical type
- collected asset count, bytes and generated package resource references
- existing staged/coded warnings, validation errors/warnings and unsupported element names
- `sourcePreserved: false`, partial semantic fidelity and unpreserved visual layout
- `readingQuality: "not-assessed"` and a separate factual `validation.valid`

No confidence percentage or reading/accessibility certification is implied by structural validity. Original resource URLs/names/absolute paths remain internal; exported warning references are limited to element names. Stable normalized node IDs remain available internally. Fine-grained source line/offset provenance and a Studio repair queue are future work, not claimed by this report. Validate/inspect JSON v0.1, older importer JSON and the earlier direct-conversion report v1.0 are unchanged.

The example's `imported/` directory and `imported.prd` demonstrate this exact directory workflow; `converted.prd` remains the earlier direct-conversion example. The revised sequence places EPUB/CBZ before DOCX. The subsequent [CBZ](PRD_CONVERT_CBZ.md), [EPUB](PRD_CONVERT_EPUB.md) and [DOCX](PRD_CONVERT_DOCX.md) increments are now implemented; PDF is next. Local browser acceptance now covers the actual imported archive, fragment navigation and byte-exact report retrieval; the earlier browser-disabled status is historical.
