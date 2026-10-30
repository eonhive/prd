# PRD Convert — bounded DOCX body import

_October 27, 2026. Implemented in the repository; pending release. Decision: PRD-045._

This increment converts a transitional WordprocessingML body into canonical `general-document` content. It reuses existing archive decoding, the optional XML parser, resource collection, semantic types, validator, packager and Viewer. It introduces no new package, renderer or manifest model.

## Usage and accepted package subset

```sh
prd convert ./source.docx --out ./document.prd --json
prd validate ./document.prd --json
```

Use the repository-built CLI until release onboarding is complete. `auto` selects `general-document`; compatible title/ID/profile options, source opt-out and both existing output transports are supported. Only adaptive conversion is implemented. The output parent must exist and the destination must be new. There is no new `prd import docx` directory command.

Detection requires `.docx` plus a plain ZIP local-header signature. The adapter reads namespace-correct `[Content_Types].xml` and root OPC relationships to discover the main document, rather than assuming `word/document.xml`. The main relationship must identify a local transitional Word document with its expected content type. Strict OOXML, renamed macro-enabled packages and legacy/encrypted OLE Word containers are outside this subset. Recognized macro content types and `vbaProject.bin` members are rejected; this is not a malware scanner or full DOCX conformance validator.

Internal relationship targets resolve only within the archive. OPC package-root targets beginning with one slash are supported as archive references. Schemes, queries, protocol-relative/backslash/control paths and traversal above the package root are refused. Percent escapes are decoded once. Content-type declarations, relationship IDs and used part relationships must be unambiguous. Images/styles/numbering must identify locally declared parts with the expected types. No source member is extracted to disk and no relationship causes network retrieval.

The implementation follows [Microsoft's WordprocessingML structure documentation](https://learn.microsoft.com/en-us/office/open-xml/word/structure-of-a-wordprocessingml-document) and its [numbering definition model](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.abstractnum). Source relationships describe Word parts only; the existing PRD manifest remains the output authority.

## Semantic mapping

| Word source | Canonical PRD result |
| --- | --- |
| Core-property title | Document title; otherwise an opening Title style or first retained heading can supply it |
| Matching opening Title paragraph | Root title and retained bookmark target; a title-only document also keeps readable body text |
| Paragraphs and text runs | Paragraph text with normalized whitespace; emphasis/typography become plain text |
| Direct/inherited paragraph outline levels | Heading levels 1–6; deeper source levels are capped and warned |
| Simple top-level bullet or decimal numbering | Grouped list nodes; default decimal numbering starts at one |
| Continued simple decimal lists after an interruption | Explicit numbered paragraph text to preserve position without inventing a PRD list start field |
| Nested/custom/unresolved numbering | Paragraph text with a warning; original labels/hierarchy remain in retained source |
| Rectangular, unmerged tables | Canonical columns/rows; an explicitly declared header supplies labels |
| Tables without declared headers | Generated column labels with every original row retained as data |
| Merged, nested or irregular tables | Readable cell text and a warning about lost relationships |
| Embedded PNG/JPEG/GIF/WebP | Declared, bounded, signature-screened resources with exact original bytes |
| Retained bookmarks | Stable generated node IDs; table/list bookmarks target their containing node and warn |
| Safe external and local bookmark hyperlinks | Canonical links; unsafe/unresolved destinations keep readable labels without activation |

Paragraph styles follow `basedOn` with a cache, cycle detection and a depth cap. Direct paragraph properties override inherited values, including numbering cancellation. Built-in Title naming is recognized; heading semantics depend on declared outline properties. Style IDs alone are not guessed as arbitrary heading levels. Numbering supports top-level bullet definitions and decimal `%1.` definitions starting at one without overrides. Custom starts, patterns, levels, overrides or missing definitions are not presented as equivalent lists. Empty decimal items are reported and consume their position before later retained items.

Links and images may follow their containing paragraph or table, matching the existing converter's block-oriented model. Bookmarks inside list items or cells cannot express precise item/cell targets in the current schema. A linked image without a readable link label receives an omission warning. Repeated image references share an asset through the existing collector. Missing/remote/unsupported images retain available alternative text and warn; absent authored alt text receives a generic label and diagnostic. Image checks do not fully decode pixels or bound image dimensions.

## Explicit losses and source policy

The reading view uses current/inserted content and omits deleted/moved-from content with a revision warning. Explicitly hidden runs are omitted. Style-based visibility, complete revision semantics and Word's full layout cascade are not evaluated. Do not treat conversion as redaction: the original archive is retained by default, including deleted/hidden content, private metadata and unused parts.

Fields are never evaluated. Stored result text may be retained and may be stale. Notes/endnotes/comments, native equations, charts, text boxes, VML/OLE objects, alternate imported content, headers/footers and section layout are not reconstructed. Notes/symbol references, equations, unsupported drawings/objects and section properties receive diagnostics where encountered. An alternate-content block uses its fallback or first available branch and warns. Original typography, inline emphasis, page/column positioning and metadata beyond title are not mapped.

Exact original DOCX bytes and the existing versioned quality report are declared attachments by default. `--no-source` explicitly omits the original and warns. Generated reports contain package/member references rather than the original absolute workstation path; retained source files may themselves contain personal information. The source attachment is an opaque download, never a reading entry or executable document environment.

## Budgets and XML reuse

Existing archive defaults remain 4 MiB input, 8 MiB per expanded member, 24 MiB expanded total and 128 entries, including ignored files and directories. Resource collection applies existing byte/count limits. Positive library `limits` overrides remain available; CLI budget flags are separate future work.

DOCX output nodes use the existing `maxNodes` limit, default 20,000. One cumulative XML work budget is **twice `maxNodes`**, default 40,000 operations, covering content types, relationships, main XML, styles, numbering and title properties. Word's common shared style part alone required about 23,000 operations in the real fixture; the allowance remains bounded without pruning the source to make the test pass. Each opening tag, attribute, comment and text/CDATA event consumes work. Nesting and style inheritance are capped at 64; generated table cell grids are also bounded before construction. This DOCX allowance does not change EPUB's existing XML budget.

`adapters/xml.ts` shares the existing lazily loaded `saxes` parser and adds namespace-aware attribute access. The EPUB wrapper preserves its prior diagnostics and behavior. XML must be UTF-8 XML 1.0; DTDs/custom entities, processing instructions, `xml:base`, malformed XML and other declared encodings fail. DOCX needs the existing optional `saxes` dependency, not `parse5`. Markdown/HTML/CBZ remain independent of XML parsing; installed-tarball checks exercise each optional-parser boundary.

## Evidence and changed files

[The real Word fixture](../../examples/conversion-docx/README.md) was authored with python-docx, rendered to one page and visually inspected using the documents skill. Its PRD output contains 12 content nodes, two grouped lists, a table, one image and source/report attachments. Unit cases cover semantic mapping, OPC relocation/root targets, namespace aliases/spoofing, URI/XML/archive limits, style cycles, revisions/fields and unsafe sources. Built CLI and both-transport integration tests open the actual generated package through the existing Viewer implementation as fully supported structured content.

Local browser acceptance completed on October 28 after browser access became available: both lists, table and 480×144 image render; the bookmark link navigates correctly; source/report downloads are byte-exact; no warning/error console messages were observed. Screenshot is ignored at `examples/dist/docx-conversion-viewer.jpg`.

- Converter: `adapters/docx.ts`, `docxPackage.ts`, `docxStyles.ts`, `docxText.ts`, `docxContent.ts`, `docx.test.ts`, shared `xml.ts`, EPUB XML wrapper and default registry/export.
- CLI and integration: conversion usage, built CLI tests, Viewer-opening tests and installed-package smoke.
- Artifacts: `examples/conversion-docx/{create-source.py,source.docx,converted.prd,quality.json,README.md}` and a minor Changeset.
- Canon: PRD-045, package/CLI/matrix/workflow/product/roadmap/index documentation and build/next-step/handoff records.

The subsequent [PDF increment](PRD_CONVERT_PDF.md) now defines and implements bounded text extraction, reading-order warnings and scan fallback. OCR, Office execution, cloud conversion, the conversion frontend and faithful/hybrid strategies remain separate work. Public release onboarding remains open.
