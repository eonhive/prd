# PRD CLI JSON Contract (v0.1)

_Status: active machine-readable contract for downstream automation._

This document defines a concise, versioned JSON contract for `prd init --json`, `prd import markdown --json`, `prd import images --json`, `prd validate --json`, and `prd inspect --json`.

Canonical command docs remain in `packages/prd-cli/README.md`.

The October 27 container slice adds `pack --container <zip|prd>` and [container/archive diagnostics](../core/PRD_CONTAINER_FORMAT.md#diagnostics), without changing validate/inspect JSON shapes or this contract identifier. Both transports report `sourceKind: "archive"`; `totalBytes` counts expanded logical files. New reader issue codes are additive strings, not new output fields.

## Contract versioning policy

- Current contract version: `prd-cli-json-v0.1`
- Compatibility target: PRD CLI preview line `0.x`
- Additive fields MAY be introduced in minor releases.
- Breaking shape changes MUST use a new contract version identifier (for example `prd-cli-json-v0.2`) and MUST be documented before release.

## `init --json` contract snippet

```json
{
  "$id": "https://eonhive.dev/prd/contracts/cli/init/v0.1",
  "type": "object",
  "additionalProperties": false,
  "required": ["created", "profile", "title", "id", "targetDir", "entry", "files"],
  "properties": {
    "created": { "const": true },
    "profile": {
      "type": "string",
      "enum": ["general-document", "comic", "storyboard"]
    },
    "title": { "type": "string", "minLength": 1 },
    "id": { "type": "string", "minLength": 1 },
    "targetDir": { "type": "string", "minLength": 1 },
    "entry": { "const": "content/root.json" },
    "files": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    }
  }
}
```

## `import markdown --json` contract snippet

```json
{
  "$id": "https://eonhive.dev/prd/contracts/cli/import-markdown/v0.1",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "imported",
    "sourcePath",
    "targetDir",
    "profile",
    "title",
    "id",
    "entry",
    "files",
    "nodeCount",
    "assetCount",
    "warnings"
  ],
  "properties": {
    "imported": { "const": true },
    "sourcePath": { "type": "string", "minLength": 1 },
    "targetDir": { "type": "string", "minLength": 1 },
    "profile": { "const": "general-document" },
    "title": { "type": "string", "minLength": 1 },
    "id": { "type": "string", "minLength": 1 },
    "entry": { "const": "content/root.json" },
    "files": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    },
    "nodeCount": { "type": "number" },
    "assetCount": { "type": "number" },
    "warnings": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    }
  }
}
```

## `import images --json` contract snippet

```json
{
  "$id": "https://eonhive.dev/prd/contracts/cli/import-images/v0.1",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "imported",
    "sourceDir",
    "targetDir",
    "profile",
    "title",
    "id",
    "entry",
    "files",
    "imageCount",
    "assetCount",
    "skippedFiles",
    "warnings"
  ],
  "properties": {
    "imported": { "const": true },
    "sourceDir": { "type": "string", "minLength": 1 },
    "targetDir": { "type": "string", "minLength": 1 },
    "profile": {
      "type": "string",
      "enum": ["comic", "storyboard"]
    },
    "title": { "type": "string", "minLength": 1 },
    "id": { "type": "string", "minLength": 1 },
    "entry": { "const": "content/root.json" },
    "files": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    },
    "imageCount": { "type": "number" },
    "assetCount": { "type": "number" },
    "skippedFiles": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    },
    "warnings": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    }
  }
}
```

## Shared issue shape

```json
{
  "$id": "https://eonhive.dev/prd/contracts/issue/v0.1",
  "type": "object",
  "additionalProperties": false,
  "required": ["code", "message"],
  "properties": {
    "code": { "type": "string", "minLength": 1 },
    "message": { "type": "string", "minLength": 1 }
  }
}
```

## `validate --json` contract snippet

```json
{
  "$id": "https://eonhive.dev/prd/contracts/cli/validate/v0.1",
  "type": "object",
  "additionalProperties": false,
  "required": ["valid", "manifest", "profileInfo", "entry", "errors", "warnings"],
  "properties": {
    "valid": { "type": "boolean" },
    "manifest": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "required": ["profile", "entry", "localizationDefaultLocale"],
      "properties": {
        "profile": { "type": "string" },
        "entry": { "type": "string" },
        "localizationDefaultLocale": { "type": ["string", "null"] }
      }
    },
    "profileInfo": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "required": ["supportClass"],
      "properties": {
        "supportClass": { "type": "string" }
      }
    },
    "entry": { "type": ["string", "null"] },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["code", "message"],
        "properties": {
          "code": { "type": "string", "minLength": 1 },
          "message": { "type": "string", "minLength": 1 }
        }
      }
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["code", "message"],
        "properties": {
          "code": { "type": "string", "minLength": 1 },
          "message": { "type": "string", "minLength": 1 }
        }
      }
    }
  }
}
```

## `inspect --json` contract snippet

`inspect --json` MUST include all `validate --json` fields and add a required `inspection` object.

```json
{
  "$id": "https://eonhive.dev/prd/contracts/cli/inspect/v0.1",
  "type": "object",
  "additionalProperties": false,
  "required": ["valid", "manifest", "profileInfo", "entry", "errors", "warnings", "inspection"],
  "properties": {
    "valid": { "type": "boolean" },
    "manifest": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "required": ["profile", "entry", "localizationDefaultLocale"],
      "properties": {
        "profile": { "type": "string" },
        "entry": { "type": "string" },
        "localizationDefaultLocale": { "type": ["string", "null"] }
      }
    },
    "profileInfo": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "required": ["supportClass"],
      "properties": {
        "supportClass": { "type": "string" }
      }
    },
    "entry": { "type": ["string", "null"] },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["code", "message"],
        "properties": {
          "code": { "type": "string", "minLength": 1 },
          "message": { "type": "string", "minLength": 1 }
        }
      }
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["code", "message"],
        "properties": {
          "code": { "type": "string", "minLength": 1 },
          "message": { "type": "string", "minLength": 1 }
        }
      }
    },
    "inspection": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "sourceKind",
        "fileCount",
        "totalBytes",
        "assetCount",
        "attachmentCount",
        "localeCount",
        "hasSeriesMembership",
        "collectionCount",
        "entryKind",
        "segmentation",
        "localizedResources",
        "localizedAlternateEntries",
        "referenceLoadMode"
      ],
      "properties": {
        "sourceKind": { "type": "string" },
        "fileCount": { "type": "number" },
        "totalBytes": { "type": "number" },
        "assetCount": { "type": "number" },
        "attachmentCount": { "type": "number" },
        "localeCount": { "type": "number" },
        "hasSeriesMembership": { "type": "boolean" },
        "collectionCount": { "type": "number" },
        "entryKind": { "type": "string" },
        "segmentation": { "type": "string" },
        "localizedResources": { "type": "boolean" },
        "localizedAlternateEntries": { "type": "boolean" },
        "referenceLoadMode": { "type": "string" }
      }
    }
  }
}
```

## Downstream pinning recommendation

For automation, pin both:

1. PRD CLI package major/minor (currently `0.1.x`)
2. Contract identifier (`prd-cli-json-v0.1`)

If either changes, re-run automation fixture checks before production rollout.

## Signature commands (`prd-cli-signature-v1`)

Repository-only `sign --json` and `verify --json` use a separate additive contract; the existing `prd-cli-json-v0.1` commands and shapes above are unchanged. See [signature-v1](../extensions/PRD_SIGNATURE_V1.md) for coverage and trust rules.

Successful `sign` output contains exactly:

```json
{
  "contractVersion": "prd-cli-signature-v1",
  "signed": true,
  "outputPath": "/absolute/path/signed.prd",
  "keyId": "sha256:<64 lowercase hexadecimal characters>"
}
```

`verify` output contains `contractVersion: "prd-cli-signature-v1"`, `status` and a human-readable `message`. Status is one of `unsigned`, `untrusted`, `verified`, `invalid`, `unsupported`. Successful cryptographic verification additionally supplies `keyId` and integer `checkedFiles`; those are absent when verification does not succeed. Messages may change and should not be parsed as stable identifiers.

```json
{
  "contractVersion": "prd-cli-signature-v1",
  "status": "verified",
  "message": "Packaged contents verified with the selected public key.",
  "keyId": "sha256:<64 lowercase hexadecimal characters>",
  "checkedFiles": 11
}
```

`sign` exits 0 when its new output is written after self-verification, otherwise 1. `verify` exits 0 **only for `verified`**, requiring a matching `--trusted-key` public key. All other statuses exit 1 and still emit their JSON result when verification is reached. Usage, I/O, archive, structural validation and key-import failures emit a diagnostic on stderr with exit 1 and no JSON result. No private key is included in either output shape. Pin this contract separately from the existing CLI JSON identifier.


## Additive conversion report (repository Phase 1)

`prd convert ... --json` returns `{ converted: true, sourcePath, outputPath, quality }` only after a completed archive is published. `quality.reportVersion` is `"1.0"`; it includes source format, profile, strategy, fidelity declarations, source retention, node/resource counts, source-to-asset mapping, staged conversion warnings and validator warnings. The same report is a declared `attachments/conversion-quality.json` payload. Failed conversion emits stderr and exit 1. This separate additive result does not alter the `prd-cli-json-v0.1` validation/inspection contract. See [PRD Convert](../architecture/PRD_CONVERT_PHASE_1.md).


## HTML directory import contracts

`prd import html <source.html> --out <targetDir> --json` uses `prd-cli-html-import-v1`, independently of `prd-cli-json-v0.1` and the direct converter report. Success stdout contains `contractVersion`, `imported: true`, operational `sourcePath`/`targetDir`, canonical `profile`/`title`/`id`/`entry`, generated `files`, `nodeCount`, `assetCount`, string `warnings` and `report`. Failure stderr contains `contractVersion`, `imported: false` and `error: { code: "html-import-failed", message }`, with exit 1 and no success stdout.

The declared report attachment uses `prd-import-report-v1`: source format, target profile, generated node/type counts, resource counts/bytes/generated references, coded warnings, unsupported element names, errors, structural validation and explicit fidelity/reading-quality limitations. `validation.valid` is derived from actual package validation; `readingQuality` is `"not-assessed"`. No fabricated confidence scores or original filesystem/URL provenance are exported. The HTML directory command bundles no raw HTML source. Older Markdown/image import, direct conversion, validation and inspection contracts are preserved. Full details: [HTML directory output and diagnostics](../architecture/PRD_CONVERT_HTML.md#directory-workflow-and-shared-output-prd-042).
