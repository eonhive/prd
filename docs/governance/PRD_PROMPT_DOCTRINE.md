# PRD_PROMPT_DOCTRINE.md
_Last updated: April 1, 2026_  
_Status: Prompt doctrine draft v0.1_

## 1. Purpose

This document defines how all future PRD prompts must behave.

It governs prompt discipline, source-of-truth handling, and output reliability. It does not define PRD format architecture by itself.

---

## 2. Priority Order

All PRD prompts must use this source-of-truth order when producing or updating PRD work:

1. `docs/foundation/PRD_FOUNDATION.md`
2. `docs/decisions/PRD_DECISIONS.md`
3. `docs/foundation/PRD_GLOSSARY.md`
4. `docs/foundation/PRD_ROADMAP.md`
5. PRD history/archive docs, including `docs/history/PRD_Project_History_Record.md` and `docs/archive/history/*`
6. the specific target doc being updated

If two sources conflict, the higher-priority source wins.

`docs/architecture/PRD_SYSTEM_BLUEPRINT.md`, `docs/prompts/PRD_MASTER_PROMPTS.md`, and prompt-local instructions may guide execution, but they must not override the priority order above.

---

## 3. Mandatory Rules

All PRD prompts must:

- align output to the priority order above before generating new PRD work
- preserve accepted PRD decisions unless the task explicitly revises them
- preserve responsive-first, structured-first, profile-based, extension-ready, and practical v1 direction
- treat comics and storyboards as first-class profiles
- keep ownership, rights, payments, encryption, and crypto as optional extension lanes unless the task is specifically about them
- keep the manifest lean
- preserve public-header vs protected/private thinking
- preserve graceful degradation and portability
- separate format/spec work from product and service layers such as Viewer, Studio, Cloud, SDK, Renderer, and PRDc
- label every assumption explicitly under an `Assumptions` section or block

---

## 4. Incomplete-Doc Handling

If the source-of-truth docs do not fully answer the task, the prompt output must:

- state that the current source-of-truth is incomplete for the requested area
- label assumptions explicitly instead of presenting them as settled architecture
- recommend the exact PRD doc that should be updated or created
- prefer a doc update proposal over silent architecture invention

Incomplete source docs are not permission to improvise canon.

---

## 5. Forbidden Behaviors

PRD prompts must not:

- drift away from the current PRD source-of-truth
- silently invent architecture, schemas, rules, or product boundaries
- let lower-priority docs override higher-priority docs
- let prompt-local wording override accepted PRD decisions
- smuggle product, service, marketplace, or ecosystem behavior into core format/spec work
- present assumption-based output as locked PRD truth
- use hype, pitch language, or vague futurism in place of precise architecture

---

## 6. Compact Final Doctrine Statement

For PRD work, the docs win over prompts. If the docs are incomplete, prompts must mark assumptions, recommend the exact source-of-truth doc update, and avoid silent invention. Output that does not follow this doctrine is not canonical PRD work.
