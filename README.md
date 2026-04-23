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

1. `docs/foundation/04_PRD/PRD_FOUNDATION.md`
2. `docs/decisions/PRD_DECISIONS.md`
3. `docs/foundation/04_PRD/PRD_GLOSSARY.md`
4. `docs/foundation/04_PRD/PRD_ROADMAP.md`
5. `docs/history/PRD_Project_History_Record.md`
6. the specific target doc being updated

Supporting control docs:

* `docs/architecture/PRD_SYSTEM_BLUEPRINT.md`
* `docs/architecture/PRD_SYSTEM_ARCHITECTURE.md`
* `docs/governance/PRD_PROFILE_REGISTRY.md`
* `docs/governance/PRD_PROMPT_DOCTRINE.md`
* `docs/prompts/PRD_MASTER_PROMPTS.md`

---

## Canonical Reading Paths

Start at:

* `docs/README.md`

Use these focused paths from there:

* core format and package canon
  * `docs/core/PRD_MINIMAL_VALID_SPEC.md`
  * `docs/core/PRD_MANIFEST_DRAFT.md`
  * `docs/core/PRD_PACKAGE_LAYOUT_DRAFT.md`
* runtime contracts
  * `docs/runtime/PRD_CAPABILITY_MODEL.md`
  * `docs/runtime/PRD_CONFORMANCE.md`
  * `docs/runtime/PRD_CLI_JSON_CONTRACT.md`
* control docs
  * `docs/decisions/PRD_DECISIONS.md`
  * `docs/governance/PRD_PROFILE_REGISTRY.md`
  * `docs/governance/PRD_RELEASE_POLICY.md`
* prompt packs and doctrine
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
`web novel` currently belongs inside the `general-document` family.
`manhua` and `manhwa` currently belong inside the `comic` family.

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
* resume remains a document kind inside the `general-document` family, not a promoted top-level canonical profile
* web novels are treated as `general-document` family works
* manhua and manhwa are treated as `comic` family works

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
  document-segmented-basic/
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
* core `assets` are packaged reusable resources; linked supplemental references belong under `attachments/`
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
* `pnpm docs:check`
* `pnpm codex:check`
* `pnpm codex:pack`
* `pnpm codex:run:web`
* `pnpm dev:web`
* `pnpm examples:pack`
* `pnpm examples:validate`
* `pnpm examples:smoke`
* `pnpm foundation:gate`
* `pnpm runtime:conformance`
* `pnpm consumer:smoke:npm`
* `pnpm release:audit:registry`
* `pnpm release:check`

Docs consistency guard scope:

- `pnpm docs:check` enforces canonical doc-path usage for `docs/**` plus root control docs (`README.md`, `AGENTS.md`).
- Optional root-doc enforcement is available via `node ./scripts/check-docs-consistency.mjs --include-root-docs` for selected non-archive root docs (`BUILD_STATUS.md`, `NEXT_STEPS.md`).

Example CLI usage:

```bash
prd validate <path>
prd inspect <path>
```

CLI output/exit-code contract: `packages/prd-cli/README.md`.
Versioned machine-readable JSON contract snippets: `docs/runtime/PRD_CLI_JSON_CONTRACT.md`.
Published reference-viewer runtime corpus: `examples/runtime-conformance/runtime-conformance-manifest.json`.


## Contributor MVP gate (no npm credentials required)

Use this flow when contributing in the monorepo before opening a PR.

For the full contributor workflow and checklist, see `docs/contributing.md`.

### 1) Install and keep local workspace links

PRD packages resolve locally through pnpm workspace linking plus semver-compatible internal package ranges.
The repo pins that behavior in [`.npmrc`](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/.npmrc) with `link-workspace-packages=true`.
That keeps changes in `packages/*` immediately available to `apps/*` and other packages without publishing to npm, while still producing consumer-safe package metadata for npm releases.

Run:

```bash
pnpm install
```

Expected outcome:

* install completes successfully
* internal dependencies resolve to local workspace packages (not downloaded published versions)
* you can edit one package and use it from another package immediately

### 2) Run the required local MVP checks

Run the full gate from repo root:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm examples:smoke
```

`pnpm examples:smoke` is the canonical aggregate smoke command for this repo.
Use `pnpm examples:smoke -- --json-summary` when you need machine-readable outputs for CI annotations and reporting.

Expected outcome:

* `pnpm typecheck`: exits 0 with no TypeScript type errors
* `pnpm test`: exits 0 with all tests passing
* `pnpm build`: exits 0 and builds all workspace targets
* `pnpm examples:smoke`: exits 0 after running smoke scripts for `document-basic`, `resume-basic`, `comic-basic`, and `storyboard-basic`
* `pnpm examples:smoke -- --json-summary`: exits 0 and writes JSON summaries for CI annotation under `examples/dist/smoke-summaries/`
* `pnpm runtime:conformance`: exits 0 and writes the reference-viewer runtime summary under `examples/dist/runtime-conformance-summary.json`

If all four pass, the local MVP contributor gate is considered green.

The contributor gate command names above should always match the root `package.json` scripts (`typecheck`, `test`, `build`, `examples:smoke`).

### 3) Changesets vs. non-publishing changes

Use a changeset when your work is intended to change versioned package outputs (for example: public API changes, behavior changes that should ship in a package release, or package dependency/version updates) and is intended for the automated `main`-branch release flow.

Do **not** add a changeset for repository-only work that is not intended for package publication (for example: internal docs, planning notes, or other non-releasable maintenance).

Release publication remains CI-driven from `main`; do not manually publish from feature branches or local workstations except for explicit maintainer emergency recovery.

When a change touches release/check flows, keep smoke gates documented and aligned:

* `pnpm release:check` should include the smoke gate via canonical `pnpm examples:smoke`
* CI/release automation that needs annotations should run `pnpm examples:smoke -- --json-summary`

### 4) npm publication policy during MVP

npm publication is optional and intentionally deferred until milestone stability.
Contributors should focus on local workspace validation and MVP gate health; npm credentials are **not** required to contribute or verify work.

## Current loading baseline

The current PRD reference stack is:

* packaged-first
* offline-first for the base readable path
* eager whole-package in-memory in the reference viewer and current inspection tooling

This repo does **not** currently claim streaming, range requests, worker unzip, or lazy section fetch as part of core PRD validity or conformance.

### Install from npm

The public npm surface is a **`0.1.0` public preview** of the PRD tooling packages under the **eonhive** org:

* `@eonhive/prd-types`
* `@eonhive/prd-validator`
* `@eonhive/prd-packager`
* `@eonhive/prd-cli`

They require **Node.js 20+**. The viewer packages stay private and are not part of the npm publish set.

The repo root also now includes [`.nvmrc`](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/.nvmrc) pinned to Node 20 so local release and Codex sessions can match the CI floor directly.

```bash
npm install -g @eonhive/prd-cli
prd validate path/to/package.prd
```

Without a global install:

```bash
npx @eonhive/prd-cli validate path/to/examples/document-basic
npx @eonhive/prd-cli pack path/to/examples/document-basic --out ./out.prd
```

`prd validate` accepts a `.prd` archive or an unpacked package directory. For programmatic use, depend on `@eonhive/prd-validator` and import `@eonhive/prd-validator/node` for filesystem validation (`validatePackage`).

Source and issues: [github.com/eonhive/PRD](https://github.com/eonhive/PRD).

Release management uses **Changesets** plus the GitHub Actions Release workflow on `main`. Do not publish from an ad hoc local machine. Use:

* `pnpm changeset` to record package changes
* `pnpm release:bootstrap` to inspect first-preview bootstrap state
* `pnpm release:check` for the release gate (including canonical `pnpm examples:smoke`)
* `pnpm release:preflight` to verify npm token auth, `eonhive` org membership, target package names, and first-preview bootstrap state
* `pnpm release:audit:registry` to verify published npm metadata contains no `workspace:*` dependencies and that `latest` points to the expected version
* `pnpm release:status` to inspect pending release state

The release workflow publishes only after the Node 20+ CI gate is green. For the one-time `0.1.0` preview, it runs a publish preflight first, then bootstraps any still-unpublished current preview packages, and then falls back to normal Changesets behavior. The preflight writes `examples/dist/release-publish-preflight-summary.json` so npm auth and org-scope failures are explicit instead of surfacing first at `pnpm publish`. After publish, the post-publish verification path now runs a registry metadata audit first and then npm consumer smoke. The audit writes `examples/dist/release-registry-audit-summary.json`. Maintainer docs live in [PRD_RELEASE_POLICY.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/docs/governance/PRD_RELEASE_POLICY.md) and [PRD_NPM_RELEASE_RUNBOOK.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/docs/governance/PRD_NPM_RELEASE_RUNBOOK.md).

`pnpm foundation:gate` is now the canonical repo-level conformance gate. It runs build, tests, docs consistency, example validation, and aggregate example smoke checks, then emits `examples/dist/foundation-gate-summary.json`.

`pnpm runtime:conformance` is the canonical reference-viewer runtime corpus check. It evaluates the published fixtures in `examples/runtime-conformance/runtime-conformance-manifest.json` and emits `examples/dist/runtime-conformance-summary.json`.

`pnpm consumer:smoke:npm` is the post-publish external-consumer smoke check. It installs the published `@eonhive/prd-*` packages from npm in a clean temp project, then exercises `prd pack`, `prd validate`, and `prd inspect` without workspace linking. It emits `examples/dist/external-consumer-smoke-summary.json`.

The current npm preview line starts at `0.1.0`, but `0.1.0` leaked `workspace:*` dependency metadata for some published packages. This repo now prepares `0.1.1` as the corrective consumer-safe patch and does not treat the preview as cleanly shipped until the registry audit and post-publish consumer smoke both pass for `0.1.1`.

### Codex Run Environment

For Codex-driven work, use the repo-local run actions instead of manually piecing together commands:

* `pnpm codex:check`
  Runs `typecheck`, `test`, `build`, and `examples:validate` in one predictable sequence.
* `pnpm codex:pack`
  Builds the workspace and produces the example `.prd` archives under `examples/dist/`.
* `pnpm codex:run:web`
  Builds the workspace, packs the example archives, and starts the web viewer.

Codex desktop also reads [`.codex/environments/environment.toml`](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/.codex/environments/environment.toml) for this workspace. That file now defines:

* `Web Viewer`
* `Check`
* `Release Check`
* `Build`
* `Tests`
* `Pack Examples`
* `Validate Examples`

The environment setup step runs `pnpm install` in the project root when Codex creates a fresh worktree for this repo.

The repo also now includes [`.github/workflows/codex-ci.yml`](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/.github/workflows/codex-ci.yml), which runs the same Codex check flow automatically on pushes, pull requests, and manual workflow dispatch.

For release automation, the repo also includes [`.github/workflows/release.yml`](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/.github/workflows/release.yml), which gates npm publication through Changesets and CI on `main`.

---

## Example flow

1. Run `pnpm codex:check`
2. Run `pnpm codex:run:web`
3. Open the web viewer and load files from `examples/dist/`

Current example behavior:

* `document-basic` is the canonical small structured `general-document` example using `content/root.json` and now demonstrates structured links, tables, charts, packaged audio media, one bundled attachment, and a French localized resource overlay for both content and small reader-facing metadata, including localized cover and inline image selection
* `document-segmented-basic` proves the Phase 3 segmentation path for larger `general-document` works by keeping one canonical root and moving top-level sections into packaged files under `content/sections/`; it also carries one lean collection membership through manifest `identity` and `public`
* `resume-basic` is a resume-flavored structured `general-document` example that keeps authored resume metadata under `profiles/resume.json`, uses `presentation: "scan"` for a scan-oriented resume viewer surface, and includes supplemental manifest `identity` and `public` references
* `comic-basic` is now the canonical structured `comic` example using `content/root.json` with image-backed panel cards, optional panel navigation, and one lean manifest-declared series membership
* `storyboard-basic` is now the canonical structured `storyboard` example using `content/root.json` with image-backed frames and optional review-grid behavior

The web viewer also now exposes a locale switcher when a package declares localization and includes localized content mappings under `content/locales/index.json`. For `general-document`, the preferred path is one shared structured root plus localized resource overlays; those overlays can localize both the document body and small reader-facing metadata such as summary, cover, lean collection/series labels, and declared image-node asset selection. Full alternate locale roots remain an escape hatch, but they are not the canonical example path.

The reference viewer also now surfaces declared attachments as supplemental links. Bundled attachments resolve from `attachments/`, while linked attachments remain optional external references and do not replace the packaged base open path.

Larger `general-document` packages may now also segment top-level sections into packaged files under `content/sections/` while keeping `manifest.entry` pointed at `content/root.json`. This keeps the small-path example small while still giving bigger works a disciplined scaling path.

Across packages, PRD now also uses a lean collection/series relationship model in the manifest rather than a spine or package-of-packages container. Stable grouping refs live under `identity`, small display labels live under `public`, and richer about-the-series material still belongs in content or attachments.

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
