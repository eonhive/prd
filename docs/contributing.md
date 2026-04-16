# PRD Contributing Guide

This guide defines the practical contribution flow for the PRD repository.

PRD contributions MUST stay aligned with the canonical docs and current MVP boundaries.

## Canonical source-of-truth order

Before proposing implementation or doc changes, align with these docs in order:

1. `docs/foundation/04_PRD/PRD_FOUNDATION.md`
2. `docs/decisions/PRD_DECISIONS.md`
3. `docs/foundation/04_PRD/PRD_GLOSSARY.md`
4. `docs/foundation/04_PRD/PRD_ROADMAP.md`
5. `docs/history/PRD_Project_History_Record.md`
6. the specific file you are editing

Supporting control docs:

- `docs/architecture/PRD_SYSTEM_BLUEPRINT.md`
- `docs/architecture/PRD_SYSTEM_ARCHITECTURE.md`
- `docs/governance/PRD_PROFILE_REGISTRY.md`
- `docs/governance/PRD_PROMPT_DOCTRINE.md`
- `docs/prompts/PRD_MASTER_PROMPTS.md`

## Contribution constraints (MVP)

Keep the foundation layer disciplined:

- Manifest-first structure
- Profile-based model (`general-document`, `comic`, `storyboard`)
- Viewer/format separation
- Structured content over static flattening
- Explicit extensions instead of hidden behavior

Do not expand core MVP scope unless explicitly requested:

- crypto ownership/payment systems
- full encryption/signature architecture as mandatory core
- live networked behavior as core
- giant script/runtime platforms

## Local workspace setup

Install dependencies and preserve local workspace linking:

```bash
pnpm install
```

Expected outcome:

- install succeeds
- internal dependencies resolve via `workspace:*`
- local package changes are immediately consumable across the monorepo

## Required local MVP gate

Run from repo root:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm examples:smoke
```

Canonical smoke command:

```bash
pnpm examples:smoke
```

Machine-readable smoke summaries for CI annotation/reporting:

```bash
pnpm examples:smoke -- --json-summary
```

Expected outcomes:

- `pnpm typecheck` exits 0
- `pnpm test` exits 0
- `pnpm build` exits 0
- `pnpm examples:smoke` exits 0 after running all current example smoke scripts
- `pnpm examples:smoke -- --json-summary` emits JSON summaries under `examples/dist/smoke-summaries/`

## Changesets and release intent

Add a changeset when your change is intended to affect published package outputs (public API changes, releasable behavior changes, package dependency/version updates).

Do not add a changeset for repository-only non-publishing updates (for example docs-only planning/maintenance).

Release publication is CI-driven from `main`.

When changing release or check flows, keep documentation aligned with canonical smoke gating:

- `pnpm release:check` includes `pnpm examples:smoke`
- CI/release annotation flows may run `pnpm examples:smoke -- --json-summary`

## PR checklist

Before opening a PR, confirm:

- [ ] Canonical docs reviewed and terminology aligned
- [ ] MVP scope boundaries preserved
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] `pnpm examples:smoke` passes
- [ ] Docs updated when behavior/contracts changed
- [ ] `BUILD_STATUS.md` updated with completed work
- [ ] `NEXT_STEPS.md` updated to reflect backlog state

## Suggested small-change strategy

Prefer small, reviewable changes:

1. implement one scoped behavior/doc update
2. add or update tests/guards
3. update docs/contracts immediately
4. run the local MVP gate
5. open PR with explicit scope and non-goals
