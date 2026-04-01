# PRD_MINIMAL_VALID_SPEC.md
_Last updated: April 1, 2026_  
_Status: Normative working draft v0.1_

## 1. Purpose

This document defines the smallest legal and usable PRD package that a reference viewer can open.

It is the first Phase 1 normative spec artifact for PRD. It turns the current foundation direction into a minimal package contract without pre-solving later work such as full package layout, full manifest schema, profile-specific structure rules, protection, or viewer capability negotiation.

---

## 2. Scope

This draft defines only the minimal structural contract required to:

- identify a PRD package
- read public core metadata
- resolve one primary content entry
- open the document without cloud, payment, crypto, or protection dependencies

This draft applies to the PRD format/spec layer only. It does not define product behavior for Viewer, Studio, Cloud, SDK, Renderer, or PRDc.

This draft is profile-compatible, not profile-complete. The example package uses the general document profile only as the simplest illustration. Comics and storyboards remain first-class PRD profiles. Responsiveness remains a PRD-wide architectural principle.

---

## 3. Non-goals

This draft does not define:

- the full manifest schema
- the full package layout
- a required spine or multi-entry content model
- attachment classes or attachment UX
- encryption, signatures, entitlements, or payment behavior
- live update feeds
- viewer capability negotiation
- product/service boundaries beyond the format/spec line

---

## 4. Assumptions Used In This Draft

- The spec is published in `docs/core/` within the current organized docs tree.
- `.prd` is the transport/archive form for the minimal valid package.
- An unpacked directory tree is informative for authoring and debugging, but not the normative transport contract.
- The first executable `general-document` foundation uses a public structured content entry at `content/root.json`.
- This draft does not yet freeze the full set of allowed entry media types for every future profile.
- Required public metadata must stay public. Protected/private material cannot become the only way to identify or open a minimal PRD.

---

## 5. Required Files

A minimal valid PRD MUST contain these required files:

1. `manifest.json`
   - MUST exist at the archive root.
   - MUST be valid JSON representing a single manifest object.
2. One primary entry target
   - MUST be declared by the `entry` field in `manifest.json`.
   - MUST resolve to exactly one file inside the package.
   - MUST be public and directly readable by the minimal viewer path.

No other root files or directories are mandatory in this draft.

---

## 6. Optional Files

A minimal valid PRD MAY contain additional public files or directories, including:

- `assets/` for images, fonts, audio, video, or other declared assets
- `attachments/` for reserved-optional bundled attachments
- additional content resources referenced by the primary entry
- future reserved protected/private material

Rules for optional files in this draft:

- Optional files MUST NOT be required to identify or open the base document.
- Optional files MAY enrich the document, but the package must remain minimally readable without them.
- Attachment presence does not change minimal validity. Full attachment rules are deferred to a later spec.
- Protected/private content is reserved. If present, it MUST layer on top of a still-openable public base.

---

## 7. Entry-resolution Rules

A minimal PRD viewer or validator MUST resolve the primary entry in this order:

1. Open the `.prd` archive as a ZIP package.
2. Locate `manifest.json` at the archive root.
3. Parse the manifest and read the required public fields.
4. Read `entry` as the single primary content path.
5. Resolve `entry` as a package-internal relative path.
6. Confirm that the resolved target exists as exactly one file inside the archive.
7. Open that target as the package's primary readable content.

The following are invalid for `entry` in this draft:

- an absolute path
- a path beginning with `/`
- a path containing `..`
- a network URL
- a directory path
- an empty string
- multiple primary entry values

This draft intentionally does not define a required spine model. Ordered multi-part reading flows belong in later manifest, package-layout, and profile specs.

---

## 8. Required Metadata

The minimal required metadata is public metadata. It MUST be readable from the top-level public manifest object, not hidden behind future protection layers.

A minimal valid PRD MUST expose:

- PRD format/spec version
- manifest version
- package/document identity
- intended profile
- human-readable title
- one primary public entry path

This draft freezes the required field names for that baseline in Section 9.

Notes:

- `id` MUST be stable enough to identify the package. This draft does not yet mandate one identifier scheme.
- `profile` MUST identify the intended PRD profile using a canonical machine-readable ID. Friendly UI labels do not satisfy this requirement. Profile identifier governance is defined in `governance/PRD_PROFILE_REGISTRY.md`. Exact machine-readable registry publication remains future work.
- `title` is minimal human-readable metadata, not a full descriptive schema.
- Required metadata MUST NOT live only inside `protected` or any future encrypted/private structure.

---

## 9. Minimal Manifest Fields

The minimal manifest baseline is frozen here so later schema work extends it instead of replacing it silently.

### 9.1 Required fields

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `prdVersion` | string | Yes | PRD format/spec version claimed by the package |
| `manifestVersion` | string | Yes | Manifest schema version claimed by the package |
| `id` | string | Yes | Stable package/document identifier |
| `profile` | string | Yes | Intended PRD profile |
| `title` | string | Yes | Human-readable document title |
| `entry` | string | Yes | Single primary package-internal entry path |

### 9.2 Optional reserved fields

These fields are allowed in the minimal draft, but their full schema is not defined here.

| Field | Type | Required | Current role |
| --- | --- | --- | --- |
| `profileVersion` | string | No | Reserved version for profile-specific behavior |
| `extensions` | array or object | No | Reserved declaration of optional extensions |
| `compatibility` | object | No | Reserved compatibility hints or requirements |
| `assets` | object or array | No | Reserved asset declarations |
| `attachments` | array | No | Reserved attachment declarations |
| `localization` | object | No | Reserved declaration for optional locale-aware behavior |
| `protected` | object | No | Reserved marker for future protected/private layering |

### 9.3 Manifest example

```json
{
  "prdVersion": "1.0",
  "manifestVersion": "1.0",
  "id": "urn:uuid:11111111-1111-1111-1111-111111111111",
  "profile": "general-document",
  "title": "Hello PRD",
  "entry": "content/root.json"
}
```

This example is intentionally small. It shows the baseline public header, not the full future manifest.

---

## 10. Packaging Constraints

The minimal valid PRD MUST obey these packaging constraints:

- The transport form MUST be a ZIP archive using the `.prd` extension.
- `manifest.json` MUST live at the archive root.
- `entry` MUST resolve only to a file packaged inside the same `.prd`.
- Package-internal paths MUST use relative archive paths.
- The package MUST be minimally readable without network access, cloud services, wallets, blockchains, payment systems, or live feeds.
- The package MUST remain minimally readable without any protected/private layer.
- Assets MAY be present but are not required.
- Attachments MAY be present but are not required.
- This draft does not require any specific directory names beyond what the example uses.

An unpacked directory tree MAY be used for authoring, validation, or debugging, but the normative distribution form in this draft is the `.prd` archive.

---

## 11. Failure Cases

A package is invalid as a minimal PRD if any of the following are true:

- the package is not a ZIP-based `.prd` archive
- `manifest.json` is missing from the archive root
- `manifest.json` cannot be parsed as a JSON object
- any required manifest field is missing
- any required manifest field is present only inside reserved protected/private material
- `entry` is missing, empty, or not a string
- `entry` resolves outside the package or to a non-existent file
- `entry` resolves to more than one target or to a directory
- the package requires a protected/private, payment, crypto, or live-update layer to open base content
- the package requires external network fetches just to open its minimal base content

A structurally valid package may still be unsupported by a given viewer. Viewer support and capability negotiation are later work.

---

## 12. Minimal Sample Package Tree

The following sample is informative. It shows the same minimal package in unpacked tree form for readability.

```text
hello-prd/
  manifest.json
  content/
    root.json
```

Example `manifest.json`:

```json
{
  "prdVersion": "1.0",
  "manifestVersion": "1.0",
  "id": "urn:uuid:11111111-1111-1111-1111-111111111111",
  "profile": "general-document",
  "title": "Hello PRD",
  "entry": "content/root.json"
}
```

Example `content/root.json`:

```json
{
  "schemaVersion": "1.0",
  "profile": "general-document",
  "type": "document",
  "id": "hello-prd",
  "title": "Hello PRD",
  "children": [
    {
      "type": "paragraph",
      "text": "This is the smallest readable structured PRD example in this draft."
    }
  ]
}
```

When distributed, the package above is zipped as `hello-prd.prd`. The unpacked tree is shown only to make the structure inspectable by humans.

---

## 13. Validator Rules

A validator implementing this draft SHOULD check at least the following:

1. The file uses `.prd` transport and can be opened as a ZIP archive.
2. `manifest.json` exists at the archive root.
3. `manifest.json` parses as a single JSON object.
4. `prdVersion`, `manifestVersion`, `id`, `profile`, `title`, and `entry` all exist and are strings.
5. `entry` is a single relative internal path with no path-traversal segments and no URL form.
6. The `entry` target exists inside the package and is a file.
7. The package can be opened to base content without consulting `protected`, `extensions`, external services, or payment/crypto systems.
8. If optional `attachments` are present, the package still validates when attachments are ignored.
9. If optional `protected` data is present, all required public metadata still exists outside it.
10. Unknown optional fields do not break minimal validity unless they contradict one of the rules above.

Every later PRD spec should extend or refine these checks, not remove the baseline rules without an explicit decision-log change.

---

## 14. Open Questions

The following remain intentionally open after this draft:

- What exact value syntax should `prdVersion` and `manifestVersion` use?
- What exact identifier formats should be recommended or required for `id`?
- What machine-readable publication format, if any, should PRD use for a public profile registry beyond the canonical doc set?
- What entry media types must every conforming minimal viewer support?
- What full directory conventions should be recommended beyond the root manifest and the declared entry target?
- How should assets be declared when present: object, array, or profile-specific model?
- What full attachment model should distinguish bundled files, linked files, and PRD-to-PRD references?
- How should protected/private material be placed and referenced without weakening portability or graceful degradation?
- How should multi-entry reading flows, spine behavior, and large-work segmentation layer on top of this minimal baseline?
- How should viewer compatibility declarations relate to the minimal manifest once the capability model is defined?
