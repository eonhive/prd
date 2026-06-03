# PRD_AUTHORING_WORKFLOW.md
_Last updated: May 31, 2026_
_Status: Phase 5 authoring workflow baseline v0.3_

## 1. Purpose

This document defines the current public authoring workflow for PRD after the first Phase 5 tooling slice.

The goal is to make PRD authoring repeatable without pretending a full Studio, broad conversion platform, or hosted workflow exists yet.

---

## 2. Current Executable Workflow

The current supported authoring path is:

```text
prd init or prd import markdown or prd import images
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

The current reference viewer baseline remains eager whole-package in-memory loading. Streaming, range requests, worker unzip, lazy section fetch, and hosted opening flows are not part of the current authoring contract.

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

After `prd import markdown` and `prd import images`, the current executable public-product lane is viewer/demo/landing UX polish that demonstrates the real create/import, validate, pack, and open flow.

The next lane should choose and implement a public hosted demo/deployment path for the reference viewer so the demo can be shared without a local repo checkout.

Full Studio, hosted conversion, DOCX/EPUB/PDF fidelity, and broad HTML import remain deferred.
