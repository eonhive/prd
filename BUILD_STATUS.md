# BUILD STATUS

## 2026-04-15

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

