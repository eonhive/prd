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

* source-verified implementation assessment
  * [October 26, 2026 architecture audit and modernization plan](architecture/PRD_ARCHITECTURE_ASSESSMENT_2026-10-26.md) (evidence and pending proposals; does not replace format canon)
  * [October 29 current-loader measurements](core/PRD_PERFORMANCE_AND_LOADING.md#13-current-loader-measurements-and-stored-windows-october-29-2026) (both transports, stored/DEFLATE, byte parity, rejected trials and Node-only limits)
  * [October 30 allocation investigation](core/PRD_PERFORMANCE_AND_LOADING.md#14-allocation-investigation-and-viewer-blob-preparation-october-30-2026) (rejected decoder preallocation, retained boundaries and private Viewer Blob-copy removal)
  * [Bounded archive mutation checks](core/PRD_CONTAINER_FORMAT.md#bounded-mutation-checks-october-30-2026) (reproducible controls/operators, filename corrections and assurance boundary)
* core format canon
  * `core/PRD_CONTAINER_FORMAT.md` (magic bytes, ZIP payload, legacy compatibility and reference archive limits)
  * `core/PRD_MINIMAL_VALID_SPEC.md`
  * `core/PRD_MANIFEST_DRAFT.md`
  * `core/PRD_PACKAGE_LAYOUT_DRAFT.md`
  * `core/PRD_VERSIONING_POLICY.md`
* runtime contracts
  * `runtime/PRD_CAPABILITY_MODEL.md`
  * `runtime/PRD_CONFORMANCE.md`
  * `runtime/PRD_HTML_FALLBACK_POLICY.md` (private Viewer containment policy; live browser acceptance pending)
  * `runtime/PRD_CLI_JSON_CONTRACT.md`
  * `../examples/runtime-conformance/runtime-conformance-manifest.json`
* optional extension contracts
  * [Digital signatures v1](extensions/PRD_SIGNATURE_V1.md) (logical file coverage and explicit public-key trust)
* profile specs
  * `profiles/PRD_PROFILE_GENERAL_DOCUMENT.md`
  * `profiles/PRD_PROFILE_COMIC.md`
  * `profiles/PRD_PROFILE_STORYBOARD.md`
* control docs
  * `governance/PRD_PROFILE_REGISTRY.md`
  * `governance/PRD_PROMPT_DOCTRINE.md`
  * `governance/PRD_RELEASE_POLICY.md`
  * `governance/PRD_HOSTING_RUNBOOK.md`
* PRD Convert foundation
  * [Source inventory, architecture record and safety limits](architecture/PRD_CONVERT_PHASE_1.md)
  * [Real Markdown conversion example](../examples/conversion-markdown/README.md)
  * [HTML mapping and safety policy](architecture/PRD_CONVERT_HTML.md)
  * [Real HTML conversion example](../examples/conversion-html/README.md)
  * [CBZ mapping and bounded archive policy](architecture/PRD_CONVERT_CBZ.md)
  * [Real CBZ comic conversion example](../examples/conversion-cbz/README.md)
  * [EPUB chapter mapping and XML safety policy](architecture/PRD_CONVERT_EPUB.md)
  * [Real EPUB book conversion example](../examples/conversion-epub/README.md)
  * [DOCX body mapping and OPC safety policy](architecture/PRD_CONVERT_DOCX.md)
  * [Real DOCX conversion example](../examples/conversion-docx/README.md)
  * [PDF extraction, fallback and process limits](architecture/PRD_CONVERT_PDF.md)
  * [Real mixed-page PDF conversion example](../examples/conversion-pdf/README.md)
  * [Convert Web execution and limits](architecture/PRD_CONVERT_WEB.md)
  * [Browser HTML and converter workspace](architecture/PRD_CONVERT_WEB_HTML.md)
  * [Browser CBZ and comic page sequence](architecture/PRD_CONVERT_WEB_CBZ.md)
  * [Comic conversion page-order repair](architecture/PRD_CONVERT_PAGE_REVIEW.md)
  * [Supplied comic descriptions and session drafts](architecture/PRD_CONVERT_COMIC_DESCRIPTIONS.md)
  * [Conversion quality diagnostic review](architecture/PRD_CONVERT_QUALITY_REVIEW.md)
  * [Actual browser-generated conversion example](../examples/conversion-web/README.md)
* product boundaries
  * `product/PRD_PRODUCT_BOUNDARIES.md`
  * `product/PRD_AUTHORING_WORKFLOW.md`
  * `product/PRD_IMPORT_EXPORT_MATRIX.md`
* `product/PRD_LIVING_HOMEPAGE.md` (six-chapter public experience, uRK capability audit, and real Viewer integration)
* `product/PRD_VISUAL_IDENTITY.md` (shared purple identity, public navigation, page styling, and artwork provenance)
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
* `governance/PRD_HOSTING_RUNBOOK.md`
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
* `PRD_HOSTING_RUNBOOK.md`

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
* `PRD_HTML_FALLBACK_POLICY.md`
* `PRD_CLI_JSON_CONTRACT.md`

Published executable runtime corpus:

* `../examples/runtime-conformance/runtime-conformance-manifest.json`

### `profiles/`

Dedicated profile specs:

* `PRD_PROFILE_GENERAL_DOCUMENT.md`
* `PRD_PROFILE_COMIC.md`
* `PRD_PROFILE_STORYBOARD.md`

### `extensions/`

Optional extension-layer specs, currently including [PRD_SIGNATURE_V1.md](extensions/PRD_SIGNATURE_V1.md). These do not become mandatory core-format requirements.

### `product/`

Product-boundary and ecosystem-role docs:

* `PRD_PRODUCT_BOUNDARIES.md`
* `PRD_AUTHORING_WORKFLOW.md`
* `PRD_IMPORT_EXPORT_MATRIX.md`

Current public demo surface:

* `../apps/prd-viewer-web/` (one deployable app with `/` Home, `/viewer/` reference Web Viewer workspace, and `/docs/` public docs index)
* `governance/PRD_HOSTING_RUNBOOK.md` (Cloudflare production and GitHub Pages fallback/staging path)
* `../.github/workflows/viewer-demo-pages.yml` (temporary GitHub Pages staging/fallback deployment)
* `../wrangler.toml` (Cloudflare Workers Static Assets output and SPA routing config)
* `pnpm viewer:demo:check:cloudflare` (production build and unauthenticated deployment dry run)
* `pnpm viewer:demo:preview:cloudflare` (production build served through the local Workers runtime)

The public `/docs/` route is a navigation layer over canonical repo docs. It is not a replacement for this directory, and it intentionally does not link `../codex/` operational planning files.

The index offers a first-use sample path and section jump links; hosting details are kept in a maintainer disclosure instead of the introductory panel. Published CLI command availability is documented in `../packages/prd-cli/README.md`; repository authoring commands must not be assumed to exist in npm `0.1.1`.

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
