# BUILD STATUS

## 2026-04-15

- Expanded validator schema tests to assert canonical top-level manifest required fields.
- Expanded validator unit tests to cover required manifest field issue codes, entry path compatibility, and profile/entry mismatch failures.
- Added a fixture-style helper for validator tests to quickly build `PrdFileMap` test inputs.
- Stabilized manifest required-field and profile-entry-format issue code selection in `packages/prd-validator/src/index.ts` via shared constants.
