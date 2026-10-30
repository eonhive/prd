---
"@eonhive/prd-validator": patch
---

Enforce the existing mutual-exclusion rule for segmented section references even when `children` is null or another non-array value. A section must provide either inline children or a packaged `src`; valid documents, public API shapes and diagnostic codes remain unchanged. Align the repository content schema and add shape/semantic parity coverage without changing declared-version acceptance.
