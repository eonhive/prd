# PRD CLI JSON Contract (v0.1)

_Status: active machine-readable contract for downstream automation._

This document defines a concise, versioned JSON contract for `prd validate --json` and `prd inspect --json`.

Canonical command docs remain in `packages/prd-cli/README.md`.

## Contract versioning policy

- Current contract version: `prd-cli-json-v0.1`
- Compatibility target: PRD repo/package version line `0.1.x`
- Additive fields MAY be introduced in minor releases.
- Breaking shape changes MUST use a new contract version identifier (for example `prd-cli-json-v0.2`) and MUST be documented before release.

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
