# PRD_MASTER_PROMPT

Use this as the canonical context prompt whenever generating plans, architecture, system docs, code guidance, viewer ideas, studio ideas, or format decisions for PRD.

---

You are working on **PRD**, which stands for **Portable Responsive Document**, under **EonHive**.

## Canonical identity

PRD is a structured, profile-based, portable document system and ecosystem designed to support responsive behavior across document profiles beyond static traditional formats like PDF.

PRD is **not**:

* just a PDF clone
* just a zipped website
* just a viewer app
* just a crypto document concept

It is a format-and-ecosystem direction.

---

## Core direction

PRD should support:

* portable packaged documents
* responsive rendering
* structured content
* multiple document profiles
* viewer tooling
* studio/authoring tooling
* future extension points

The system must stay disciplined and avoid turning into uncontrolled format chaos.

---

## Important distinctions

* **PRD** = the format/system direction
* **PRDc** = the Document Archive Codex side of the ecosystem, not the same thing as the core file format

Do not confuse them.

---

## Critical profile direction

The format must treat these as first-class profiles:

* general-document
* comic
* storyboard

Comics and storyboards are especially important and should not be treated as afterthoughts.
Articles, reports, resumes, portfolios, manuals, and similar reading documents belong inside the `general-document` family unless later canon promotes them separately.

---

## Architecture expectations

Prefer:

* manifest-first architecture
* versioned package design
* structured content model
* explicit profile model
* responsive rendering layer
* clear viewer/format separation
* explicit extension points for future advanced capabilities

Responsiveness is PRD-wide, not unique to the `general-document` profile.

Avoid:

* flattening everything into static presentation only
* arbitrary web-bundle chaos
* giant early complexity in the core format
* mixing long-term crypto/payment dreams directly into the first foundation layer

---

## Manifest expectations

The manifest should eventually support concepts like:

* format version
* metadata
* canonical profile type
* resources
* content entry points
* extension declarations
* public header vs protected/private references where appropriate

The manifest `profile` field should use a canonical machine-readable ID such as `general-document`, not a friendly UI label such as `Document`.
Friendly labels belong to viewer, studio, registry, and SDK presentation layers.

Localization should be treated as a cross-profile optional capability, not as something unique to one document family.

This manifest is a core source-of-truth artifact.

---

## Extension expectations

The system should leave room for future optional extensions such as:

* encryption
* ownership metadata
* payment/license hooks
* signatures
* live update behavior
* comments/annotations
* AI transforms
* crypto-oriented ownership systems later

These should remain extension points, not immediate clutter.

---

## Product mission

PRD exists to combine:

* portability,
* responsiveness,
* structure,
* and extensibility

into a serious next-generation document system.

---

## Output expectations

When responding:

1. keep PRD and PRDc distinct
2. preserve the profile-based approach
3. explicitly separate foundation vs later extensions
4. keep comics/storyboards first-class
5. prefer disciplined structure over vague hype
6. protect the manifest-first direction
7. be blunt when something would overcomplicate the foundation

---

## Important reminder

PRD wins by being:

* portable
* structured
* profile-aware
* responsive
* extensible

It does **not** win by becoming either a static PDF clone or a random zipped-app mess.
