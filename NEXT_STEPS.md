# NEXT_STEPS

> Canonical active backlog for the PRD repository. Update this file directly for active work items.
>
> Consolidation note (2026-04-15): Relevant tasks from `NEXT_STEPS copy.md` were already merged into this canonical list, and the duplicate copy file has been removed from the repository.

- [x] Keep the contributor MVP gate section aligned with any future script-name changes in the root `package.json`.
- [x] If release workflow policy changes, update the changeset vs. non-publishing guidance in `README.md` before the next milestone tag.
- [ ] Consider adding a dedicated `docs/contributing.md` and link it from `README.md` once contributor guidance grows beyond the current MVP gate section.
- [ ] Document the stable CLI output contract in package-level CLI docs so downstream tooling can rely on it explicitly.
- [ ] Add table-driven tests for every `entry-*` path validation code (`entry-absolute`, `entry-backslash`, `entry-url`, `entry-directory`, etc.).
- [ ] Add a dedicated validator test matrix for profile-specific entry compatibility across `general-document`, `comic`, and `storyboard`.
- [x] Add dedicated web app tests for rendering-mode UI messages in `apps/prd-viewer-web` (structured JSON, HTML fallback, unsupported mode).
- [x] Add a cross-package integration test (validator + viewer-core + web state mapping) to ensure support-state messaging remains aligned.
- [ ] Consider exposing a typed `renderMode` helper from `@eonhive/prd-viewer-core` so viewer clients can consume a canonical capability classification.
- [ ] Add a lightweight docs consistency check that fails CI when stale `foundation/PRD_*.md` references appear in control docs/README instead of `docs/foundation/04_PRD/*` paths.
- [ ] Add a CI workflow step that runs `pnpm examples:smoke -- --json-summary` and uploads summaries as artifacts for annotation/reporting.
