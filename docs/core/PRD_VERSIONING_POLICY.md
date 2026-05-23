# PRD_VERSIONING_POLICY.md
_Last updated: May 23, 2026_
_Status: Canonical versioning policy baseline v0.1_

## 1. Purpose

This document defines how PRD version surfaces relate to one another.

Its job is to keep format versions, manifest versions, profile versions, extension versions, runtime versions, and npm package versions from being confused or silently coupled.

This policy does not change the manifest shape, schema, validator behavior, CLI behavior, or package exports.

---

## 2. Version Surfaces

| Surface | Where it appears | Current role | Versioned by |
| --- | --- | --- | --- |
| PRD format version | `manifest.prdVersion` | Declares the PRD package-format contract claimed by a package | core format policy |
| Manifest version | `manifest.manifestVersion` | Declares the manifest contract claimed by a package | manifest/schema policy |
| Profile version | optional `manifest.profileVersion` | Declares profile-specific contract when needed | profile specs |
| Extension version | manifest extension declarations | Declares optional extension contract | extension specs |
| Runtime/viewer version | runtime descriptors and app releases | Identifies implementation behavior | implementation release policy |
| npm package version | `package.json` for public tooling packages | Identifies published tool/library releases | Changesets and npm release policy |
| CLI JSON contract version | `docs/runtime/PRD_CLI_JSON_CONTRACT.md` and CLI docs | Identifies machine-readable CLI output shape | CLI/runtime contract policy |

These surfaces are related, but they are not interchangeable.

---

## 3. Current Baseline

Current executable examples use `prdVersion: "1.0"` and `manifestVersion: "1.0"` as package-declared format and manifest contract values.

The public npm tooling preview is separate from those fields. The current clean public npm baseline is `0.1.1` for:

- `@eonhive/prd-types`
- `@eonhive/prd-validator`
- `@eonhive/prd-packager`
- `@eonhive/prd-cli`

The `0.1.1` npm version does not mean the PRD format is externally finalized as a permanent `1.0` standard. It means the published tooling is in a clean pre-1.0 public preview state.

---

## 4. Format And Manifest Version Policy

PRD format and manifest version changes must be explicit.

Use this policy:

- Additive optional fields may be introduced only with schema, validator, docs, and fixture alignment.
- Required field changes need a decision-log entry and minimal-valid spec update.
- Changes that reinterpret existing required fields are breaking format changes.
- Viewer-only behavior must not be used to silently redefine format validity.
- Example packages must not introduce new version semantics before the docs and validator understand them.

The validator determines structural validity. Runtime support-state behavior remains separate.

---

## 5. Profile And Extension Version Policy

Profiles and extensions evolve under their own docs.

Profile changes should be classified as:

- editorial clarification
- additive compatible behavior
- behavior-changing compatible behavior
- breaking profile behavior

Extension changes must remain declared, optional unless explicitly required by a profile or package contract, and safe for unsupported viewers to ignore or reject according to the runtime conformance model.

No extension may create a hidden dependency on Cloud, payment, wallet, PRDc, or private product infrastructure for the base readable path.

---

## 6. npm Tooling Version Policy

Public npm packages use semver and Changesets.

Until the public tooling reaches `1.0.0`:

- patch releases fix bugs, metadata, docs packaging, tests, or compatible behavior
- minor releases may add tooling features, CLI surfaces, validator coverage, or compatible library APIs
- breaking changes may still occur before `1.0.0`, but they must be explicit in changesets, docs, and release notes
- package versions should stay aligned across the public toolchain when internal dependency edges or consumer clarity benefit from alignment

Public publishable packages must not publish `workspace:*` dependency values. Internal `@eonhive/prd-*` dependency edges in published metadata must resolve to concrete semver ranges.

The release policy and maintainer runbook define the CI-operated npm publication flow.

---

## 7. Release Channels And Gates

The only normal public npm release path is:

- `main`
- GitHub Actions
- Changesets
- release preflight
- release check
- registry audit
- post-publish consumer smoke

The broken `0.1.0` npm preview is deprecated. `0.1.1` is the clean public preview baseline.

No package is considered cleanly shipped until:

- expected npm package versions resolve
- registry metadata contains no `workspace:*` dependency values
- internal public dependency edges are concrete semver ranges
- post-publish consumer smoke passes against npm-installed packages

---

## 8. Compatibility Guidance

Compatibility claims should name the exact surface they apply to.

Examples:

- "supports `prdVersion: 1.0` packages"
- "emits `prd-cli-json-v0.1` inspect output"
- "publishes npm package version `0.1.1`"
- "reference viewer load mode is `eager-whole-package`"

Do not use a tooling package version as a substitute for package-format compatibility, and do not use a manifest version as a substitute for viewer support.

---

## 9. Follow-up Work

Later work should define:

- exact compatibility behavior for future `prdVersion` values
- migration guidance when manifest versions change
- extension-specific compatibility rules
- release-note format for public tooling releases
- whether a formal compatibility matrix belongs in runtime conformance docs or a separate product-facing document
