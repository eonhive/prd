# PRD Architecture Corrections Proposal
_Last updated: March 31, 2026_  
_Status: Proposed canon correction draft v0.1_

## Purpose

This document proposes a targeted correction to the current PRD architecture and wording so the system remains internally consistent.

The central issue is:

- PRD is already defined as **responsive-first at the system level**
- but one of the core profiles is currently named **responsive-document**

That naming creates a conceptual conflict.

It makes it sound like:

- one profile is responsive
- the others might not be

That is not the intended architecture.

---

## Blunt Assessment

The problem is **not** that the current PRD vision is wrong.

The problem is that the current doc set mixes together two different ideas:

1. **Responsiveness as a core PRD-wide design principle**
2. **A general-purpose reading/document profile**

Those two things should be separated.

Responsiveness should belong to the full PRD system.

The general-purpose document profile should have a name that describes its document family, not a name that captures a system-wide property.

---

## Core Correction

### Correction 1 — Responsiveness is PRD-wide, not profile-specific

Responsiveness should be treated as a **cross-profile architectural principle**.

That means:

- comic is responsive by design
- storyboard is responsive by design
- general document reading is responsive by design
- fixed-page output remains possible as a mode, export path, or constrained layout behavior
- responsiveness is not a special perk owned by one profile

### Correction 2 — Rename the current `responsive-document` profile

The current top-level profile currently referred to as `responsive-document` should be renamed to something that describes the actual document family.

Recommended replacement:

- `general-document`

Other acceptable alternatives:

- `reading-document`
- `structured-document`
- `prose-document`

### Recommendation

Use **`general-document`** as the canonical replacement.

Why:

- broad enough for reports, essays, manuals, articles, white papers, and standard reading docs
- does not imply other profiles are non-responsive
- simple to explain
- future-friendly

---

## Corrected Architecture Model

The corrected mental model should be:

### PRD-wide architectural principles

These are true across the whole format:

- responsive-first
- structured-first
- profile-based
- extensible but layered
- portable
- graceful degradation
- public-header first

### Top-level profile families

These define document class, not core PRD powers:

- `general-document`
- `comic`
- `storyboard`

### Layout modes / behavior modes

These describe how a profile behaves:

- `responsive-flow`
- `page-fixed`
- `hybrid`
- `vertical-scroll`
- `guided-panel`
- `review-grid`
- `collector-edition`

### Extensions

These remain optional layers:

- protected/private
- signatures
- rights
- payments
- live updates
- analytics
- cryptographic identity

---

## What This Fix Solves

This correction solves the following problems.

### 1. Naming confusion

It removes the accidental implication that only one profile gets responsiveness.

### 2. Cleaner mental model

It makes profile mean **document family**, not **feature claim**.

### 3. Better future growth

It lets future profile families grow without each one fighting over the word “responsive.”

### 4. Better manifest logic

It makes manifest declarations cleaner:

- `profile` says what the document is
- `layoutMode` says how it behaves
- extensions say what optional powers are attached

### 5. Better community extensibility

Third parties can create new profiles without misunderstanding responsiveness as a special top-level category.

---

## Proposed Canonical Rules

### Rule PRD-CORR-001 — Responsiveness is cross-profile

Responsiveness MUST be treated as a PRD-wide system principle, not as a special property of only one top-level profile.

### Rule PRD-CORR-002 — Profile names must describe document family

Top-level profile identifiers SHOULD describe document class or document family, not general PRD architectural powers.

### Rule PRD-CORR-003 — Layout behavior belongs outside profile identity

Layout behavior such as page-fixed, responsive-flow, vertical-scroll, or guided-panel SHOULD be declared as layout or variant metadata rather than replacing the top-level profile.

### Rule PRD-CORR-004 — Fixed layouts do not negate responsive-first architecture

A PRD package MAY declare constrained or fixed layout behavior, but that does not change the rule that PRD remains responsive-first at the architectural level.

---

## Manifest Direction After Correction

### Old confusing direction

```json
{
  "profile": "responsive-document"
}
```

### Corrected direction

```json
{
  "profile": "general-document",
  "layoutMode": "responsive-flow"
}
```

### Another corrected example

```json
{
  "profile": "general-document",
  "layoutMode": "page-fixed"
}
```

### Comic example

```json
{
  "profile": "comic",
  "layoutMode": "guided-panel"
}
```

### Storyboard example

```json
{
  "profile": "storyboard",
  "layoutMode": "review-grid"
}
```

---

## Files That Should Be Corrected

The following docs should be updated.

### 1. `PRD_GLOSSARY.md`

#### Replace
- `Responsive Document Profile`

#### With
- `General Document Profile`

#### Corrected meaning
A general-purpose PRD profile for:

- articles
- manuals
- reports
- white papers
- essays
- standard reading documents

This profile is not the owner of responsiveness.
It is simply the broad general-reading profile family.

---

### 2. `PRD_ROADMAP.md`

#### Replace in Phase 2 priority profiles
- Responsive document

#### With
- General document

---

### 3. `PRD_PROFILE_REGISTRY.md`

#### Replace canonical baseline list
- `responsive-document`

#### With
- `general-document`

#### Add explicit rule
Responsiveness is a PRD-wide architectural principle and MUST NOT be interpreted as belonging only to the general-document profile.

---

### 4. `PRD_FOUNDATION.md`

#### Clarify in design principles or profile-based section
Add language stating:

- responsiveness applies across profile families
- profiles specialize structure and behavior, not ownership of responsiveness

---

### 5. `PRD_DECISIONS.md`

Add a new decision entry:

**PRD-0XX — Responsiveness is cross-profile; general-purpose reading profile is renamed**

#### Decision
Responsiveness belongs to PRD as a system-wide principle. The former `responsive-document` profile name is replaced by `general-document` to avoid architectural confusion.

#### Why
The old name incorrectly suggests responsiveness is profile-specific instead of architecture-wide.

#### Implication
Future docs should use `general-document` for the general-purpose reading profile and keep layout behavior separate from profile identity.

---

### 6. `PRD_MINIMAL_VALID_PRD.md`

The minimal example currently uses `responsive-document` as the sample profile value.

#### Replace example value
- `responsive-document`

#### With
- `general-document`

---

### 7. `PRD_MINIMAL_VALID_SPEC.md`

Where the example package or explanatory text uses `responsive-document` as the baseline example profile, update it to `general-document`.

---

### 8. Future profile docs

Create or rename toward:

- `PRD_PROFILE_GENERAL_DOCUMENT.md`
- `PRD_PROFILE_COMIC.md`
- `PRD_PROFILE_STORYBOARD.md`

---

## Architecture Wording Fix

The architecture wording should become:

### Before
PRD is responsive-first, but one core profile is the responsive-document profile.

### After
PRD is responsive-first across the whole system.  
The general-document profile is the default general-purpose reading and prose-oriented document family.

That wording is much cleaner.

---

## Migration Strategy

This correction should be handled as a **controlled rename**, not a chaotic rewrite.

### Recommended migration path

#### Phase A — Canon correction
Update the source-of-truth docs first.

#### Phase B — Transitional compatibility note
Allow historical references to `responsive-document` only as a legacy alias in explanatory notes for a limited period.

#### Phase C — New docs use only the corrected term
New profile docs, registry docs, and examples should use `general-document` only.

### Optional alias note
During transition, docs MAY state:

> `responsive-document` is a legacy draft-era label superseded by `general-document`.

---

## Suggested New Decision Entry

```md
## PRD-0XX — Responsiveness is cross-profile; general-purpose profile uses a non-feature name
**Status:** Accepted

**Decision:**  
Responsiveness belongs to PRD as a system-wide architectural principle across all profiles.  
The general-purpose reading/document profile is named `general-document`, not `responsive-document`.

**Why:**  
The prior naming created architectural confusion by making a PRD-wide design principle sound like a single profile identity.

**Implication:**  
Profile names should describe document family.  
Layout behavior should be expressed through layout modes, variants, and compatibility rules instead of being baked into the general profile name.

**Follow-up:**  
Update glossary, roadmap, minimal examples, profile registry, and future profile specs.
```

---

## Suggested Glossary Replacement Entry

```md
## General Document Profile
A general-purpose PRD profile for things like:
- articles
- manuals
- reports
- white papers
- essays
- standard reading docs

Usually text-led, but still structured and responsive.

Responsiveness is not unique to this profile.  
It is a PRD-wide architectural principle.
```

---

## Suggested Registry Correction

The canonical registry baseline should become:

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

## Risks If We Do Not Correct This

If the docs are not corrected, PRD risks:

- profile naming confusion
- accidental community misunderstanding
- poor future profile taxonomy
- architecture drift where responsiveness gets treated like an optional toggle
- weaker product messaging
- validators and tooling carrying misleading assumptions

---

## Recommended Immediate Next Actions

1. Accept the rename from `responsive-document` to `general-document`
2. Update the glossary
3. Update the roadmap
4. Add the decision log entry
5. Update minimal package examples
6. Update the profile registry draft
7. Create `PRD_PROFILE_GENERAL_DOCUMENT.md`

---

## Final Recommendation

Yes, the docs and architecture should be corrected.

Not because PRD’s foundation is broken.

But because the current terminology creates a fake contradiction.

The better architecture is:

- PRD is responsive-first everywhere
- profile names describe document family
- layout modes describe behavior
- extensions describe optional powers

That is the cleaner system.

