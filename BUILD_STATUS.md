# BUILD STATUS

## 2026-04-22

- Started the `0.1.0` publish-recovery slice by adding `scripts/release-publish-preflight.mjs`, root `pnpm release:preflight`, and `examples/dist/release-publish-preflight-summary.json` as the canonical npm publish-identity diagnostic surface.
- Wired the Release workflow to run publish preflight before first-preview bootstrap publish and upload the preflight summary as a workflow artifact for CI debugging.
- Hardened the release docs (`README.md`, `docs/governance/PRD_RELEASE_POLICY.md`, `docs/governance/PRD_NPM_RELEASE_RUNBOOK.md`) so they now describe the real operator sequence for npm auth, `eonhive` org membership, and first-preview bootstrap behavior.
- Fixed a real post-publish verification defect by removing TypeScript-only `as const` syntax from `scripts/external-consumer-smoke.mjs`, keeping the downstream npm consumer smoke path executable under plain Node.
- The actual npm publish is still blocked outside the repo until the `NPM_TOKEN` owner has verified publish rights for the `eonhive` npm organization and the Release workflow is rerun successfully on `main`.

## 2026-04-16

- Added a post-publish external-consumer smoke path with `scripts/external-consumer-smoke.mjs`, root `pnpm consumer:smoke:npm`, and `.github/workflows/post-publish-consumer-smoke.yml` so published npm packages are verified from a clean temp project without workspace linking.
- Refactored `apps/prd-viewer-web` package-facts/runtime copy to consume `PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR` directly, removing duplicated app-local reference-viewer load-mode/support-state strings.
- Published a validator-valid runtime conformance corpus under `examples/runtime-conformance/`, including a machine-readable expected-results manifest for `fully-supported`, `safe-mode`, and `unsupported-required-capability` reference-viewer outcomes.
- Added `scripts/runtime-conformance-check.mjs`, root `pnpm runtime:conformance`, and `examples/dist/runtime-conformance-summary.json` as the canonical executable runtime-baseline surface for the reference viewer.
- Added manifest-driven runtime tests and script tests so the published corpus is verified through validator truth, viewer-core support-state truth, and summary artifact generation.
- Completed the runtime-contract hardening slice by aligning `docs/runtime/PRD_CAPABILITY_MODEL.md` and `docs/runtime/PRD_CONFORMANCE.md` with executable type/code surfaces in `packages/prd-types` and `packages/prd-viewer-core`.
- Added typed runtime descriptor surfaces in code: `PrdRuntimeCapabilityDescriptor`, `PrdReferenceLoadMode`, `PRD_REFERENCE_VIEWER_SUPPORTED_CAPABILITIES`, `PRD_REFERENCE_VIEWER_SUPPORT_STATES`, and `PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR`.
- Expanded `packages/prd-viewer-core` tests to lock the current reference-viewer runtime descriptor and support-state subset to the documented runtime baseline.
- Expanded root/docs navigation so canonical control docs, runtime contracts, and prompt packs are discoverable directly from `README.md` and `docs/README.md`.
- Completed the conformance-lock slice by ratifying `docs/core/PRD_MINIMAL_VALID_SPEC.md`, replacing provisional `TBD` conformance-matrix rows with concrete validator/runtime truth, and cross-linking the minimal-valid baseline to live manifest/profile/runtime docs.
- Added field-level conformance coverage to `docs/core/PRD_MANIFEST_DRAFT.md`, including current schema/validator truth for `required`, `identity`, `public`, `localization`, `compatibility`, `assets`, `attachments`, `extensions`, and `protected`.
- Published a non-canonical invalid conformance fixture corpus under `examples/conformance/` for `general-document`, `comic`, and `storyboard`, and wired those directories into validator and built-CLI test coverage.
- Added `scripts/foundation-gate.mjs`, root `pnpm foundation:gate`, and `examples/dist/foundation-gate-summary.json` as the canonical repo-level conformance gate/artifact surface, with dedicated script tests for summary generation and failure reporting.
- Updated contributor-facing docs to treat `pnpm foundation:gate` as the canonical one-command local conformance gate while leaving `release:check` unchanged.
- Revised `docs/core/PRD_MINIMAL_VALID_SPEC.md` (draft v0.2) to align with accepted decisions and reviewer feedback by restoring `.prd` ZIP transport as a normative interchange requirement, restoring MUST-level portability/openability constraints, and making `general-document` structured JSON entry conformance explicit.
- Started NEXT_STEPS item 23 by adding `docs/core/PRD_MINIMAL_VALID_SPEC.md` (draft v0.1) with MVP-scoped normative rules, explicit non-goals, manifest/entry constraints, and a starter conformance matrix to map requirements to validator checks and fixtures.
- Added a new active next-phase backlog slice in `NEXT_STEPS.md` (items 23-28) covering minimal valid spec ratification, manifest conformance mapping, profile fixture hardening, foundation-gate automation, capability/conformance docs, and docs discoverability alignment.
- Added a unified orchestration artifact to `docs/prompts/PRD_MASTER_PROMPTS.md` (`Prompt 00. Unified Next-Steps Execution Prompt`) so all active next-step tasks can be planned and executed together under canonical PRD constraints.
- Completed contributor-guidance extraction by adding `docs/contributing.md` and linking it from the README contributor MVP gate section so onboarding details can evolve without overloading top-level docs.
- Completed a versioned machine-readable CLI contract doc by adding `docs/runtime/PRD_CLI_JSON_CONTRACT.md` (validate/inspect JSON schema snippets plus `prd-cli-json-v0.1` compatibility rules) and linking it from README + `packages/prd-cli/README.md`.
- Completed optional root-doc canonical path enforcement by extending `scripts/check-docs-consistency.mjs` with `--include-root-docs` support for selected non-archive root docs (`BUILD_STATUS.md`, `NEXT_STEPS.md`), and documented the scope/rationale in README.
- Hardened docs-consistency allowlist matching by requiring the explicit decisions-ledger allowance to match at the specific snippet span, preventing unrelated forbidden references in `docs/decisions/PRD_DECISIONS.md` from being silently ignored.
- Corrected `docs/runtime/PRD_CLI_JSON_CONTRACT.md` inspect schema snippet to a satisfiable single-object contract so payloads that include both validate fields and `inspection` validate as intended for downstream automation.
- Completed roadmap/glossary canonical path cleanup by normalizing stale references to `docs/...` paths and explicitly labeling still-missing planned docs in `docs/foundation/04_PRD/PRD_ROADMAP.md`.
- Completed docs consistency guard expansion in `scripts/check-docs-consistency.mjs` by scanning markdown across canonical `docs/` paths, excluding archive/history trees by default, and preserving forbidden-pattern checks with an explicit intentional legacy-reference allowance in the canonical decisions ledger.
- Completed package-level CLI contract documentation by adding `packages/prd-cli/README.md` (commands, exit codes, stable text/JSON contracts for `pack`, `validate`, and `inspect`) and linking it from repository top-level docs.
- Completed canonical render-mode helper alignment by introducing typed render-mode utilities in `packages/prd-viewer-core`, refactoring `apps/prd-viewer-web/src/viewerRenderMode.ts` to consume the core helper, and extending viewer-core/web tests to guard against contract drift.

## 2026-04-15

- Completed NEXT_STEPS item 18 by updating `README.md` plus release governance docs to explicitly define `pnpm examples:smoke` as the canonical aggregate smoke command, document `--json-summary` as CI annotation/reporting support, and align smoke-gate wording across release/check flow guidance.
- Completed NEXT_STEPS item 5 by adding table-driven validator coverage for entry-path validation branches (`entry-empty`, `entry-absolute`, `entry-backslash`, `entry-url`, `entry-traversal`, `entry-directory`) and preserving stable issue-code assertions.
- Completed NEXT_STEPS item 6 by adding a validator manifest-level profile/entry compatibility matrix test for `general-document`, `comic`, and `storyboard`, including structured JSON, HTML legacy fallback, and invalid non-canonical entry cases.
- Completed NEXT_STEPS item 15 by adding built CLI E2E invalid-package snapshots for `validate` and `inspect` in both text and `--json` modes.
- Completed NEXT_STEPS items 10 and 17 by adding a docs consistency guard script that fails on stale canonical path references in control docs and wiring it into the `codex:check` pipeline via `docs:check`.
- Completed NEXT_STEPS item 11 by adding a CI step to run `pnpm examples:smoke -- --json-summary` and uploading generated summary JSON artifacts from `examples/dist/smoke-summaries/*.json`.
- Extended smoke summary behavior to emit per-example JSON files under `examples/dist/smoke-summaries/` when `--json-summary` is enabled, so CI artifact upload can reliably capture machine-readable outputs.
- Consolidated the canonical PRD decisions ledger into `docs/decisions/PRD_DECISIONS.md`, merged unique historical decisions from legacy foundation decisions-path pointer, and converted the foundation-path file into an archived pointer to prevent future drift.
- Updated source-of-truth decision-log references in `README.md`, `AGENTS.md`, `docs/governance/PRD_PROMPT_DOCTRINE.md`, and `docs/prompts/PRD_MASTER_PROMPTS.md` to point to `docs/decisions/PRD_DECISIONS.md`.
- Completed a CLI test-hardening task by adding built-CLI snapshot coverage for `validate` and `inspect` text/`--json` output using the existing E2E fixture flow, including byte-field normalization to keep snapshots deterministic while still catching contract drift.
- Completed NEXT_STEPS item 1 by aligning the README contributor MVP gate to current root script names (`typecheck`, `test`, `build`, `examples:smoke`) and clarifying script-name sync expectations.
- Completed NEXT_STEPS item 2 by updating README changeset guidance to match current CI-driven `main` release workflow policy and non-publishing change expectations.
- Completed NEXT_STEPS item 6 by adding dedicated `apps/prd-viewer-web` tests that assert rendering-mode message behavior for structured JSON, HTML fallback, and unsupported modes.
- Completed NEXT_STEPS item 7 by adding a cross-package integration test that validates support-state/render-mode alignment across validator results, viewer-core document opening, and web render-mode mapping.
- Consolidated and formatting-standardized `NEXT_STEPS.md` as the single checklist-style canonical backlog, confirmed `NEXT_STEPS copy.md` items were already merged, and verified the duplicate file remains removed.
- Updated control docs and docs index references from legacy `foundation/PRD_*.md` paths to canonical `docs/foundation/04_PRD/PRD_*.md` paths (`docs/README.md`, `docs/architecture/PRD_SYSTEM_BLUEPRINT.md`, `docs/decisions/PRD_DECISIONS.md`) and verified with repo-wide search.
- Updated canonical reference lists in `README.md`, `AGENTS.md`, `docs/governance/PRD_PROMPT_DOCTRINE.md`, and `docs/prompts/PRD_MASTER_PROMPTS.md` to use real `docs/foundation/04_PRD/*` file paths; verified no stale legacy foundation-path references remain.
- Consolidated `NEXT_STEPS.md` into a single canonical numbered backlog format, added a top-line canonical note, and recorded that `NEXT_STEPS copy.md` was not present for merge/archival during this update.
- Added a contributor-facing README section documenting the MVP local gate flow (workspace linking, required local checks, changeset guidance, and deferred npm publication policy).
- Included exact commands and expected outcomes so contributors can validate fully without npm credentials.
- Completed: Defined a stable PRD CLI output contract for `validate` and `inspect` with explicit, documented fields used by both text and `--json` output.
- Completed: Added deterministic human-readable section ordering and consistent unknown-command failure behavior for the limited command surface (`pack`, `validate`, `inspect`).
- Completed: Expanded CLI tests to cover missing-argument usage errors, exit code behavior (`0` valid / `1` invalid), expected JSON key presence, and deterministic text section ordering.
- Expanded validator schema tests to assert canonical top-level manifest required fields.
- Expanded validator unit tests to cover required manifest field issue codes, entry path compatibility, and profile/entry mismatch failures.
- Added a fixture-style helper for validator tests to quickly build `PrdFileMap` test inputs.
- Stabilized manifest required-field and profile-entry-format issue code selection in `packages/prd-validator/src/index.ts` via shared constants.
- Added an MVP smoke-gate script for `examples/document-basic` that runs pack, source validate, packed validate, and packed inspect in a strict sequence.
- Added root script target `examples:smoke:document-basic` with a prebuild hook for `@eonhive/prd-cli`.
- Verified the new smoke-gate command succeeds end-to-end.
- Added explicit viewer UI rendering-mode messages in `apps/prd-viewer-web` to distinguish:
  - structured JSON entry rendering,
  - HTML fallback rendering,
  - unsupported entry mode detection.
- Clarified messaging that validator package validity and viewer rendering capability are separate concerns.
- Expanded `packages/prd-viewer-core` tests to verify viewer unsupported/fallback states can still coexist with validator-valid packages.
- Completed: Replaced assertion-only CLI output-contract checks with snapshot coverage for both `validate`/`inspect` text output and `--json` output shapes.
- Completed: Added built-binary E2E CLI coverage that executes `packages/prd-cli/dist/cli.js` for `pack`, `validate`, and `inspect` against temporary fixtures.
- Completed: Added smoke scripts for `examples/resume-basic`, `examples/comic-basic`, and `examples/storyboard-basic`.
- Completed: Added `examples:smoke` root aggregator command that runs all example smoke gates.
- Completed: Added optional machine-readable smoke summary emission via `--json-summary` in smoke scripts.

- Refined built-CLI E2E test naming to explicitly assert dist-binary command execution for `pack`, `validate`, and `inspect` as the command-surface gate.
- Added aggregate smoke orchestrator script `scripts/examples-smoke-all.mjs` and wired root `examples:smoke` to that single command entrypoint.
- Completed housekeeping request to keep NEXT_STEPS as canonical backlog with a single numbered checklist style; confirmed NEXT_STEPS copy file is absent and consolidated note retained.
- Updated stale canonical-doc references in `README.md`, `AGENTS.md`, `docs/governance/PRD_PROMPT_DOCTRINE.md`, and `docs/prompts/PRD_MASTER_PROMPTS.md` to point at `docs/decisions/PRD_DECISIONS.md`.
- Updated `NEXT_STEPS.md` checked and pending decisions-path items to consistently reference the finalized canonical path `docs/decisions/PRD_DECISIONS.md`, while explicitly treating foundation-path mentions as duplicate legacy references.
