# @eonhive/prd-validator Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.2.0

### Added

- Browser-safe PRD v1 container identification and bounded archive decoding, retaining legacy ZIP packages.
- Shared bounded Node directory loading and configurable entry, per-file and aggregate-byte limits for validation, inspection and packaging.
- Optional signature-v1 coverage and Ed25519 verification through the signature subpath, with explicit public-key trust and unsigned compatibility.

### Fixed

- Verify decoded-member CRC-32 and bounded ZIP/ZIP64 records, descriptors and member extents before accepting archive content.
- Reject malformed UTF-8 member names while preserving exact Unicode spelling and literal leading U+FEFF characters, including signature path round trips.
- Enforce the existing mutual exclusion between segmented inline children and packaged section sources, including malformed non-array children.

### Changed

- Stored ZIP members use 64 KiB input windows to reduce temporary view/callback churn. DEFLATE windows, eager loading, resource budgets, independent output buffers and public diagnostics remain unchanged.

## [0.1.0] - 2026-04-23

### Added

- Initial public preview release
- Manifest structure validation
- Profile compliance checking
- Content schema validation
- Asset reference verification
- Browser and Node.js environments
- JSON mode for machine-readable output
- Detailed error reporting with path information

### Notes

This is a pre-1.0 public preview. Validation rules and error reporting may evolve as the PRD specification matures.
