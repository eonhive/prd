# PRD_FOUNDATION.md
_Last updated: April 1, 2026_  
_Status: Canonical foundation draft v0.1_

## 1. Purpose

PRD is a **Portable Responsive Document** system designed to be more modern, structured, responsive, and extensible than traditional static document formats like PDF.

This file is the **source-of-truth foundation** for PRD.  
It defines what PRD is, what it is trying to solve, what principles guide it, and what structural rules future PRD architecture work should follow.

This is **not** the white paper.  
This is **not** the marketing pitch.  
This is the core foundation document that future prompts, architecture docs, schemas, and product plans should read before generating new PRD work.

---

## 2. Core Mission

PRD exists to create a document format and ecosystem that can:

- adapt across devices and screen sizes
- preserve structure better than flat page-first formats
- support richer publishing modes than static text pages
- scale from simple documents to advanced media-rich and interactive works
- support future ownership, rights, access, payment, and optional cryptographic extensions
- work for both traditional publishing and visual storytelling formats

---

## 3. What PRD Is

PRD is not just one file type.  
PRD is a **document architecture family** made of:

- a document format/spec
- a manifest-driven package model
- rendering rules
- profile-specific layout behaviors
- optional service/product layers around authoring, viewing, syncing, and archival use
- locale-aware behavior when declared, without forcing localization into every package

At minimum, PRD should be understood as:

1. **A structured document container**
2. **A responsive layout-aware publishing format**
3. **A manifest-based extensible system**
4. **A format family that can support multiple document profiles**
5. **A future-ready base for richer creator and archive ecosystems**

---

## 4. What PRD Is Not

PRD should not be designed as:

- just “PDF but prettier”
- only a page screenshot container
- a format limited to books or reports only
- a crypto-first gimmick
- a system that forces advanced features on simple documents
- a bloated format where every file must carry rights, payment, and blockchain overhead

PRD must stay practical at its core.

---

## 5. Core Problems PRD Is Intended to Solve

## 5.1 Static page limitations
Traditional formats like PDF are strong for fixed visual preservation, but weak for:

- mobile responsiveness
- fluid reading experiences
- structured content understanding
- adaptive layouts
- profile-aware rendering
- scalable extensibility

## 5.2 Weak content structure
Many traditional document formats preserve appearance better than meaning.  
PRD should preserve both:

- what the content is
- how it should behave
- how it should adapt
- what rules govern it

## 5.3 Poor support for modern mixed media publishing
PRD should better support:

- embedded or linked media
- attachments
- visual storytelling
- modular content packaging
- future progressive loading and streaming

## 5.4 Poor future extensibility
Most older document formats were not built cleanly for:

- optional ownership metadata
- rights management
- payment hooks
- access tiers
- cryptographic identity
- modular extension packs

PRD should reserve clean extension points without forcing them into every document.

---

## 6. Design Principles

## 6.1 Responsive first, not page first
PRD should treat responsiveness as a first-class concern.  
Static pages may still exist as a mode, export path, or constrained layout behavior, but they should not define the whole system.

## 6.2 Structured first
PRD should preserve semantic structure, not only visual output.

## 6.3 Profile-based
Different document types need different behaviors.  
A comic is not a white paper.  
A storyboard is not a novel.  
A help guide is not a report.  

PRD should support profile-driven behavior rather than pretending all documents are the same.
Responsiveness applies across profile families. Profiles specialize document family, structure, and behavior; they do not own responsiveness.

## 6.4 Extensible, but layered
Advanced features should be optional layers.  
Simple PRD documents should stay lightweight.

## 6.5 Versioned from the start
PRD must have clear versioning so future evolution does not break existing documents carelessly.

## 6.6 Public by default, protected when needed
Core metadata should be interoperable where practical, but protected/private sections must be possible for sensitive or premium use cases.

## 6.7 Portable
Documents should remain portable across viewers, devices, and ecosystems as much as possible.

## 6.8 Graceful degradation
A document with advanced extensions should still expose usable base content when a viewer does not support every optional feature.

## 6.9 Locale-aware when declared
PRD should support locale-aware behavior when a package declares it.
Localization is optional per package, cross-profile, and should remain lean at the manifest level.

---

## 7. Canonical PRD Building Blocks

Every PRD architecture proposal should think in terms of the following layers:

## 7.1 Content layer
The actual document content:
- text
- images
- panels
- scenes
- attachments
- references
- media blocks

## 7.2 Structure layer
The semantic organization of the content:
- sections
- chapters
- scenes
- panels
- notes
- captions
- metadata tags
- relationships between units

## 7.3 Layout layer
Rules for display and responsive adaptation:
- flow rules
- panel arrangement
- page rules
- viewport behavior
- breakpoints
- reading modes
- print/export constraints

## 7.4 Manifest layer
The declarative package description for:
- identity
- version
- profile
- locale declarations when present
- package structure
- assets
- optional capabilities
- extension declarations
- rights/access hooks
- compatibility info

## 7.5 Asset layer
Embedded or referenced resources:
- images
- audio
- video
- fonts
- attachments
- thumbnails
- external bundles

## 7.6 Protection/access layer
Optional systems for:
- protected sections
- access rules
- encryption wrappers
- payment hooks
- ownership claims
- signature/verification

## 7.7 Runtime/render layer
The viewer/render behavior that interprets the document based on profile and capabilities.

---

## 8. Required First-Class Profiles

The following are currently mandatory first-class PRD profiles:

## 8.1 General document
For:
- reports
- articles
- essays
- manuals
- white papers
- general reading docs

This is the broad general-reading profile family. It is not the owner of responsiveness; responsiveness is a PRD-wide principle.

## 8.2 Comic
For:
- panel-based visual storytelling
- page or scroll reading modes
- visual pacing
- caption/speech/thought structure
- possible episode/chapter packaging

## 8.3 Storyboard
For:
- shot-based scene planning
- image + notes + timing relationships
- layout suited for production review
- versioned visual planning content

These are not side experiments.  
They are part of the expected foundation scope.

---

## 9. Manifest Direction

The manifest is central to PRD.

At minimum, future manifest design must support:

- PRD version
- profile type
- document/package identity
- title/basic metadata
- content entry points
- asset declarations
- extension declarations
- compatibility requirements
- public metadata vs protected/private sections
- optional rights/payment/ownership fields
- future cryptographic extension points

### Manifest rule
The base manifest should remain as clean and small as possible.  
Do not force advanced ecosystem features into the minimal valid PRD.

---

## 10. Public vs Protected Sections

PRD should support a conceptual split between:

## 10.1 Public/header area
This should hold the minimum interoperable information needed to identify and open the document safely and correctly.

Examples:
- format version
- profile
- title
- basic identity
- entry points
- declared extensions
- compatibility requirements
- visible metadata intended for normal readers/viewers

## 10.2 Protected/private area
This may hold:
- encrypted metadata
- premium sections
- access-controlled references
- private author/owner metadata
- signatures
- rights details
- payment or entitlement info

### Rule
Protected/private content should be optional and layered, not mandatory.

---

## 11. Versioning Policy Direction

PRD must be versioned from the beginning.

Future architecture docs should define versioning across at least:

- format/spec version
- manifest version
- profile version
- extension version
- renderer/viewer compatibility declarations

### Principle
Backward compatibility should be respected whenever reasonable.  
Breaking changes must be explicit, documented, and justified.

---

## 12. Attachments and Assets

Attachments are a real requirement, not a maybe.

PRD should plan for:
- embedded attachments
- linked attachments
- packaged assets
- optional external asset resolution
- portability-aware fallbacks

Because file size matters, PRD should support multiple strategies rather than forcing one universal rule.

---

## 13. Large Content Strategy

PRD must not assume all documents are small.

Large-content support should be considered for:
- novels
- serial publications
- comics
- storyboards
- media-heavy educational or production docs

This means future design should consider:
- chunking
- segmentation
- modular packaging
- partial loading
- streaming-friendly structures
- collections/series support

---

## 14. Crypto / Ownership / Payment Position

PRD should be **extension-ready**, not **extension-dependent**.

That means:

- ownership support may exist
- rights support may exist
- payment support may exist
- cryptographic identity/signature support may exist
- future crypto-linked features may exist

But:
- PRD v1 should not be blocked by unfinished ecosystem dependencies
- simple documents should not require blockchain, wallets, or token logic
- advanced economy/ownership systems belong in optional extension layers

---

## 15. Product Family Direction

PRD should be designed so it can support a broader ecosystem, potentially including:

- PRD format/spec
- PRDc archive/codex role
- Studio authoring tools
- Viewer apps
- Cloud services
- SDKs
- Renderer/runtime components

The format foundation must stay clean even if the product family grows.

---

## 16. Non-Negotiable Foundation Rules

1. PRD must remain useful without crypto.
2. PRD must support responsive behavior.
3. PRD must support structured semantics.
4. PRD must support multiple profiles.
5. Comics and storyboards are first-class.
6. Versioning must be explicit.
7. Protected/private sections must be possible but optional.
8. Attachments and asset strategies must be planned early.
9. Future ownership/payment hooks must be extensible, not forced.
10. The architecture must be shaped from the wider PRD + EonHive + AeonHive history, not isolated snippets.

---

## 17. What Future Docs Should Derive From This File

Every future PRD master prompt or architecture doc should align with this foundation and then specialize into areas such as:

- system blueprint / execution model
- master prompt system
- manifest schema
- package layout
- localization model
- profile specs
- rendering model
- viewer capability model
- conformance model
- authoring workflow
- storage/sync model
- rights/access extension design
- white paper and market narrative

---

## 18. Current Scope vs Reserved Future Scope

## Current scope
- foundation principles
- profile-first architecture direction
- manifest-centered structure
- versioning
- public/protected split
- attachments
- large-content planning
- extension-ready ownership/payment/crypto direction

## Reserved future scope
- full schema details
- exact package folder layout
- entitlement/payment protocol
- encryption model
- signature model
- SDK boundaries
- renderer capability model
- cloud sync/service behavior
- PRDc archive details

---

## 19. Final Foundation Statement

PRD should become a **portable, responsive, structured, extensible document system** that is practical in v1, powerful in growth, and capable of supporting both traditional documents and visual narrative publishing without being trapped by the limitations of older page-first formats.
