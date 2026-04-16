# NEXT_STEPS

> Canonical active backlog for the PRD repository. Update this file directly for active work items.
>
> Consolidation note (2026-04-15): `NEXT_STEPS copy.md` is no longer present in the repository. Its unique items are reflected below.

1. [x] Keep the contributor MVP gate section aligned with any future script-name changes in the root `package.json`.
2. [x] If release workflow policy changes, update the changeset vs. non-publishing guidance in `README.md` before the next milestone tag.
3. [ ] Consider adding a dedicated `docs/contributing.md` and link it from `README.md` once contributor guidance grows beyond the current MVP gate section.
4. [ ] Document the stable CLI output contract in package-level CLI docs so downstream tooling can rely on it explicitly.
5. [x] Add table-driven tests for every `entry-*` path validation code (`entry-absolute`, `entry-backslash`, `entry-url`, `entry-directory`, etc.).
6. [x] Add a dedicated validator test matrix for profile-specific entry compatibility across `general-document`, `comic`, and `storyboard`.
7. [x] Add dedicated web app tests for rendering-mode UI messages in `apps/prd-viewer-web` (structured JSON, HTML fallback, unsupported mode).
8. [x] Add a cross-package integration test (validator + viewer-core + web state mapping) to ensure support-state messaging remains aligned.
9. [ ] Consider exposing a typed `renderMode` helper from `@eonhive/prd-viewer-core` so viewer clients can consume a canonical capability classification.
10. [x] Add a lightweight docs consistency check that fails CI when stale `foundation/PRD_*.md` references appear in control docs/README instead of `docs/foundation/04_PRD/*` paths.
11. [x] Add a CI workflow step that runs `pnpm examples:smoke -- --json-summary` and uploads summaries as artifacts for annotation/reporting.
12. [x] Update stale canonical reference paths in `README.md`, `AGENTS.md`, `docs/governance/PRD_PROMPT_DOCTRINE.md`, and `docs/prompts/PRD_MASTER_PROMPTS.md` so they consistently use the finalized decisions path: `docs/decisions/PRD_DECISIONS.md`.
13. [ ] Audit `docs/foundation/04_PRD/PRD_ROADMAP.md` references (e.g., `prompts/*`, `core/*`) and either align paths to current repo locations or label them explicitly as planned docs.
14. [x] Add built-CLI snapshot coverage for `validate` and `inspect` output (text and `--json`) using the existing E2E fixture setup.
15. [x] Add invalid-package snapshot coverage for built CLI `validate`/`inspect` output (text and `--json`) so issue-list formatting drift is caught before release.
16. [x] Add a single aggregate examples smoke script entrypoint (`examples:smoke`) backed by a dedicated orchestrator script.
17. [x] Add a lightweight docs guard check that enforces `docs/decisions/PRD_DECISIONS.md` as the only canonical decisions path and fails on duplicate legacy references (for example `docs/foundation/04_PRD/PRD_DECISIONS.md`).
18. [x] Ensure `README.md`, release docs, and contributor-facing guidance explicitly treat `pnpm examples:smoke` as the canonical aggregate smoke command, document `--json-summary` for CI annotation, and keep smoke-gate release/check flow docs consistent.
