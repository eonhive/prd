# PRD

**Portable Responsive Document**

PRD is a **structured, profile-based, portable document format and ecosystem** designed to support responsive document behavior beyond static traditional formats like PDF.

PRD is intended to preserve the strengths of portable documents while improving:

* responsive reading
* semantic structure
* profile-aware behavior
* long-term extensibility
* modern viewing experiences

---

## What PRD is

PRD is:

* a portable document/package format
* a manifest-first system
* a structured content model
* a profile-based architecture
* a foundation for viewer and studio tooling
* a disciplined extension-ready ecosystem

PRD is **not**:

* just a PDF clone
* just a zipped website
* just a viewer app
* just a crypto document idea

---

## Source of truth

Implementation and doc work should follow the canonical docs in this order:

1. `docs/foundation/PRD_FOUNDATION.md`
2. `docs/decisions/PRD_DECISIONS.md`
3. `docs/foundation/PRD_GLOSSARY.md`
4. `docs/foundation/PRD_ROADMAP.md`
5. `docs/history/PRD_Project_History_Record.md`
6. the specific target doc being updated

Supporting control docs:

* `docs/architecture/PRD_SYSTEM_BLUEPRINT.md`
* `docs/architecture/PRD_SYSTEM_ARCHITECTURE.md`
* `docs/governance/PRD_PROFILE_REGISTRY.md`
* `docs/governance/PRD_PROMPT_DOCTRINE.md`
* `docs/prompts/PRD_MASTER_PROMPTS.md`

---

## Core direction

PRD is built around a few core pillars:

* **Portable**: documents should remain transferable and viewable as files/packages
* **Responsive**: content should adapt intelligently across device sizes and contexts
* **Structured**: documents should preserve meaningful semantic structure
* **Profile-based**: different document types should be supported through explicit profiles
* **Extensible**: future advanced capabilities should attach through disciplined extensions

---

## First-class profiles

PRD is designed to support first-class profiles such as:

* `general-document`
* `comic`
* `storyboard`

Document kinds such as:

* `article`
* `report`
* `resume`
* `portfolio`
* `magazine`

currently belong inside the `general-document` family unless later canon promotes them separately.

Comics and storyboards are intentional parts of the system design, not afterthoughts.

---

## Repo purpose

This repository is the early implementation home for the PRD foundation.

The initial goal is **not** to build the full ecosystem at once.

The initial goal is to establish a clean executable base for:

* manifest design
* package layout
* profile modeling
* validation
* example PRD packages
* a minimal viewer

---

## Current MVP scope

The first implementation phase focuses on:

* manifest schema
* structured content schema
* validator CLI
* example PRD packages
* minimal web viewer
* foundational documentation

Explicitly out of scope for the first foundation layer:

* crypto ownership systems
* payment/commerce systems
* full encryption systems
* full signing/authenticity stack
* live collaborative/network behavior
* giant runtime/script systems
* broad conversion/import platform work

---

## Current implementation scope

Current implementation-facing assumptions in this repo:

* canonical core profile IDs are `general-document`, `comic`, and `storyboard`
* `responsive-document` is treated only as a legacy alias that normalizes to `general-document`
* localization is optional and lean at the manifest boundary
* `resume-basic` is currently a general-document-family example, not a promoted top-level canonical profile

This repo is trying to prove a serious base format and toolchain, not every future PRD feature at once.

---

## Repository structure

```text
PRD/
  AGENTS.md
  README.md
  apps/
  docs/
  examples/
  packages/
  schemas/
  scripts/
```

Current docs structure:

```text
docs/
  architecture/
  archive/
  core/
  decisions/
  extensions/
  foundation/
  governance/
  history/
  market/
  product/
  profiles/
  prompts/
  runtime/
```

Current implementation structure:

```text
packages/
  prd-types/
  prd-validator/
  prd-packager/
  prd-cli/
  prd-viewer-core/

apps/
  prd-viewer-web/

examples/
  document-basic/
  resume-basic/
  comic-basic/
  storyboard-basic/
```

---

## Package model direction

A conceptual PRD package looks like:

```text
my-document.prd/
  manifest.json
  content/
  assets/
  profiles/
  extensions/
  protected/
```

Key ideas:

* `manifest.json` is the canonical structural source of truth
* `content/` holds structured document content
* `assets/` holds declared reusable assets
* `profiles/` supports profile-specific specialization
* `extensions/` holds declared extension data
* `protected/` is reserved for future protected/private data flows

---

## Commands

The current top-level scripts are:

* `pnpm build`
* `pnpm typecheck`
* `pnpm test`
* `pnpm dev:web`
* `pnpm examples:pack`
* `pnpm examples:validate`

Example CLI usage:

```bash
prd validate <path>
```

---

## Example flow

1. Run `pnpm examples:pack`
2. Run `pnpm examples:validate`
3. Run `pnpm dev:web`
4. Open the web viewer and load files from `examples/dist/`

Current example behavior:

* `document-basic` is the canonical structured `general-document` example using `content/root.json`
* `resume-basic` remains a useful HTML-backed implementation example while the structured document family expands
* `comic-basic` and `storyboard-basic` are important structural fixtures even where runtime support is still narrower

---

## Architecture boundary

This monorepo preserves the PRD boundary between format and viewer:

* format packages own manifests, profiles, validation, packaging, and package rules
* `packages/prd-viewer-core` owns open behavior and rendering-model support logic
* `apps/prd-viewer-web` owns browser UI and web delivery concerns

The app does not define PRD validity, and the format packages do not depend on React UI code.

---

## Development priorities

The preferred build order is:

1. lock repo rules in `AGENTS.md`
2. define manifest schema
3. define base content schema
4. implement `prd validate`
5. create `examples/document-basic`
6. build a minimal web viewer
7. expand to additional profiles

The first major milestone is:

> `examples/document-basic` validates successfully and opens in the viewer.

---

## Design rules

When contributing, preserve these rules:

* manifest-first architecture
* profile-based design
* viewer/format separation
* structured content over flattened presentation
* explicit extensions over hidden behavior
* portability as a core property
* simplicity in the foundation layer

Avoid turning PRD into either:

* a rigid static print-only format
* an undisciplined packaged web app

---

## Planned components

### `schemas/`

Canonical schema definitions for the PRD manifest and structured content models.

### `packages/prd-types`

Shared core types used across validator, viewer, CLI, and tooling.

### `packages/prd-validator`

Validation logic for manifests, entry paths, resources, and profile alignment.

### `packages/prd-packager`

Packaging logic for producing `.prd` ZIP archives from source package directories.

### `packages/prd-cli`

Command-line tooling such as:

```bash
prd validate <path>
```

Later commands may include packaging, inspection, and profile-aware utilities.

### `packages/prd-viewer-core`

Shared parsing, resolution, support-state, and rendering-model logic for PRD viewing.

### `apps/prd-viewer-web`

A minimal web viewer that proves the concept of PRD in actual use.

### `examples/`

Reference PRD packages used for validation, tests, demos, and viewer development.

---

## First target deliverables

The first useful deliverables for this repo are:

* `schemas/manifest.schema.json`
* `schemas/content.schema.json`
* `packages/prd-validator`
* `packages/prd-cli`
* `examples/document-basic`
* `apps/prd-viewer-web`

---

## Contribution expectations

Contributors should:

* make small, reviewable changes
* update docs when format behavior changes
* avoid inventing new canon terminology casually
* add tests for validator behavior
* keep naming consistent across schema, viewer, validator, and examples

Important directional decisions should be recorded in `docs/decisions/PRD_DECISIONS.md`.

---

## Long-term direction

Over time, PRD may support broader tooling and extension lanes such as:

* richer profile systems
* import/export pipelines
* annotations/comments
* signatures
* protected/private content
* ownership/license metadata
* AI helper layers
* other extension-governed capabilities

Those should remain **disciplined extensions**, not core-foundation clutter.

---

## Status

Current phase: **foundation bootstrapping**

The project is establishing the minimum serious base needed for PRD to become a real format and ecosystem:

* clear manifest model
* predictable package shape
* validation
* examples
* viewer proof-of-concept

---

## Canonical reminder

PRD wins by being:

* portable
* structured
* profile-aware
* responsive
* extensible

It does **not** win by becoming a prettier PDF clone or a random packaged app mess.
