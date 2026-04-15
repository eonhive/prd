# AGENTS.md

This file adds PRD-specific rules on top of the global defaults in `/Users/nappy.cat/.codex/AGENTS.md`.

## Project identity

PRD stands for **Portable Responsive Document**.

PRD is a **structured, profile-based, portable document format and ecosystem** designed to support responsive document behavior beyond static traditional formats like PDF.

PRD is **not**:

* just a PDF clone
* just a zipped website
* just a viewer app
* just a crypto document concept

**Important:**
**PRD** is the core format/system direction.
**PRDc** is the Document Archive Codex side of the ecosystem.
Do **not** confuse them.

---

## Source-of-truth discipline

When making implementation or documentation decisions, follow the canonical PRD docs in this order:

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

Use canonical names from those docs.
Do not invent new canon terminology casually.

---

## Core architectural rules

1. **Manifest-first**

   * Treat the manifest as the canonical structural source of truth.
   * Do not invent hidden structure outside the manifest.
   * Do not silently change manifest semantics.

2. **Profile-based**

   * PRD must remain profile-based, not document-by-document chaotic.
   * Profiles are first-class system concepts, not cosmetic labels.

3. **Viewer and format are distinct**

   * The viewer interprets PRD.
   * The viewer does not define PRD.
   * Avoid coupling core format decisions to one viewer implementation.

4. **Portable, structured, responsive**

   * Preserve portability as a core property.
   * Preserve semantic structure rather than flattening everything into static presentation.
   * Support responsive rendering without turning documents into arbitrary app bundles.

5. **Extensible, but disciplined**

   * Future advanced features must enter through explicit, version-aware extensions.
   * Do not smuggle extension behavior into the core format.

---

## First-class profiles

These profiles are first-class in the architecture and must be treated seriously:

* `general-document`
* `comic`
* `storyboard`

General document kinds such as:

* `article`
* `report`
* `resume`
* `portfolio`
* `magazine`

currently belong inside the `general-document` family unless later canon promotes them separately.
`web novel` currently belongs inside the `general-document` family.
`manhua` and `manhwa` currently belong inside the `comic` family.

**Important:**
`comic` and `storyboard` are not secondary hacks or future bolt-ons.

---

## MVP priorities

During the first implementation phase, focus on:

* manifest model
* package layout
* profile model
* structured content model
* validator
* CLI
* one minimal web viewer
* example PRD packages

The first goal is a **disciplined executable foundation**, not ecosystem sprawl.

Current first practical example set:

* `examples/document-basic/`
* `examples/resume-basic/`
* `examples/comic-basic/`
* `examples/storyboard-basic/`

---

## Explicit non-goals for the MVP foundation

Do **not** add these into the core MVP foundation unless explicitly requested by the repo owner:

* crypto ownership systems
* payment/commerce systems
* full encryption architecture
* full signature/authenticity stack
* live networked document behavior
* giant scripting/runtime systems
* full conversion platform
* every advanced viewer feature at once

These are later extension lanes, not first-foundation requirements.

---

## Repo workflow

* Make small, reviewable changes.
* Update docs when schemas or package layout change.
* Add tests for validators, parsers, and example packages.
* Never silently change manifest semantics.
* Never add undeclared resources outside the manifest/resource map.
* Keep naming aligned across schema, validator, viewer, CLI, and examples.

---

## Format guidance

When making format decisions:

* prefer structured content over HTML-first website behavior
* avoid arbitrary file-tree chaos
* avoid viewer-specific junk in the package root
* avoid random metadata dumping
* avoid flattening everything into print-like static layout
* avoid turning PRD into a disguised web app bundle

PRD should not become either:

* a rigid static-print-only format
* an undisciplined "anything goes" zipped web bundle

---

## Current implementation truth

Until higher-priority canon changes:

* the canonical executable `general-document` path is a structured JSON entry under `content/`, typically `content/root.json`
* HTML-backed document opens are fallback behavior, not the canonical fully-supported `general-document` path
* bare `resume` is legacy/deprecated as a top-level profile identifier
* resume-shaped packages should use `profile: "general-document"` and keep authored resume-specific data under `profiles/resume.json` or normal structured content

Keep docs, validator behavior, viewer behavior, and examples aligned with those truths.

---

## Package guidance

Assume the package stays manifest-centered.

Preferred conceptual structure:

```text
my-document.prd/
  manifest.json
  content/
  assets/
  profiles/
  extensions/
  protected/
```

Keep structure predictable and toolable.

---

## Manifest guidance

The manifest should remain:

* canonical
* versioned
* profile-aware
* validateable
* extensible
* disciplined

Current manifest canon:

* required opening fields stay at the top level: `prdVersion`, `manifestVersion`, `id`, `profile`, `title`, and `entry`
* optional durable references belong under `identity`
* optional lean reader-facing metadata belongs under `public`
* locale declarations belong under `localization`
* do not revive required nested `header`, `metadata`, or `structure` sections

Do not collapse the manifest into a random blob.

---

## Viewer and CLI guidance

Keep viewer behavior and format validity separate:

* the validator decides whether a package is structurally valid
* the viewer decides how much of a valid package it can truthfully render
* the CLI should expose packaging, validation, and inspection cleanly without redefining the format

Avoid hiding format behavior inside one viewer or one app-specific code path.

---

## Coding guidance

When generating code:

* keep changes small and reviewable
* prefer clear TypeScript types and explicit schemas
* add tests for validators and parsers
* keep interfaces stable and documented
* avoid hidden magic
* avoid premature abstraction when the core model is still being locked
* favor readability over cleverness

Current repo surfaces to keep aligned:

* `packages/prd-types`
* `packages/prd-validator`
* `packages/prd-packager`
* `packages/prd-cli`
* `packages/prd-viewer-core`
* `apps/prd-viewer-web`

---

## Documentation guidance

When changing the format, schemas, or package rules:

* update relevant docs
* keep naming consistent across schema, validator, viewer, and examples
* record important directional changes in `docs/decisions/PRD_DECISIONS.md`
* do not introduce new canon terminology casually

When a naming or model change is provisional, label it clearly as provisional.

---

## Example-package guidance

Always maintain at least one clean example package that proves the system works end-to-end.

Preferred first milestone:

* `examples/document-basic/`

  * validates successfully
  * opens in the viewer
  * demonstrates manifest + structured content + responsive rendering

After that, expand to:

* `resume-basic`
* `comic-basic`
* `storyboard-basic`

Those examples should remain useful for validation, CLI, tests, and viewer checks.

---

## Done criteria for early work

A task is not complete unless relevant items below are true:

* code builds
* tests pass when relevant to the change
* validator behavior is tested
* example package still works
* viewer still opens supported examples
* docs stay aligned with the current implementation
* no canon rules were broken silently

Minimum early milestone expectation:

* example PRD package validates
* viewer opens the example package successfully

---

## Decision priority

When in doubt, preserve these priorities:

1. portability
2. structure
3. manifest discipline
4. profile clarity
5. responsive behavior
6. future extensibility
7. implementation simplicity

---

## Final reminder

PRD wins by being:

* portable
* structured
* profile-aware
* responsive
* extensible

It does **not** win by becoming:

* a prettier PDF clone
* a random packaged website
* a dumping ground for every future dream feature


- follow canonical docs
- do not invent new product scope
- keep the MVP small and practical
- prefer clear types, readable modules, and minimal abstraction
- update BUILD_STATUS.md with what was completed
- update NEXT_STEPS.md with the next concrete tasks
- update docs if implementation decisions materially change architecture or scope