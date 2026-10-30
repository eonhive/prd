# PRD Convert — bounded reflowable EPUB import

_October 27, 2026. Implemented in the repository; pending release. Decision: PRD-044._

This increment extends the existing converter with an EPUB adapter. It reuses the validator's archive decoder, the HTML semantic extractor, archive-image collection, canonical `general-document` sections, validation, packaging and the existing Viewer. It creates no new manifest model, renderer, service or npm package.

## Accepted subset

```sh
prd convert ./book.epub --out ./book.prd --json
prd validate ./book.prd --json
```

Use the repository-built CLI until coordinated release onboarding is complete. `auto` selects `general-document`; compatible explicit overrides, title/ID options, `--no-source` and both existing output transports work normally. Only adaptive conversion is implemented. The destination must be new and its parent must exist. There is no new `prd import epub` directory command.

Detection requires a `.epub` filename and a plain ZIP local-header signature. The importer checks the exact `mimetype` content, namespace-correct `META-INF/container.xml`, the first OPF rootfile, and OPF package version `2.0` or `3.0`. This is a conversion subset, not an EPUB conformance validator: it does not verify every OCF ZIP rule, including mimetype placement/compression, or every EPUB metadata requirement.

Namespace-aware XML parsing handles UTF-8 XML 1.0, predefined/numeric entities, comments, CDATA and namespace prefixes. DTDs, custom entities, processing instructions, `xml:base`, malformed XML, invalid UTF-8 and other declared encodings are rejected. Many legacy EPUB 2 books use XHTML DTDs or named HTML entities; those sources are outside this initial subset. There is no parser recovery into guessed package relationships.

The relationship model follows [W3C EPUB 3.3's package, spine and container definitions](https://www.w3.org/TR/epub-33/). Local resource references are decoded once and resolved relative to the containing OPF/XHTML member. Parent-directory references may remain inside the archive, but schemes, queries, absolute/backslash/control paths and traversal above the archive root are refused. Manifest item IDs and normalized local resource paths must be unique. Spine items must identify local declared XHTML; foreign-content fallback chains and repeated spine documents are unsupported and fail explicitly.

## Content and navigation mapping

| Source | Canonical PRD result |
| --- | --- |
| First nonempty Dublin Core title | Document title, unless overridden |
| Spine item order | Inline chapter sections in that order, regardless of filenames or ZIP insertion order |
| Chapter title / first heading | Section title; otherwise a numbered chapter label |
| Matching opening heading | Folded into the section title when other content remains; its source anchor maps to the section |
| XHTML headings, prose, lists, quotes, simple tables and images | Existing HTML semantic mapping, including its loss warnings |
| Retained chapter/source IDs | Stable, globally unique generated chapter/node anchors |
| Same-book links | Generated fragments targeting retained chapters or anchors |
| Unresolved/unsafe local links | Plain labels with warnings |
| Allowed external links | Existing HTTP(S), mailto and tel link behavior; no retrieval during conversion |
| Declared PNG/JPEG/GIF/WebP images | Bounded, signature-screened assets with preserved bytes and shared reference mapping |

The first rendition is used; alternatives warn. Non-linear spine entries remain at their listed positions as ordinary chapters and warn. Empty/unreadable chapters fail. Inline anchor limitations of the HTML subset still apply; a link whose target cannot be retained becomes plain text with a diagnostic.

Image references must identify existing declared members with matching media type/extension. Missing, undeclared, remote, unsafe, SVG or otherwise unsupported images are reported; alternative text is retained where possible. The shared collector checks actual raster signatures and deduplicates repeated member references. It does not fully decode images or impose pixel-dimension limits.

CSS, fonts, typography, original navigation/NCX hierarchy, metadata beyond title, media overlays, page progression and unused resources are not mapped. Recognized fixed-layout declarations and any `META-INF/encryption.xml` cause conversion to fail, including font-obfuscation declarations. No DRM, decryption, OCR, scripting, remote retrieval or original EPUB signature verification is implemented. Source scripts/embedded markup never become a Viewer HTML entry. Foreign XML content receives no HTML-specific semantics.

## Bounds and dependency isolation

The CBZ-established archive budgets remain unchanged: 4 MiB compressed input, 8 MiB per expanded member, 24 MiB total expanded bytes and 128 entries, including ignored metadata and directories. The resource collector uses the same byte/count budgets. The library accepts positive `limits` overrides; the CLI currently has no limit flags. Source retention adds the original compressed bytes to the generated package beyond copied assets.

`maxNodes` defaults to 20,000. One cumulative XML work budget covers the container, OPF and every imported chapter: opening tags, attributes, text/CDATA and comments consume it. XML nesting is capped at 64. Extracted content, chapter wrappers and resource-reference attempts also obey their existing limits. Ignored archive members remain subject to all archive byte/count/path checks even though their XML is not parsed. No member is extracted to disk or resolved against workstation paths.

The EPUB adapter loads optional `saxes@^6.0.0` when its XML is read. The later DOCX adapter shares the same bounded XML helper. Its [upstream behavior](https://github.com/lddubeau/saxes/blob/v6.0.0/README.md) and installed API were reviewed; the converter explicitly rejects DTDs and does not supply entity resolvers. XHTML is translated into the existing extractor's internal tree shape without executing markup or using HTML recovery. EPUB does not require `parse5`; HTML does not require `saxes`. Markdown/CBZ remain independent of both. Installed-tarball tests remove each optional parser in turn and verify the relevant diagnostic and unaffected formats.

## Reports, preservation and evidence

Existing `reportVersion: "1.0"` and CLI success/error contracts remain unchanged. Actual counts and mappings identify `sourceFormat: "epub"`; structural validation must pass. Fidelity remains conservatively partial and presentation layout is not preserved. There is no confidence percentage or automatic reading-quality claim. Original source and quality report are declared attachments by default; source opt-out explicitly warns. Reports use archive-member references, not the original absolute workstation path. Retained source archives and their member names may themselves contain user-authored private information.

[The real example](../../examples/conversion-epub/README.md) contains two chapters whose spine order differs from filename order, an image, list, table, forward/back links, CSS, a navigation document and a harmless source script marker. The generated archive has 13 canonical content nodes, one image asset and two attachments. Tests cover source/report parity, both transports, profile rejection, XML/entity/path/relationship failures, budgets and existing Viewer opening. Local browser acceptance confirms Valid / fully-supported status, chapter order, heading normalization, table/image rendering, forward/back navigation and byte-exact source/report retrieval through the supported browser file-link API. No warning/error console logs appeared. This is local acceptance, not deployed/physical-device/screen-reader acceptance.

## Files in this increment

- Converter: `src/adapters/epub.ts`, `epubXml.ts`, `epub.test.ts`, the internal `HtmlExtractor` link/anchor seam, default registry/export and optional dependency/lockfile.
- CLI: conversion usage text and built-binary EPUB test. Existing import/report commands are unchanged.
- Integration: `scripts/converter-viewer.integration.test.ts` and `scripts/release-smoke.mjs`.
- Evidence: `examples/conversion-epub/` source directory, EPUB, generated PRD, extracted report and guide; `.changeset/prd-epub-conversion.md`.
- Canon: PRD-044; converter/package/CLI/matrix/workflow/roadmap/index documentation; build status, next steps and session handoff.

The later [DOCX increment](PRD_CONVERT_DOCX.md) now defines its own bounded ZIP/XML/relationships policy and implementation. PDF/OCR, Office execution, conversion UI, faithful/hybrid modes and public release remain separate work.
