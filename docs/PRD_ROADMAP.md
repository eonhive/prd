# PRD_ROADMAP.md
_Last updated: April 1, 2026_  
_Status: Roadmap draft v0.1_

## Purpose
This roadmap breaks PRD into practical phases so the project does not turn into a giant vague ambition blob.

The goal is to move from **clear foundation** to **minimal real format** to **profile support** to **ecosystem expansion**.

---

## Roadmap Philosophy

PRD should be built in layers:

1. Foundation first
2. Minimal viable format second
3. Profile support third
4. Tooling and renderer maturity next
5. Advanced rights/payment/crypto extensions later

Do not build late-stage fantasy systems before the base format is real.

---

# Phase 0 — Foundation Lock
**Goal:** Define the backbone before implementation.

## Deliverables
- PRD history archive
- PRD foundation doc
- PRD decisions log
- PRD glossary
- PRD roadmap
- PRD system blueprint
- PRD master prompts
- initial product-family map
- initial manifest philosophy
- initial scope boundaries

## Exit criteria
- project vocabulary is stable enough
- first principles are explicit
- v1 boundaries are clear enough to start technical design
- milestone execution method is explicit enough to guide future docs

---

# Phase 1 — Minimal Valid PRD Spec
**Goal:** Define the smallest real PRD package that works.

## Deliverables
- minimal valid PRD package structure
- base manifest draft
- identity/version fields
- content entry rules
- asset declaration basics
- compatibility rules
- validation rules
- one simple reader/render prototype target

## Questions to answer
- What files are mandatory?
- What is the simplest legal PRD?
- How does a viewer know where content starts?
- How are assets declared?
- What is embedded vs referenced?

## Exit criteria
- a tiny PRD example can be authored and opened
- the base spec is understandable and testable
- there is no dependency on crypto or cloud systems

---

# Phase 2 — Core Profiles
**Goal:** Make PRD real across multiple document types.

## Priority profiles
1. General document
2. Comic
3. Storyboard

## Deliverables
- profile definitions
- structure rules per profile
- layout/render rules per profile
- example sample docs per profile
- fallback behavior for unsupported features

## Exit criteria
- at least one valid example exists for each core profile
- viewers can tell profiles apart and render accordingly
- the profile concept proves its value over one-size-fits-all document design

---

# Phase 3 — Assets, Attachments, and Large-Content Strategy
**Goal:** Make PRD scale beyond tiny demo files.

## Deliverables
- attachment model
- embedded vs linked asset rules
- chunking/segmentation strategy
- collection/series strategy
- large-work packaging approach
- performance/loading notes

## Focus areas
- novels
- comics
- storyboards
- media-heavy docs
- portability tradeoffs

## Exit criteria
- PRD can describe and package non-trivial works
- file size and loading strategy are not hand-wavy anymore
- attachment behavior is defined enough for tooling

---

# Phase 4 — Renderer and Viewer Capabilities
**Goal:** Define how PRD actually gets interpreted consistently.

## Deliverables
- capability model
- graceful degradation rules
- reader/viewer compatibility behavior
- print/export strategy
- runtime/render responsibilities
- baseline renderer architecture concept

## Exit criteria
- it is clear what a minimal viewer must support
- extension support does not break older/simple viewers completely
- rendering expectations are documented

---

# Phase 5 — Authoring and Tooling Surface
**Goal:** Make the format usable by humans, not just theoretical.

## Deliverables
- Studio concept
- SDK boundary draft
- validation tooling ideas
- import/export ideas
- conversion strategy from existing formats
- sample authoring workflow

## Questions
- What does authoring feel like?
- How much is code/schema-driven vs visual editing?
- What creator workflows matter first?

## Exit criteria
- there is a believable path from concept to usable toolchain

---

# Phase 6 — PRDc / Archive / Ecosystem Mapping
**Goal:** Clarify product-family boundaries.

## Deliverables
- PRD vs PRDc boundary map
- Studio / Viewer / Cloud / SDK / Renderer map
- open vs private layer discussion
- archive/codex role clarification
- ecosystem dependency boundaries

## Exit criteria
- product naming stops being fuzzy
- core format and surrounding services are clearly separated

---

# Phase 7 — Rights / Access / Protection Extensions
**Goal:** Add advanced control layers without polluting the base format.

## Deliverables
- protected/private section model
- access-control extension draft
- rights metadata model
- licensing/ownership extension concepts
- signature/verification concept
- optional entitlement hooks

## Rule
This phase must stay layered on top of the minimal core format.

## Exit criteria
- sensitive/premium use cases are supported conceptually
- simple PRD documents remain simple

---

# Phase 8 — Payments / Economy / Optional Crypto Extensions
**Goal:** Explore future-facing ecosystem power without hijacking base PRD.

## Possible deliverables
- payment hook extension design
- premium unlock model
- creator entitlement concepts
- optional chain-linked verification model
- crypto-PRD experimental layer
- Nectar-PRD exploratory concepts

## Rule
This phase is optional ecosystem growth, not the base definition of PRD.

## Exit criteria
- advanced economy features are clearly modular
- v1/v2 boundaries remain sane

---

# Phase 9 — White Paper / External Positioning
**Goal:** Tell the story properly after the architecture is grounded.

## Deliverables
- PRD white paper
- PRD vs PDF strategic positioning
- creator value proposition
- publishing use-case framing
- ecosystem/future vision deck or narrative

## Exit criteria
- external narrative matches the actual architecture
- the message is strong without being fake hype

---

# Immediate Next Documents to Create

## Highest priority
1. `PRD_SYSTEM_BLUEPRINT.md`
2. `PRD_MASTER_PROMPTS.md`
3. `PRD_MINIMAL_VALID_SPEC.md`
4. `PRD_MANIFEST_DRAFT.md`
5. `PRD_PACKAGE_LAYOUT_DRAFT.md`
6. `PRD_CAPABILITY_MODEL.md`
7. `PRD_CONFORMANCE.md`
8. `PRD_PROFILE_GENERAL_DOCUMENT.md`
9. `PRD_PROFILE_COMIC.md`
10. `PRD_PROFILE_STORYBOARD.md`

## After that
11. `PRD_PRODUCT_BOUNDARIES.md`
12. `PRD_VERSIONING_POLICY.md`
13. `PRD_ASSETS_AND_ATTACHMENTS.md`
14. `PRD_PROTECTION_MODEL.md`
15. `PRD_LOCALIZATION_MODEL.md`

---

# Practical v1 Scope Recommendation

## Include in v1
- base PRD spec
- minimal manifest
- general document profile
- comic profile
- storyboard profile
- asset/attachment baseline
- viewer capability basics
- clean versioning
- optional reserved extension points

## Exclude from v1 hard dependency
- deep AeonHive coupling
- Nectar dependency
- mandatory blockchain/wallet systems
- full payment rails
- overcomplicated security stack
- giant cloud-first assumptions

---

# Risk List

## Risk 1 — Overengineering
Trying to solve every future dream in v1 can kill the project.

## Risk 2 — PDF mimic trap
If PRD copies PDF too closely, it loses the reason to exist.

## Risk 3 — Weak boundaries
If format, viewer, studio, archive, and cloud all blur together, architecture gets messy fast.

## Risk 4 — Bloated manifest
If the manifest becomes a dumping ground, the whole system gets ugly and fragile.

## Risk 5 — Feature dependency trap
If ownership/payment/crypto features become mandatory too early, adoption gets harder.

---

# Blunt Strategy Summary

The correct path is:

- lock the foundation
- define the minimal valid PRD
- define the three core profiles
- define package + manifest + assets
- define viewer/render behavior
- then grow into ecosystem and advanced extensions

Anything else is noise.
