# PRD Release Policy

This document defines the current npm release posture for the PRD reference tooling workspace.

---

## 1. Current Release Baseline

The public npm preview line starts at **`0.1.0`**.

It is a real public release, but it should be read as **pre-1.0 tooling** rather than a claim that the format or tooling surface is permanently stable.

The initial `0.1.0` publish leaked `workspace:*` internal dependencies in some published package manifests. The corrective **`0.1.1`** patch is now the clean public preview baseline:

- `0.1.1` is live on npm `latest`
- broken `0.1.0` versions are deprecated with upgrade guidance
- post-publish registry audit passes
- post-publish npm consumer smoke passes

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

Detailed policy for separating PRD format versions, manifest versions, runtime contract versions, and npm package versions lives in `docs/core/PRD_VERSIONING_POLICY.md`.

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

After the coordinated first-preview/corrective baseline, public package versions are independent. The current Changesets configuration has no fixed or linked release group. For example, a CLI-only minor release can target `@eonhive/prd-cli@0.2.0` while unchanged libraries remain at `0.1.1`; this is an illustrative version plan, not a statement that the release is published. Do not bump unrelated packages solely to satisfy a gate's former one-version assumption.

Preflight and registry audit retain the exact four-package boundary. They accept stable post-preview versions per package, reject malformed/unconfigured prerelease versions and mixed first-preview/post-preview sets, and keep npm auth/org and consumer-safe metadata requirements unchanged. Registry audit verifies each expected version and each package's own `latest` tag, not one shared toolchain version. Changesets and declared dependency ranges determine necessary dependent updates; external consumer smoke still proves the installed combination works.

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
- the repo root `.nvmrc` pins local release work to Node 22

CI release validation currently runs on Node 22, and post-publish consumer smoke runs on Node 20 to verify the declared package floor.

---

## 4. Publish Gate

No public npm release is treated as complete unless all of these are green in CI on Node 20+:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm examples:validate`
- `pnpm examples:smoke` (canonical aggregate smoke command)
- tarball smoke tests for all four public packages
- release publish preflight passes with a valid npm token and verified `eonhive` org access
- release workflow itself is healthy
- post-publish registry audit confirms npm metadata is consumer-safe (no `workspace:*` dependency values in published manifests)
- post-publish consumer smoke passes against npm-installed packages
- install and release docs match the shipped package names and commands

For CI annotation/reporting, smoke-capable release/check jobs should run:

- `pnpm examples:smoke -- --json-summary`

`--json-summary` is a supported smoke option intended for machine-readable CI summaries/artifacts.

The first-preview bootstrap path has already been used for the initial `0.1.0` publication. For the one-time `0.1.0` public preview, the Release workflow first runs `pnpm release:preflight`, then checks npm for the current preview package versions and publishes any still-unpublished preview packages directly in dependency order before falling through to normal Changesets automation.

After `0.1.0` exists on npm, normal Changesets release flow remains the source of truth for `0.1.1+`. The post-publish verification lane then must run `pnpm release:audit:registry` before the external npm consumer smoke path is treated as authoritative.

### Authoring consumer verification

`release:check` also runs the external consumer flow against the four locally
packed tarballs with authoring required, independently of their current version.
It creates starters for all three profiles, imports Markdown with a local image,
and imports naturally ordered images for both comic and storyboard. Each output
is validated, inspected, packed, then validated and inspected as an archive.
Checks verify JSON success/profile/source facts and imported source bytes/order.

Post-publish consumer smoke automatically requires these authoring scenarios when
the checked-out CLI manifest targets stable `0.2.0` or later, the first planned
authoring release. It does not infer support from help text or skip a failing
command. The existing `0.1.x` published baseline retains the six original
installation/pack/validate/inspect checks. The summary's additive
`authoringRequired` field distinguishes the two modes; malformed expected CLI
versions and preparation failures produce failed summaries.

The tarball summary is
`examples/dist/release-authoring-consumer-smoke-summary.json`; the existing npm
summary path and `prd-external-consumer-smoke-v0.1` contract remain unchanged.
Tarball checks establish release-candidate compatibility, not npm availability.
Actual publication still requires the CI credential gates, version PR review,
registry audit and successful authoring consumer checks against npm packages.
