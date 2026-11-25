# @eonhive/prd-packager Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.2.0

### Added

- Opt-in PRD v1 envelope writing alongside the existing default ZIP transport.
- Browser-safe `packPackageFiles` export for validated in-memory packaging, shared with the Node writer's canonical package assembly.
- Optional signature-v1 signing through the signing subpath, preserving the logical file set and both supported transports.
- Configurable unpacked-directory loading limits shared with validation and inspection; packaging rejects bounded-read failures before writing output.

### Dependencies

- Validator dependency moves to `^0.2.0`; types remain at `^0.1.1`.

## [0.1.0] - 2026-04-23

### Added

- Initial public preview release
- Directory-to-archive packaging functionality
- ZIP archive creation for PRD packages
- Compression support
- Output path customization
- Cross-platform compatibility

### Notes

This is a pre-1.0 public preview. Packaging behavior and archive format may evolve as the PRD specification matures.
