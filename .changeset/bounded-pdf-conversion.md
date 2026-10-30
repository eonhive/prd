---
"@eonhive/prd-converter": minor
"@eonhive/prd-cli": minor
---

Add bounded PDF text extraction and textless-page raster fallback through the existing canonical converter, validator and packager. Isolate optional PDF.js/native canvas support in a deadline-limited child process, retain original source and factual quality diagnostics, reject encrypted sources, and preserve existing CLI/report contracts.
