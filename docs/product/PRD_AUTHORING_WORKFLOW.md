# PRD_AUTHORING_WORKFLOW.md
_Last updated: October 27, 2026_
_Status: Phase 5 authoring workflow baseline v0.3_

## 1. Purpose

This document defines the current public authoring workflow for PRD after the first Phase 5 tooling slice.

The goal is to make PRD authoring repeatable without pretending a full Studio, broad conversion platform, or hosted authoring workflow exists yet. The current hosted surface is a static reference viewer demo, not Cloud authoring.

Command availability: this workflow describes the repository build. On October 25, 2026, npm `@eonhive/prd-cli` latest is still `0.1.1` with `pack`, `validate`, and `inspect`; the `init` and import lanes have queued minor changesets. Until that release ships, use the repository build for authoring. See the [CLI availability note](../../packages/prd-cli/README.md#command-availability).

---

## 2. Current Executable Workflow

The current supported authoring path is:

```text
prd init or prd import markdown or prd import images or prd import html
  -> edit package files
  -> prd validate
  -> prd inspect
  -> prd pack
  -> open or share the .prd archive
```

This path is intentionally file-system first and package-first.

It creates and works on unpacked package directories during authoring, then emits a `.prd` ZIP archive for interchange.

---

## 3. Authoring Steps

### 3.1 Create or import a starter package

Use `prd init` to create a validator-valid starter package directory:

```bash
prd init ./my-document --profile general-document
prd init ./my-comic --profile comic
prd init ./my-board --profile storyboard
```

Supported starter profiles:

- `general-document`
- `comic`
- `storyboard`

`prd init` does not create a `.prd` archive directly. It creates an unpacked package directory so authors can edit the manifest, content, and assets before packaging.

Use `prd import markdown` when the source material already exists as Markdown:

```bash
prd import markdown ./source.md --out ./my-document
```

The v0.1 Markdown import lane targets `general-document` only. It supports a small deterministic subset: ATX headings, paragraphs, unordered and ordered lists, blockquotes, and standalone local relative images. Unsupported features are skipped or preserved as plain text with explicit import warnings rather than inventing broad conversion behavior.

Use `prd import images` when the source material is already an ordered folder of page, panel, or frame images:

```bash
prd import images ./pages --profile comic --out ./my-comic
prd import images ./frames --profile storyboard --out ./my-board
```

The v0.1 image import lane targets `comic` and `storyboard` only. It imports supported top-level image files (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`) in deterministic natural filename order, so `page-2.png` sorts before `page-10.png`. Non-image files and nested directories are skipped with warnings. The command does not edit, resize, optimize, OCR, or fetch images.

Use `prd import html` for the controlled HTML subset:

```sh
prd import html ./source.html --out ./my-document --json
```

This produces structured `general-document` JSON, packaged local raster images and a declared import report. It omits raw HTML source, scripts and unsafe/unsupported reading content, reporting losses explicitly. The new JSON output is separately versioned as `prd-cli-html-import-v1`; earlier import output shapes are unchanged. Existing empty target directories are accepted; nonempty/file/symlink targets are refused. See [the HTML policy and report contract](../architecture/PRD_CONVERT_HTML.md#directory-workflow-and-shared-output-prd-042).

### 3.2 Edit package files

Authors edit normal package files:

- `manifest.json`
- `content/root.json`
- declared assets under `assets/`
- optional profile-specific files under `profiles/`
- optional attachments under `attachments/`

The manifest remains the canonical package control surface. The content root remains structured JSON for the current first-class profile baselines.

### 3.3 Validate during authoring

Run validation after meaningful edits:

```bash
prd validate ./my-document
```

Validation answers whether the package is structurally valid. It does not guarantee every viewer can fully render every future optional feature.

### 3.4 Inspect package shape

Run inspection when package shape or loading-relevant facts matter:

```bash
prd inspect ./my-document
```

Inspection reports facts such as file count, byte count, entry mode, segmentation status, localization status, attachment presence, and reference load mode.

### 3.5 Pack for interchange

Create a `.prd` archive only after the source directory validates:

```bash
prd pack ./my-document --out ./my-document.prd
```

The `.prd` archive is the interchange form. The unpacked directory is the authoring and CI form.

### 3.6 Open or share

Open the packed archive in a compatible viewer or distribute it as a portable package.

The current reference viewer baseline remains eager whole-package in-memory loading. Streaming, range requests, worker unzip, lazy section fetch, and hosted opening flows are not part of the current authoring contract. Hosted sample archives in the web demo are demonstration assets, not a format-level network-loading guarantee.

---

## 4. Profile-Specific Authoring Notes

### 4.1 General document

Use `general-document` for prose-led works such as articles, reports, manuals, resumes, portfolios, magazines, and web novels.

Current authoring shape:

- structured root at `content/root.json`
- document node with `children`
- sections, headings, paragraphs, lists, tables, images, charts, and media according to the current structured content model

### 4.2 Comic

Use `comic` for panel-led sequential visual works.

Current authoring shape:

- structured root at `content/root.json`
- comic node with `panels`
- panel assets declared in `manifest.assets`
- optional series metadata through the lean collection/series model

`prd import images --profile comic` creates this baseline from an ordered image folder by copying images into `assets/panels/` and generating one panel per imported image.

### 4.3 Storyboard

Use `storyboard` for frame-led planning and review packages.

Current authoring shape:

- structured root at `content/root.json`
- storyboard node with `frames`
- frame assets declared in `manifest.assets`
- notes and alt text kept close to frame declarations

`prd import images --profile storyboard` creates this baseline from an ordered image folder by copying images into `assets/frames/` and generating one frame per imported image with placeholder notes.

---

## 5. Current Non-goals

This workflow does not define:

- full visual Studio behavior
- hosted authoring or Cloud sync
- collaborative editing
- broad import/conversion pipelines
- PDF, DOCX, EPUB, or HTML fidelity guarantees
- payment, rights, crypto, entitlement, or protected-content authoring flows

Those remain future product or extension lanes.

---

## 6. Next Implementation Lane

After `prd import markdown` and `prd import images`, the current executable public-product lane is the hosted PRD Home page, public docs index, and reference Web Viewer demo. It demonstrates the real create/import, validate, inspect, pack, and open flow with light and premium dark modes, using `/` for Home, `/viewer/` for the actual package-opening workspace, and `/docs/` for the public docs navigation layer over canonical repo docs.

Production hosting targets Cloudflare Workers Static Assets, with GitHub Pages retained as fallback until custom-domain launch QA passes. This is static web hosting, not server-side authoring or package processing. See the [hosting runbook](../governance/PRD_HOSTING_RUNBOOK.md).

Full Studio, hosted conversion, DOCX/EPUB/PDF fidelity, and broad HTML import remain deferred.


## Direct conversion with PRD Convert

For a completed archive with source retention and a quality report, use the repository-built CLI:

```sh
node packages/prd-cli/dist/cli.js convert ./source.md --out ./converted.prd --json
node packages/prd-cli/dist/cli.js validate ./converted.prd --json
```

The output parent must exist; existing destinations are refused. Open the resulting archive in the existing Viewer. Files exposes the declared source and quality-report attachments. `--profile auto` is the default; only compatible overrides are accepted. `--strategy adaptive` is the only Phase 1 strategy. `--no-source` disables source retention and records a warning. The legacy unpacked `prd import markdown` workflow stays available. See [PRD Convert architecture](../architecture/PRD_CONVERT_PHASE_1.md) and the [conversion example](../../examples/conversion-markdown/README.md). This lane is implemented locally and pending public release.


### HTML source conversion

The same direct-archive workflow now accepts `prd convert ./source.html --out ./converted.prd --json`. Install optional dependencies to enable the HTML parser. The result is canonical structured content, with the original HTML retained as an inert download and a quality report declaring omitted scripts/CSS/embedded content and other losses. Read [HTML mapping and limits](../architecture/PRD_CONVERT_HTML.md) before relying on a particular source feature. The later DOCX increment is documented below.

### CBZ source conversion

Use `prd convert ./sample-comic.cbz --out ./comic.prd --profile comic --json` to import a bounded ZIP comic sequence. `auto` also selects `comic`. Raster pages become canonical panels in natural full-path order, with explicit warnings for inferred order, filename alternative text and omitted metadata. The original archive is retained by default; `--no-source` opts out. Existing Viewer comic navigation opens the result without a new renderer. See [CBZ policy and limits](../architecture/PRD_CONVERT_CBZ.md) and [example](../../examples/conversion-cbz/README.md). EPUB, DOCX and PDF are supported by subsequent increments below; converter UI remains later work.

### EPUB source conversion

Use `prd convert ./book.epub --out ./book.prd --json` for the supported reflowable EPUB subset. The optional XML parser (`saxes`) must be installed; the HTML parser is not required. Spine order becomes canonical chapter sections, retained source anchors become unique PRD links and declared local raster resources enter the existing resource map. Inspect warnings for omitted navigation hierarchy, styles, metadata and unsupported source behavior before distributing the result. DTD-based legacy XHTML, encryption/obfuscation and recognized fixed layouts are refused. See [EPUB policy](../architecture/PRD_CONVERT_EPUB.md) and [the real book example](../../examples/conversion-epub/README.md). The later DOCX increment is documented below.

### DOCX source conversion

Use `prd convert ./source.docx --out ./document.prd --json` for the supported transitional Word body subset. Optional `saxes` is required; the HTML parser is not. Review quality warnings for page layout, headers/footers, notes, fields, unsupported numbering, equations and other Word-specific behavior. This produces readable canonical content, not an equivalent Word editing/layout engine. The original archive remains available by default and may contain hidden/deleted content or private metadata; source retention is not redaction. See [DOCX policy](../architecture/PRD_CONVERT_DOCX.md) and [example](../../examples/conversion-docx/README.md).

### PDF source conversion

Use `prd convert ./source.pdf --out ./pages.prd --json` with Node.js 22.13+ and optional PDF.js/native canvas support. Review the resulting page sections and quality warnings: extraction order may differ from reading order, text-page illustrations remain source-only, and textless pages use PNG fallback without OCR. The original PDF remains an opaque attachment by default; it is not sanitized or redacted. Encrypted sources are refused. See [PDF mapping and process limits](../architecture/PRD_CONVERT_PDF.md) and [the actual source/PRD example](../../examples/conversion-pdf/README.md). The browser Markdown workflow is described below.

### Browser Markdown conversion

Open **Convert** at `/convert/` in the repository-built web app. Select Markdown and optional supporting raster files, choose a title/profile/source-retention setting and convert locally. Review real conversion/validator warnings, download the PRD/report and use **Preview in Viewer** to open the exact archive. Resources are explicit local selections; missing or uncollected files warn. Source retention defaults on and is not redaction. A 20-second job deadline and cancel action stop workers; no service receives source data. See [browser execution and limits](../architecture/PRD_CONVERT_WEB.md) and [actual browser output](../../examples/conversion-web/README.md). Other formats remain Node-only until their browser policies are implemented.

### Browser HTML and workspace review

The same `/convert/` route supports HTML/Markdown with **Browse files** or a single-source drop, removable supporting images, actual output settings and quality/assets/plain-source views. HTML becomes canonical JSON through the existing static semantic adapter; scripts/CSS/embedded behavior are reported, not executed. Use **Preview in Viewer** for the exact generated archive. CBZ support follows below; additional browser formats, PSD/AI/layers and editor behavior remain unimplemented. See [HTML browser/workspace policy](../architecture/PRD_CONVERT_WEB_HTML.md). Fresh interaction/visual acceptance is pending while browser automation is disabled.

### Browser CBZ comics

Choose one small `.cbz` archive in the same workspace. Automatic/Comic profile imports supported raster members without separate supporting images. Choose natural or reversed filename sequence, review inferred-order/generated-description/metadata warnings, then download or preview the exact package in Viewer. Page sequence does not specify manga direction. The same source-retention setting includes or omits the exact binary archive; source review does not display binary bytes as text. Browser limits are 4 MiB input / 8 MiB expanded member / 24 MiB expanded total / 128 archive entries, including ignored members. See [CBZ browser policy](../architecture/PRD_CONVERT_WEB_CBZ.md) and [actual example](../../examples/conversion-web/cbz/README.md). Live browser acceptance remains pending.

### Repair imported comic page order

After CBZ conversion, use **Review comic pages** to move filenames earlier/later. **Reset changes** restores the current package sequence/text; **Apply review** reruns conversion and validation with the complete draft sequence and supplied descriptions. Every imported page keeps its IDs/assets, and the quality report records explicit review. Failed/cancelled apply keeps the previous package and draft. Download/Viewer refer to the current package until apply succeeds.

The selected immutable CBZ File/settings and unapplied draft remain in session memory for this action, including after returning from Viewer and when source packaging is disabled. Reload or changing source/conversion settings ends that review; there is no persistent history or source upload. Source opt-out is not memory erasure. Results without source context require reconversion. Artwork inspection uses the existing Viewer. See [repair policy](../architecture/PRD_CONVERT_PAGE_REVIEW.md). Fresh live keyboard/focus/apply/download acceptance remains pending.

### Review conversion diagnostics

In **Quality report**, inspect each warning's code, origin/stage and supplied source reference or package path. **Warning category** separates conversion stages from package-validator issues; **Search warnings** matches literal code/message/location text across the complete report. Counts show visible, matching and total warnings, with up to 50 matches displayed. Narrow the filters or download the unchanged complete report for the rest. **Clear filters** restores all warnings. New results reset filters; draft-only updates keep them, and route remounts reset this view state. Locations remain plain text. Review actions do not resolve source limitations or establish fidelity/accessibility. See [quality-review policy](../architecture/PRD_CONVERT_QUALITY_REVIEW.md). Live filter/keyboard/download/theme/mobile acceptance remains pending while browser use is disabled.

### Supply comic page descriptions

Replace filename-derived text in the labeled description fields with plain text up to 2,048 characters each. Empty/invalid changes cannot be applied. The list distinguishes imported, supplied and draft text. Apply keeps page IDs/assets, reruns canonical conversion and reports actual supplied/remaining filename-derived counts; correctness/completeness is not automatically assessed. Previously supplied text carries forward when reordering pages. Drafts remain local until apply succeeds and survive Viewer return; reload/input changes end the review. See [description/draft policy](../architecture/PRD_CONVERT_COMIC_DESCRIPTIONS.md) and [actual example](../../examples/conversion-web/comic-descriptions/README.md). This is focused conversion repair, not a general Studio editor. Full live acceptance remains open after browser access briefly returned for file selection, then stopped.
