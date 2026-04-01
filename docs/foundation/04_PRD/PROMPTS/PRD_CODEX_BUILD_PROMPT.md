# PRD_CODEX_BUILD_PROMPT

Use this prompt when you want Codex to start implementing PRD in a disciplined, foundation-first way.

---

You are implementing **PRD**, which stands for **Portable Responsive Document**, under **EonHive**.

## Canonical identity

PRD is a structured, profile-based, portable document system and ecosystem.

It is designed to support:

* portable packaged documents
* responsive rendering
* structured content
* multiple first-class document profiles
* viewer tooling
* studio/authoring tooling
* future extensions

Do not reduce PRD to:

* just a PDF clone
* just a zipped website
* just a viewer app
* just a crypto document idea

---

## Important distinction

* **PRD** = the format/system direction
* **PRDc** = the Document Archive Codex side of the ecosystem

Do not confuse them.

---

## Critical design rules

1. manifest-first
2. profile-based
3. structured, not flattened
4. portable first
5. extensible without corruption
6. viewer and format are related but distinct

---

## First-class profiles

Treat these as canonical first-class profiles:

* general-document
* comic
* storyboard

Comics and storyboards are especially important and must not be treated as afterthoughts.
Articles, reports, resumes, portfolios, manuals, and similar reading documents belong inside the `general-document` family unless later canon promotes them separately.

---

## Architecture expectations

Prefer a clean layered system such as:

* package layer
* manifest layer
* content model layer
* profile layer
* rendering layer
* viewer layer
* studio/authoring layer
* extension layer

Avoid:

* arbitrary bundle chaos
* giant premature extension complexity
* flattening everything into static layout only
* overloading the core with long-term crypto/payment ideas too early

---

## Manifest expectations

The manifest should be treated as the canonical structural source-of-truth.

It should eventually support concepts like:

* format version
* document identity
* metadata
* profile declaration
* content entry points
* resource map
* rendering/view hints
* extension declarations
* optional public vs protected/private references

The manifest must remain disciplined and validateable.

---

## Package layout expectations

A development/package direction should support a structure conceptually similar to:

```text
document.prd/
  manifest.json
  content/
  assets/
  profiles/
  extensions/
  protected/
```

This can evolve, but the separation of concerns should remain clean.

---

## Viewer expectations

The viewer should:

* read the manifest
* load structured content
* render responsively
* respect profile-specific behavior
* support navigation
* preserve document identity
* remain readable and elegant

Do not make the viewer into a random arbitrary app runtime.

---

## MVP direction

The first practical implementation should focus on:

* manifest schema direction
* package layout conventions
* content model starter
* profile model starter
* viewer proof-of-concept
* strong handling for a small set of profiles first

A realistic early profile set for implementation focus may be:

* general-document
* comic
* storyboard

That is strong enough to prove the system.

Responsiveness is PRD-wide, not unique to the `general-document` profile.

---

## Constraints

* be blunt about overcomplication
* preserve extension points without implementing all of them immediately
* keep PRD and PRDc distinct
* protect the manifest-first direction
* avoid format drift
* prefer implementation-ready structure over hype

---

## Output expectations

When implementing:

1. list the files/modules you plan to create or modify
2. keep naming aligned with canonical PRD docs
3. separate foundation vs future extension work
4. call out assumptions and tradeoffs
5. do not invent random parallel terminology
6. favor strong validation and clean structure

---

## Important reminder

PRD wins by being:

* portable
* responsive
* structured
* profile-aware
* extensible
* disciplined

It does **not** win by becoming either a static PDF clone or an undisciplined zipped web mess.
