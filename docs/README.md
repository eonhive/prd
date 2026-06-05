# Docs Index

This directory holds the PRD documentation set.

It is organized by role so the live canon, active supporting docs, and archived materials are easier to find.

---

## Start Here

If you are entering from the repo root:

1. read `foundation/04_PRD/PRD_FOUNDATION.md`
2. read `decisions/PRD_DECISIONS.md`
3. pick the path you actually need below instead of browsing the tree blindly

Primary paths:

* core format canon
  * `core/PRD_MINIMAL_VALID_SPEC.md`
  * `core/PRD_MANIFEST_DRAFT.md`
  * `core/PRD_PACKAGE_LAYOUT_DRAFT.md`
  * `core/PRD_VERSIONING_POLICY.md`
* runtime contracts
  * `runtime/PRD_CAPABILITY_MODEL.md`
  * `runtime/PRD_CONFORMANCE.md`
  * `runtime/PRD_CLI_JSON_CONTRACT.md`
  * `../examples/runtime-conformance/runtime-conformance-manifest.json`
* profile specs
  * `profiles/PRD_PROFILE_GENERAL_DOCUMENT.md`
  * `profiles/PRD_PROFILE_COMIC.md`
  * `profiles/PRD_PROFILE_STORYBOARD.md`
* control docs
  * `governance/PRD_PROFILE_REGISTRY.md`
  * `governance/PRD_PROMPT_DOCTRINE.md`
  * `governance/PRD_RELEASE_POLICY.md`
* product boundaries
  * `product/PRD_PRODUCT_BOUNDARIES.md`
  * `product/PRD_AUTHORING_WORKFLOW.md`
  * `product/PRD_IMPORT_EXPORT_MATRIX.md`
* prompt packs
  * `prompts/PRD_MASTER_PROMPTS.md`

---

## Canonical Source Order

Use this order when producing or updating PRD work:

1. `docs/foundation/04_PRD/PRD_FOUNDATION.md`
2. `decisions/PRD_DECISIONS.md`
3. `docs/foundation/04_PRD/PRD_GLOSSARY.md`
4. `docs/foundation/04_PRD/PRD_ROADMAP.md`
5. `history/PRD_Project_History_Record.md` and other history/archive docs when relevant
6. the specific target doc being updated

Supporting control docs:

* `architecture/PRD_SYSTEM_BLUEPRINT.md`
* `architecture/PRD_SYSTEM_ARCHITECTURE.md`
* `governance/PRD_PROFILE_REGISTRY.md`
* `governance/PRD_PROMPT_DOCTRINE.md`
* `governance/PRD_RELEASE_POLICY.md`
* `governance/PRD_NPM_RELEASE_RUNBOOK.md`
* `prompts/PRD_MASTER_PROMPTS.md`

---

Supporting implementation contracts:

* `../packages/prd-cli/README.md` (CLI command/output/exit-code contract)

---

## Folder Map

### `foundation/`

Core source-of-truth docs for PRD direction:

* `PRD_FOUNDATION.md`
* `PRD_GLOSSARY.md`
* `PRD_ROADMAP.md`

### `decisions/`

Accepted and pending directional decisions:

* `PRD_DECISIONS.md`

### `architecture/`

System-level structure and milestone/process architecture:

* `PRD_SYSTEM_BLUEPRINT.md`
* `PRD_SYSTEM_ARCHITECTURE.md`

### `governance/`

Control docs for profile governance and prompt discipline:

* `PRD_PROFILE_REGISTRY.md`
* `PRD_PROMPT_DOCTRINE.md`
* `PRD_RELEASE_POLICY.md`
* `PRD_NPM_RELEASE_RUNBOOK.md`

### `prompts/`

Reusable PRD prompt system docs:

* `PRD_MASTER_PROMPTS.md`

### `core/`

Format/spec-layer docs:

* `PRD_MINIMAL_VALID_SPEC.md`
* `PRD_MINIMAL_VALID_PRD.md`
* `PRD_MANIFEST_DRAFT.md`
* `PRD_ASSETS_AND_ATTACHMENTS.md`
* `PRD_COLLECTION_AND_SERIES_MODEL.md`
* `PRD_SEGMENTATION_MODEL.md`
* `PRD_PERFORMANCE_AND_LOADING.md`
* `PRD_METADATA_MODEL.md`
* `PRD_PACKAGE_LAYOUT_DRAFT.md`
* `PRD_LOCALIZATION_MODEL.md`
* `PRD_VERSIONING_POLICY.md`

### `runtime/`

Viewer/renderer capability and runtime-facing spec docs:

* `PRD_CAPABILITY_MODEL.md`
* `PRD_CONFORMANCE.md`
* `PRD_CLI_JSON_CONTRACT.md`

Published executable runtime corpus:

* `../examples/runtime-conformance/runtime-conformance-manifest.json`

### `profiles/`

Dedicated profile specs:

* `PRD_PROFILE_GENERAL_DOCUMENT.md`
* `PRD_PROFILE_COMIC.md`
* `PRD_PROFILE_STORYBOARD.md`

### `extensions/`

Reserved location for optional extension-layer specs.

### `product/`

Product-boundary and ecosystem-role docs:

* `PRD_PRODUCT_BOUNDARIES.md`
* `PRD_AUTHORING_WORKFLOW.md`
* `PRD_IMPORT_EXPORT_MATRIX.md`

Current public demo surface:

* `../apps/prd-viewer-web/` (one deployable app with `/` landing page and `/viewer/` reference Web Viewer workspace)
* `../.github/workflows/viewer-demo-pages.yml` (GitHub Pages deployment)

### `market/`

Reserved location for white paper and external narrative docs.

### `history/`

Active history record:

* `PRD_Project_History_Record.md`

### `archive/`

Non-canonical records preserved for reference:

* `archive/history/`
* `archive/proposals/`

These may inform work, but they do not override live canon.

### `foundation/04_PRD/`

Active secondary foundation set.

This folder is not a root-level replacement for the main canonical order above, but it is still active guidance and should stay aligned with current canon.

---

## Practical Rule

If a doc in this tree conflicts with the canonical source order above, the higher-priority doc wins.

If the canon is incomplete, label assumptions explicitly and propose the exact doc that should be updated rather than silently inventing architecture.
