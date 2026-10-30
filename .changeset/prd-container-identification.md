---
"@eonhive/prd-validator": minor
"@eonhive/prd-packager": minor
"@eonhive/prd-cli": minor
---

Add browser-safe PRD v1 container identification and bounded archive decoding, while retaining legacy ZIP packages. Support the 16-byte PRD magic/version/flags/length envelope through the additive packager option and `prd pack --container prd`; keep ZIP as the default output for older readers. Reject malformed headers, unsafe or conflicting member paths, and archives exceeding documented reader budgets. Validation/inspection JSON shapes remain unchanged.
