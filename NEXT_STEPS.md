# NEXT STEPS

> Canonical active backlog for the PRD repository. Update this file directly for active work items.
>
> Note (2026-04-15): `NEXT_STEPS copy.md` was not present in the repository at update time, so no additional copy-file-only tasks were merged.

1. Keep the contributor MVP gate section aligned with any future script-name changes in the root `package.json`.
2. If release workflow policy changes, update the changeset vs. non-publishing guidance in `README.md` before the next milestone tag.
3. Consider adding a dedicated `docs/contributing.md` and link it from `README.md` once contributor guidance grows beyond the current MVP gate section.
4. Add CLI snapshot tests for text and JSON outputs to guard against accidental output-contract drift.
5. Add command-level integration tests that execute the built `prd` binary end-to-end (not just `runCli`) for `pack`, `validate`, and `inspect`.
6. Document the stable CLI output contract in package-level CLI docs so downstream tooling can rely on it explicitly.
7. Add table-driven tests for every `entry-*` path validation code (`entry-absolute`, `entry-backslash`, `entry-url`, `entry-directory`, etc.).
8. Add a dedicated validator test matrix for profile-specific entry compatibility across `general-document`, `comic`, and `storyboard`.
9. Add equivalent smoke-gate scripts for `resume-basic`, `comic-basic`, and `storyboard-basic`.
10. Add a combined `examples:smoke` aggregator command that runs all example smoke gates in CI.
11. Emit optional JSON summaries from smoke scripts for machine-readable CI annotations.
12. Add dedicated web app tests for rendering-mode UI messages in `apps/prd-viewer-web` (structured JSON, HTML fallback, unsupported mode).
13. Add a cross-package integration test (validator + viewer-core + web state mapping) to ensure support-state messaging remains aligned.
14. Consider exposing a typed `renderMode` helper from `@eonhive/prd-viewer-core` so viewer clients can consume a canonical capability classification.
