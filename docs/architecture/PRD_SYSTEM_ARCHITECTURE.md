# PRD_SYSTEM_ARCHITECTURE.md
_Last updated: April 1, 2026_  
_Status: Canonical architecture draft v0.1_

## 1. Purpose

This document defines the current PRD system architecture baseline from the canonical PRD docs.

It separates:

- PRD Core
- the PRD Reference Stack
- the PRD Ecosystem Stack
- the boundaries between standard, reference implementation, and optional product/service layers

This is an architecture document, not a market document.

Current source-of-truth is still incomplete for some product-boundary details. Those areas are labeled explicitly as assumptions instead of being presented as closed architecture.

---

## 2. Architecture Shape

PRD architecture should be read as a layered system:

```text
Control Docs
    ↓
PRD Core
    ↓
PRD Reference Stack
    ↓
PRD Ecosystem Stack
```

Lower layers must remain usable without upper layers.

Core PRD must not depend on Studio, Cloud, PRDc, payment systems, wallets, or other unfinished ecosystem services.

---

## 3. PRD Core

PRD Core is the standard-defining layer. It describes what a PRD is, how a PRD package is identified, how it is interpreted, and where optional extensions may attach.

Responsiveness is a cross-profile architecture rule in PRD Core. Profiles define document families such as `general-document`, `comic`, and `storyboard`; they do not own responsiveness as a special feature.
Canonical profile IDs are machine-facing declarations in the manifest. Friendly profile labels belong to registries, SDKs, validators, and product UI.

### 3.1 Core sublayers

| Core sublayer | Responsibility |
| --- | --- |
| Content layer | carries the actual document content such as text, images, panels, scenes, notes, and media blocks |
| Structure layer | defines the semantic organization of units such as sections, chapters, panels, scenes, and relationships |
| Layout layer | defines responsive display behavior, reading modes, breakpoints, flow rules, and print/export constraints |
| Manifest layer | defines identity, versioning, profile, entry points, assets, compatibility, and extension declarations |
| Asset layer | defines packaged, embedded, linked, or externally resolved resources and their portability constraints |
| Protection/access layer | defines optional protected/private, access, signature, entitlement, rights, and payment attachment points |
| Runtime/render contract | defines the behavior a renderer/viewer must interpret from the package, profile, and capabilities |

### 3.2 Core responsibilities

PRD Core must define:

- package identity and version surfaces
- responsive-first behavior as a cross-profile rule
- locale-aware behavior as an optional cross-profile capability
- profile identity
- canonical profile ID governance and registry translation rules
- primary entry resolution
- public-header versus protected/private separation
- extension declaration points
- graceful degradation expectations
- portability rules for base packages

PRD Core must not define:

- Studio workflows
- Cloud service behavior
- PRDc archive product behavior
- proprietary business logic
- mandatory crypto, ownership, or payment infrastructure

---

## 4. PRD Reference Stack

The PRD Reference Stack proves that PRD Core is implementable.

It should contain the minimal shared implementation surfaces needed to validate and demonstrate the standard:

- reference packer/unpacker behavior
- validator rules
- conformance checks
- reference viewer
- reference rendering behavior
- profile samples and fixtures

The Reference Stack is not the same thing as the product ecosystem.

### 4.1 Reference Stack responsibilities

| Component | Responsibility |
| --- | --- |
| Reference packer | assembles valid PRD packages from known inputs |
| Validator | checks package validity against core rules and later spec rules |
| Reference viewer | opens a valid PRD through the minimal supported reading path |
| Reference renderer | interprets profile, structure, layout, and assets according to reference behavior |
| Conformance fixtures | provide known-good and known-bad packages for testing |

The Reference Stack may be simple. It exists to remove ambiguity, not to maximize product polish.

---

## 5. PRD Ecosystem Stack

The PRD Ecosystem Stack contains optional tools, services, runtimes, and archive systems built around PRD.

These layers may depend on PRD Core and may reuse the Reference Stack, but they must not redefine package validity.

### 5.1 Ecosystem components

| Component | Current architectural role |
| --- | --- |
| PRDc | archive/codex layer for indexing, organizing, and operating over PRD documents and related assets |
| Studio | authoring, editing, preview, validation, and export surface |
| Viewer | end-user reading/viewing application surface beyond the minimal reference viewer |
| Cloud | optional hosting, sync, publishing, collaboration, distribution, and entitlement service layer |
| SDK | developer libraries and tools for creating, validating, converting, or consuming PRD |
| Renderer implementations | platform-specific or performance-specific engines that interpret PRD packages |

### 5.2 Ecosystem rules

- Ecosystem systems may add convenience, scale, discovery, sync, and premium behavior.
- Ecosystem systems must not become hard dependencies for opening a minimal valid PRD.
- Ecosystem systems may use private infrastructure, but that does not change the public PRD package contract.

---

## 6. Layer Boundaries

The architecture boundary rules are:

1. Control docs govern architecture truth.
2. PRD Core governs file, manifest, profile, extension, and portability rules.
3. The Reference Stack proves Core behavior but does not create new hidden standards.
4. The Ecosystem Stack consumes PRD; it does not redefine PRD.
5. Public-header data must stay outside protected/private zones.
6. Protected/private behavior must remain optional and layered.
7. Advanced extension behavior must degrade gracefully when unsupported.

Operational consequence:

- a valid PRD package remains valid even when PRDc, Studio, Cloud, or premium services do not exist
- a product bug in Viewer, Studio, or Cloud does not change the core PRD spec
- a new extension does not get to backdoor a breaking core dependency

---

## 7. Responsibilities By Layer

| Layer | Owns | Must not own |
| --- | --- | --- |
| PRD Core | package contract, manifest contract, profile contract, extension seams, public/protected split | product UX, hosting policy, commercial service logic |
| PRD Reference Stack | validation, conformance, minimal opening/render path, fixtures | product lock-in, proprietary-only behavior, service dependencies |
| PRD Ecosystem Stack | authoring, archive, sync, discovery, advanced viewers, developer tooling, scaled runtime implementations | changing what counts as a valid PRD package |

---

## 8. Data Flow

The canonical PRD data flow is:

1. Content and assets are authored or assembled.
2. A packer or authoring tool builds a PRD package from content, structure, manifest data, and optional assets.
3. The package is emitted as a `.prd` archive for transport.
4. A validator may verify package correctness before distribution or opening.
5. A viewer opens the package, reads the public header, resolves the profile and entry path, and hands the content to a renderer.
6. The renderer interprets structure, layout, assets, and profile behavior to produce visible output.
7. Optional ecosystem systems such as PRDc or Cloud may index, store, sync, distribute, or analyze the package without changing the base package contract.

### 8.1 Minimal open path

The minimal open path is:

```text
.prd package
  → manifest public header
  → profile + entry resolution
  → renderer/viewer interpretation
  → readable output
```

This path must work without Cloud, PRDc, payments, or crypto.

---

## 9. Trust Flow

The canonical PRD trust flow is:

1. Control docs define the allowed architecture and accepted decisions.
2. A PRD package exposes the public metadata needed to identify and open it safely.
3. Version, profile, and extension declarations tell a validator or viewer what contract is being claimed. Canonical profile IDs, not friendly labels, are the contract surface.
4. A validator or viewer checks package shape, required metadata, and entry resolution.
5. Optional protected/private, rights, signature, or payment extensions are evaluated only if declared and supported.
6. Unsupported optional features fall back without destroying base readability whenever possible.

Trust must begin from the public/header zone. Protected/private material may extend trust, but it must not replace the minimum interoperable opening path.

---

## 10. Extension Seams

PRD must remain extension-ready through explicit seams rather than hidden assumptions.

Current extension seams are:

- profile-specific behavior
- manifest extension declarations
- asset and attachment strategies
- protected/private layering
- rights metadata
- payment hooks
- signature and verification layers
- optional crypto-linked features
- future capability negotiation
- future collection/series and large-content behavior

Rules for extension seams:

- they must be declared, not implied
- they must not bloat the minimal valid PRD
- they must not force ecosystem dependencies into simple documents
- they should preserve graceful degradation where possible

---

## 11. Public Vs Protected/Private Zones

PRD architecture uses a two-zone model.

### 11.1 Public/header zone

The public/header zone holds the minimum interoperable information required to identify and open the document safely.

It should contain items such as:

- format/spec version
- manifest version
- profile
- title
- package identity
- entry points
- declared extensions
- compatibility requirements
- small locale declarations when present
- visible reader-facing metadata

### 11.2 Protected/private zone

The protected/private zone is optional.

It may contain:

- encrypted metadata
- premium or access-controlled content
- private author or owner data
- signatures
- rights metadata
- payment or entitlement material
- private references

### 11.3 Zone boundary rule

- The public/header zone must remain sufficient to identify and open the base package.
- Required metadata must not exist only in protected/private material.
- Protected/private behavior must layer on top of the public/header path, not replace it.

---

## 12. Relation To PRDc, Viewer, Studio, Cloud, SDK, Renderer

### 12.1 PRDc

PRDc is the Document Archive Codex role in the broader ecosystem. It is not the base PRD format.

Architecturally, PRDc sits in the Ecosystem Stack and operates on PRD packages for archive, indexing, discovery, and codex behavior.

### 12.2 Viewer

Viewer is the runtime application surface that opens PRD documents.

Architecturally:

- the minimal reference viewer belongs to the Reference Stack
- full viewer applications belong to the Ecosystem Stack

Viewer behavior must consume PRD Core rules rather than redefine them.

### 12.3 Studio

Studio is the authoring/editing surface for creating, previewing, validating, and exporting PRD documents.

Studio belongs to the Ecosystem Stack. It may use validators, packers, renderers, and SDKs, but it does not define the standard.

### 12.4 Cloud

Cloud is the optional service layer for sync, hosting, publishing, distribution, collaboration, and entitlement operations.

Cloud belongs to the Ecosystem Stack and must not be a hard dependency for minimal PRD readability.

### 12.5 SDK

SDK provides developer-facing libraries and tools for producing or consuming PRD.

Assumption:

- core conformance-oriented SDK pieces may align closely with the Reference Stack
- broader automation, integration, and product SDK surfaces belong to the Ecosystem Stack

This assumption is used because exact SDK boundary details are still pending in the canon.

### 12.6 Renderer

Renderer is the engine that interprets PRD structure, layout, profile behavior, and assets into visible or printable output.

Architecturally:

- the render contract belongs to PRD Core
- reference rendering behavior belongs to the Reference Stack
- concrete renderer implementations may exist in the Ecosystem Stack

This split keeps rendering rules part of the standard while allowing multiple runtime implementations.

---

## 13. Assumptions And Required Follow-on Docs

### 13.1 Assumptions

- The current source-of-truth is incomplete for the exact PRD / PRDc / Studio / Viewer / Cloud / SDK / Renderer boundary map.
- This document therefore treats PRDc, Studio, Viewer, Cloud, SDK, and Renderer as ecosystem-facing roles around PRD, while keeping PRDc specifically anchored to archive/codex behavior.
- SDK and Renderer are described as cross-cutting between Core, Reference Stack, and Ecosystem Stack because the canon has not fully closed those boundaries yet.

### 13.2 Required follow-on docs

The current canon should still be extended with:

- `product/PRD_PRODUCT_BOUNDARIES.md`
- `runtime/PRD_CAPABILITY_MODEL.md`
- `runtime/PRD_CONFORMANCE.md`
- `extensions/PRD_PROTECTION_MODEL.md`
- `core/PRD_VERSIONING_POLICY.md`

Until those docs exist, this architecture document should be treated as the current canonical baseline, not the final closed boundary map.
