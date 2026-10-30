---
"@eonhive/prd-validator": patch
---

Decode UTF-8-flagged ZIP member names strictly and preserve literal leading U+FEFF characters. Reject malformed name bytes through the existing `archive-read-invalid` diagnostic before decompression, and prevent a BOM-prefixed filename from being promoted into `manifest.json`. Preserve the existing unflagged byte-name interpretation, exact Unicode spelling, both transports, budgets, CRC and public API/JSON shapes. Add bounded mutation coverage and installed-consumer checks.

Keep literal U+FEFF characters in signature path Unicode round trips as well, preserving signed file-set identity through repacking. Metadata JSON decoding, Ed25519/SHA-256, the v1 signature preimage and explicit key-trust rules remain unchanged.
