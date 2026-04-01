# PRD_MINIMAL_VALID_PRD.md
_Last updated: April 1, 2026_  
_Status: Canonical minimal package draft v0.1_

## 1. Purpose

This document defines the smallest legal PRD package that a minimal PRD viewer can open.

It is a concise canonical extraction of the current minimal-package baseline already established in `core/PRD_MINIMAL_VALID_SPEC.md` and the accepted minimal-package decisions.

**Assumptions**

- `governance/PRD_PROFILE_REGISTRY.md` governs profile identifiers and status, but a machine-readable public registry format is not defined yet.
- `runtime/PRD_CAPABILITY_MODEL.md` defines the current capability baseline, but fuller viewer conformance detail may still refine fallback behavior later.

---

## 2. Minimum Legal Package

The minimum legal PRD package is:

- one ZIP archive using the `.prd` extension
- one root `manifest.json`
- one public content file referenced by `entry`

The smallest legal package therefore contains exactly two mandatory packaged files:

1. `manifest.json`
2. the single entry target named by `entry`

The minimum legal package must remain readable without:

- Cloud
- PRDc
- payments
- crypto
- wallets
- protected/private-only access paths

Required identifying metadata must remain in the public/header area.

---

## 3. Required Files

Only these files are mandatory in the minimum legal PRD:

1. `manifest.json`
   - MUST exist at the archive root.
   - MUST parse as one JSON object.
2. One entry file
   - MUST be referenced by `entry` in `manifest.json`.
   - MUST exist inside the same `.prd` package.
   - MUST be public.

No other files or directories are required.

---

## 4. Required Manifest Fields

The minimum manifest fields are:

| Field | Type | Required | Role |
| --- | --- | --- | --- |
| `prdVersion` | string | Yes | PRD format/spec version |
| `manifestVersion` | string | Yes | manifest schema version |
| `id` | string | Yes | package/document identity |
| `profile` | string | Yes | minimum profile declaration |
| `title` | string | Yes | human-readable title |
| `entry` | string | Yes | single public content path |

Minimum profile declaration rules:

- `profile` MUST be present in the public manifest.
- `profile` MUST be a single string value.
- `profile` MUST use a canonical machine-readable ID such as `general-document`, not a friendly UI label such as `Document`.
- `profileVersion` is not required in the minimum legal package.
- `general-document` is the baseline example value for the tiny example in this doc.

No rights, payment, ownership, encryption, signature, attachment, localization, or Cloud fields are required in the minimum manifest.

---

## 5. Entry Resolution Rules

The viewer finds content in this order:

1. Open the `.prd` file as a ZIP archive.
2. Locate `manifest.json` at the archive root.
3. Parse the required manifest fields.
4. Read `entry` as the single primary content path.
5. Resolve `entry` as a relative package-internal path.
6. Confirm that the resolved target exists as exactly one file.
7. Open that file as the package's base readable content.

`entry` is invalid if it is:

- missing
- empty
- not a string
- an absolute path
- a path beginning with `/`
- a path containing `..`
- a network URL
- a directory path
- more than one primary value

The minimum legal PRD does not require a spine or any secondary entry path.

---

## 6. Fallback Rules

Baseline fallback behavior for the minimum legal PRD is:

- the viewer MUST use the declared `entry` path as the only required content path
- unknown optional manifest fields MAY be ignored if they do not contradict the required package contract
- unsupported optional extensions, attachments, or protected/private material MUST NOT block the base open path when the public manifest and `entry` remain usable
- if profile-specific behavior is unsupported but the declared `entry` can still be opened safely, the viewer SHOULD fall back to generic opening of that entry
- if the viewer cannot render the declared entry content, it SHOULD still expose the public/header metadata and report unsupported content explicitly
- a missing or unreadable `entry` is not a fallback case; it is an invalid package

Exact viewer conformance detail remains follow-on work beyond `runtime/PRD_CAPABILITY_MODEL.md`.

---

## 7. Example Tree

```text
hello-prd/
  manifest.json
  content/
    index.html
```

Example `manifest.json`:

```json
{
  "prdVersion": "1.0",
  "manifestVersion": "1.0",
  "id": "urn:uuid:11111111-1111-1111-1111-111111111111",
  "profile": "general-document",
  "title": "Hello PRD",
  "entry": "content/index.html"
}
```

Example `content/index.html`:

```html
<!doctype html>
<html lang="en">
  <body>
    <p>Hello PRD.</p>
  </body>
</html>
```

Distributed form: `hello-prd.prd`

---

## 8. Validation Checklist

A package passes the minimum legal PRD baseline only if all of the following are true:

- it is a ZIP archive with the `.prd` extension
- `manifest.json` exists at the archive root
- `manifest.json` parses as one JSON object
- `prdVersion`, `manifestVersion`, `id`, `profile`, `title`, and `entry` all exist and are strings
- `profile` is declared publicly in the manifest
- `entry` is one relative package-internal file path
- the `entry` target exists inside the package and is a file
- required metadata does not exist only inside protected/private material
- the package does not require Cloud, PRDc, payment, crypto, or protected/private-only behavior to open base content
- optional unsupported fields do not prevent the base package from being identified and opened
