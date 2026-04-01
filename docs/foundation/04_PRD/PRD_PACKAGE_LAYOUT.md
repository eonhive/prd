# PRD_PACKAGE_LAYOUT

**Project:** PRD
**Version:** 0.1
**Status:** Working Package Layout Direction
**Last Updated:** 2026-03-31

---

# 1. Purpose

This document defines the recommended package layout direction for PRD.

The goal is to create a package structure that is:

* clear
* portable
* validateable
* profile-friendly
* extensible
* and not chaotic

A good package layout matters because it affects:

* tooling
* conversion
* validation
* viewer implementation
* debugging
* long-term maintainability

---

# 2. Core Direction

A PRD package should likely be a bundled portable package containing:

* manifest
* structured content
* assets/resources
* profile-specific data
* optional extension data
* optional protected/private sections later

The exact file extension can be locked later, but the package structure itself should be intentional.

---

# 3. Design Principles

## 3.1 Predictable

Common files and folders should be where tools expect them.

## 3.2 Clean

Avoid uncontrolled folder sprawl.

## 3.3 Profile-friendly

The layout must support multiple document profiles without becoming fragmented.

## 3.4 Extensible

Advanced features should have clear places to live.

## 3.5 Toolable

Studio tools, validators, converters, and viewers should be able to reason about the layout easily.

---

# 4. Recommended High-Level Package Shape

A conceptual PRD package may look like this:

```text
my-document.prd/
  manifest.json
  content/
  assets/
  profiles/
  extensions/
  protected/
```

This is conceptual.
Exact naming can change, but the separation of concerns is good.

---

# 5. Root-Level Files

## 5.1 `manifest.json`

The canonical source-of-truth manifest.

This should always exist.

## 5.2 Optional lightweight metadata files later

Avoid too many root files early.
The manifest should carry most structural meaning.

---

# 6. `content/` Directory Direction

This directory should contain the structured content model and main content entry files.

Examples:

* root content structure
* section maps
* flow content
* profile-specific content nodes
* block definitions
* navigation maps if needed

This is where the main document body structure should live.

The exact file breakup depends on the final content model.

---

# 7. `assets/` Directory Direction

This directory should contain reusable document assets such as:

* images
* illustrations
* embedded media references
* thumbnails
* cover art
* optional style/theme assets where appropriate

Keep asset references explicit through the manifest/resource map.

Do not rely on random undeclared asset discovery.

---

# 8. `profiles/` Directory Direction

This directory should support profile-specific content or configuration when needed.

Examples:

* comic panel maps
* storyboard board/shot structures
* resume structured sections
* magazine issue layout data

Important:
This should support specialization without splitting the package into unrelated mini-formats.

---

# 9. `extensions/` Directory Direction

This directory should contain declared extension data.

Examples:

* annotation data
* signature data
* live update config
* ownership/license extension data
* future AI transform metadata
* future commerce/payment metadata

Extensions should not be allowed to silently mutate the meaning of the package without manifest declaration.

---

# 10. `protected/` Directory Direction

This directory is for future optional protected/private/encrypted resources or sections.

Examples later:

* encrypted assets
* private metadata blocks
* protected attachment content
* restricted content segments

This should not be required in normal simple PRDs.

But leaving room for it now is smart.

---

# 11. Profile-Aware Layout Behavior

The layout should support both shared structure and profile specialization.

Examples:

## Standard document

Likely heavy use of:

* `manifest.json`
* `content/`
* `assets/`

## Comic

Likely use:

* `manifest.json`
* `content/`
* `assets/`
* `profiles/comic/...`

## Storyboard

Likely use:

* `manifest.json`
* `content/`
* `assets/`
* `profiles/storyboard/...`

That balance is correct.

---

# 12. Validation Expectations

A validator should be able to confirm:

* manifest exists
* entry paths resolve
* profile files align with declared profile
* required content structure exists
* all declared assets are present
* extension references are valid
* protected blocks are structurally valid even if not readable without authorization

---

# 13. Compression / Packaging Direction

The PRD package may eventually be:

* a directory structure in development mode
* and a compressed packaged artifact for distribution

This is a sane path because it supports:

* authoring/debugging
* packaging/export
* portability

The packaged form should preserve deterministic structure.

---

# 14. What Not to Do

Do not allow:

* totally arbitrary file trees
* undocumented scripts everywhere
* profile-specific chaos with no shared base
* extension files with hidden behavior
* viewer-specific junk mixed into the root
* asset dumping with no manifest control

That would destroy the ecosystem fast.

---

# 15. Summary

The PRD package layout should be:

* predictable
* structured
* manifest-centered
* profile-aware
* extension-ready
* and clean enough for serious tooling and long-term compatibility.
