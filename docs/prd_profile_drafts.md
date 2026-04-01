# PRD_PROFILE_REGISTRY.md
_Last updated: April 1, 2026_  
_Status: Normative working draft v0.1_

## 1. Purpose

This document defines how PRD profiles are identified, registered, versioned, classified, and evaluated.

Its job is to prevent profile sprawl, naming chaos, and hidden fragmentation while still allowing PRD to grow into many document kinds.

This is a **profile governance and registration** document.  
It does **not** redefine the PRD core package, manifest, or minimal validity rules.

---

## 2. Scope

This document defines:

- what a PRD profile is
- what counts as a profile versus a variant or extension
- profile identifier rules
- profile registry states
- profile versioning expectations
- required registration metadata
- compatibility and fallback expectations
- conformance implications
- third-party and community profile handling

This document does **not** define:

- the full manifest schema
- the full extension registry system
- the detailed rules of each individual profile
- branding, trademark, or legal enforcement language
- Viewer or Studio product policy beyond what affects registry truth

---

## 3. Non-goals

This document is **not** intended to:

- let every custom idea become a top-level PRD profile immediately
- turn variants into full profiles without justification
- replace extension declarations with profile declarations
- allow product features to masquerade as profile requirements
- force all viewers to support every profile equally

---

## 4. Alignment With Existing PRD Canon

This draft aligns with the current PRD direction that:

- PRD is profile-based
- comics and storyboards are first-class profiles
- PRD should remain extensible but layered
- unsupported advanced behavior should degrade gracefully
- the base format must remain portable and practical

This draft also fills a current gap: PRD has profile-based direction, but it does not yet have a dedicated profile registration policy.

---

## 5. Core Terms

### 5.1 Profile

A **profile** is a named PRD document class with defined structure rules, layout/render behavior, reading/review expectations, fallback behavior, and validator implications.

A profile answers:

- what kind of document this is
- what semantic units it uses
- what baseline behavior a conforming viewer should expect

### 5.2 Variant

A **variant** is a narrower mode within a profile family.

Examples:

- comic with right-to-left reading
- comic with vertical-scroll layout
- comic with collector-edition packaging

Variants do **not** automatically become top-level profiles.

### 5.3 Extension

An **extension** is an optional capability layer beyond the base profile behavior.

Examples:

- protected/private content
- payments
- live update feeds
- signature verification
- motion layers

Extensions must not be used to hide the identity of the underlying profile.

### 5.4 Profile Family

A **profile family** is a broad top-level document category that may contain variants or future subprofiles.

Examples:

- general-document
- comic
- storyboard

---

## 6. Profile Versus Variant Decision Rule

The following decision rule applies.

A document kind SHOULD become a **new top-level profile** only when it introduces one or more of the following:

1. substantially different semantic units
2. substantially different reading or review behavior
3. substantially different fallback behavior
4. substantially different validator logic
5. substantially different authoring and rendering expectations that would make reuse of the parent profile misleading

A document kind SHOULD remain a **variant** when it mainly changes:

- reading direction
- visual style
- edition style
- packaging mode
- guided-reading preference
- presentation mode within an already fitting profile family

### 6.1 Practical examples

These SHOULD stay inside `comic` unless later evidence proves otherwise:

- manga
- webtoon-style comic
- collector-edition comic
- guided-panel comic

These MAY justify their own top-level profiles later if they diverge enough:

- complex interactive educational simulations
- fully review-driven legal filing packages
- a future production pipeline package that is no longer meaningfully a storyboard

---

## 7. Registry Classes

Profiles in the registry MUST use one of the following classes:

- **core** — part of the canonical PRD baseline
- **provisional** — approved for experimentation but not yet core
- **third-party** — externally defined and not part of the canonical baseline
- **deprecated** — discouraged for new use
- **superseded** — replaced by a newer profile or registry entry

### 7.1 Meaning of each class

#### core
Core profiles are first-class canonical profiles expected by the PRD standard direction.

Current baseline core profiles are:

- `general-document`
- `comic`
- `storyboard`

#### provisional
Provisional profiles are serious candidates under active evaluation.

They may be implemented and tested, but they are not yet assumed to be part of the stable baseline.

#### third-party
Third-party profiles are valid PRD-compatible profile definitions created outside the canonical registry body.

They may remain compatible with PRD, but they are not automatically treated as canonical PRD core.

#### deprecated
Deprecated profiles remain known for backward compatibility but SHOULD NOT be used for new authoring.

#### superseded
Superseded profiles have been explicitly replaced.

---

## 8. Registry States

Each profile entry MUST also declare a state:

- Draft
- Proposed
- Accepted
- Experimental
- Deprecated
- Superseded

These states align with the current PRD governance direction.

### 8.1 State meaning

- **Draft** — work in progress, unstable
- **Proposed** — ready for review, not yet accepted
- **Accepted** — canonically approved for its current class
- **Experimental** — testable but intentionally unstable
- **Deprecated** — retained for compatibility only
- **Superseded** — replaced by a newer entry

---

## 9. Profile Identifier Rules

Each registered profile MUST have a stable identifier.

### 9.1 Identifier format

Top-level canonical profile identifiers SHOULD use lowercase ASCII kebab-case.

Examples:

- `general-document`
- `comic`
- `storyboard`

### 9.2 Third-party identifier guidance

Third-party profiles SHOULD use a namespaced form to reduce collisions.

Recommended form:

- `vendor.example.profile-name`
- `org-name.profile-name`

Examples:

- `indiesweb.interactive-lesson`
- `studio7.pitch-deck`

### 9.3 Forbidden identifier patterns

Profile identifiers MUST NOT:

- contain spaces
- contain path separators
- contain manifest-relative paths
- start with a period
- use uppercase-only branding strings as the machine identifier
- pretend to be a canonical core profile when they are not

---

## 10. Required Registry Metadata

Every registry entry MUST contain the following metadata:

- `id`
- `title`
- `class`
- `state`
- `profileVersion`
- `summary`
- `owner`
- `specRef`
- `fallbackSummary`
- `compatibilityNotes`

### 10.1 Recommended entry shape

```json
{
  "id": "comic",
  "title": "Comic Profile",
  "class": "core",
  "state": "Accepted",
  "profileVersion": "1.0",
  "summary": "Panel-based visual storytelling profile with page and scroll reading modes.",
  "owner": "PRD Core",
  "specRef": "docs/profiles/PRD_PROFILE_COMIC.md",
  "fallbackSummary": "Falls back to declared public reading order and static page or panel-safe path.",
  "compatibilityNotes": "Supports page and scroll modes; variant-specific behavior may degrade to safe static reading."
}
```

---

## 11. Manifest Declaration Rules

A PRD package MUST declare exactly one top-level `profile` in the public manifest.

A package MAY additionally declare:

- `profileVersion`
- `profileVariant`
- profile-specific public metadata

### 11.1 Base rule

The top-level `profile` field identifies the main document family.

It MUST NOT be replaced by:

- extension identifiers
- tool names
- product tiers
- Viewer-only mode strings

### 11.2 Variant guidance

A package SHOULD use a variant field when the underlying profile family is still accurate.

Example:

```json
{
  "profile": "comic",
  "profileVersion": "1.0",
  "profileVariant": "manga-rtl"
}
```

This is preferred over inventing a new top-level `profile` for every variation.

---

## 12. Registration Admission Rules

A proposed profile entry MUST include:

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

A proposal that lacks these items MUST remain Draft or Proposed and MUST NOT be treated as Accepted.

---

## 13. Fallback And Compatibility Rules

Every registered profile MUST define a truthful fallback path.

A fallback path SHOULD answer:

- what survives when advanced behavior is unsupported
- what reading or review order remains usable
- whether static fallback exists
- what semantic information should still be exposed

Profile entries MUST NOT rely on silent failure.

A viewer MAY partially support a profile, but it MUST report unsupported required behavior rather than pretending full fidelity.

---

## 14. Community And Third-Party Profiles

Third-party profiles are allowed.

This is a feature, not a bug.

However, third-party profiles MUST follow the PRD base contract if they want to remain PRD-compatible.

That means they MUST NOT redefine:

- minimal package validity
- root manifest entry rules
- public-header requirement
- entry resolution rules
- path safety rules

Third-party profiles MAY define:

- their own semantic units
- their own layout rules
- their own validator additions
- their own variants
- their own profile-specific metadata

### 14.1 Compatibility naming rule

A third-party profile may be called:

- PRD-compatible
- PRD third-party profile

It MUST NOT be presented as canonical core PRD unless formally accepted into the core registry.

---

## 15. Promotion And Demotion Rules

A provisional or third-party profile MAY be promoted when:

- it solves a meaningful document class
- it has a stable spec draft
- it has sample packages
- it has validator rules
- it has at least one believable viewer path
- it does not bloat or distort the PRD core model

A profile SHOULD be deprecated or superseded when:

- its behavior is misleading
- it duplicates another profile unnecessarily
- it causes validator or compatibility confusion
- its duties are better handled by a variant or extension

---

## 16. Minimal Canonical Registry Baseline

The minimal canonical registry baseline at this stage is:

```json
[
  {
    "id": "general-document",
    "class": "core",
    "state": "Accepted",
    "profileVersion": "1.0"
  },
  {
    "id": "comic",
    "class": "core",
    "state": "Accepted",
    "profileVersion": "1.0"
  },
  {
    "id": "storyboard",
    "class": "core",
    "state": "Accepted",
    "profileVersion": "1.0"
  }
]
```

---

## 17. Examples

### 17.1 Valid canonical declaration

```json
{
  "profile": "comic",
  "profileVersion": "1.0",
  "profileVariant": "vertical-scroll"
}
```

### 17.2 Valid third-party declaration

```json
{
  "profile": "indiesweb.interactive-lesson",
  "profileVersion": "0.9"
}
```

### 17.3 Valid manga-as-variant declaration

```json
{
  "profile": "comic",
  "profileVersion": "1.0",
  "profileVariant": "manga-rtl",
  "readingDirection": "rtl"
}
```

---

## 18. Invalid Cases

The following are invalid or architecturally wrong:

### 18.1 Extension pretending to be a profile

```json
{
  "profile": "payments"
}
```

Reason: payments are an extension lane, not a document class.

### 18.2 Product tier pretending to be a profile

```json
{
  "profile": "studio-pro"
}
```

Reason: product packaging is not document identity.

### 18.3 New top-level profile with no justification

```json
{
  "profile": "manga"
}
```

Reason: at current v1 scope, manga is better modeled as a comic variant unless a later accepted spec proves otherwise.

### 18.4 Viewer mode pretending to be a profile

```json
{
  "profile": "presentation-mode"
}
```

Reason: a viewer mode is not a document family.

---

## 19. Validator Implications

Validators SHOULD check:

- `profile` exists and is a string
- `profile` matches canonical or allowed third-party identifier shape
- canonical profile IDs are spelled correctly
- `profileVersion` is present when required by the selected profile spec
- deprecated or superseded profiles trigger clear warnings
- unknown third-party profiles are reported accurately, not silently treated as canonical
- variant declarations do not replace the required top-level profile field

Validators MAY warn when:

- a proposed top-level profile appears to be only a variant
- a profile name collides with an extension or product concept
- a package claims canonical status without matching the registry

---

## 20. Compatibility Notes

This document is additive to the current PRD architecture direction.

It does not change:

- minimal valid package rules
- manifest public-header requirements
- profile-based design direction

Instead, it formalizes how profile growth should happen without wrecking compatibility.

---

## 21. Open Questions

1. Should canonical registry data live in a dedicated machine-readable file in addition to this spec?
2. Should `profileVariant` be standardized globally or left profile-specific in v1?
3. Should third-party profile namespace rules be stricter in the future?
4. When should a heavily used third-party profile be considered for promotion to core?
5. Should PRD define a separate profile-family field later, or is `profile` plus variant sufficient?

---

## 22. Recommended Next Docs

- `PRD_PROFILE_GENERAL_DOCUMENT.md`
- `PRD_PROFILE_COMIC.md`
- `PRD_PROFILE_STORYBOARD.md`
- `PRD_VERSIONING_POLICY.md`
- `PRD_CONFORMANCE.md`


# PRD_PROFILE_COMIC.md
_Last updated: March 31, 2026_  
_Status: Normative working draft v0.1_

## 1. Purpose

This document defines the PRD **comic** profile as a first-class PRD profile for panel-based visual storytelling.

The comic profile is intended to support modern digital comic reading without reducing comics to flat page snapshots only.

It defines:

- the core content units of a comic PRD
- reading order behavior
- page and scroll reading modes
- panel and spread semantics
- caption, dialogue, and thought structure
- fallback expectations
- validator implications

---

## 2. Scope

This document applies to PRD packages whose public manifest declares:

```json
{
  "profile": "comic"
}
```

This document covers the base comic family only.

It does not fully define:

- motion-comic extension behavior
- payment systems
- rights or entitlement systems
- advanced creator commentary extension rules
- hosted-only live comic services
- a series index standard beyond local examples

---

## 3. Non-goals

This document does **not** attempt to:

- treat every comic tradition as a separate top-level profile in v1
- replace image-heavy legacy imports completely
- require all comics to expose full panel geometry in v1
- require Cloud, PRDc, or Studio for base reading
- force animation or audio into the base comic profile

---

## 4. Alignment With Existing PRD Canon

This draft aligns with the current PRD direction that comics are a required first-class profile and that PRD should support richer structure, responsive behavior, and graceful degradation beyond static PDF-like pages.

This draft also respects the current practical boundary that advanced capabilities should remain layered rather than mandatory.

---

## 5. Profile Summary

The comic profile is for:

- panel-based visual storytelling
- chapter or episode packaging
- page or scroll reading modes
- visual pacing
- dialogue/caption-aware reading
- responsive viewing across phone, tablet, and desktop

A comic PRD MAY be highly structured or minimally structured.

However, the preferred direction is that a comic PRD SHOULD preserve more meaning than a flat stack of page images when the source material allows it.

---

## 6. Core Content Units

A comic profile package SHOULD think in terms of the following semantic units.

### 6.1 Work

The overall comic release, issue, chapter, episode, or collected edition.

### 6.2 Page or reading segment

A top-level visual reading unit.

In page-oriented comics, this is usually a page.

In vertical-scroll comics, this MAY be a segment rather than a print-style page.

### 6.3 Panel

A panel is the primary visual storytelling unit within a page or segment.

### 6.4 Balloon or dialogue unit

A speech, thought, or related dialogue element associated with a panel or region.

### 6.5 Caption or narration unit

A non-dialogue text unit attached to a panel, page, or reading segment.

### 6.6 Spread

A spread is a two-page or multi-region visual composition intended to be interpreted together.

### 6.7 Variant metadata

A comic package MAY declare variant-specific behavior such as:

- reading direction
- layout mode
- guided-panel mode
- edition style

---

## 7. Required Baseline Behavior

A conforming comic profile package MUST provide:

1. a valid PRD package
2. a public manifest declaring `profile: "comic"`
3. one base readable public entry path
4. a truthful reading order at least at the page or segment level

A comic package MUST remain openable even when advanced panel-aware behavior is unavailable.

This means the minimum truthful path is:

- page order
- or segment order
- plus static readable visual output

---

## 8. Recommended Structural Model

The following public content model is recommended, but not all fields are mandatory in v0.1.

### 8.1 Work-level metadata

A comic work SHOULD be able to describe:

- title
- issue/chapter/episode label
- creator display metadata
- language
- reading direction
- edition type
- publication sequence metadata

### 8.2 Page or segment metadata

A page or reading segment SHOULD be able to describe:

- stable ID
- order index
- associated visual asset or layered content
- optional spread membership
- optional panel list
- alt text summary
- fallback reading label

### 8.3 Panel metadata

A panel SHOULD be able to describe when available:

- stable panel ID
- reading sequence index
- optional geometry or region reference
- optional associated dialogue units
- optional caption units
- optional mobile guided-reading hints

### 8.4 Dialogue and caption metadata

Dialogue and caption units SHOULD support:

- type
- content text when semantically available
- associated panel or page/segment
- reading order position
- accessibility exposure

---

## 9. Reading Order Model

The comic profile MUST define a truthful reading order.

### 9.1 Page or segment order

Every comic package MUST define the order of pages or reading segments.

### 9.2 Internal panel order

If panel-level structure is provided, the package SHOULD define panel reading order.

### 9.3 Directionality

The profile MAY declare reading direction metadata such as:

- `ltr` for left-to-right
- `rtl` for right-to-left
- top-to-bottom where appropriate for vertical segmentation

### 9.4 Manga guidance

At current v1 scope, manga SHOULD be modeled as a `comic` variant rather than a separate top-level profile unless a future accepted spec says otherwise.

Example:

```json
{
  "profile": "comic",
  "profileVersion": "1.0",
  "profileVariant": "manga-rtl",
  "readingDirection": "rtl"
}
```

### 9.5 Spread behavior

If a spread exists, the package SHOULD declare whether:

- the spread is intended as a combined view
- pages remain individually readable in fallback mode

---

## 10. Layout Modes

The comic profile supports multiple layout modes.

A package MAY support one or more of the following:

- `page-fixed`
- `responsive-page`
- `vertical-scroll`
- `guided-panel`
- `collector-edition`

These are not top-level profiles in this draft.

They are layout or variant modes within the comic family.

### 10.1 Page-fixed

Optimized for preserving deliberate page composition.

### 10.2 Responsive-page

Uses a page-aware layout while still adapting to device size.

### 10.3 Vertical-scroll

Optimized for continuous scroll reading.

### 10.4 Guided-panel

Optimized for mobile reading where the viewer can guide the reader panel by panel.

### 10.5 Collector-edition

Optimized for collected release packaging and edition-specific presentation.

---

## 11. Panel And Spread Behavior

### 11.1 Panel-aware support

If panel data is present, a viewer SHOULD be able to use it for:

- guided reading
- focus navigation
- accessibility support
- alternate phone presentation

### 11.2 Spread-aware support

If spread metadata is present, a viewer SHOULD be able to preserve spread intent on devices that support it.

### 11.3 Fallback rule

If panel or spread behavior is unsupported, the viewer MUST still preserve page or segment reading order as the truthful fallback path.

---

## 12. Caption, Dialogue, And Thought Structure

A comic profile SHOULD distinguish among at least the following text roles when semantically available:

- speech
n- thought
- narration
- sound-effect text
- caption

If the original source does not expose these semantically, the package MAY fall back to page-level or panel-level text summaries.

The comic profile SHOULD preserve reading sequence for text units when possible.

---

## 13. Asset Expectations

A comic profile package MAY contain:

- page images
- layered art assets
- font resources
- thumbnails
- alternate-resolution assets
- bonus material
- attachment supplements

The comic profile SHOULD remain usable when advanced optional assets are absent.

External hosted assets MUST NOT become the only base-readable path for a minimal comic PRD.

---

## 14. Accessibility Expectations

The comic profile SHOULD support accessibility hooks where source material allows.

Recommended accessibility surfaces include:

- page or segment alt summaries
- panel summaries
- dialogue and narration text exposure
- declared reading order
- keyboard-friendly navigation targets
- contrast-safe Viewer presentation modes

A comic package does not become invalid merely because full semantic extraction is unavailable.

However, validators MAY warn when a package provides no accessible text alternatives at all.

---

## 15. Fallback Behavior

A comic package MUST define a truthful fallback path.

### 15.1 Minimum fallback

The minimum fallback is:

- public manifest metadata
- page or segment order
- static readable image or equivalent visual content path

### 15.2 When guided mode fails

If guided-panel behavior is unsupported, the viewer SHOULD fall back to page or segment reading.

### 15.3 When spread support fails

If spread support is unavailable, the viewer SHOULD expose the component pages individually while preserving order.

### 15.4 When semantic text structure is partial

If dialogue/caption semantics are partial, the viewer MAY fall back to page summaries or image-first reading without pretending richer semantics exist.

---

## 16. Minimal Sample Package

A minimal comic PRD MAY be as simple as:

```text
my-comic.prd
├── manifest.json
└── content/
    ├── index.html
    ├── page-001.webp
    └── page-002.webp
```

Example `manifest.json`:

```json
{
  "prdVersion": "1.0",
  "manifestVersion": "1.0",
  "id": "urn:uuid:22222222-2222-2222-2222-222222222222",
  "profile": "comic",
  "profileVersion": "1.0",
  "title": "Hello Comic",
  "entry": "content/index.html",
  "public": {
    "readingDirection": "ltr",
    "layoutMode": "page-fixed"
  }
}
```

This is valid as long as the base reading path is truthful.

---

## 17. Richer Example Direction

A richer comic package MAY later use structures like:

```text
issue-01.prd
├── manifest.json
├── content/
│   ├── issue.json
│   ├── pages/
│   │   ├── page-001.json
│   │   ├── page-002.json
│   │   └── ...
│   └── reading-map.json
├── assets/
│   ├── pages/
│   ├── thumbs/
│   └── fonts/
└── snapshots/
    └── default.html
```

That richer shape is informative, not mandatory at current v0.1 scope.

---

## 18. Invalid Cases

The following are invalid or architecturally wrong.

### 18.1 Missing profile declaration

```json
{
  "title": "Comic Without Profile"
}
```

Reason: comic identity is not declared.

### 18.2 Manga replacing comic as an unregistered top-level v1 profile

```json
{
  "profile": "manga"
}
```

Reason: current draft expects manga under `comic` unless a future accepted profile spec says otherwise.

### 18.3 Layout mode pretending to be the profile

```json
{
  "profile": "vertical-scroll"
}
```

Reason: layout mode is not the top-level family.

### 18.4 Hidden required reading path

A comic package is invalid if its only readable path depends on hidden protected content or unsupported hosted services.

### 18.5 False semantic richness

A package MUST NOT claim full panel-aware reading if the content only contains unordered page dumps with no truthful mapping.

---

## 19. Validator Implications

Validators SHOULD check:

- `profile` equals `comic`
- `entry` exists and is public
- page or segment reading order is present in a truthful way
- declared reading direction values are valid when present
- layout or variant values are syntactically valid when present
- spread declarations do not break fallback order
- panel order is well-formed when panel-level structure is declared

Validators MAY warn when:

- no accessible summaries exist
- `profileVariant` appears unregistered or malformed
- guided-panel mode is declared without any panel mapping
- spread mode is declared without identifiable spread relationships

---

## 20. Compatibility Notes

This profile is additive to current PRD core direction.

It assumes:

- minimal valid PRD remains small
- advanced features are optional
- comic reading must degrade gracefully
- Viewer implementations may vary in support depth

A simple viewer MAY support only:

- package open
- page/segment order
- static page display

A more advanced viewer MAY support:

- guided-panel mode
- spread-aware display
- semantic dialogue navigation
- phone-optimized panel progression

Both can still remain truthful if support is reported honestly.

---

## 21. Open Questions

1. Should panel geometry be standardized in v1 or left optional?
2. Should `layoutMode` be standardized globally or only inside profile docs?
3. Should a separate formal series/index package spec exist for multi-issue comics?
4. How much balloon/dialogue semantic detail should be required for conformance tiers later?
5. At what point would manga or webtoon deserve promotion from variant to separate profile?

---

## 22. Recommended Next Docs

- `PRD_PROFILE_STORYBOARD.md`
- `PRD_ASSETS_AND_ATTACHMENTS.md`
- `PRD_CAPABILITY_MODEL.md`
- `PRD_CONFORMANCE.md`
- `PRD_VERSIONING_POLICY.md`
