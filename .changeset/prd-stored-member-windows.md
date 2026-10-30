---
"@eonhive/prd-validator": patch
---

Use 64 KiB input windows for stored ZIP members instead of 1 KiB slices, reducing temporary view/callback churn for already bounded data that cannot expand. Keep DEFLATE pushes at 1 KiB and preserve record/path checks, declared and actual byte limits, CRC-32, independent returned file buffers, both PRD transports and existing public diagnostics/APIs. The eager loading model and reference limits are unchanged; Node benchmark results are not browser-memory or universal speed guarantees.
