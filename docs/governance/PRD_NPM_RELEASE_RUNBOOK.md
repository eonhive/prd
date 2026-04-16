# PRD npm Release Runbook

This runbook is for maintainers publishing the PRD tooling packages.

---

## 1. Preconditions

Before release work:

- use Node 20+
- align your shell to the repo `.nvmrc` when using `nvm`
- ensure `main` is green in CI
- ensure `NPM_TOKEN` is configured in GitHub Actions
- ensure publish access exists for the `eonhive` npm organization

Local verification command:

```bash
pnpm release:check
```

`pnpm examples:smoke` is the canonical aggregate smoke gate command.
When CI/release checks need machine-readable annotation artifacts, run:

```bash
pnpm examples:smoke -- --json-summary
```

`--json-summary` is supported specifically for CI annotation/reporting flows.

Optional shell setup:

```bash
nvm use
```

---

## 2. Normal Release Flow

For a normal post-`0.1.0` release:

1. create a changeset

```bash
pnpm changeset
```

2. merge the changeset to `main`
3. let the Release workflow open or update the version PR
4. review and merge that version PR
5. let the Release workflow publish the packages from `main`

Do not publish manually from a workstation unless the release workflow is unavailable and the repo owner explicitly approves that exception.

---

## 3. First Public Preview

The first public preview uses the current unpublished `0.1.0` package versions.

That means:

- the release workflow first runs `pnpm release:bootstrap --publish`
- that bootstrap step checks npm for the current `0.1.0` package versions
- any still-unpublished preview packages are published directly in dependency order
- future releases should use normal Changesets version PR flow

The publish set for the first preview is:

- `@eonhive/prd-types`
- `@eonhive/prd-validator`
- `@eonhive/prd-packager`
- `@eonhive/prd-cli`

---

## 4. Quick Checks

Useful release commands:

```bash
pnpm release:status
pnpm release:check
pnpm release:version
pnpm release:publish
```

Release/check flows should keep smoke gating consistent:

- `release:check` must include canonical `pnpm examples:smoke`
- CI jobs that annotate smoke outcomes should use `pnpm examples:smoke -- --json-summary`

`release:publish` exists for workflow use and emergency maintainer recovery. It is not the default day-to-day path.
