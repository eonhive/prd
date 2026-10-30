---
"@eonhive/prd-validator": minor
"@eonhive/prd-packager": minor
"@eonhive/prd-cli": minor
---

Add optional PRD signature-v1 coverage and Ed25519 signing/verification through additive signature/signing subpaths and CLI sign/verify commands. Cover all logical files except signature metadata, preserve ZIP/envelope transport, require an explicitly trusted matching public key for verified status, and retain unsigned compatibility and existing structural validation contracts.
