# @eonhive/prd-cli

CLI for initializing, importing, packaging, validating, inspecting, and optionally signing/verifying PRD packages.

## Command Availability

The commands below describe the current repository build. As verified on October 25, 2026, npm `latest` is still `0.1.1`, whose command surface is `pack`, `validate`, and `inspect`. The `init`, `import markdown`, `import images`, `import html`, and converter implementations have queued minor changesets and are not in that published version yet. Build from the repository to try them; publication remains a separate CI-driven release task.

The PRD envelope option and shared bounded archive reader added October 27 are also repository features pending release. Do not assume npm `0.1.1` can open that new transport.

The optional `sign` / `verify` commands and `prd-cli-signature-v1` JSON contract are also pending release. They do not change `validate` / `inspect` output.

The shared archive reader now verifies every decoded member's CRC-32 and bounded ZIP/ZIP64 records before interpretation. `validate` / `inspect` return `archive-checksum-mismatch` for bad member data checksums through their existing JSON/error shapes; malformed records and unsupported ZIP flags use `archive-read-invalid`. Both transports remain supported. This integrity hardening is pending release and remains separate from optional signature verification/publisher trust. See the [ZIP integrity policy](../../docs/core/PRD_CONTAINER_FORMAT.md#zip-integrity-policy).

Directory loading now inherits the shared reference limits: 32 MiB per file, 128 MiB total file bytes and 10,000 visited entries (including folders and skipped names). `validate` / `inspect` report coded directory errors using existing JSON shapes, and `pack` fails before output creation/replacement. The library supports overrides; this CLI increment adds no budget flags. These reference policies are pending the normal release and are not universal PRD size limits. See [container and directory policy](../../docs/core/PRD_CONTAINER_FORMAT.md#unpacked-directory-policy).

## Commands

### `prd sign <source.prd> --key <private-key.pem> --out <signed.prd> [--json]`

Signs a structurally valid archive using a caller-supplied unencrypted Ed25519 private key. Adds the optional `eonhive.signature` extension; exact logical-file coverage includes the updated manifest and all resources. Preserves ZIP/envelope transport. Requires a separate new `.prd` output file and refuses existing outputs, existing signatures and placeholder object-form extensions. Private keys are not packaged or printed by this command; keep them outside source/package directories. Exit 0 means the output was created and self-verified; command failures return 1.

### `prd verify <source.prd> [--trusted-key <public-key.pem>] [--json]`

Checks structural validity, complete signature coverage/digests and native Ed25519 verification. The trusted key must be an independently obtained Ed25519 SPKI `PUBLIC KEY` PEM. Exit **0 only for `verified`** with a matching supplied key; unsigned/untrusted/invalid/unsupported results and errors return 1. Without `--trusted-key`, a correct signature is `untrusted`. Structural `validate` remains independent and does not verify signatures.

See [signature-v1 specification](../../docs/extensions/PRD_SIGNATURE_V1.md) and the [separate signing JSON contract](../../docs/runtime/PRD_CLI_JSON_CONTRACT.md#signature-commands-prd-cli-signature-v1). No certificates, revocation, encryption, key generation or publisher-identity service is included.

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

### `prd import html <source.html> --out <targetDir> [--title <title>] [--id <id>] [--json]`

Imports UTF-8 HTML into a validated structured `general-document` directory. Reuses the converter's HTML adapter and bounded resource collection. Headings, prose, lists, quotes, links, simple tables and local PNG/JPEG/GIF/WebP images are supported. Emphasis becomes plain text. Scripts/CSS/embedded content and other unsupported behavior are reported. Raw source HTML is not copied into this directory output.

The package declares `attachments/import-report.json` with contract `prd-import-report-v1`. It separates structural validation, fidelity limitations and reading quality that has not been assessed. Exported diagnostics omit original source filesystem/URL provenance. Target directories must be absent or empty; HTML refuses file/symlink/nonempty targets. Unknown, duplicate or incomplete options fail. After import, use the existing validate/inspect/pack commands and open the resulting archive in Viewer.

`--json` success prints `{ contractVersion: "prd-cli-html-import-v1", imported: true, sourcePath, targetDir, profile, title, id, entry, files, nodeCount, assetCount, warnings, report }` on stdout. Failure prints `{ contractVersion: "prd-cli-html-import-v1", imported: false, error: { code, message } }` on stderr and exits 1. Earlier command contracts remain unchanged. See [HTML output/report details](../../docs/architecture/PRD_CONVERT_HTML.md#directory-workflow-and-shared-output-prd-042) and [the working example](../../examples/conversion-html/README.md).

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

### `prd pack <sourceDir> --out <file.prd> [--container <zip|prd>]`

Packages a directory-form PRD into an archive file.

Default `zip` output preserves existing consumers. `--container prd` emits the [PRD container 1.0 envelope](../../docs/core/PRD_CONTAINER_FORMAT.md): `50 52 44 00`, version, zero flags and exact payload length, followed by ZIP. Validate/inspect accept both forms; malformed/unsupported headers and archive policy violations fail with explicit issue codes. Unknown or missing `--container` values fail before writing output. Signing and encryption are not implemented by this option.

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


## `prd convert` — repository Phase 1

```sh
prd convert ./source.md --out ./converted.prd --json
prd convert ./source.html --out ./converted-html.prd --json
prd convert ./sample-comic.cbz --out ./comic.prd --profile comic --json
prd convert ./book.epub --out ./book.prd --json
prd convert ./source.docx --out ./document.prd --json
prd convert ./source.pdf --out ./pages.prd --json
```

Converts through `@eonhive/prd-converter` directly to a valid archive. The output parent must exist and the destination must be new. Options: `--profile auto|general-document|comic|storyboard` (incompatible canonical profiles fail), `--strategy adaptive`, `--title`, `--id`, `--container zip|prd`, `--no-source`, `--json`. Unknown, duplicate and missing options fail. Default source retention includes exact source bytes as a declared attachment; the quality report is always a declared JSON attachment. Text output lists conversion and validator warnings. JSON success output is `{ converted: true, sourcePath, outputPath, quality }`; failures print stderr and exit 1 without publishing a new archive. This is additive and does not change `prd-cli-json-v0.1` validate/inspect output or legacy import results.

Phase 1 detects `.md`/`.markdown` UTF-8 text and maps a limited subset into adaptive structured `general-document`. Raster resources are bounded and signature-screened; SVG and other formats are deferred. Source code/HTML can remain in the retained source without being rendered or executed. See [the architecture record](../../docs/architecture/PRD_CONVERT_PHASE_1.md) for detailed limits and tradeoffs. The command is implemented in the repository and pending public release with the converter package.


The Phase 2 HTML increment also detects `.html`/`.htm` UTF-8 documents and fragments. It converts static semantics into canonical structured content using the optional HTML parser; it does not select legacy HTML fallback rendering. Unsafe/embedded content, CSS/layout, unrepresentable links/tables and other losses are reported. See [HTML conversion policy](../../docs/architecture/PRD_CONVERT_HTML.md). DOCX and PDF support are described below; public release onboarding remains pending.

The CBZ increment accepts `.cbz` ZIP sources and selects canonical `comic` output. Whole-page PNG/JPEG/GIF/WebP members are ordered naturally; metadata, hidden files and unsupported formats are reported. Default input/expanded-member/total-expanded/entry limits are 4 MiB / 8 MiB / 24 MiB / 128; library callers can override budgets, while the CLI has no limit flags. There is no new `import cbz` command. Reading direction, metadata, spreads, OCR and panel detection remain unsupported. See [CBZ policy](../../docs/architecture/PRD_CONVERT_CBZ.md) and [example](../../examples/conversion-cbz/README.md). EPUB support is described below; normal Changesets/CI release onboarding remains separate.

EPUB conversion accepts a bounded reflowable UTF-8 XML subset and creates canonical `general-document` chapter sections in OPF spine order. Same-book links and declared raster resources are mapped; original source/report attachments remain the direct converter default. The optional `saxes` parser is needed only for EPUB. Recognized fixed layouts, encryption/obfuscation, DTDs/entities, malformed XML and unsafe/ambiguous package relationships fail. Navigation/NCX hierarchy, CSS and metadata beyond title are reported as unmapped. Existing defaults include 128 archive entries and a cumulative XML-work budget; larger library overrides exist, while CLI limit flags remain unimplemented. See [EPUB mapping and limits](../../docs/architecture/PRD_CONVERT_EPUB.md) and [example](../../examples/conversion-epub/README.md). There is no new `import epub` command. DOCX support is described below; this command remains pending public release.

DOCX now uses the same direct converter for a bounded transitional Word body subset. It maps structural paragraph styles, simple lists, tables, bookmarks/safe hyperlinks and declared raster images through existing validation and packaging. XML parsing requires optional `saxes`; HTML parsing is not required. Word layout, notes, fields, equations and other unsupported structures are reported. Existing archive defaults and source/report retention remain; cumulative XML work is twice the output-node budget to accommodate Word style definitions. There is no new `import docx` command. Read [DOCX policy](../../docs/architecture/PRD_CONVERT_DOCX.md) and [the actual Word/PRD example](../../examples/conversion-docx/README.md). PDF support is described below. Publication remains a separate CI release task.

PDF uses the same `convert` command for bounded extraction-order paragraphs and textless-page PNG fallback in canonical `general-document` sections. Install optional PDF.js/native canvas support and use Node.js 22.13+. No OCR, logical layout reconstruction or text-page illustration mapping is claimed; inspect the actual quality warnings. Encrypted sources are refused. Source/report retention, validation and both transports use existing contracts. See [PDF policy and process limits](../../docs/architecture/PRD_CONVERT_PDF.md) and [the actual mixed-page example](../../examples/conversion-pdf/README.md). There is no new `import pdf` directory command. Public release remains pending.
