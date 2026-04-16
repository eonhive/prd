# PRD Release Policy

This document defines the current npm release posture for the PRD reference tooling workspace.

---

## 1. Current Release Baseline

The first public npm release is a **`0.1.0` public preview**.

It is a real public release, but it should be read as **pre-1.0 tooling** rather than a claim that the format or tooling surface is permanently stable.

The release channel is:

- npm `latest`

The public preview package set is limited to:

- `@eonhive/prd-types`
- `@eonhive/prd-validator`
- `@eonhive/prd-packager`
- `@eonhive/prd-cli`

The following workspace packages stay private:

- `@eonhive/prd-viewer-core`
- `@eonhive/prd-web-viewer`
- the repo root workspace

---

## 2. Versioning Expectations

Until PRD reaches `1.0.0`:

- semver is still used
- breaking changes may still occur across minor releases
- release notes and install guidance should clearly frame the tooling as pre-1.0

Internal dependency order remains:

1. `@eonhive/prd-types`
2. `@eonhive/prd-validator`
3. `@eonhive/prd-packager`
4. `@eonhive/prd-cli`

Changesets is the release source of truth for version planning and publish orchestration.

---

## 3. Release Source Of Truth

Releases publish from:

- the `main` branch
- GitHub Actions release automation

Releases do **not** publish from:

- ad hoc local machines
- arbitrary feature branches
- Codex sessions running outside the release workflow

Local development may still use older Node versions for non-release work, but the supported release environment is:

- **Node.js 20+**
- the repo root `.nvmrc` pins the current release floor to Node 20

CI currently uses Node 20 for release and validation flows so the publish gate runs against the declared floor, not a higher accidental target.

---

## 4. Publish Gate

No public npm publish is allowed unless all of these are green in CI on Node 20+:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm examples:validate`
- `pnpm examples:smoke` (canonical aggregate smoke command)
- tarball smoke tests for all four public packages
- release workflow itself is healthy
- install and release docs match the shipped package names and commands

For CI annotation/reporting, smoke-capable release/check jobs should run:

- `pnpm examples:smoke -- --json-summary`

`--json-summary` is a supported smoke option intended for machine-readable CI summaries/artifacts.

The first publish happens only after this release-hardening baseline is merged and the release workflow is ready to publish the current unpublished `0.1.0` packages.

For the one-time `0.1.0` public preview, the Release workflow first checks npm for the current preview package versions and publishes any still-unpublished preview packages directly in dependency order before falling through to normal Changesets automation.
