# PRD Project History Record
_Last updated: March 22, 2026_

## Purpose
This file is a consolidated history record for the **PRD project** based on the conversation history and project context currently available in this workspace. It is meant to act as a **future reminder / reference document**, not a perfect verbatim export of every past message.

## Important Note
This record is **not a raw full-chat dump** of every PRD conversation ever had.  
It is a **structured archive summary** built from the available PRD conversation context, project memory, and recent discussion history visible in this session.

Because of that:

- It captures the **main ideas, decisions, themes, naming, and direction**
- It does **not** include every exact message word-for-word
- It should be treated as a **living master history document** that can be updated over time

---

# 1. High-Level Definition of PRD

## What PRD is
PRD is being shaped as a **portable responsive document format/system** intended to go beyond the limitations of traditional PDF. The goal is not just "another document file" but a broader **document ecosystem** that can support:

- responsive layouts
- richer structure than PDF
- better interactivity
- stronger metadata / manifest-driven architecture
- future support for ownership, authorship, rights, payments, sharing, and possibly crypto-linked capabilities
- first-class support for document types beyond normal text documents

## Core strategic position
PRD is repeatedly discussed as something that should:

- compete with or outperform PDF in modern digital use cases
- remain scalable for future ecosystems
- support creators, publishers, and richer document experiences
- avoid being designed too narrowly around only one use case

---

# 2. Major PRD Themes Repeated Across Conversations

## 2.1 PRD vs PDF
A major recurring idea is that PRD should be positioned as **better than PDF** in areas where PDF is weak, especially:

- responsiveness across screen sizes
- richer structure
- extensibility
- more modern web-friendly behavior
- future-ready features
- better support for living documents instead of static pages only

The broader direction is not just to "replace PDF everywhere" instantly, but to create a format that is **clearly superior in important modern categories**, then grow from there.

## 2.2 PRD as a broader ecosystem
PRD is not being treated as only a file extension. It is increasingly discussed as a larger system that could include:

- PRD files/spec
- PRDc
- Studio
- Viewer
- Cloud
- SDK
- Renderer

This means PRD is moving toward a **platform architecture**, not only a format spec.

## 2.3 Manifest-centered architecture
A key idea is that PRD should be driven by a **canonical master foundation / architecture / structure document** and a strong manifest model. The manifest is expected to be central for describing:

- document structure
- metadata
- extensibility
- rights / ownership fields
- future payment hooks
- possible crypto-related fields later
- optional protection / private sections
- versioning

The user specifically preferred a design with:

- a canonical master markdown source of truth
- clear versioning
- public header vs protected/private sections
- future extension points for ownership, payments, crypto, and encryption

## 2.4 PRD should support more than text documents
A major clarified direction is that PRD should **not be limited to standard text-heavy documents**.

The user explicitly wants PRD to support these as **first-class publishing/document profiles**:

- comics
- storyboards

That means PRD should be able to represent visual narrative documents, not only articles, reports, or books.

## 2.5 Long-form content concern
A direct question was raised about whether PRD can support a large web novel. That brought out an important product question:

- PRD should not be designed only for short docs
- file size, structure, streaming, segmentation, and packaging matter
- very large publishing formats must be considered in the architecture

This suggests the system needs to support both:
- lightweight documents
- larger serialized / modular content packages

---

# 3. PRD Naming / Product Family Discussions

## 3.1 PRD and PRDc
A distinction was explored between **PRD** and **PRDc**.

### Current remembered interpretation
- **PRD** = the broader document format/ecosystem/standard direction
- **PRDc** = the Document Archive Codex in AeonHive, described as the system-wide document archive/codex

A remembered clarification from project memory is:

> PRDc = the Document Archive Codex in AeonHive (system-wide document archive/codex).  
> It is **not** the Peer Request DNA creation flow.

This matters because it separates the archive/codex concept from other naming collisions or earlier interpretations.

## 3.2 Broader family map
A specific hierarchy discussion happened around mapping:

- PRD
- PRDc
- Studio
- Viewer
- Cloud
- SDK
- Renderer

This suggests the ecosystem is being organized into product layers rather than a single monolithic product.

---

# 4. Crypto / Ownership / NFT-Adjacent Conversations

## 4.1 PRD and uniqueness
There were several discussions around whether PRD could or should have unique ownership/identity properties similar to NFTs.

Recurring questions included ideas like:

- does a PRD become an NFT?
- if a creator makes a PRD with a public key, is it unique like an NFT?
- is there a “crypto-PRD” concept?
- does crypto-PRD beat NFTs, become one, or interact with NFTs?

## 4.2 Crypto-PRD direction
The user explored a concept where PRD could eventually support crypto-related layers, but also wisely identified versioning strategy:

### Discussed path
- **Version 1** should avoid depending on unfinished AeonHive / Nectar systems
- Start with a cleaner foundation first
- Later, in an updated version, release deeper crypto-linked capabilities once AeonHive is live

That is a strong product decision because it avoids overloading v1 with future dependencies.

## 4.3 Nectar-PRD
There was discussion about “nectar-PRD” and how it differs from “crypto-PRD,” including the idea that PRD-based assets or documents could be:

- free
- shared across the Hive
- used for info/help/blog-style content

This indicates a future economy model where not all PRD assets are paid or locked; some are openly shareable.

## 4.4 Ownership / rights / payments / encryption
The user explicitly raised future foundation concerns around:

- author ownership
- rights
- shared ownership
- payments
- encryption
- security of the manifest
- file size implications

This is one of the most important strategic threads because it means the architecture must reserve space for rights management without making the base format too heavy.

---

# 5. White Paper vs PRD-First Strategy

A recurring planning question was whether to make:

- the PRD first
- the white paper first
- or one inside the other

The discussion trend suggests:

- the **PRD core/foundation/spec direction** should be clarified first
- then a **white paper** can explain the why, vision, market position, and future potential
- both can exist, but they serve different roles

### Practical interpretation
- **Foundation/spec doc** = how PRD works
- **White paper** = why it matters, why it beats PDF, future roadmap, ecosystem vision

That is a strong separation and should probably stay.

---

# 6. Repo / Brand / Architecture Direction

From recent PRD repo-structure discussions, the user emphasized that decisions about PRD should not be made in isolation.

## Explicit user directive remembered
Before creating foundation or architecture documents for PRD, work should be based on:

- the full discussion history across PRD
- EonHive discussions
- AeonHive discussions
- older and newer ideas together
- including outdated or redundant material, so the good ideas can be retained and the weaker ones filtered out

This means PRD is intended to be designed as a **cross-project informed system**, not as a single isolated spec.

## Brand relationship themes
Conversations also explored how PRD sits under a larger family and whether parts are:

- public
- private/internal
- open-source
- contributor-friendly
- EonHive-owned or operated

This indicates that PRD may eventually involve both:
- public/open layers
- internal/private service layers

---

# 7. Canonical Foundation Requirement

A major recent direction from March 2026 was the need for a **canonical master foundation / architecture / structure markdown source-of-truth**.

## User preference that should guide future work
Future PRD master prompts should read from a central markdown foundation file.

That foundation should include:

- architecture principles
- structure rules
- manifest model
- versioning policy
- extension points
- public vs protected sections
- current scope vs reserved future scope

This is one of the strongest actionable decisions in the available history.

---

# 8. First-Class Profiles the User Wants PRD to Support

The project history clearly points toward PRD needing multiple content profiles.

## Confirmed important profiles
- standard responsive documents
- comics
- storyboards

## Likely implied future profiles
Based on the broader conversations, PRD may later need to support:
- articles / reports
- books / novels
- white papers
- interactive docs
- learning / help docs
- creator portfolio documents
- asset-linked documents
- archive/codex content

But the explicitly remembered must-have expansion is:
- **comics**
- **storyboards**

That matters because those formats require layout logic that differs from normal prose pages.

---

# 9. Technical/Architectural Concerns Mentioned or Implied

## 9.1 Manifest growth
The manifest is useful, but the user is already thinking ahead about:

- future field growth
- backward compatibility
- avoiding bloated design
- allowing future modules without breaking old documents

## 9.2 Security / encryption
The user asked whether the manifest needs encryption for security and what the implications are.

That leads to a probable architecture principle:

- base manifest should stay readable/interoperable where possible
- protected/private/encrypted areas may need to be optional modular layers
- encryption should not be forced on all documents

## 9.3 File size
File size is already a concern, especially if PRD supports:

- media
- attachments
- large narrative works
- comics
- storyboards
- protected content
- future payment/ownership metadata

This implies a likely need for:
- modular packaging
- external asset references or bundles
- progressive/partial loading
- profile-based document packaging

## 9.4 Attachments
The user reminded that attachment features should be included. This is a meaningful requirement because attachment handling affects:
- packaging
- file size
- portability
- security
- rendering
- offline support

---

# 10. Strategic View of What PRD Is Becoming

Based on the visible history, PRD is evolving toward this shape:

## PRD is not just:
- a prettier PDF
- a basic document file
- a one-off static format

## PRD is becoming:
- a responsive document standard/system
- a manifest-driven format family
- a platform with multiple products/tools
- a creator/publisher-friendly publishing system
- a future-ready container for ownership, rights, payments, and optional crypto-linked capabilities
- a format intended to support both traditional and visual narrative publishing

That is the real trajectory visible across the conversations.

---

# 11. Strong Decisions / Preferences Captured from History

## High-confidence decisions
1. PRD should be built from a **master canonical markdown foundation**.
2. PRD must be **extensible** for future ownership, payment, crypto, and encryption-related capabilities.
3. PRD should support **public header vs protected/private sections**.
4. PRD should use **clear versioning**.
5. PRD must support **comics and storyboards as first-class profiles**.
6. PRD architecture should be informed by the broader **PRD + EonHive + AeonHive** history, not isolated threads only.
7. A **v1 without full AeonHive/Nectar dependency** is a smart path.
8. White paper and foundation/spec should be treated as related but different deliverables.
9. Attachment support matters and should be planned early.
10. PRD should be aimed at beating PDF where PDF is weakest: responsiveness, richness, structure, and future extensibility.

---

# 12. Open Questions Still Alive in the History

These questions appear unresolved or only partially resolved:

1. What exactly is the smallest valid PRD package/spec?
2. How much of the manifest should be mandatory vs optional?
3. Should media/assets be embedded, referenced, or both?
4. How should large works like novels/comics/storyboards be chunked or streamed?
5. How should private/protected sections work technically?
6. What is the exact relationship between PRD, PRDc, Studio, Viewer, Cloud, SDK, and Renderer?
7. What parts are open/public vs private/internal?
8. How much crypto capability belongs in the base standard vs optional extension packs?
9. How should authorship, rights, and payment metadata be represented without making basic docs too heavy?
10. What rendering model best supports both prose documents and highly visual formats?

---

# 13. Suggested Future Use of This File

This file can serve as:

- a history reminder
- a decision memory
- a seed for the real canonical foundation file
- a starting point for a PRD white paper outline
- a reference when creating repo structure or product boundaries

## Best next evolution of this file
Turn this into a versioned archive system such as:

- `PRD_HISTORY.md` → conversational/project history archive
- `PRD_FOUNDATION.md` → canonical architecture/source-of-truth
- `PRD_ROADMAP.md` → milestones and staged rollout
- `PRD_GLOSSARY.md` → terms like PRD, PRDc, Studio, Viewer, Nectar-PRD, crypto-PRD, etc.
- `PRD_DECISIONS.md` → explicit design decisions and reasons

---

# 14. Compact Timeline Snapshot

## Earlier idea phase
- PRD discussed as a possible next-generation document format / ecosystem
- Comparison against PDF became a major strategic theme
- Crypto/ownership questions started appearing

## Expansion phase
- PRD explored as more than a file type
- Product-family thinking emerged: PRD / PRDc / Studio / Viewer / Cloud / SDK / Renderer
- Questions of open vs private layers came up

## Strategic clarification phase
- User emphasized reviewing **all relevant project history** before making final architecture choices
- User pushed for a master architecture/foundation markdown source-of-truth
- Future extension points became an explicit requirement

## March 2026 refinement
- Strong emphasis on manifest design
- public vs protected/private sections
- versioning
- future ownership/payments/crypto/encryption hooks
- explicit requirement that comics and storyboards be first-class PRD profiles

---

# 15. Final Summary

PRD is being shaped into a **next-generation responsive document ecosystem** that aims to surpass PDF by being:

- responsive
- structured
- extensible
- future-ready
- supportive of both traditional and visual publishing
- capable of growing into rights/payment/ownership systems later

The most important current architectural direction is to establish a **canonical markdown foundation** first, keep v1 practical, and reserve clean extension points for the more ambitious future ecosystem.

---
_End of record_
