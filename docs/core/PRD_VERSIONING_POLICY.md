# PRD_VERSIONING_POLICY.md
_Last updated: October 28, 2026_
_Status: Canonical versioning policy baseline v0.2; reference opening policy under PRD-046_

## 1. Purpose

This document defines how PRD version surfaces relate to one another.

Its job is to keep format versions, manifest versions, profile versions, extension versions, runtime versions, and npm package versions from being confused or silently coupled.

This policy keeps manifest/schema shapes, structural validation, CLI output and public package exports unchanged. It defines the reference viewer's supported opening baseline separately from structural validity.

---

## 2. Version Surfaces

| Surface | Where it appears | Current role | Versioned by |
| --- | --- | --- | --- |
| Binary container version | optional PRD envelope header major/minor bytes | Defines how to locate/read the ZIP payload; current envelope is 1.0, while legacy ZIP has no PRD header | container contract / PRD-040 |
| PRD format version | `manifest.prdVersion` | Declares the PRD package-format contract claimed by a package | core format policy |
| Manifest version | `manifest.manifestVersion` | Declares the manifest contract claimed by a package | manifest/schema policy |
| Structured content version | content root/section `schemaVersion` | Declares the structured-content contract claimed by each file; current examples use `1.0` | profile/content policy |
| Profile version | optional `manifest.profileVersion` | Declares profile-specific contract when needed | profile specs |
| Extension version | manifest extension declarations | Declares optional extension contract | extension specs |
| Runtime/viewer version | runtime descriptors and app releases | Identifies implementation behavior | implementation release policy |
| npm package version | `package.json` for public tooling packages | Identifies published tool/library releases | Changesets and npm release policy |
| CLI JSON contract version | `docs/runtime/PRD_CLI_JSON_CONTRACT.md` and CLI docs | Identifies machine-readable CLI output shape | CLI/runtime contract policy |

These surfaces are related, but they are not interchangeable.

Container identification is specified in [PRD_CONTAINER_FORMAT.md](PRD_CONTAINER_FORMAT.md). Adding the opt-in 1.0 envelope does not change manifest `prdVersion`/`manifestVersion` or npm package numbers. Unknown header versions and flags fail explicitly. Current writers keep ZIP as default; migrating that default requires an explicit compatibility/release decision.

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

### 4.1 Structural validity remains separate

The validator and schemas retain their current structural checks. Format/manifest/content version fields remain required non-empty strings, and optional `profileVersion` remains a non-empty string when present. The handwritten `minViewer` check still accepts any string, including empty; the independent manifest schema has a non-empty constraint. This change does not insert supported-version enums into structural validation or alter validate/inspect JSON.

An otherwise structurally valid package declaring `999.0` may therefore still validate. It can no longer receive a render payload from the reference viewer merely because that string is non-empty. Missing or otherwise invalid structural fields still fail validation first.

### 4.2 Reference viewer opening baseline

| Surface | Reference opening policy |
| --- | --- |
| `prdVersion` | Exactly `1.0` or its normalized spelling `1.0.0` |
| `manifestVersion` | Exactly `1.0` or `1.0.0` |
| Canonical profile `profileVersion`, when present | Exactly `1.0` or `1.0.0`; absence remains valid. This explicit wire baseline is independent of profile-document draft maturity. Custom/deprecated profile versions are not reinterpreted as canonical contracts. |
| Canonical structured root / packaged section `schemaVersion` | Exactly `1.0` or `1.0.0`, including alternate locale roots and their referenced sections |
| `compatibility.minViewer` | Absent means no minimum. When present, parse a numeric two- or three-component version and require the current descriptor version to be at least that value. Current descriptor: `0.1.0`; `0.1` means `0.1.0`. |
| Required extension versions | No required extension handlers exist; required declarations remain unsupported. Optional extensions follow their own contracts. |
| Binary and signature versions | Existing exact container/signature rules remain independent and unchanged. |

Numeric reference-version syntax is `major.minor` or `major.minor.patch`. Components use ASCII decimal digits with no leading zeros except literal zero, and must fit nonnegative JavaScript safe integers. Omitted patch means zero. Comparison is numeric by major, then minor, then patch; it is not string comparison. Surrounding whitespace, prefixes, ranges, signs, prereleases, build suffixes and additional components are not recognized. An empty or unrecognized `minViewer` is unsupported opening, not an implicit minimum of zero.

Contract support is an exact set, not a guessed semver compatibility range: `0.9`, `1.0.1`, `1.1`, `2.0` and `999.0` are unsupported for the current format/manifest/canonical-profile/content contracts. `1.0.0` is a spelling equivalent of the existing contract, not a migration. Raw declarations and original package bytes are not rewritten. Viewer minimums are different: an older or equal requirement such as `0.0.999` or `0.1` is satisfied, while `0.1.1`, `0.2` or `999.0` is not.

### 4.3 Opening sequence, fallback and scope

`openPrdDocument` checks manifest versions, canonical profile version, minimum viewer and required capabilities/extensions after profile normalization and before reading the entry. Failure uses the existing `unsupported-required-capability` state, retains normalized manifest/profile/entry/locale facts and names the unmet declarations. No new support-state label or descriptor field is introduced.

For a canonical structured path, JSON must be parsed to read its version metadata. The viewer checks the default root and its top-level packaged sections, then alternate roots declared through the existing localization index and their sections, before returning any render payload. Each such file is checked once per opening. The host's existing unsupported-state guard stops section resolution, locale presentation and media/object-URL preparation. The current host eagerly prepares every declared alternate, so an unsupported alternate blocks this opening rather than being silently dropped or rendered under the current schema.

This preflight follows declared presentation references, not all JSON in the package. Unreferenced content, attachments, profile hints, localization indexes and localization override resources do not acquire a new `schemaVersion` requirement. Assets and optional extension payloads keep their own contracts. Structurally invalid packages never use version negotiation as a substitute for validation.

Existing `1.0` examples, the `responsive-document` alias, and documented legacy HTML/bare-resume/custom-profile fallbacks retain their behavior when base versions/minimum requirements pass. HTML itself needs no structured `schemaVersion`; declared structured alternates still do. No older format decoder, automatic migration, guessed fallback or silent per-locale substitution is implemented. Earlier format versions are not inferred from npm preview numbers. A valid digital signature also cannot grant unsupported semantic/version behavior.

Archive bytes and structural validation remain eager. Version metadata preflight is an additional interpretation boundary, not streaming or a performance optimization. Migration, broader version ranges, per-locale partial support and additional profile/extension contracts require later decisions and fixtures.

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

The optional [signature-v1 extension](../extensions/PRD_SIGNATURE_V1.md) declares extension version `1.0` and metadata contract `prd-signature-v1`; its CLI commands use `prd-cli-signature-v1`. These identifiers do not change the format, manifest, container or existing CLI JSON versions. Unknown signature contracts are unsupported verification, never implicit success. Unsigned readability remains available.

---

## 6. npm Tooling Version Policy

Public npm packages use semver and Changesets.

Until the public tooling reaches `1.0.0`:

- patch releases fix bugs, metadata, docs packaging, tests, or compatible behavior
- minor releases may add tooling features, CLI surfaces, validator coverage, or compatible library APIs
- breaking changes may still occur before `1.0.0`, but they must be explicit in changesets, docs, and release notes
- package versions are independent under PRD-057; Changesets and dependency updates determine individual versions, without a toolchain-wide equality requirement

The public release catalog includes types, validator, packager, converter and CLI. Changesets `fixed`/`linked` groups remain empty. Maintainers may deliberately coordinate related changes, but preflight must not require an unchanged package to bump just because another package changes. Registry audit and consumer checks use each package's exact declared version. The one-time original preview bootstrap is retired from current CI; new-package publication follows the ordinary Changesets version PR flow.

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

- migration or additional supported contracts beyond the reference baseline above
- migration guidance when manifest versions change
- extension-specific compatibility rules
- release-note format for public tooling releases
- whether a formal compatibility matrix belongs in runtime conformance docs or a separate product-facing document
