# @eonhive/prd-cli

CLI for packaging, validating, and inspecting PRD packages.

## Commands

Machine-readable JSON contract snippets and versioning notes: `docs/runtime/PRD_CLI_JSON_CONTRACT.md`.

### `prd pack <sourceDir> --out <file.prd>`

Packages a directory-form PRD into an archive file.

**Text output (stable):**

```text
Packed <sourceDirName> -> <resolvedOutputPath>
```

### `prd validate <path> [--json]`

Validates a directory or archive PRD package.

* Text mode emits a stable line-based contract.
* JSON mode (`--json`) emits a stable machine-readable object.

### `prd inspect <path> [--json]`

Runs validation plus deterministic package metrics.

* Text mode emits validation lines followed by an `inspection:` section.
* JSON mode (`--json`) emits the validate object plus `inspection` metrics.

## Exit codes

- `0`: command succeeded and result is valid.
  - `pack`: package archive written.
  - `validate`/`inspect`: `valid: true`.
- `1`: usage error, unsupported command, or validation/inspection invalid result.
  - Missing required args (for example, missing `--out` or missing target path).
  - Unknown command.
  - `validate`/`inspect` where `valid: false`.

## Stable output contract

### `validate` text output

Order is stable:

1. `valid: yes|no`
2. `profile: <profile>|n/a`
3. `profileStatus: <supportClass>|n/a`
4. `entry: <entry>|n/a`
5. `localization: <defaultLocale>|none`
6. `errors:` list (`- none` when empty)
7. `warnings:` list (`- none` when empty)

### `validate --json` fields

Top-level keys (stable):

- `valid` (`boolean`)
- `manifest` (`object | null`)
  - `profile` (`string`)
  - `entry` (`string`)
  - `localizationDefaultLocale` (`string | null`)
- `profileInfo` (`object | null`)
  - `supportClass` (`string`)
- `entry` (`string | null`)
- `errors` (`Array<{ code: string; message: string }>`)
- `warnings` (`Array<{ code: string; message: string }>`)

### `inspect` text output

`inspect` text output is exactly `validate` text output plus:

- `inspection:`
  - `- source: <sourceKind>`
  - `- files: <fileCount>`
  - `- bytes: <totalBytes>`
  - `- assets: <assetCount>`
  - `- attachments: <attachmentCount>`
  - `- locales: <localeCount>`
  - `- series: yes|no`
  - `- collections: <collectionCount>`
  - `- entry mode: <entryKind>`
  - `- segmentation: <segmentation>`
  - `- localized resources: yes|no`
  - `- localized alternate entries: yes|no`
  - `- reference load mode: <referenceLoadMode>`

### `inspect --json` fields

All `validate --json` fields, plus:

- `inspection` (`object`)
  - `sourceKind` (`string`)
  - `fileCount` (`number`)
  - `totalBytes` (`number`)
  - `assetCount` (`number`)
  - `attachmentCount` (`number`)
  - `localeCount` (`number`)
  - `hasSeriesMembership` (`boolean`)
  - `collectionCount` (`number`)
  - `entryKind` (`string`)
  - `segmentation` (`string`)
  - `localizedResources` (`boolean`)
  - `localizedAlternateEntries` (`boolean`)
  - `referenceLoadMode` (`string`)
