# NEXT_STEPS

> Canonical active backlog for the PRD repository. Update this file directly for active work items.
>
> Consolidation note (2026-04-15): `NEXT_STEPS copy.md` is no longer present in the repository. Its unique items are reflected below.

1. [x] Keep the contributor MVP gate section aligned with any future script-name changes in the root `package.json`.
2. [x] If release workflow policy changes, update the changeset vs. non-publishing guidance in `README.md` before the next milestone tag.
3. [x] Added dedicated `docs/contributing.md` and linked it from `README.md` so contributor guidance can evolve beyond the MVP gate summary.
4. [x] Document the stable CLI output contract in package-level CLI docs so downstream tooling can rely on it explicitly.
5. [x] Add table-driven tests for every `entry-*` path validation code (`entry-absolute`, `entry-backslash`, `entry-url`, `entry-directory`, etc.).
6. [x] Add a dedicated validator test matrix for profile-specific entry compatibility across `general-document`, `comic`, and `storyboard`.
7. [x] Add dedicated web app tests for rendering-mode UI messages in `apps/prd-viewer-web` (structured JSON, HTML fallback, unsupported mode).
8. [x] Add a cross-package integration test (validator + viewer-core + web state mapping) to ensure support-state messaging remains aligned.
9. [x] Expose a typed `renderMode` helper from `@eonhive/prd-viewer-core` so viewer clients can consume a canonical capability classification.
10. [x] Add a lightweight docs consistency check that fails CI when stale `foundation/PRD_*.md` references appear in control docs/README instead of `docs/foundation/04_PRD/*` paths.
11. [x] Add a CI workflow step that runs `pnpm examples:smoke -- --json-summary` and uploads summaries as artifacts for annotation/reporting.
12. [x] Update stale canonical reference paths in `README.md`, `AGENTS.md`, `docs/governance/PRD_PROMPT_DOCTRINE.md`, and `docs/prompts/PRD_MASTER_PROMPTS.md` so they consistently use the finalized decisions path: `docs/decisions/PRD_DECISIONS.md`.
13. [x] Audit `docs/foundation/04_PRD/PRD_ROADMAP.md` references (e.g., `prompts/*`, `core/*`) and either align paths to current repo locations or label them explicitly as planned docs.
14. [x] Add built-CLI snapshot coverage for `validate` and `inspect` output (text and `--json`) using the existing E2E fixture setup.
15. [x] Add invalid-package snapshot coverage for built CLI `validate`/`inspect` output (text and `--json`) so issue-list formatting drift is caught before release.
16. [x] Add a single aggregate examples smoke script entrypoint (`examples:smoke`) backed by a dedicated orchestrator script.
17. [x] Add a lightweight docs guard check that enforces `docs/decisions/PRD_DECISIONS.md` as the only canonical decisions path and fails on duplicate legacy references (for example legacy foundation decisions-path pointer).
18. [x] Ensure `README.md`, release docs, and contributor-facing guidance explicitly treat `pnpm examples:smoke` as the canonical aggregate smoke command, document `--json-summary` for CI annotation, and keep smoke-gate release/check flow docs consistent.

19. [x] Added concise CLI JSON schema snippets under `docs/runtime/PRD_CLI_JSON_CONTRACT.md` with an explicit `prd-cli-json-v0.1` contract identifier for automation pinning.
20. [x] Extended docs-consistency guard with an optional `--include-root-docs` mode for selected non-archive root docs (`BUILD_STATUS.md`, `NEXT_STEPS.md`) while preserving canonical decisions-path enforcement.

21. [x] Hardened docs-consistency allowlist matching to validate the specific allowed snippet span in `docs/decisions/PRD_DECISIONS.md` rather than allowing file-wide sentinel-based bypasses.

22. [x] Fixed `docs/runtime/PRD_CLI_JSON_CONTRACT.md` inspect schema snippet to remove the unsatisfiable `allOf` + `additionalProperties: false` combination and publish a valid combined output contract.
23. [x] Draft and ratify `docs/core/PRD_MINIMAL_VALID_SPEC.md` using the canonical prompt flow, then map every normative requirement to validator checks or explicitly deferred TODOs.
24. [x] Finalize and document manifest field-level conformance coverage (`required`, `optional`, `identity`, `public`, `localization`, `extensions`) across schema, validator issue codes, and example fixtures.
25. [x] Publish profile conformance fixtures for `general-document`, `comic`, and `storyboard` with one canonical valid package + one intentional invalid package each, wired into CLI and validator test gates.
26. [x] Add an end-to-end “foundation gate” script that runs build, tests, docs consistency, and aggregate example smoke checks and emits a single machine-readable summary artifact for CI policy decisions.
27. [x] Add a canonical runtime capability/conformance draft (`docs/runtime/PRD_CAPABILITY_MODEL.md` and `docs/runtime/PRD_CONFORMANCE.md`) and align viewer-core capability typing with documented conformance levels.
28. [x] Expand docs index/navigation so canonical control docs, runtime contracts, and prompt packs are discoverable in one path from root `README.md` and `docs/README.md`.
29. [x] Publish a standard runtime conformance fixture corpus plus expected support-state manifest for `fully-supported`, `safe-mode`, and `unsupported-required-capability` so non-reference viewers can test against a shared baseline.
30. [x] Refactor `apps/prd-viewer-web` to consume `PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR` directly for package-facts/runtime copy instead of duplicating runtime-support strings in app-local constants.
31. [x] Add a post-publish external-consumer smoke workflow that installs `@eonhive/prd-*` packages from npm in a clean temp project and exercises `pack`, `validate`, and `inspect` without workspace linking.
32. [x] Add a release publish preflight that verifies `NPM_TOKEN`, npm auth identity, `eonhive` org membership, expected `@eonhive/prd-*` package targets, and first-preview bootstrap state before CI publish.
33. [ ] Rerun the `Release` workflow on `main` after the `NPM_TOKEN` owner has confirmed publish rights for the `eonhive` npm organization, then verify all four public packages resolve on npm at `0.1.0`.
34. [ ] Verify `Post-Publish Consumer Smoke` passes against the real published packages, then update `BUILD_STATUS.md` to record that the `0.1.0` preview actually shipped.
