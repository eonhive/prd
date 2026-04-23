---
"@eonhive/prd-cli": patch
"@eonhive/prd-packager": patch
"@eonhive/prd-types": patch
"@eonhive/prd-validator": patch
---

Correct the published PRD npm preview after the broken `0.1.0` release:

- publish consumer-safe internal dependency metadata instead of `workspace:*`
- add registry metadata auditing after publish
- keep the post-publish consumer smoke path aligned with the real npm surface
