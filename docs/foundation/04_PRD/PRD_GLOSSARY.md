# PRD_GLOSSARY.md
_Last updated: April 1, 2026_  
_Status: Working glossary v0.1_

## Purpose
This file defines the main PRD terms so future docs use them consistently.

---

## PRD
**Portable Responsive Document**

The main document format/system being designed.  
PRD is intended to be a structured, responsive, extensible document architecture that can support multiple publishing profiles and future ecosystem growth.

---

## Portable
In the PRD context, portable means a document should be usable across devices, viewers, and environments as much as practical without losing its essential meaning or usefulness.

---

## Responsive
In the PRD context, responsive means content and layout can adapt to different screen sizes, display contexts, reading modes, or device conditions rather than being frozen into one fixed visual page form only.

---

## Document Profile
A predefined behavior/style/category of PRD document.  
Different profiles can have different structure rules, layout rules, and rendering logic.

Examples:
- general document
- comic
- storyboard

---

## General Document Profile
A general-purpose PRD profile for things like:
- articles
- manuals
- novels
- web novels
- reports
- white papers
- essays
- standard reading docs

Usually text-led, but still structured and responsive.
Responsiveness is not unique to this profile. It is a PRD-wide architectural principle.

---

## Profile ID
A stable machine-readable identifier used in the manifest `profile` field.

Examples:
- `general-document`
- `comic`
- `storyboard`

Profile IDs are part of the package contract. They are not UI labels.

---

## Profile Label
A human-facing display name used by Viewer, Studio, SDKs, validators, or registry UIs when presenting a profile to people.

Examples:
- `Document`
- `Comic`
- `Storyboard`

Profile labels may map from canonical profile IDs, but they do not replace them in the manifest.

---

## Comic Profile
A PRD profile for panel-based visual storytelling.  
Likely needs support for:
- panels
- balloons/captions
- page or scroll reading modes
- visual pacing
- chapter/episode packaging

This family currently includes manhua and manhwa-style works unless later canon promotes a more specialized profile or variant model.

---

## Web Novel
A novel-style work published in digital or serialized form.

In current PRD canon, web novels belong inside the `general-document` family unless later canon promotes a more specialized profile.

---

## Manhua / Manhwa
Comic-family works with their own common publication and presentation patterns.

In current PRD canon, manhua and manhwa belong inside the `comic` family unless later canon promotes a more specialized profile or variant model.

---

## Storyboard Profile
A PRD profile for shot-based planning and production communication.  
Likely needs support for:
- scene/shot frames
- visual notes
- timing or sequence relationships
- annotations
- review-friendly layout modes

---

## Manifest
The core package description file or data structure that tells a viewer/renderer what the PRD contains and how to interpret it.

A manifest may eventually describe:
- version
- identity
- profile
- entry points
- assets
- extensions
- capabilities
- compatibility
- public metadata
- protected/private declarations

---

## Public Header
The interoperable, normally readable part of PRD metadata needed to safely identify and open a document.

Typical examples:
- format version
- title
- profile
- entry file
- compatibility requirements

---

## Identity Object
An optional manifest object for durable machine-facing references beyond the required top-level `id`.

Typical examples:
- revision links
- parent/origin relationships
- author or publisher references

It supplements the required package identity. It does not replace it.

---

## Public Metadata
The optional lean reader-facing metadata lane in the manifest.

Typical examples:
- subtitle
- summary
- byline
- contributors
- publisher
- genres
- tags
- content rating
- cover reference

Public metadata is for lightweight display and discovery information. It is not the place for full author bios or large about pages.

---

## Byline / Contributors
Short creator-credit metadata intended for display in Viewer, Studio, SDK, validator, or library surfaces.

`byline` is the primary short display credit.  
`contributors` is the small structured credits list, such as author, illustrator, translator, or editor.

---

## Genre / Subgenre
Optional classification metadata describing the work's content or editorial grouping.

Genre and subgenre are metadata, not profile identity.
A fantasy web novel still belongs to `general-document`. A romance manhwa still belongs to `comic`.

---

## Content Warning / Content Rating
Optional public metadata describing warnings or audience suitability.

These values may affect discovery or presentation, but they do not change the package's top-level profile identity.

---

## About Content
Rich human-facing explanatory content such as:
- author bio
- about the series
- acknowledgements
- release notes
- creator notes

This belongs in content, attachments, or later profile-specific payloads rather than the lean base manifest.

---

## Protected/Private Section
Optional parts of the PRD package that are hidden, access-controlled, encrypted, or otherwise restricted.

Potential use cases:
- premium content
- private author metadata
- secure references
- ownership/rights metadata
- entitlement or signature data

---

## Extension
An optional feature layer added to PRD beyond the minimal core format.

Examples of future extension areas:
- rights
- payments
- signatures
- cryptographic identity
- access control
- advanced media systems

---

## Minimal Valid PRD
The smallest correct and usable form of a PRD package that still follows the base format rules.

This is not fully defined yet, but it should stay lightweight and practical.

---

## PRDc
**Document Archive Codex**

A remembered project meaning for PRDc within the broader ecosystem.  
PRDc refers to the system-wide document archive/codex concept in AeonHive.

Important clarification:
PRDc is **not** the Peer Request DNA flow.

---

## Studio
A likely authoring/editing environment in the PRD ecosystem.  
Would probably be where creators assemble, edit, preview, validate, and export PRD documents.

---

## Viewer
A likely reading/viewing application or runtime surface for opening PRD documents.

Could exist in:
- web
- desktop
- mobile
- embedded
- cloud-preview contexts

---

## Cloud
A likely service layer in the PRD ecosystem for things like:
- syncing
- publishing
- hosting
- collaboration
- distribution
- entitlement/access operations

This is broader than the core format itself.

---

## SDK
Software development tools and libraries used by developers to create PRD-compatible apps, renderers, validators, converters, or authoring tools.

---

## Renderer
The system or engine that interprets PRD structure, layout, and assets and turns them into visible or printable output.

A renderer may vary by:
- platform
- profile support
- capability level
- performance target

---

## Package
The full set of files/data that make up a PRD document, not just the visible content alone.

A package may contain:
- content
- manifest
- assets
- attachments
- metadata
- optional private/protected data

---

## Attachment
A file or resource associated with the PRD that is meant to travel with it or be referenced by it.

Examples:
- image assets
- downloadable files
- source references
- audio/video media
- supplements

---

## Chunking
Breaking very large PRD works into smaller internal units for loading, packaging, syncing, or rendering.

Useful for:
- novels
- comic series
- large manuals
- storyboard collections
- media-heavy docs

---

## Segmentation
Dividing a document into logical parts such as:
- chapters
- scenes
- episodes
- panels
- sections
- appendices

Chunking is usually technical; segmentation is often structural or editorial.

---

## Graceful Degradation
The principle that a PRD document should still remain partially useful even when a viewer does not support every advanced feature or extension.

---

## Localization
Optional PRD behavior that lets a package declare locale-aware content or presentation support across profiles.

Localization may include things such as:
- language variants
- region-specific variants
- text direction
- locale-aware metadata
- locale-specific asset selection

Localization is a cross-profile capability. It is not limited to one profile family.
Locale/language declarations belong in `localization`, not as a loose replacement for the manifest's opening contract.

---

## Locale-Aware
Able to adapt meaningfully to language, region, or text-direction context when the package declares that behavior.

Locale-aware behavior is broader than viewport responsiveness. It may affect text selection, formatting, reading direction, metadata, or asset choice.

---

## Rights Metadata
Optional metadata describing things like:
- authorship
- ownership
- licensing
- permissions
- usage restrictions
- publication rights

This should likely be extensible rather than forced into all PRDs.

---

## Payment Hooks
Optional extension points that could let a PRD interact with payment or entitlement systems in the future.

Examples:
- paywalled sections
- purchase entitlements
- license verification
- premium unlock models

Not required for base PRD.

---

## Crypto-PRD
A conceptual future direction where PRD documents may integrate cryptographic ownership, identity, verification, or chain-linked behaviors.

This is not currently the same thing as base PRD.  
It should be treated as an optional future extension direction, not the default requirement.

---

## Nectar-PRD
A future ecosystem-oriented concept discussed in relation to the Hive/AeonHive economy.  
It appears to imply PRD content participating in a Nectar-linked sharing/payment/value system.

This is not mature enough to define fully yet and should stay as a future-facing concept for now.

---

## White Paper
A strategy/vision/market document explaining why PRD matters, what problem it solves, where it fits, and why it can outperform older formats or systems.

This is different from the foundation/spec docs.

---

## Foundation Document
The source-of-truth architecture and principles file that defines the core direction of PRD.

Right now, that role is being filled by `docs/foundation/04_PRD/PRD_FOUNDATION.md`.

---

## Decision Log
A living record of explicit PRD design decisions and pending decisions.

Right now, that role is being filled by `docs/decisions/PRD_DECISIONS.md`.

---

## Roadmap
A staged plan showing what should be built first, next, and later.

Right now, that role is being filled by `docs/foundation/04_PRD/PRD_ROADMAP.md`.


## PRD Convert

The ingestion product boundary for reconstructing existing documents into PRD's canonical semantic model. It uses Core validation and packaging; Studio owns subsequent authoring and editing. The repository's Phase 1 implementation provides Markdown conversion through a library and CLI. See [the architecture record](../../architecture/PRD_CONVERT_PHASE_1.md).
