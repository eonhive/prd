# @eonhive/prd-cli Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - Unreleased

### Added

- `prd init` creates validator-valid starter directories for `general-document`, `comic`, and `storyboard`.
- `prd import markdown` creates structured `general-document` directories from a deterministic Markdown subset and local images.
- `prd import images` creates `comic` and `storyboard` directories from naturally ordered image folders.

### Notes

This is a CLI-only tooling release candidate. Internal library dependencies remain at `^0.1.1`; PRD format and manifest versions are unchanged. Publication and npm-installed authoring verification are still pending.

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
