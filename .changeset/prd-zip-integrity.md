---
"@eonhive/prd-validator": patch
---

Verify CRC-32 for every decoded ZIP member in both supported PRD transports. Preflight bounded central/local/descriptor records, ZIP64 values and member extents before decompression, reject unsupported encryption/patch/reserved flags and inconsistent metadata, and decode only indexed member bytes with the existing fflate inflater and output budgets. Preserve ordinary ZIP, envelope, stored/DEFLATE, descriptor and safe ZIP64 compatibility. Add `archive-checksum-mismatch` through existing error/JSON shapes. Checksums do not establish publisher authenticity; optional PRD signatures remain separate.
