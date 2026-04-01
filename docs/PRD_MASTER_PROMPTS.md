# PRD_MASTER_PROMPTS.md
_Last updated: April 1, 2026_  
_Status: PRD prompt system draft v0.1_

## Purpose

This file provides reusable prompts for every major PRD milestone so future work stays aligned with the canonical docs instead of drifting.

These prompts are meant to generate disciplined PRD artifacts, not vague brainstorm text.

---

## Global Rules For All PRD Prompts

Every PRD prompt should assume the model must read and align with:

- `docs/PRD_FOUNDATION.md`
- `docs/PRD_DECISIONS.md`
- `docs/PRD_GLOSSARY.md`
- `docs/PRD_ROADMAP.md`
- `docs/PRD_Project_History_Record.md`
- `docs/PRD_SYSTEM_BLUEPRINT.md`
- `docs/PRD_PROMPT_DOCTRINE.md`
- `docs/PRD_LOCALIZATION_MODEL.md` when localization, language, locale, or text-direction behavior is relevant

Every PRD prompt should follow `docs/PRD_PROMPT_DOCTRINE.md` for source-of-truth precedence, prompt constraints, labeled assumptions, incomplete-doc handling, and forbidden behaviors.

In addition:

1. Use normative language for specs: MUST, MUST NOT, SHOULD, SHOULD NOT, MAY.
2. Include examples, failure cases, validator implications, compatibility notes, and open questions.
3. Preserve graceful degradation whenever possible.

---

## Standard Output Shape For Spec Prompts

Unless a prompt says otherwise, ask for this output shape:

1. Alignment with existing PRD docs
2. Scope
3. Non-goals
4. Normative rules
5. Examples
6. Invalid or edge cases
7. Compatibility and fallback behavior
8. Validator/conformance implications
9. Open questions
10. Recommended next docs

---

## Master System Prompt

```text
You are working on PRD, a Portable Responsive Document system.

Before producing anything, read and align with:
- docs/PRD_FOUNDATION.md
- docs/PRD_DECISIONS.md
- docs/PRD_GLOSSARY.md
- docs/PRD_ROADMAP.md
- docs/PRD_Project_History_Record.md
- docs/PRD_SYSTEM_BLUEPRINT.md
- docs/PRD_PROMPT_DOCTRINE.md
- docs/PRD_LOCALIZATION_MODEL.md when localization, language, locale, or text-direction behavior is relevant

Rules:
- Follow docs/PRD_PROMPT_DOCTRINE.md for source precedence, labeled assumptions, incomplete-doc handling, and forbidden behaviors.
- Use normative language where rules are being defined.
- Always include examples, invalid cases, compatibility notes, and open questions.
- Do not write hype copy unless explicitly asked for market language.
- When unsure, choose the simpler v1 design that preserves future extension points.

Output only the requested artifact, in clean Markdown, with clear section headings.
```

---

## Prompt 01. Foundation Audit

Use this when the control docs need to be reviewed for contradictions, missing areas, or sequencing gaps.

```text
Using the PRD canonical docs, perform a strict architecture audit.

Tasks:
1. Identify contradictions, overlaps, and ambiguous terminology.
2. Identify missing documents required to turn PRD into a real standard.
3. Separate what is already decided from what is still open.
4. Recommend the smallest high-value next documents to create.

Output:
- Current strengths
- Contradictions or ambiguity
- Missing artifacts
- Priority order
- Exact recommended file names
- Risks if the gaps stay unresolved

Constraints:
- Do not invent new product hype.
- Do not collapse core PRD into product-layer ideas.
- Keep recommendations practical for v1.
```

---

## Prompt 02. Minimal Valid PRD Spec

Use this to generate the core minimal package definition.

```text
Using the canonical PRD docs, write `PRD_MINIMAL_VALID_SPEC.md`.

Goal:
Define the smallest legal and usable PRD package that a reference viewer can open.

Required sections:
- Purpose
- Scope
- Non-goals
- Required files
- Optional files
- Entry-resolution rules
- Required metadata
- Minimal manifest fields
- Packaging constraints
- Failure cases
- Minimal sample package tree
- Validator rules
- Open questions

Constraints:
- Keep v1 minimal.
- Do not require crypto, payments, cloud, or live services.
- Ensure the result can be implemented by a small reference viewer.
```

---

## Prompt 03. Manifest Draft

Use this to define the manifest carefully and keep it from becoming a dumping ground.

```text
Using the canonical PRD docs, write `PRD_MANIFEST_DRAFT.md`.

Goal:
Define a clean, minimal, versioned PRD manifest with clear separation between:
- required core fields
- optional standard fields
- extension fields
- reserved future fields

Required sections:
- Manifest purpose
- Design principles
- Field inventory
- Required fields
- Optional fields
- Public vs protected metadata split
- Namespacing rules for extensions
- Versioning rules
- JSON example
- Invalid examples
- Backward compatibility guidance
- Validator implications
- Open questions

Constraints:
- Keep the base manifest small.
- Do not force rights, payments, crypto, or signatures into every PRD.
- Make future extensibility explicit without bloating v1.
```

---

## Prompt 04. Package Layout Draft

Use this to define internal package structure.

```text
Using the canonical PRD docs, write `PRD_PACKAGE_LAYOUT_DRAFT.md`.

Goal:
Define the recommended internal directory and file layout for PRD packages, including how content, assets, attachments, and private/protected material should be organized.

Required sections:
- Layout goals
- Required root files
- Recommended directories
- Reserved directories
- Rules for relative paths
- Entry file rules
- Asset location rules
- Attachment location rules
- Private/protected area placement model
- Example trees for small and large works
- Invalid layouts
- Portability notes
- Validator implications

Constraints:
- Keep the layout understandable by humans and tools.
- Avoid deep mandatory nesting.
- Leave room for large-work segmentation without forcing it on tiny docs.
```

---

## Prompt 05A. General Document Profile

```text
Using the canonical PRD docs, write `PRD_PROFILE_GENERAL_DOCUMENT.md`.

Goal:
Define the general document profile for reports, essays, manuals, white papers, and general reading documents.

Required sections:
- Profile purpose
- Typical use cases
- Structural model
- Layout behavior
- Reading modes
- Accessibility expectations
- Print/export behavior
- Allowed feature set
- Fallback behavior
- Minimal sample package
- Invalid cases
- Validator implications

Constraints:
- Preserve semantic structure.
- Treat responsiveness as PRD-wide, not unique to this profile.
- Optimize for mobile, tablet, and desktop reading.
- Do not design this profile as a frozen PDF clone.
```

## Prompt 05B. Comic Profile

```text
Using the canonical PRD docs, write `PRD_PROFILE_COMIC.md`.

Goal:
Define the comic profile as a first-class PRD profile.

Required sections:
- Profile purpose
- Core content units
- Reading order model
- Scroll vs page modes
- Panel and spread behavior
- Caption/dialogue structure
- Asset expectations
- Fallback behavior
- Accessibility expectations
- Minimal sample package
- Invalid cases
- Validator implications

Constraints:
- Treat comics as native, not as a hacked PDF variant.
- Support visual pacing and multiple reading modes.
- Keep v1 rules implementable.
```

## Prompt 05C. Storyboard Profile

```text
Using the canonical PRD docs, write `PRD_PROFILE_STORYBOARD.md`.

Goal:
Define the storyboard profile as a first-class PRD profile for production planning and review.

Required sections:
- Profile purpose
- Core content units
- Scene and shot structure
- Frame/image/note relationships
- Timing and sequencing rules
- Review and annotation expectations
- Layout modes
- Fallback behavior
- Minimal sample package
- Invalid cases
- Validator implications

Constraints:
- Support production-review workflows, not just reading.
- Keep profile rules machine-readable where possible.
- Avoid requiring cloud services for the base profile.
```

---

## Prompt 06. Assets, Attachments, And Large Works

```text
Using the canonical PRD docs, write `PRD_ASSETS_AND_ATTACHMENTS.md`.

Goal:
Define how PRD should handle embedded assets, linked assets, attachments, chunking, segmentation, and collections for large works.

Required sections:
- Scope
- Asset classes
- Embedded vs linked rules
- Attachment rules
- Offline behavior
- Chunking strategy
- Segmentation strategy
- Collection/series model
- Performance considerations
- Example structures
- Invalid cases
- Validator implications
- Open questions

Constraints:
- Do not assume all PRDs are tiny.
- Preserve portability when external links are used.
- Keep simple documents simple.
```

---

## Prompt 07. Capability Model And Conformance

```text
Using the canonical PRD docs, write both:
- `PRD_CAPABILITY_MODEL.md`
- `PRD_CONFORMANCE.md`

Goal:
Define what a PRD viewer must support, how it declares capabilities, and how conformance should be tested.

Required sections:
- Minimal viewer responsibilities
- Optional viewer capabilities
- Capability declaration model
- Graceful degradation rules
- Security defaults
- Network and script policy
- Print/export expectations
- Conformance levels
- Test-vector strategy
- Example compatibility matrix
- Failure behavior

Constraints:
- A minimal viewer should be realistic to build.
- Advanced features must not become hidden core requirements.
- Capability claims must be testable.
```

---

## Prompt 07A. Localization Model

```text
Using the canonical PRD docs, write `PRD_LOCALIZATION_MODEL.md`.

Goal:
Define localization as a cross-profile optional PRD capability without bloating the base manifest.

Required sections:
- Purpose
- Scope
- Non-goals
- Localization philosophy
- Lean manifest declaration model
- Package/content separation
- Viewer negotiation and fallback rules
- Validator implications
- Example declarations
- Open questions

Constraints:
- Treat localization as cross-profile.
- Keep the base manifest lean and declarative.
- Keep localization optional per package.
- Keep localized payloads and large locale maps outside the base manifest.
```

---

## Prompt 08. Versioning Policy

```text
Using the canonical PRD docs, write `PRD_VERSIONING_POLICY.md`.

Goal:
Define versioning across the PRD ecosystem.

Required sections:
- Why versioning matters
- Core spec version
- Manifest version
- Profile version
- Extension version
- Reference implementation version
- Compatible vs breaking changes
- Deprecation policy
- Migration guidance
- Example version scenarios
- Decision-log implications

Constraints:
- Keep the policy explicit and easy to audit.
- Do not hide breaking changes in examples or tooling.
```

---

## Prompt 09. Product Boundaries

```text
Using the canonical PRD docs, write `PRD_PRODUCT_BOUNDARIES.md`.

Goal:
Clearly separate the PRD standard from related products and ecosystem layers such as PRDc, Studio, Viewer, Cloud, SDK, and Renderer.

Required sections:
- Why boundary clarity matters
- PRD core standard
- PRDc role
- Studio role
- Viewer role
- Renderer role
- SDK role
- Cloud role
- Open vs proprietary boundary
- Dependency rules
- Example architecture map
- Risks of boundary blur

Constraints:
- Do not let product features redefine the standard.
- Preserve room for both open implementations and premium product layers.
```

---

## Prompt 10. Protection, Rights, And Signatures

```text
Using the canonical PRD docs, write `PRD_PROTECTION_MODEL.md`.

Goal:
Define the optional protection, private-section, rights, and signature model for PRD without making it a core requirement.

Required sections:
- Scope
- Non-goals
- Public vs protected split
- Protection model options
- Signature and verification model
- Rights metadata model
- Compatibility and degradation behavior
- Threat considerations
- Example extension declarations
- Invalid cases
- Open questions

Constraints:
- This must stay layered on top of core PRD.
- Simple PRDs must remain simple.
- Avoid fantasy security language; write implementable rules.
```

---

## Prompt 11. Live Updates, Payments, And Optional Crypto Extensions

```text
Using the canonical PRD docs and prior project history, write an experimental extension draft covering:
- live updates
- payment hooks
- optional crypto-linked capabilities

Goal:
Define these as modular extension families, not as base PRD requirements.

Required sections:
- Why these are extensions, not core
- Extension boundaries
- Live update model
- Payment hook model
- Optional identity/signature/crypto hooks
- Viewer behavior when unsupported
- Security and abuse risks
- Compatibility rules
- Suggested future file names

Constraints:
- Keep this experimental.
- Do not make v1 depend on wallets, chains, or hosted services.
- Preserve graceful degradation.
```

---

## Prompt 12. Reference Implementation Plan

```text
Using the canonical PRD docs, write a reference implementation plan for:
- packer
- validator
- reference viewer
- sample corpus
- conformance fixtures

Output:
- implementation goals
- smallest useful toolchain
- repository structure
- milestone order
- sample package list
- validation strategy
- risk list

Constraints:
- Favor a practical OSS baseline over feature creep.
- Tie every tool back to a specific spec milestone.
```

---

## Prompt 13. Launch And Ecosystem Strategy

```text
Using the canonical PRD docs, write a launch strategy for PRD.

Goal:
Define the right beachhead, open-source posture, demo plan, and milestone for public launch.

Required sections:
- Best first market/use-case wedge
- Why PRD wins there
- What must exist before launch
- What should stay out of launch
- OSS vs proprietary split
- Demo set
- Early adopter targets
- Messaging guardrails
- 90-day launch sequence

Constraints:
- No fake hype.
- The launch story must match actual capability.
- Favor one or two sharp entry points over broad claims.
```

---

## Prompt 14. Milestone Closeout Review

Use this at the end of any milestone before calling it done.

```text
Review the current PRD milestone artifact set against the system blueprint.

Tasks:
1. Check whether the milestone has all required documents, samples, tests, and validator implications.
2. Identify missing exit-gate criteria.
3. Identify contradictions with accepted decisions.
4. Recommend only the smallest remaining work needed to close the milestone.

Output:
- Pass/fail by exit criterion
- Missing artifacts
- Risks
- Required follow-ups
- Recommended milestone status
```

---

## Final Prompt Rule

If a future prompt generates PRD work without:

- examples
- invalid cases
- validator implications
- compatibility notes
- open questions
- labeled assumptions when the source-of-truth is incomplete
- a proposed source-of-truth doc update when the source-of-truth is incomplete

then the output is incomplete and should not be treated as a locked PRD artifact.
