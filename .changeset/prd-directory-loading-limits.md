---
"@eonhive/prd-validator": minor
"@eonhive/prd-packager": minor
---

Share bounded unpacked-directory loading between Node validation, inspection and packaging. Apply configurable file-count/traversal, per-file and total-byte limits before retaining source data, including actual-byte checks when files grow after stat. Add Node directory reader/default/error exports, optional Node validation/inspection limit arguments and packager `limits` options. Preserve existing JSON shapes, logical content, ZIP defaults and PRD envelopes. Directory load failures return coded issues; packaging fails before writing output. Limits are reference policies rather than format-wide maxima.
