# PRD_SYSTEM_BLUEPRINT.md
_Last updated: April 1, 2026_  
_Status: PRD execution blueprint draft v0.1_

## Purpose

This file turns the current PRD foundation, decisions, glossary, history, and roadmap into a real operating system for building PRD.

The current docs already establish strong direction. What they still need is a stricter process for:

- separating core standard from product ideas
- converting ideas into testable specifications
- turning profile ideas into valid sample packages
- keeping extensions from polluting v1
- defining when a milestone is actually done

---

## Blunt Assessment

PRD has enough vision to move forward.

What it does not yet have, at standards-program level, is:

- a normative vs informative document split
- a milestone packet structure
- a conformance and test-vector plan
- a release/governance model
- a security and accessibility baseline
- a sharper launch beachhead

The better process is to run PRD as a coordinated system, not as a loose pile of good ideas.

---

## The Better Way

PRD should be run across four tracks at the same time:

1. **Standard track**  
   Foundation, package, manifest, profiles, extensions, versioning.
2. **Reference track**  
   Packer, validator, viewer, renderer rules, capability detection.
3. **Corpus track**  
   Minimal sample packages, profile samples, test vectors, compatibility fixtures.
4. **Adoption track**  
   Conversion paths, docs site, demos, launch positioning, open ecosystem strategy.

No major milestone should be considered complete unless all four tracks have at least one concrete output.

---

## PRD System Layers

### Layer 0. Control docs

These govern project truth:

- `foundation/PRD_FOUNDATION.md`
- `decisions/PRD_DECISIONS.md`
- `foundation/PRD_GLOSSARY.md`
- `foundation/PRD_ROADMAP.md`
- `history/PRD_Project_History_Record.md`
- `architecture/PRD_SYSTEM_BLUEPRINT.md`
- `governance/PRD_PROFILE_REGISTRY.md`
- `governance/PRD_PROMPT_DOCTRINE.md`
- `prompts/PRD_MASTER_PROMPTS.md`

### Layer 1. Core standard

These define the base format:

- minimal valid package
- package layout
- manifest schema
- identity and versioning
- entry resolution
- asset declaration basics
- compatibility declaration

### Layer 2. Profile standard

These define behavior by document class:

- general document profile
- comic profile
- storyboard profile

### Layer 3. Extension standard

These remain optional:

- protected/private sections
- signatures and verification
- rights metadata
- payment hooks
- live update feeds
- optional crypto-linked features

### Layer 4. Reference implementation

These prove PRD is real:

- reference packer
- validator
- reference viewer
- rendering rules
- profile samples
- conformance fixtures

### Layer 5. Product ecosystem

These are not the standard itself:

- Studio
- Viewer apps beyond reference baseline
- Cloud
- SDK product surfaces
- PRDc archive role
- marketplace and distribution systems

### Rule

Lower layers must be usable without upper layers.  
Core PRD must not depend on Studio, Cloud, PRDc, Nectar, wallets, or live service infrastructure.

---

## Document Taxonomy

PRD docs should be classified explicitly.

### Canonical control docs

Project truth and governance.

### Normative specs

Rules that implementations must follow. These should use language like:

- MUST
- MUST NOT
- SHOULD
- SHOULD NOT
- MAY

### Informative guides

Helpful explanations, examples, diagrams, migration notes, and implementation guidance.

### Experimental drafts

Useful ideas that are not yet binding.

### Market docs

White paper, pitch, launch pages, comparison tables, positioning material.

### Rule

Do not mix normative spec language with hype copy in the same document.

---

## Missing Additions PRD Should Introduce Next

These are the highest-value additions beyond the current set:

1. A minimal valid package spec
2. A manifest schema draft
3. A versioning policy
4. A viewer capability and conformance model
5. An assets/attachments policy
6. A product-boundary map
7. A security and protection model draft
8. A sample corpus and test-vector suite
9. A validator ruleset
10. An extension registry policy

Without these, PRD remains promising but underspecified.

---

## Repo Blueprint

PRD should eventually evolve toward a repo layout like this:

```text
docs/
  foundation/
    PRD_FOUNDATION.md
    PRD_GLOSSARY.md
    PRD_ROADMAP.md
    04_PRD/
      ...
  decisions/
    PRD_DECISIONS.md
  architecture/
    PRD_SYSTEM_BLUEPRINT.md
    PRD_SYSTEM_ARCHITECTURE.md
  governance/
    PRD_PROFILE_REGISTRY.md
    PRD_PROMPT_DOCTRINE.md
  prompts/
    PRD_MASTER_PROMPTS.md
  history/
    PRD_Project_History_Record.md
  core/
    PRD_MINIMAL_VALID_SPEC.md
    PRD_MINIMAL_VALID_PRD.md
    PRD_MANIFEST_DRAFT.md
    PRD_PACKAGE_LAYOUT_DRAFT.md
    PRD_LOCALIZATION_MODEL.md
    PRD_VERSIONING_POLICY.md
  profiles/
    PRD_PROFILE_GENERAL_DOCUMENT.md
    PRD_PROFILE_COMIC.md
    PRD_PROFILE_STORYBOARD.md
  extensions/
    PRD_PROTECTION_MODEL.md
    PRD_RIGHTS_MODEL.md
    PRD_PAYMENT_EXTENSION.md
    PRD_LIVE_UPDATES_EXTENSION.md
  runtime/
    PRD_CAPABILITY_MODEL.md
    PRD_RENDERING_MODEL.md
    PRD_CONFORMANCE.md
  product/
    PRD_PRODUCT_BOUNDARIES.md
    PRD_OPEN_VS_PROPRIETARY.md
  market/
    PRD_WHITE_PAPER.md
  archive/
    history/
      ...
    proposals/
      ...
schemas/
samples/
test-vectors/
reference/
tools/
```

This does not need to be physically reorganized immediately, but the logical split should start now.

---

## Quality Bars That Apply To Every Milestone

Every PRD milestone should be checked against these bars:

### Simplicity

The minimal valid PRD must stay small and explainable.

### Portability

A document must remain usable across devices and implementations.

### Graceful degradation

Unsupported advanced features must not destroy basic usability where avoidable.

### Accessibility

PRD should preserve semantic structure, reading order, alt text hooks, captions, and keyboard-friendly navigation from the start.

### Security

The base viewer and package rules must define safe defaults for scripting, network access, integrity checks, and protected content boundaries.

### Performance

Large works need chunking, segmentation, and loading strategy, not hand-waving.

### Convertibility

There should be a believable path from HTML, Markdown, Docx, and selected EPUB/PDF material into PRD.

### Testability

Every normative rule should produce at least one sample package and one validator check.

---

## Milestone Packet Template

Every serious milestone should produce a packet with the following:

1. A problem statement
2. A normative spec draft
3. At least one minimal example
4. At least one edge-case example
5. Validator rules or conformance checks
6. Compatibility and fallback notes
7. Open questions and non-goals
8. Decision-log updates
9. Next-step document list

If a milestone has only prose and no examples or checks, it is not finished.

---

## Milestone Blueprint

### Milestone 0. Foundation lock

**Goal:** Stabilize the control system.

**Required outputs:**

- foundation
- decisions log
- glossary
- roadmap
- history archive
- system blueprint
- master prompts

**Exit gate:**

- terminology is stable
- v1 boundaries are explicit
- next doc set is sequenced

### Milestone 1. Minimal valid PRD

**Goal:** Define the smallest legal PRD package.

**Required outputs:**

- minimal valid PRD spec
- package layout draft
- manifest draft
- sample `minimal.prd`
- validator rules for mandatory fields

**Exit gate:**

- a tiny PRD opens in the reference viewer
- required vs optional fields are explicit
- no ecosystem dependencies exist

### Milestone 2. Profiles

**Goal:** Prove PRD is more than one generic doc mode.

**Required outputs:**

- general document profile
- comic profile
- storyboard profile
- one sample package for each
- fallback behavior notes

**Exit gate:**

- profile identity is machine-readable
- profile behavior differences are concrete
- samples render in a predictable way

### Milestone 3. Assets, attachments, and large works

**Goal:** Make PRD scale beyond toy examples.

**Required outputs:**

- asset classes
- embed vs reference rules
- attachment rules
- chunking policy
- segmentation and collection model
- performance notes

**Exit gate:**

- large works have a documented packaging path
- offline and linked-resource tradeoffs are explicit
- attachment handling is validator-checkable

### Milestone 4. Runtime and conformance

**Goal:** Define what a viewer and renderer actually owe the format.

**Required outputs:**

- viewer capability model
- renderer responsibility model
- conformance levels
- graceful degradation rules
- print/export policy
- baseline sandbox and network policy

**Exit gate:**

- minimum viewer behavior is testable
- implementations can advertise support honestly
- old/simple viewers fail safely

### Milestone 5. Tooling and conversion

**Goal:** Make PRD authorable and ingestible.

**Required outputs:**

- reference packer
- validator CLI
- import path matrix
- export path matrix
- authoring workflow draft
- conversion samples

**Exit gate:**

- authors can create PRD without hand-assembling ZIP internals
- at least HTML/Markdown import paths exist
- validator catches broken packages

### Milestone 6. Extensions and trust layers

**Goal:** Add advanced capabilities without corrupting the core.

**Required outputs:**

- extension registry rules
- protection model draft
- signatures and verification draft
- rights metadata draft
- payment hooks draft
- live updates draft

**Exit gate:**

- extension boundaries are explicit
- unsupported extensions degrade safely
- v1 core remains independent

### Milestone 7. Open launch and ecosystem setup

**Goal:** Launch PRD as a credible standard, not just a private experiment.

**Required outputs:**

- public spec docs
- reference viewer
- sample corpus
- compatibility matrix
- launch demo set
- OSS/proprietary boundary statement
- early adopter package

**Exit gate:**

- someone outside the project can build or open a valid PRD
- PRD has a clear beachhead use case
- public narrative matches actual capabilities

---

## Recommended Beachhead

PRD should not launch as "everything for everyone."

The strongest initial wedge is:

- responsive premium documents
- indie comics
- storyboard/review packages

Why this wedge works:

- PDF is weak on phone reading and responsive adaptation
- comics and storyboards prove profile-driven value fast
- premium and visual publishing justify a better viewer experience
- these use cases benefit from packaging, structure, assets, and future access layers

This is stronger than trying to win generic office documents first.

---

## Open vs Proprietary Blueprint

The strongest long-term structure is:

### Open

- core PRD format
- manifest rules
- package rules
- profile specs
- reference samples
- reference viewer
- validator rules

### Productized

- Studio
- hosted conversion
- library/cloud sync
- subscription/live feed services
- premium creator tools
- advanced analytics

This supports ecosystem trust without giving up product surface area.

---

## Governance Model

PRD should adopt simple governance early.

### Decision states

- Draft
- Proposed
- Accepted
- Experimental
- Deprecated
- Superseded

### Change classes

- Editorial only
- Additive compatible
- Behavior-changing compatible
- Breaking

### Release logic

- Core spec version
- Manifest schema version
- Profile version
- Extension version
- Reference implementation version

### Rule

Breaking changes must never be smuggled in through examples or prompt output alone. They need explicit decision-log entries.

---

## Definition Of Done For A Spec Document

A spec document is done for its milestone only when it has:

- scope
- non-goals
- normative rules
- examples
- failure cases
- compatibility notes
- validator implications
- unresolved questions

If one of those is missing, the doc is still a draft input, not a locked milestone artifact.

---

## What To Build Immediately After This Blueprint

In order:

1. `core/PRD_MINIMAL_VALID_SPEC.md`
2. `core/PRD_MANIFEST_DRAFT.md`
3. `core/PRD_PACKAGE_LAYOUT_DRAFT.md`
4. `runtime/PRD_CAPABILITY_MODEL.md`
5. `runtime/PRD_CONFORMANCE.md`
6. `profiles/PRD_PROFILE_GENERAL_DOCUMENT.md`
7. `profiles/PRD_PROFILE_COMIC.md`
8. `profiles/PRD_PROFILE_STORYBOARD.md`
9. `core/PRD_ASSETS_AND_ATTACHMENTS.md`
10. `product/PRD_PRODUCT_BOUNDARIES.md`
11. `core/PRD_VERSIONING_POLICY.md`
12. `extensions/PRD_PROTECTION_MODEL.md`

That ordering is more disciplined than jumping straight from vision docs to white paper or monetization language.

---

## Final Blueprint Statement

PRD becomes strongest when it is treated as:

- a clean core standard
- a profile-driven document family
- an extension-ready but extension-disciplined system
- a reference implementation with validator and samples
- an open ecosystem with premium product layers above it

That is the path that gives PRD a real chance to outperform PDF where modern documents actually hurt.
