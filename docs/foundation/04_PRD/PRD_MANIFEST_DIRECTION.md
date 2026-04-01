# PRD_MANIFEST_DIRECTION

**Project:** PRD
**Version:** 0.1
**Status:** Canonical Manifest Direction Draft
**Last Updated:** 2026-04-01

---

# 1. Purpose

This document defines the architectural direction for the PRD manifest.

The manifest should be treated as the **canonical structural source-of-truth** for a PRD package.

It is one of the most important parts of the whole system.

Without a disciplined manifest:

- packages become inconsistent,
- profiles become messy,
- extensions become dangerous,
- viewers become brittle,
- and validation becomes weak.

---

# 2. Manifest Role

The manifest should describe:

- what the PRD package is
- what version/spec it follows
- what profile it uses
- what content/resources it contains
- how the viewer should interpret the package
- what extensions are declared
- what is public vs protected/private where applicable

The manifest should **not** be treated as random metadata only.

It is the document’s structural contract.

---

# 3. Core Design Principles

## 3.1 Manifest-first

The manifest is the first file the system should trust and read.

## 3.2 Versioned

The manifest must declare a format/spec version.

## 3.3 Profile-aware

The manifest must explicitly state the document profile.

## 3.4 Structured, not vague

The manifest should point to structured content and resources clearly.

## 3.5 Extension-safe

Future advanced features must attach through explicit extension declarations, not hidden hacks.

## 3.6 Public vs protected aware

The system should leave room for public-readable fields and protected/private references without corrupting the base model.

---

# 4. Canonical Responsibilities

The manifest should eventually carry responsibility for:

- package identity
- versioning
- metadata
- profile declaration
- content entry points
- resource map
- reading/navigation hints where needed
- theme/layout references where appropriate
- extension declarations
- optional protected/private references
- validation surface

---

# 5. Recommended Top-Level Shape

The exact syntax can evolve, but conceptually the manifest should include areas like:

- header
- identity
- metadata
- profile
- structure
- resources
- rendering/view hints
- extensions
- protection/security hooks
- validation compatibility data

This should stay clean and predictable.

---

# 6. Public Header Direction

The manifest should have a **public header-like section** that contains the minimum safe data needed to identify and interpret the package.

Examples of what belongs here:

- PRD format version
- package/document ID
- title
- primary profile type
- default locale / available locale declarations when present
- manifest schema version
- basic creator/publisher metadata
- content entry point reference
- declared extensions list

This is important because future protected/private systems should not hide the minimum package identity needed for handling the file.

---

# 7. Identity Direction

The manifest should support identity concepts such as:

- document ID
- version ID or revision ID
- optional parent/origin linkage
- author/publisher/owner references where applicable
- creation/update timestamps
- optional canonical slug or external reference

Identity must be stable enough to support:

- validation
- version history later
- PRDc indexing
- ownership logic later
- document relationships later

---

# 8. Metadata Direction

Metadata should support:

- title
- subtitle
- description/summary
- author(s)
- publisher
- language
- locale hints
- keywords/tags
- cover/thumbnail reference
- category or domain metadata where useful

Metadata should not become a junk drawer.

Keep it useful and bounded.

---

# 9. Profile Declaration Direction

The manifest must explicitly declare the document profile.

Examples:

- `general-document`
- `comic`
- `storyboard`
- `vendor.example.profile-name`

The manifest `profile` value should use the canonical machine-readable identifier, such as `general-document`, not a friendly UI label such as `Document`.
Friendly labels and descriptions belong to registry and product UI surfaces, not the base manifest.

This profile declaration is essential because it influences:

- validation
- content model expectations
- rendering behavior
- viewer decisions
- authoring tools
- conversion behavior

---

# 10. Structure Direction

The manifest should point clearly to the package’s main structural content.

Examples:

- root content file
- section index
- page/flow entry model
- profile-specific structure references
- navigation map where applicable

The manifest should not need to inline the entire document content, but it should clearly define where the structure begins.

---

# 11. Resource Map Direction

The manifest should define a clear resource map for:

- images
- media
- attachments
- fonts if allowed
- themes/layout assets
- profile-specific assets
- optional protected asset references later

Resources should be:

- addressable
- validateable
- typed where useful
- predictable in packaging

Do not let arbitrary mystery resources float around the package.

---

# 12. Rendering / View Hint Direction

The manifest may contain optional rendering/view hints such as:

- preferred reading mode
- paginated support
- responsive behavior hints
- profile-specific view preferences
- cover/start view hints
- theme preference hints

Important:
These are **hints**, not absolute viewer tyranny.

The viewer still needs control and compatibility behavior.

---

# 13. Extension Declaration Direction

Extensions must be declared explicitly.

Examples of future extension categories:

- encryption
- signatures
- annotations/comments
- live PRD behavior
- ownership/license metadata
- payment/commerce hooks
- AI transform hooks
- attachment relationship models

An extension declaration should ideally include:

- extension ID/name
- version
- scope
- whether it is optional or required
- referenced data location

This prevents extension chaos.

---

# 14. Protected / Private Direction

The manifest should leave room for:

- public fields
- protected references
- encrypted sections
- private metadata blocks later

The manifest should **not** require all content to be public.

But also:
the package must still be interpretable enough to know what it is, even when some sections are protected.

That balance matters.

---

# 15. Validation Direction

The manifest should be the main validation surface.

Validation should check things like:

- required fields exist
- profile is valid
- entry points exist
- resource references resolve
- extension declarations are well-formed
- incompatible version/profile combinations are caught
- protected/private declarations are structurally valid

Without validation, PRD will rot fast.

---

# 16. Backward / Forward Compatibility Direction

The manifest should support controlled evolution through:

- explicit format versioning
- optional extension declarations
- graceful ignore rules for unknown optional fields
- compatibility rules for unsupported required extensions

PRD should grow without becoming impossible to parse.

---

# 17. Recommended Conceptual Manifest Skeleton

A conceptual structure might look like:

- `header`
- `identity`
- `metadata`
- `profile`
- `structure`
- `resources`
- `view`
- `extensions`
- `protection`
- `compatibility`

This is not the final syntax.
It is the correct mental model.

---

# 18. What Not to Do

Do not let the manifest become:

- a random metadata blob
- a dumping ground for every feature
- a full inlined document body without discipline
- a hidden extension maze
- viewer-specific junk
- crypto-everything clutter in v1

That would kill the format.

---

# 19. Summary

The PRD manifest should be:

- canonical
- versioned
- profile-aware
- structured
- validateable
- extensible
- and disciplined enough to support the full ecosystem without turning the format into spaghetti.
