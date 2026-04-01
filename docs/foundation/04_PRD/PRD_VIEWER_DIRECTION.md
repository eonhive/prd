# PRD_VIEWER_DIRECTION

**Project:** PRD
**Version:** 0.1
**Status:** Viewer Direction Draft
**Last Updated:** 2026-03-31

---

# 1. Purpose

This document defines the direction for the PRD Viewer.

The viewer is one of the most important adoption surfaces for PRD, but it must not be confused with the full definition of the format.

PRD is bigger than the viewer.
Still, the viewer is where users will judge whether PRD actually feels better than static formats.

---

# 2. Viewer Mission

The PRD Viewer should make PRD documents feel:

* portable
* responsive
* elegant
* structured
* readable
* profile-aware
* modern

It should prove the value of PRD in actual use.

---

# 3. Viewer Responsibilities

The viewer should be responsible for:

* opening PRD packages
* reading the manifest
* resolving structure/resources
* rendering profile-aware content
* adapting for screen size/context
* supporting navigation
* handling supported extensions
* surfacing metadata and document info
* supporting future transformation or helper features

---

# 4. Core Viewer Principles

## 4.1 Format-aware, not format-owning

The viewer interprets PRD.
It is not the definition of PRD.

## 4.2 Profile-aware

The viewer must know that a comic is not a general document and a storyboard is not a comic.

## 4.3 Responsive

The viewer must adapt intelligently to device size and context.

## 4.4 Portable-feeling

The user should still feel like they opened a document, not a random app.

## 4.5 Readability first

Fancy behavior must never destroy readability.

---

# 5. Main Viewer Modes

A PRD viewer should likely support multiple presentation modes over time.

## 5.1 Responsive Reading Mode

The main adaptive reading mode.

Best for:

* general documents such as articles, essays, manuals, resumes, and reports
* mobile viewing

## 5.2 Paginated / Print-Aware Mode

Useful when layout fidelity or print-friendly behavior matters.

Best for:

* reports
* some portfolios
* print outputs
* certain archival or export contexts

## 5.3 Profile-Specific Mode

Needed where the profile demands specialized presentation.

Examples:

* comic reading mode
* storyboard browsing mode
* magazine issue mode

These should still derive from the shared PRD system, not custom chaos.

---

# 6. Navigation Direction

The viewer should support:

* section navigation
* document outline
* profile-aware navigation
* page/board/panel navigation where relevant
* cover/start entry
* search later
* history/bookmarks later

Navigation behavior should be driven by structured content, not only flat page indexes.

---

# 7. Metadata Surface Direction

The viewer should expose useful metadata such as:

* title
* author/publisher
* profile type
* language
* summary/description
* version info where relevant
* cover/thumbnail

This helps PRD feel like a serious document ecosystem.

---

# 8. Profile-Specific Viewer Expectations

## Standard Document

Focus on clean section flow, readability, and responsive adaptation.

## Resume

Focus on structure clarity, fast scanning, and polished portability.

## Comic

Focus on:

* reading order
* panel/page clarity
* speech text readability
* responsive adaptation without sequence confusion

## Storyboard

Focus on:

* board/shot navigation
* sequence structure
* frame readability
* notes/dialogue/context display

These are especially important because comics and storyboards are first-class PRD profiles.

---

# 9. Import / Conversion UX Direction

Over time, the viewer may also support opening or importing non-PRD documents.

Possible behavior later:

* warn that file is not PRD-native
* offer conversion/open-as-PRD flow
* explain what may change
* reopen using PRD rendering

This is useful, but it should not distract from core native PRD support first.

---

# 10. Extension Handling Direction

The viewer should gracefully handle:

* supported extensions
* unsupported optional extensions
* unsupported required extensions
* protected/private content boundaries
* encrypted sections where credentials/access exist later

This behavior must be predictable.
Silent failure would be bad.

---

# 11. AI / Helper Direction

Later, the viewer may support features such as:

* summarization
* translation
* alternative reading modes
* structural explanation
* accessibility transforms
* content extraction helpers

These should remain viewer features layered on top of PRD, not the definition of PRD itself.

---

# 12. What Not to Do

Do not make the viewer:

* a random browser for arbitrary app bundles
* overloaded with gimmicks
* dependent on one profile only
* hostile to portability
* so dynamic that documents stop feeling document-like

That would weaken PRD’s identity.

---

# 13. MVP Viewer Recommendation

A realistic first PRD viewer should focus on:

* manifest reading
* structured content loading
* responsive rendering
* basic profile awareness
* navigation
* metadata display
* strong support for general-document + early comic/storyboard direction

That is enough to prove the concept without overbuilding.

---

# 14. Summary

The PRD Viewer should be the place where the promise of PRD becomes obvious:

a portable file that behaves like a modern responsive structured document, without losing document identity.
