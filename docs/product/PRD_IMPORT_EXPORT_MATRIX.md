# PRD_IMPORT_EXPORT_MATRIX.md
_Last updated: May 31, 2026_
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
| HTML | `general-document` | Later MVP lane | Deferred | Needs a disciplined subset and sanitizer policy before implementation. |
| DOCX | `general-document` | Later conversion lane | Deferred | Useful, but high-fidelity mapping is complex and should not be first. |
| EPUB | `general-document` | Later conversion lane | Deferred | Needs spine, asset, metadata, and chapter mapping decisions. |
| PDF | `general-document` or attachment-first | Deferred | Deferred | PDF is difficult to convert structurally; initial handling should likely stay attachment or reference-led until a conversion policy exists. |
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

The current public-product implementation is the hosted PRD landing page and reference web viewer demo that demonstrates the now-real authoring loop:

```text
init/import -> validate -> inspect -> pack -> open in the reference viewer
```

That keeps the product story focused on usable PRD creation before adding broad conversion. The web demo can load generated hosted sample archives, but those samples are demo assets only and do not change PRD's packaged-first, eager whole-package reference loading baseline.

The next public-product lane should launch-QA the hosted demo, verify the GitHub Pages deployment, and then choose the next viewer/product polish step.

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
