# PRD_DECISIONS

**Project:** PRD
**Version:** 0.1
**Status:** Active Decision Log
**Last Updated:** 2026-04-01

---

# How to Use This File

This file records accepted and important directional decisions so PRD does not drift across:

* docs
* prompts
* architecture
* viewer plans
* studio plans
* conversion work
* ecosystem strategy

Status values:

* accepted
* provisional
* deferred
* replaced

---

## P-001

**Decision:** PRD stands for Portable Responsive Document.
**Reason:** This is the canonical expansion and core identity of the system.
**Status:** accepted
**Date:** 2026-03-31

---

## P-002

**Decision:** PRD is a format-and-ecosystem direction, not just one viewer app.
**Reason:** The vision includes the packaged format, viewer, studio tools, and surrounding systems.
**Status:** accepted
**Date:** 2026-03-31

---

## P-003

**Decision:** PRD should be profile-based.
**Reason:** Different document categories need specialized behavior without fragmenting the overall foundation.
**Status:** accepted
**Date:** 2026-03-31

---

## P-004

**Decision:** Comics and storyboards are first-class PRD profiles.
**Reason:** They are part of the intended product vision and should not be treated as awkward future hacks.
**Status:** accepted
**Date:** 2026-03-31

---

## P-005

**Decision:** The manifest should be the canonical structural source-of-truth for PRD packages.
**Reason:** A manifest-first design reduces ambiguity and keeps the package model disciplined and extensible.
**Status:** accepted
**Date:** 2026-03-31

---

## P-006

**Decision:** PRD should preserve structure rather than flatten everything into static presentation only.
**Reason:** Structure is necessary for responsiveness, profile behavior, intelligent transforms, and future tooling.
**Status:** accepted
**Date:** 2026-03-31

---

## P-007

**Decision:** PRD must remain portable even while becoming more responsive and extensible.
**Reason:** Portability is one of the core reasons document formats matter.
**Status:** accepted
**Date:** 2026-03-31

---

## P-008

**Decision:** PRDc refers to the Document Archive Codex side of the ecosystem, not the core PRD format itself.
**Reason:** This distinction avoids conceptual confusion.
**Status:** accepted
**Date:** 2026-03-31

---

## P-009

**Decision:** The architecture should leave room for future ownership, payment, encryption, and crypto-related extensions without forcing them into the first foundation layer.
**Reason:** These are important long-term directions, but they should remain extension points rather than clutter the MVP foundation.
**Status:** accepted
**Date:** 2026-03-31

---

## P-010

**Decision:** Viewer logic and format logic should be related but distinct.
**Reason:** PRD should not become trapped inside one viewer implementation.
**Status:** accepted
**Date:** 2026-03-31

---

## P-011

**Decision:** PRD should avoid becoming “just a zipped website.”
**Reason:** The format needs discipline, validation, semantics, and predictable structure.
**Status:** accepted
**Date:** 2026-03-31

---

## P-012

**Decision:** PRD should also avoid becoming a static PDF clone with superficial responsiveness layered on top.
**Reason:** The whole point is to move beyond rigid document behavior while preserving portability.
**Status:** accepted
**Date:** 2026-03-31

---

## P-013

**Decision:** Future extensions should be explicit and version-aware.
**Reason:** This will keep the system extensible without breaking compatibility or causing uncontrolled format drift.
**Status:** accepted
**Date:** 2026-03-31

---

## P-014

**Decision:** The early focus should be on the foundation, manifest model, profile model, and viewer/studio direction rather than premature full ecosystem sprawl.
**Reason:** PRD needs a strong base before it can carry bigger ambitions.
**Status:** accepted
**Date:** 2026-03-31

---

## P-015

**Decision:** Responsiveness is a PRD-wide architectural principle across all profiles, and the general-purpose reading profile is `general-document`.
**Reason:** Responsiveness describes the whole PRD system, not a special privilege of one profile. The core profile name should describe document family rather than a PRD-wide feature.
**Status:** accepted
**Date:** 2026-03-31

---

## P-016

**Decision:** Manifest `profile` values use canonical machine-readable IDs, while friendly labels belong to registry and product UI layers.
**Reason:** The package contract needs stable identifiers for validation and interoperability. Human-facing wording should not replace the machine surface.
**Status:** accepted
**Date:** 2026-04-01

---

## P-017

**Decision:** Localization is a cross-profile optional capability in PRD.
**Reason:** PRD should support locale-aware behavior when declared, but simple packages must remain lightweight and not require multilingual payloads.
**Status:** accepted
**Date:** 2026-04-01
