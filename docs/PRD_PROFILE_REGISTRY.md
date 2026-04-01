# PRD_PROFILE_REGISTRY.md
_Last updated: April 1, 2026_  
_Status: Canonical profile governance draft v0.4_

## 1. Purpose

This document defines how PRD profiles are identified, classified, proposed, and evaluated.

Its job is to prevent profile sprawl, naming collisions, and hidden fragmentation while preserving PRD's profile-based architecture.

This is a profile-governance document. It does not redefine the PRD core package, manifest baseline, minimal validity rules, or product boundaries.

**Assumptions**

- A separate machine-readable public registry file is not defined yet.
- The exact governance workflow for proposing or accepting future canonical profiles is not fully defined yet.
- A globally standardized variant field is not accepted yet. Variant notation remains profile-specific unless a higher-priority manifest or registry update standardizes it.

---

## 2. Scope

This document defines:

- what counts as a PRD profile
- what should remain a variant instead of becoming a new top-level profile
- canonical core profile identifiers
- profile identifier rules
- profile status classes
- proposal and acceptance expectations
- community/custom profile handling
- validator and viewer implications

This document does not define:

- the full manifest schema
- the full extension registry system
- the detailed structure or rendering rules of each profile
- branding or legal policy
- Viewer, Studio, Cloud, SDK, Renderer, or PRDc product behavior beyond registry truth

---

## 3. Core Terms

### 3.1 Profile

A profile is a named PRD document class with defined structure, layout/render behavior, reading or review expectations, fallback behavior, and validator implications.

The manifest `profile` field identifies that class.

### 3.2 Variant

A variant is a narrower mode within an existing profile.

Variants may change things such as reading direction, presentation mode, or edition style without becoming a new top-level profile automatically.

### 3.3 Extension

An extension is an optional capability layer beyond the base profile behavior.

Examples include protected/private behavior, payments, signatures, live updates, or other optional capability lanes.

Extensions must not replace the underlying profile identity.

---

## 4. Canonical Core Profiles

The following profile identifiers are currently reserved as canonical first-class PRD profiles:

| Profile identifier | Status | Role |
| --- | --- | --- |
| `general-document` | Canonical core profile | General structured responsive reading documents |
| `comic` | Canonical core profile | Panel-based visual storytelling |
| `storyboard` | Canonical core profile | Shot-based planning and production communication |

These identifiers are part of PRD canon. They must not be repurposed, aliased, or redefined by community packages.
Responsiveness is a PRD-wide architectural principle and is not owned by the `general-document` profile.
`responsive-document` is a legacy draft-era alias superseded by `general-document` and should appear only in explanatory migration notes.

---

## 5. Profile Versus Variant Rule

A document kind should become a new top-level profile only when it introduces one or more of the following:

1. substantially different semantic units
2. substantially different reading or review behavior
3. substantially different fallback behavior
4. substantially different validator logic
5. substantially different authoring or rendering expectations that would make reuse of an existing profile misleading

A document kind should remain a variant when it mainly changes:

- reading direction
- presentation mode
- edition style
- packaging mode
- guided-reading preference
- visual treatment within an already fitting profile

Examples that should normally remain inside `comic` unless a later accepted spec proves otherwise:

- manga-style right-to-left reading
- vertical-scroll comic presentation
- collector-edition comic packaging
- guided-panel comic reading

This rule exists to keep PRD profile growth disciplined rather than turning every variation into a new top-level profile.

---

## 6. Identifier Rules

Every profile identifier must be stable and machine-readable.

Canonical core identifiers should use lowercase ASCII kebab-case.

Examples:

- `general-document`
- `comic`
- `storyboard`

Community/custom profile identifiers should use a namespaced form to reduce collisions.

Recommended forms:

- `vendor.example.profile-name`
- `org-name.profile-name`

Examples:

- `indiesweb.interactive-lesson`
- `studio7.pitch-deck`

Profile identifiers must not:

- contain spaces
- contain path separators
- contain manifest-relative paths
- start with `.`
- use product tiers or viewer modes as the profile identifier
- impersonate a canonical core profile

---

## 7. Status Classes

PRD currently recognizes these operational profile classes:

| Class | Meaning |
| --- | --- |
| Canonical core profile | Reserved by higher-priority PRD source-of-truth docs and part of the expected interoperability baseline |
| Community/custom profile | Defined outside core PRD canon but allowed if it respects PRD core boundaries |
| Local/experimental profile | Private or provisional profile with no general interoperability claim |
| Deprecated profile | Retained for compatibility but discouraged for new authoring |
| Superseded profile | Explicitly replaced by a newer profile entry |

This document does not define a separate machine-readable registry-state schema yet. It defines the operational classes PRD uses when reasoning about profile status.

---

## 8. Community And Custom Profiles

Community, open-source, vendor, and organization-defined PRD profiles are allowed.

A community/custom profile:

- MUST use an identifier that does not collide with a reserved canonical identifier
- MUST keep the PRD core package and manifest contract intact
- MUST NOT redefine the meaning of `prdVersion`, `manifestVersion`, `id`, `title`, `entry`, or the public/protected split
- MUST publish its own profile rules if it claims portability across tools
- SHOULD declare `profileVersion` when profile-specific behavior may evolve incompatibly
- SHOULD define truthful fallback behavior for viewers that do not implement the profile fully

A community/custom profile may be described as:

- a PRD-compatible profile
- a PRD third-party profile

It must not be presented as a canonical core PRD profile unless higher-priority PRD source-of-truth docs later accept it.

Canonical status requires a source-of-truth update, not just community usage.

---

## 9. Proposal And Acceptance Requirements

A proposed profile entry should include:

1. purpose
2. scope
3. non-goals
4. structural model
5. layout/render expectations
6. fallback behavior
7. minimal sample package
8. invalid cases
9. validator implications
10. open questions

A profile should not be treated as canonically accepted unless its profile spec and supporting examples are concrete enough to evaluate those items.

Recommended profile registry metadata for a published profile entry includes:

- `id`
- `label`
- `description`
- `statusClass`
- `profileVersion`
- `summary`
- `owner`
- `specRef`
- `fallbackSummary`
- `compatibilityNotes`
- `aliases`

The exact machine-readable shape for this metadata remains future work.

### 9.1 Registry metadata roles

- `id` is the canonical machine-readable profile identifier used in the manifest.
- `label` is the friendly human-facing display label used by Viewer, Studio, SDKs, validators, or registry UIs.
- `description` is short help text or explanatory copy for humans.
- `aliases` is an optional compatibility list for legacy or deprecated identifiers that tools may normalize during read or validation.

Friendly labels and descriptions do not replace canonical profile IDs in the package contract.

Illustrative registry baseline:

```json
[
  {
    "id": "general-document",
    "label": "Document",
    "description": "General-purpose structured reading document family.",
    "statusClass": "canonical-core-profile",
    "aliases": ["responsive-document"]
  },
  {
    "id": "comic",
    "label": "Comic",
    "description": "Panel-based visual storytelling.",
    "statusClass": "canonical-core-profile"
  },
  {
    "id": "storyboard",
    "label": "Storyboard",
    "description": "Shot-based planning and review.",
    "statusClass": "canonical-core-profile"
  }
]
```

---

## 10. Manifest Declaration Rules

The base manifest rules remain unchanged:

- `profile` is the required public manifest field that names the intended PRD profile
- `profile` must be one string value
- `profileVersion` is optional and may be used for profile-specific versioning

A package must declare exactly one top-level `profile` in the public manifest.

The manifest `profile` value must use the canonical registry `id`, not a friendly UI label.
New packages should emit canonical IDs, not legacy aliases.

The top-level `profile` field identifies the main document family. It must not be replaced by:

- extension identifiers
- tool names
- product tiers
- viewer-only mode strings
- rights modes
- payment modes
- encryption modes

This document does not globally standardize a `profileVariant` field. If a profile spec chooses to use variant notation, that remains profile-specific until a higher-priority manifest or registry update standardizes it.

---

## 11. Boundary Rules

A PRD profile may define:

- structure rules
- layout rules
- rendering rules
- reading or navigation modes
- review behavior
- profile-specific metadata beyond the base manifest
- profile-specific capabilities or extensions

A PRD profile must not redefine:

- the `.prd` ZIP transport baseline
- the required root `manifest.json`
- the required public manifest fields
- the public-header versus protected/private model
- the rule that base readability must not depend on PRDc, Cloud, payments, crypto, or protected/private-only access
- the rule that extensions remain optional layers rather than hidden base requirements

Profiles may extend PRD behavior, but they may not backdoor a new base format under the PRD name.

---

## 12. Viewer And Validator Handling

If a viewer or validator encounters a declared profile:

1. If the profile is known and supported, it should apply that profile's rules.
2. If the profile value is a known legacy alias, the tool may normalize it to the canonical profile ID and continue with explicit reporting.
3. If the profile is unknown but the package still exposes a truthful base open path, the viewer may fall back safely according to the capability model.
4. If the profile requires behavior the viewer cannot support and no truthful fallback exists, the viewer should fail clearly rather than invent semantics.

Unknown community/custom profiles do not make a package non-PRD automatically. They make profile-specific interoperability conditional on tool support.

Validators should check at least the following:

- `profile` exists and is a string
- canonical profile identifiers are spelled correctly
- friendly UI labels are not used in place of canonical `profile` IDs
- a package does not falsely claim canonical status through identifier misuse
- `profileVersion` is present when required by the selected profile spec
- unknown community/custom profiles are reported accurately rather than silently treated as canonical
- deprecated or superseded profiles produce clear warnings

Validators may warn when:

- a proposed top-level profile appears to be only a variant of an existing profile
- a profile name collides with an extension or product concept
- a package uses a profile identifier with unsafe or non-portable naming

---

## 13. What Makes A Profile Canonical

A profile becomes canonical only when all of the following are true:

- the profile is accepted in higher-priority PRD source-of-truth docs
- the profile identifier is reserved by canon
- the profile has a dedicated profile spec
- the profile has example packages or fixtures suitable for validation and reference viewing
- the profile does not distort the PRD core model or overload the minimal baseline

Community adoption alone does not grant canonical status.

---

## 14. Open Questions

- Should canonical registry data also live in a dedicated machine-readable file?
- Should PRD later standardize a global variant field?
- Should third-party namespace rules become stricter?
- What exact workflow should govern promotion from community/custom use to canonical core acceptance?
- Should alias normalization be required in validators, viewers, SDKs, or only recommended?

---

## 15. Follow-On Work

This document closes the profile-governance gap, but it does not finish all profile work.

Follow-on docs still needed:

- dedicated profile specs for `general-document`, `comic`, and `storyboard`
- conformance guidance tied to profile support levels
- a machine-readable public registry publication format, if PRD chooses to publish one
