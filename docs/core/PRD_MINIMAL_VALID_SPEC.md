# PRD_MINIMAL_VALID_SPEC.md
_Last updated: April 16, 2026_  
_Status: Draft v0.2 (provisional)_

## Purpose

This document defines the smallest legal and usable PRD package for the MVP foundation.

The goal is to keep minimal PRD packages:

- portable,
- manifest-centered,
- profile-aware,
- validator-testable,
- and minimally renderable by a compliant viewer.

This is a foundation spec, not an ecosystem expansion spec.

---

## Scope

This spec defines:

1. normative minimal transport and package structure
2. minimal required manifest fields
3. entry resolution constraints
4. baseline profile-entry compatibility requirements
5. portability constraints for base readability
6. baseline validator conformance expectations

---

## Non-goals

This spec does **not** define full architectures for:

- payment or commerce systems
- crypto ownership or chain-linked behavior
- full encryption or signature stacks
- live networked document behavior
- advanced runtime extension execution models
- full conversion workflows

Those capabilities remain optional extension lanes and MUST NOT be required for minimal-valid package readability.

---

## Normative rules

Normative terms are interpreted as defined by RFC 2119/8174 usage: MUST, MUST NOT, SHOULD, SHOULD NOT, MAY.

### Transport and package root

**MVS-001**  
For interchange validity, a minimal PRD package **MUST** be a ZIP archive with a `.prd` extension.

**MVS-002**  
The package **MUST** include `manifest.json` at package root (archive root for `.prd`; directory root for tooling directory validation mode).

**MVS-003**  
`manifest.json` **MUST** be parseable as valid JSON object content.

**MVS-004**  
The manifest **MUST** include all required top-level opening fields:

- `prdVersion`
- `manifestVersion`
- `id`
- `profile`
- `title`
- `entry`

**MVS-005**  
The manifest **MUST NOT** require nested `header`, `metadata`, or `structure` sections as opening structure.

**MVS-006**  
Reference validators/CLI **MAY** accept unpacked directory targets for authoring and CI workflows, applying the same structural checks to the logical package tree. This does not change **MVS-001** for interchange transport.

### Minimal directory model (logical package tree)

**MVS-007**  
The logical package tree **SHOULD** use the canonical predictable layout:

- `manifest.json`
- `content/`
- `assets/`
- `profiles/`
- `extensions/`
- `protected/`

For minimal validity, only paths required by manifest references are mandatory to exist.

### Entry constraints

**MVS-008**  
`entry` **MUST** be a relative package-internal path.

**MVS-009**  
`entry` **MUST NOT** be:

- an absolute path
- a URL
- a backslash-based path
- a directory path
- a path traversal (`..`) escape path

**MVS-010**  
`entry` **MUST** resolve to an existing package member file.

### Profile constraints (MVP core set)

**MVS-011**  
`profile` **MUST** be one of:

- `general-document`
- `comic`
- `storyboard`

**MVS-012**  
Profile-specific entry compatibility **MUST** be enforced by validator rules.

### General-document canonical path

**MVS-013**  
For canonical executable support, `general-document` packages **MUST** use structured JSON entry under `content/` (typically `content/root.json`).

**MVS-014**  
HTML-backed opening behavior for `general-document` **MAY** exist as viewer fallback behavior, but **MUST NOT** be treated as minimal-valid canonical `general-document` entry conformance.

### Portability constraints for minimal validity

**MVS-015**  
A minimal-valid package **MUST** provide base readable content through public manifest + public `entry` without requiring Cloud, PRDc, payment, crypto, wallet, or protected/private-only access paths.

**MVS-016**  
Required opening metadata (`prdVersion`, `manifestVersion`, `id`, `profile`, `title`, `entry`) **MUST NOT** exist only in protected/private material.

### Optional manifest areas

**MVS-017**  
When present, `identity` **MUST** conform to schema-defined shape.

**MVS-018**  
When present, `public` **MUST** conform to schema-defined shape.

**MVS-019**  
When present, `localization` **MUST** conform to schema-defined shape.

**MVS-020**  
When present, `extensions` **MUST** conform to schema-defined shape and versioning/namespace rules.

### Validator and viewer boundary

**MVS-021**  
Structural validity **MUST** be determined by validator conformance checks, not viewer implementation behavior.

**MVS-022**  
Viewer capability levels **MUST** be represented separately from package validity.

---

## Minimal legal package tree (logical contents)

```text
example-minimal.prd/
  manifest.json
  content/
    root.json
```

The distributed interchange artifact for this logical tree is `example-minimal.prd` (ZIP).

---

## Minimal manifest example (illustrative)

```json
{
  "prdVersion": "1.0.0",
  "manifestVersion": "1.0.0",
  "id": "example-minimal-001",
  "profile": "general-document",
  "title": "Minimal PRD Example",
  "entry": "content/root.json"
}
```

---

## Invalid examples (illustrative)

### Missing required field

```json
{
  "prdVersion": "1.0.0",
  "manifestVersion": "1.0.0",
  "id": "bad-001",
  "profile": "general-document",
  "entry": "content/root.json"
}
```

Invalid: missing `title`.

### Illegal entry URL

```json
{
  "prdVersion": "1.0.0",
  "manifestVersion": "1.0.0",
  "id": "bad-002",
  "profile": "general-document",
  "title": "Bad Entry",
  "entry": "https://example.com/doc.json"
}
```

Invalid: `entry` is an external URL.

### Non-structured general-document entry

```json
{
  "prdVersion": "1.0.0",
  "manifestVersion": "1.0.0",
  "id": "bad-003",
  "profile": "general-document",
  "title": "Legacy HTML",
  "entry": "index.html"
}
```

Invalid for minimal-valid `general-document` canonical conformance.

---

## Conformance mapping matrix (starter)

| Req ID | Normative requirement | Schema/validator path | Validator issue code(s) | Fixture ID(s) | CLI output expectation | Status |
| --- | --- | --- | --- | --- | --- | --- |
| MVS-001 | interchange artifact is `.prd` ZIP | CLI/open target mode | TBD | `transport-not-prd-zip` | `.prd` validation rejects non-zip/non-prd | Draft |
| MVS-004 | required opening fields present | top-level manifest fields | `prdVersion-required`, `manifestVersion-required`, `id-required`, `profile-required`, `title-required`, `entry-required` | `missing-*` set | deterministic missing-field issues | Draft |
| MVS-008..010 | entry is relative, safe, existing file | `manifest.entry` checks | `entry-empty`, `entry-absolute`, `entry-backslash`, `entry-url`, `entry-traversal`, `entry-directory`, `entry-missing` | `entry-*` fixtures | deterministic entry issue family | Draft |
| MVS-011..014 | profile + entry compatibility | profile/entry compatibility checks | `general-document-entry-format`, `comic-entry-format`, `storyboard-entry-format` | `profile-entry-*` fixtures | mismatch appears in invalid list | Draft |
| MVS-015/016 | portability constraints hold | manifest/opening portability checks | TBD | `requires-cloud`, `requires-wallet`, `protected-only-base-open` | portability failures are hard-invalid | Draft |
| MVS-017..020 | optional blocks shape-valid when present | optional object checks | TBD | block-specific invalid fixtures | shape-specific issue list | Draft |
| MVS-021/022 | validity vs capability separated | validator/viewer boundary | TBD | integration fixtures | valid package can still show limited viewer capability state | Draft |

Replace all `TBD` codes with canonical issue codes from implementation and lock via tests.

---

## Validation and CLI expectations

1. `validate` MUST return deterministic issue structure for invalid packages.
2. `validate` MUST return success for valid packages.
3. JSON output MUST remain stable enough for automation contracts.
4. Human-readable output SHOULD remain deterministic in section ordering.
5. For `.prd` file targets, transport checks from MVS-001 MUST apply.
6. For directory targets in reference tooling mode, MVS-001 transport check MAY be skipped while all other structural checks still apply.

---

## Deferred items (explicit)

The following are intentionally deferred to later specs/docs:

- detailed capability levels taxonomy
- full conformance class model
- advanced extension execution/runtime behavior
- rights/access/protection model details
- economy/payment/crypto extension model details

---

## Open questions

1. Which exact issue code(s) should represent portability violations in validator output?
2. Should `.prd` transport enforcement live in validator core, CLI layer, or both (with shared contract docs)?
3. What is the exact minimum content schema for `content/root.json` per profile?
4. Which optional manifest blocks are MVP-required for any profile-specific conformance tier?

---

## Change control notes

This document remains provisional until:

1. all `TBD` issue-code mappings are resolved
2. fixture IDs exist and pass in CI
3. active NEXT_STEPS conformance tasks are closed
