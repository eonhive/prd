# BUILD STATUS

## 2026-04-15

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
