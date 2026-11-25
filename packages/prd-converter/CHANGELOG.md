# @eonhive/prd-converter Changelog

## 0.2.0

### Added

- Initial bounded Markdown, static HTML, CBZ, EPUB, DOCX and PDF ingestion through canonical PRD structured content, validation and packaging.
- Node conversion and preparation APIs with declared resources, optional original-source attachments and factual quality reports, shared with the CLI conversion/import workflows.
- Browser entry points for Markdown, static HTML and bounded CBZ conversion, with selected-resource snapshots and lazy optional parsing.
- Complete comic page-sequence review and supplied plain-text page descriptions, preserving source page identities and assets through the existing pipeline.

### Dependencies and limits

- Packager and validator dependencies move to `^0.2.0`; types remain at `^0.1.1`.
- PDF conversion requires Node.js 22.13+ and optional PDF.js/native canvas support in a deadline-limited child process. Other optional parsers load only for their supported source formats.
- Conversion remains a bounded semantic reconstruction with explicit loss diagnostics; full visual fidelity, OCR and active document execution are outside this release.
