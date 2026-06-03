# @eonhive/prd-cli

CLI for initializing, importing, packaging, validating, and inspecting PRD packages.

## Commands

Machine-readable JSON contract snippets and versioning notes: `docs/runtime/PRD_CLI_JSON_CONTRACT.md`.

### `prd init <targetDir> [--profile <general-document|comic|storyboard>] [--title <title>] [--id <id>] [--json]`

Creates a validator-valid starter PRD package directory.

Defaults:

* `--profile`: `general-document`
* `--title`: title-cased target directory name
* `--id`: `urn:prd:local:<slug>`

Safety behavior:

* creates the target directory when it does not exist
* allows an existing empty target directory
* refuses to write into a non-empty target directory
* refuses unsupported profiles

**Text output (stable):**

```text
Created PRD package: <targetDir>
profile: <profile>
title: <title>
entry: content/root.json
next:
- prd validate <targetDir>
- prd pack <targetDir> --out <targetDir>.prd
```

### `prd import markdown <source.md> --out <targetDir> [--title <title>] [--id <id>] [--json]`

Imports a small Markdown subset into a validator-valid `general-document` package directory.

Supported v0.1 Markdown mappings:

* ATX headings
* paragraphs
* unordered and ordered lists
* blockquotes
* standalone local relative images

Defaults:

* `--title`: first level-1 heading, then source filename
* `--id`: `urn:prd:local:<slug>`

Safety behavior:

* creates the target directory when it does not exist
* allows an existing empty target directory
* refuses to write into a non-empty target directory
* skips remote, missing, unsafe, or unsupported images with warnings
* skips fenced code blocks and raw HTML with warnings

**Text output (stable):**

```text
Imported PRD package: <targetDir>
profile: general-document
title: <title>
entry: content/root.json
nodes: <count>
assets: <count>
warnings:
- none
next:
- prd validate <targetDir>
- prd inspect <targetDir>
- prd pack <targetDir> --out <targetDir>.prd
```

### `prd import images <sourceDir> --profile <comic|storyboard> --out <targetDir> [--title <title>] [--id <id>] [--json]`

Imports an ordered image folder into a validator-valid `comic` or `storyboard` package directory.

Supported v0.1 image inputs:

* `.png`
* `.jpg`
* `.jpeg`
* `.webp`
* `.gif`
* `.svg`

Defaults:

* `--title`: title-cased source directory name
* `--id`: `urn:prd:local:<slug>`

Safety behavior:

* sorts top-level image files by deterministic natural filename order
* creates the target directory when it does not exist
* allows an existing empty target directory
* refuses to write into a non-empty target directory
* refuses unsupported profiles
* skips non-image files and nested directories with warnings
* fails when no supported images are found

Generated package shape:

* `comic`: copies images into `assets/panels/`, declares them in `manifest.assets`, and creates `panels[]`
* `storyboard`: copies images into `assets/frames/`, declares them in `manifest.assets`, and creates `frames[]`

**Text output (stable):**

```text
Imported PRD package: <targetDir>
profile: <comic|storyboard>
title: <title>
entry: content/root.json
images: <count>
assets: <count>
skipped files:
- none
warnings:
- none
next:
- prd validate <targetDir>
- prd inspect <targetDir>
- prd pack <targetDir> --out <targetDir>.prd
```

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
  - `init`: package directory written.
  - `import`: package directory written.
  - `pack`: package archive written.
  - `validate`/`inspect`: `valid: true`.
- `1`: usage error, unsupported command, or validation/inspection invalid result.
  - Missing required args (for example, missing init target, missing `--out`, or missing validate/inspect target path).
  - Unknown command.
  - `init` where the target is unsafe to write or profile is unsupported.
  - `import` where the source kind is unsupported, the target is unsafe to write, a required import flag is missing, or no supported input files are found.
  - `validate`/`inspect` where `valid: false`.

## Stable output contract

### `init --json` fields

Top-level keys (stable):

- `created` (`true`)
- `profile` (`"general-document" | "comic" | "storyboard"`)
- `title` (`string`)
- `id` (`string`)
- `targetDir` (`string`)
- `entry` (`"content/root.json"`)
- `files` (`string[]`)

### `import markdown --json` fields

Top-level keys (stable):

- `imported` (`true`)
- `sourcePath` (`string`)
- `targetDir` (`string`)
- `profile` (`"general-document"`)
- `title` (`string`)
- `id` (`string`)
- `entry` (`"content/root.json"`)
- `files` (`string[]`)
- `nodeCount` (`number`)
- `assetCount` (`number`)
- `warnings` (`string[]`)

### `import images --json` fields

Top-level keys (stable):

- `imported` (`true`)
- `sourceDir` (`string`)
- `targetDir` (`string`)
- `profile` (`"comic" | "storyboard"`)
- `title` (`string`)
- `id` (`string`)
- `entry` (`"content/root.json"`)
- `files` (`string[]`)
- `imageCount` (`number`)
- `assetCount` (`number`)
- `skippedFiles` (`string[]`)
- `warnings` (`string[]`)

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
