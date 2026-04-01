# AGENTS.md

## Project identity
PRD = Portable Responsive Document.
PRDc is a separate archive/codex system and must not be confused with the core PRD file format.

## Architectural rules
- Treat the manifest as the canonical structural source of truth.
- Keep PRD profile-based.
- Keep viewer logic and format logic distinct.
- Preserve portability, structure, and responsiveness together.
- Treat comics and storyboards as first-class profiles.
- Keep extensions explicit and version-aware.
- Do not add crypto, payment, ownership, or encryption into the MVP core.
- Avoid turning PRD into either a zipped website or a prettier PDF clone.

## Repo workflow
- Make small, reviewable changes.
- Update docs when schemas or package layout change.
- Add tests for validators, parsers, and example packages.
- Never silently change manifest semantics.
- Never add undeclared resources outside the manifest/resource map.

## Done criteria
- Code compiles.
- Tests pass.
- Example PRD package validates.
- Viewer opens the example package successfully.