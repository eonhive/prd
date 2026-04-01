# PRD_DECISIONS.md
_Last updated: April 1, 2026_  
_Status: Working decision log v0.1_

## Purpose
This file records major PRD decisions, current leanings, and explicit design directions so future work stays consistent.

Use this as a decision ledger.  
When a decision changes, do not silently overwrite history. Add a new entry or mark the prior one as superseded.

---

## Decision Format
Each decision uses:

- **ID**
- **Title**
- **Status**
- **Decision**
- **Why**
- **Implication**
- **Follow-up**

---

## PRD-001 — Canonical source-of-truth markdown is required
**Status:** Accepted

**Decision:**  
PRD work should be grounded in a canonical markdown foundation/architecture/structure document that future master prompts read before generating additional PRD materials.

**Why:**  
Without a source-of-truth file, the project risks drift, contradictions, and loss of important context over time.

**Implication:**  
PRD should maintain a small set of core markdown control files such as:
- foundation/PRD_FOUNDATION.md
- decisions/PRD_DECISIONS.md
- foundation/PRD_GLOSSARY.md
- foundation/PRD_ROADMAP.md

**Follow-up:**  
Expand these files and keep them versioned.

---

## PRD-002 — PRD is more than a file extension
**Status:** Accepted

**Decision:**  
PRD should be treated as a broader document system/ecosystem, not merely a single file type.

**Why:**  
The project direction includes format/spec, rendering, tooling, archive/codex use, and possible cloud/service layers.

**Implication:**  
Architecture must separate the core format from product/platform layers.

**Follow-up:**  
Define boundaries between format, runtime, authoring tools, and services.

---

## PRD-003 — PRD should beat PDF on modern strengths
**Status:** Accepted

**Decision:**  
PRD should aim to outperform PDF where PDF is weakest, especially in responsiveness, structure, extensibility, and modern reading/publishing behavior.

**Why:**  
Trying to replace PDF by copying PDF is pointless. PRD needs a clear strategic advantage.

**Implication:**  
PRD should not be built as page-snapshot-first architecture.

**Follow-up:**  
Define profile-based render and layout behaviors.

---

## PRD-004 — Responsive-first over page-first
**Status:** Accepted

**Decision:**  
PRD should be responsive-first at the system level, even if some profiles or export modes support fixed-page output.

**Why:**  
Modern reading happens across phones, tablets, laptops, desktops, TVs, and possibly embedded viewers.

**Implication:**  
Layout systems and profiles must adapt to viewport and reading mode.

**Follow-up:**  
Define responsive layout rules and fallback print/page behavior.

---

## PRD-005 — Manifest-centered architecture
**Status:** Accepted

**Decision:**  
PRD should use a strong manifest-centered architecture.

**Why:**  
The manifest gives the system a clean way to describe document identity, structure, assets, profile, capabilities, and extension hooks.

**Implication:**  
The manifest becomes one of the core architecture surfaces.

**Follow-up:**  
Define minimal manifest fields vs optional extension fields.

---

## PRD-006 — Public header vs protected/private sections
**Status:** Accepted

**Decision:**  
PRD should support a separation between public interoperable metadata and protected/private content or metadata.

**Why:**  
This balances portability with future premium, private, or secure use cases.

**Implication:**  
The format likely needs optional protected zones or layered wrappers.

**Follow-up:**  
Define how protection/encryption is layered without breaking simple reader compatibility.

---

## PRD-007 — Clear versioning from the start
**Status:** Accepted

**Decision:**  
PRD must have explicit versioning at the beginning of the project.

**Why:**  
Without versioning, growth becomes messy and compatibility becomes fragile.

**Implication:**  
Multiple version surfaces may be needed:
- format/spec version
- manifest version
- profile version
- extension version

**Follow-up:**  
Create a version policy document later.

---

## PRD-008 — Comics are first-class
**Status:** Accepted

**Decision:**  
Comics must be treated as a first-class PRD publishing/document profile.

**Why:**  
This was explicitly requested and strategically broadens PRD beyond plain text documents.

**Implication:**  
PRD cannot assume prose-only structure.

**Follow-up:**  
Define a comic profile with panel-aware layout and reading modes.

---

## PRD-009 — Storyboards are first-class
**Status:** Accepted

**Decision:**  
Storyboards must be treated as a first-class PRD publishing/document profile.

**Why:**  
This was explicitly requested and aligns with production/visual planning workflows.

**Implication:**  
PRD must support shot/scene/image/note relationships.

**Follow-up:**  
Define a storyboard profile with timing/annotation/layout behavior.

---

## PRD-010 — PRD should support simple and large documents
**Status:** Accepted

**Decision:**  
PRD should scale from lightweight documents to large narrative or media-heavy works.

**Why:**  
The project includes questions around novels, comics, and other potentially large formats.

**Implication:**  
Chunking, streaming, modular packaging, and collections may be needed.

**Follow-up:**  
Define package segmentation strategies.

---

## PRD-011 — Attachments must be supported
**Status:** Accepted

**Decision:**  
Attachment support should be designed in early, not bolted on late.

**Why:**  
Attachments affect packaging, portability, file size, security, and workflow.

**Implication:**  
Manifest and asset model must account for them.

**Follow-up:**  
Define attachment classes and embedding/reference rules.

---

## PRD-012 — Crypto/ownership/payment must be optional extensions
**Status:** Accepted

**Decision:**  
Ownership, rights, payment, and future crypto-linked capabilities should be supported through extension-ready architecture, not forced into all PRD files.

**Why:**  
The project wants future ecosystem strength without making the base format bloated or dependent on unfinished systems.

**Implication:**  
Base PRD remains usable without wallet, chain, or token integrations.

**Follow-up:**  
Define extension namespaces/modules later.

---

## PRD-013 — v1 should not depend on full AeonHive/Nectar rollout
**Status:** Accepted

**Decision:**  
PRD v1 should be practical and independent enough to ship without waiting on deeper AeonHive/Nectar infrastructure.

**Why:**  
This reduces risk and keeps the project grounded.

**Implication:**  
Advanced ecosystem features should be staged later.

**Follow-up:**  
Roadmap should clearly split v1 core from future ecosystem phases.

---

## PRD-014 — White paper and foundation/spec are different deliverables
**Status:** Accepted

**Decision:**  
The PRD foundation/spec documents and the PRD white paper should be treated as separate but related deliverables.

**Why:**  
One explains how it works; the other explains why it matters.

**Implication:**  
Do not mix internal architecture truth with pitch-language fluff.

**Follow-up:**  
Create white paper later after the core architecture stabilizes.

---

## PRD-015 — PRD architecture must use wider cross-project history
**Status:** Accepted

**Decision:**  
PRD decisions should be informed by the full relevant discussion history across PRD, EonHive, and AeonHive, not only isolated PRD threads.

**Why:**  
Important future-facing design considerations live across multiple project conversations.

**Implication:**  
PRD design work should remain ecosystem-aware.

**Follow-up:**  
Keep history records and cross-reference major concepts.

---

## PRD-016 — Core format must stay practical
**Status:** Accepted

**Decision:**  
PRD should not become an overengineered monster in its base form.

**Why:**  
A format that solves everything at once usually solves nothing well.

**Implication:**  
Minimal valid PRD should stay small and implementable.

**Follow-up:**  
Define a minimal valid PRD package/spec.

---

## PRD-017 — Format and product family must be separated
**Status:** Accepted

**Decision:**  
PRD format/spec should be conceptually separated from tools/products like Studio, Viewer, Cloud, SDK, and Renderer.

**Why:**  
Mixing core standard design with app-specific behavior causes architecture confusion.

**Implication:**  
Clear layer boundaries are required.

**Follow-up:**  
Create a product boundary map later.

---

## PRD-018 — PRDc means Document Archive Codex
**Status:** Accepted

**Decision:**  
PRDc currently refers to the Document Archive Codex in AeonHive, not unrelated older interpretations.

**Why:**  
This was explicitly clarified in project memory.

**Implication:**  
Naming should stay consistent across future docs.

**Follow-up:**  
Add glossary definitions and product boundary docs.

---

## PRD-019 — Graceful degradation should be preserved
**Status:** Accepted

**Decision:**  
Documents using advanced extensions should still expose useful base behavior whenever possible on simpler viewers.

**Why:**  
This improves portability and long-term resilience.

**Implication:**  
Extension design must avoid all-or-nothing fragility where possible.

**Follow-up:**  
Define capability negotiation later.

---

## PRD-020 — First deliverables should be architecture before hype
**Status:** Accepted

**Decision:**  
The immediate focus should be architecture/foundation/source-of-truth docs before hype-heavy ecosystem storytelling.

**Why:**  
The project needs a hard backbone first.

**Implication:**  
Core docs take priority over visual/marketing docs.

**Follow-up:**  
Next likely docs: manifest draft, package layout draft, profile specs.

---

## PRD-021 — Minimal valid PRD uses `.prd` ZIP transport
**Status:** Accepted

**Decision:**  
The minimal valid PRD defined for Phase 1 uses `.prd` as the transport form, and that transport form is a ZIP archive with `manifest.json` at the archive root.

**Why:**  
This gives PRD a portable single-file package baseline while still allowing an unpacked tree for authoring, inspection, and validation workflows.

**Implication:**  
Minimal viewers can implement one clear opening path. The unpacked tree is informative for tooling, not the normative transport contract.

**Follow-up:**  
Define fuller internal package layout rules later in `core/PRD_PACKAGE_LAYOUT_DRAFT.md`.

---

## PRD-022 — Minimal valid PRD uses one declared primary entry path
**Status:** Accepted

**Decision:**  
The minimal valid PRD must declare exactly one public primary entry path via `manifest.json`. A required spine model is deferred.

**Why:**  
This keeps v1 small and machine-readable while staying compatible with future richer structure and profile-specific sequencing.

**Implication:**  
A small reference viewer can open a minimal PRD without implementing full spine, segmentation, or profile-specific reading-flow logic.

**Follow-up:**  
Define ordered multi-entry reading and spine behavior later in manifest, package-layout, runtime, and profile docs.

---

## PRD-023 — Minimal manifest baseline is fixed before the full schema
**Status:** Accepted

**Decision:**  
The minimal valid PRD spec must freeze a small public manifest baseline with required fields `prdVersion`, `manifestVersion`, `id`, `profile`, `title`, and `entry`. Optional reserved fields may include `profileVersion`, `extensions`, `compatibility`, `assets`, `attachments`, and `protected`.

**Why:**  
Phase 1 needs a concrete manifest baseline without turning the manifest into a dumping ground or pretending the full schema is already done.

**Implication:**  
Later manifest work must extend this baseline rather than silently replace it. The exact schema remains open beyond the minimal field set.

**Follow-up:**  
Keep `PRD-P002` open for exact field constraints, reserved namespaces, invalid forms, and backward-compatibility rules.

---

## PRD-024 — Attachments are reserved-optional in the minimal valid spec
**Status:** Accepted

**Decision:**  
Attachments remain part of PRD direction and are allowed in the minimal package, but the minimal valid PRD does not require attachments or define their full model.

**Why:**  
Attachment support matters, but full classes and behaviors belong in dedicated assets/attachments work rather than the smallest Phase 1 package.

**Implication:**  
A minimal PRD stays lightweight while preserving a clean lane for bundled or linked attachment behavior later.

**Follow-up:**  
Define attachment classes and embedding/reference rules in `core/PRD_ASSETS_AND_ATTACHMENTS.md`.

---

## PRD-025 — PRD allows community profiles without making them canonical automatically
**Status:** Accepted

**Decision:**  
PRD reserves `general-document`, `comic`, and `storyboard` as canonical core profile identifiers. Additional community/custom profiles are allowed if they keep the PRD core package and manifest contract intact and do not present themselves as canonical core profiles without source-of-truth acceptance.

**Why:**  
PRD needs profile-based extensibility without collapsing into profile-name chaos or allowing third parties to redefine the base format by convention.

**Implication:**  
Open-source communities and other third parties may define their own PRD profiles, but interoperability depends on their published profile rules and tool support. Canonical first-class status remains controlled by PRD source-of-truth docs.

**Follow-up:**  
Define profile-governance details in `governance/PRD_PROFILE_REGISTRY.md` and add dedicated specs for canonical core profiles.

---

## PRD-026 — Responsiveness is cross-profile; the general-purpose profile is `general-document`
**Status:** Accepted

**Decision:**  
Responsiveness belongs to PRD as a system-wide architectural principle across all profiles. The general-purpose reading/document profile is named `general-document`, not `responsive-document`.

**Why:**  
The prior naming made a PRD-wide design principle sound like the identity of one top-level profile, which blurred the difference between document family and architectural behavior.

**Implication:**  
Future docs should treat profile names as document-family identifiers. Layout and presentation behavior should remain separate from top-level profile identity unless a later higher-priority spec defines exact field names and rules.

**Follow-up:**  
Update foundation, glossary, roadmap, registry, manifest examples, minimal-package examples, and future profile-spec filenames to use `general-document`. Allow `responsive-document` only as a legacy explanatory alias during transition.

---

## PRD-027 — Manifest profile values are canonical machine IDs; UI labels are separate
**Status:** Accepted

**Decision:**  
The manifest `profile` field uses canonical machine-readable profile identifiers such as `general-document`, `comic`, and `storyboard`. Friendly display labels such as `Document`, `Comic`, and `Storyboard` belong to registries, SDKs, validators, and product UI rather than the base package contract.

**Why:**  
The spec needs stable identifiers for validation and interoperability. Human-facing labels are useful, but they should not replace the machine contract or leak product wording into the manifest.

**Implication:**  
Viewers, Studio, SDKs, and validators may map canonical profile IDs to friendly labels. New packages should emit canonical IDs, not UI labels or legacy aliases. Registry guidance should define label, description, and alias metadata without changing the manifest baseline.

**Follow-up:**  
Update the profile registry, manifest draft, minimal package docs, capability model, architecture docs, and active prompts to distinguish canonical profile IDs from UI labels clearly.

---

## PRD-028 — Localization is a cross-profile optional capability
**Status:** Accepted

**Decision:**  
Localization is a cross-profile PRD capability. A PRD package may declare locale-aware behavior, but localization is optional per package and must not bloat or replace the lean base manifest.

**Why:**  
PRD should be able to adapt not only to viewport and reading mode, but also to language, region, and text-direction context when a package declares that behavior. At the same time, tiny packages must stay lightweight.

**Implication:**  
Locale-aware behavior belongs in a standardizable model that works across `general-document`, `comic`, and `storyboard`. The base manifest may carry small localization declarations, while localized payloads and per-locale resources remain outside the base manifest.

**Follow-up:**  
Add `core/PRD_LOCALIZATION_MODEL.md` and align manifest, capability, and architecture docs with localization as a cross-profile optional capability.

---

## Open Decisions Still Pending

### PRD-P001 — Minimal valid package structure
**Status:** Pending

**Note:**  
Narrowed by PRD-021 and PRD-022. Remaining work includes exact internal layout conventions beyond the root `manifest.json` and the single declared primary entry path.

### PRD-P002 — Exact manifest schema
**Status:** Pending

**Note:**  
Narrowed by PRD-023. Remaining work includes exact field constraints, value syntax, reserved-field structure, invalid examples, and backward-compatibility rules.

### PRD-P003 — Asset embedding vs external linking rules
**Status:** Pending

### PRD-P004 — Encryption/protection model
**Status:** Pending

### PRD-P005 — Exact relation of PRD / PRDc / Studio / Viewer / Cloud / SDK / Renderer
**Status:** Pending

### PRD-P006 — Collection/series model for large works
**Status:** Pending

### PRD-P007 — Viewer capability negotiation model
**Status:** Pending

### PRD-P008 — Rights/payment metadata model
**Status:** Pending
