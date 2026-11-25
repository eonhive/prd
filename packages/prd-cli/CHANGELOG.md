# @eonhive/prd-cli Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.3.0

### Added

- `prd init` creates structured starter packages for the three core profiles; `prd import markdown` and `prd import images` provide semantic text and ordered visual imports.
- `prd import html` writes a structured general-document directory with a versioned diagnostic report, without bundling raw source HTML.
- `prd convert` produces validated PRD archives from bounded Markdown, static HTML, CBZ, EPUB, DOCX and PDF sources, with explicit source retention and quality reports.
- `prd pack --container prd` writes the optional PRD v1 envelope; ordinary ZIP output remains the default.
- `prd sign` and `prd verify` support optional signature-v1 archives, Ed25519 signing and verification with an explicitly trusted public key.

### Dependencies

- Validator, packager and converter dependencies move to `^0.2.0`; types remain at `^0.1.1`.

### Notes

This pre-1.0 tooling release includes the previously unpublished authoring candidate. PRD format and manifest versions are unchanged. PDF conversion requires Node.js 22.13+ and its optional PDF dependencies; the other conversion paths retain their documented requirements.

## [0.1.0] - 2026-04-23

### Added

- Initial public preview release
- `prd validate` command for package validation
- `prd pack` command for creating PRD archives
- `prd inspect` command for package inspection
- JSON output mode for machine-readable results
- Stable text and JSON output contracts
- Comprehensive help and error messaging

### Notes

This is a pre-1.0 public preview. CLI commands and output formats may evolve as the PRD specification matures.
