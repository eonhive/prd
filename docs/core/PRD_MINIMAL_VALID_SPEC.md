# PRD_MINIMAL_VALID_SPEC.md
_Last updated: October 27, 2026_
_Status: Ratified minimal-valid baseline v0.3_

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

## Companion docs

This document is the minimal-valid conformance anchor and works together with:

- `docs/core/PRD_MANIFEST_DRAFT.md` for manifest field meaning and optional-field truth
- `docs/core/PRD_PACKAGE_LAYOUT_DRAFT.md` for canonical package layout guidance
- `docs/profiles/PRD_PROFILE_GENERAL_DOCUMENT.md` for the canonical structured `general-document` root contract
- `docs/profiles/PRD_PROFILE_COMIC.md` for structured `comic` root rules and legacy fallback posture
- `docs/profiles/PRD_PROFILE_STORYBOARD.md` for structured `storyboard` root rules and legacy fallback posture
- `docs/runtime/PRD_CAPABILITY_MODEL.md` and `docs/runtime/PRD_CONFORMANCE.md` for runtime truth separate from structural validity

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
For interchange validity, a minimal PRD package **MUST** use the `.prd` extension and a ZIP payload, either as the existing ZIP archive or inside the additive PRD container 1.0 envelope defined in [PRD_CONTAINER_FORMAT.md](PRD_CONTAINER_FORMAT.md) and PRD-040. Default writers retain the legacy ZIP form during the staged rollout. In both forms, package-root paths refer to the ZIP payload root.

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

## Conformance mapping matrix

| Req ID(s) | Normative requirement | Current enforcement truth | Issue code family / status | Positive fixture(s) | Negative fixture(s) / tests |
| --- | --- | --- | --- | --- | --- |
| `MVS-001` | `.prd` with a ZIP payload, directly or in the PRD 1.0 envelope | Shared browser-safe container reader plus Node extension policy; not core in-memory semantic validation | `archive-extension-invalid`, `archive-magic-invalid`, `container-*`, `archive-read-invalid`; operational budgets/member guards documented in the container contract | archive and CLI round trips for both forms | `packages/prd-validator/src/container.test.ts` covers malformed headers, invalid ZIP, hostile members, declared/actual limits and legacy compatibility |
| `MVS-002`, `MVS-003` | root `manifest.json` exists and parses as one JSON object | Enforced by package-file validation before profile/content checks | `manifest-missing`, `manifest-json-invalid`, `manifest-shape` | `examples/document-basic`, `examples/comic-basic`, `examples/storyboard-basic` | existing validator fixture coverage for missing/invalid manifest packages |
| `MVS-004`, `MVS-005` | required opening fields stay top-level and public | Enforced in manifest validation | `prdVersion-required`, `manifestVersion-required`, `id-required`, `profile-required`, `title-required`, `entry-required` | canonical examples and `validManifest` fixture coverage | required-field tests in `packages/prd-validator/src/index.test.ts` |
| `MVS-006`, `MVS-007` | reference tooling may accept directories while interchange remains `.prd`; canonical layout stays predictable | Directory acceptance is implemented in `@eonhive/prd-validator/node`; canonical layout remains guidance rather than a hard-validity requirement beyond referenced paths | no dedicated layout issue code; directory mode is explicit runtime/tooling behavior | directory/archive dual-mode tests in `packages/prd-validator/src/index.test.ts` | non-canonical but structurally valid layouts remain allowed if manifest references resolve |
| `MVS-008`, `MVS-009`, `MVS-010` | `entry` is relative, safe, and resolves to one existing file | Enforced in manifest/package validation | `entry-empty`, `entry-absolute`, `entry-backslash`, `entry-url`, `entry-traversal`, `entry-directory`, `entry-missing` | canonical examples and `validManifest` fixture coverage | entry-path matrix tests in `packages/prd-validator/src/index.test.ts` |
| `MVS-011`, `MVS-012` | profile is one of the MVP core profiles and profile-entry compatibility is enforced | Enforced in manifest normalization and package validation | `profile-unknown`, `general-document-entry-format`, `comic-entry-format`, `storyboard-entry-format` | canonical examples for each core profile | `examples/conformance/general-document-invalid-entry`, `examples/conformance/comic-invalid-entry`, `examples/conformance/storyboard-invalid-entry` |
| `MVS-013`, `MVS-014` | canonical `general-document` path is structured JSON under `content/`; HTML stays fallback-only | Enforced in package validation and viewer/runtime separation | `general-document-entry-format`; runtime fallback is separate and documented in `docs/runtime/PRD_CONFORMANCE.md` | `examples/document-basic` | `examples/conformance/general-document-invalid-entry` plus built CLI/validator fixture coverage |
| `MVS-015`, `MVS-016` | base readability comes from the public manifest and public `entry`; required opening metadata cannot live only in protected/private material | Current manifest model keeps required fields top-level and public, and `entry` must resolve to a public package file; there is no separate legal protected-only base-open path in the current schema/validator model | no dedicated portability-only issue code in v0.3; enforced through required top-level field checks, `entry-*` checks, and public-manifest-only modeling | canonical examples | dedicated cloud/wallet/protected-only negative fixtures remain deferred because those surfaces are not modeled as valid minimal-open paths today |
| `MVS-017` | `identity`, when present, must match current schema/validator truth | Enforced in schema + manifest validation | `identity-shape`, `identity-*`, `identity-series-*`, `identity-collection-*` | valid identity/series tests in `packages/prd-validator/src/index.test.ts` | malformed identity tests in `packages/prd-validator/src/index.test.ts` |
| `MVS-018` | `public`, when present, must match current schema/validator truth | Enforced in schema + manifest validation | `public-shape`, `public-cover`, `public-contributor-*`, `public-series-*`, `public-collections-*` | valid public metadata tests in `packages/prd-validator/src/index.test.ts` | malformed public metadata tests in `packages/prd-validator/src/index.test.ts` |
| `MVS-019` | `localization`, when present, must match current schema/validator truth | Enforced in schema + manifest validation | `localization-shape`, `localization-default-locale`, `localization-available-locales`, `localization-default-missing`, `localization-text-direction` | localized document package tests and `examples/document-basic` | malformed localization-block test coverage in `packages/prd-validator/src/index.test.ts` |
| `MVS-020` | `extensions`, when present, must match current schema/validator truth | Current schema/validator truth allows either an array of declarations or an object placeholder surface; this remains a documented MVP reality rather than a redesign target in this slice | `extensions-shape`, `extension-id-required` | positive `extensions` declaration tests in `packages/prd-validator/src/index.test.ts` | malformed `extensions` block tests in `packages/prd-validator/src/index.test.ts` |
| `MVS-021`, `MVS-022` | validity and runtime capability remain separate | Enforced through separate validator and viewer-core/runtime contracts | runtime support-state labels such as `fully-supported`, `safe-mode`, `unsupported-required-capability` remain outside validator issue codes | viewer-core integration tests and `apps/prd-viewer-web` render-mode integration tests | cross-package validator/viewer render-mode integration tests |

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

1. Should a later transport/conformance slice add dedicated bad-archive fixtures rather than relying only on archive entrypoint tests?
2. When the protection model is drafted, should minimal-valid spec add explicit portability issue codes for public-path blockage?
3. What is the smallest profile-specific content-schema contract that deserves its own normative extraction beyond the existing profile docs?
