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

As rechecked on October 30, 2026, those four packages remain on npm `latest` at `0.1.1`; `@eonhive/prd-converter` is not yet published. The current release-check catalog now includes it for its first Changesets release:

- `@eonhive/prd-types`
- `@eonhive/prd-validator`
- `@eonhive/prd-packager`
- `@eonhive/prd-converter` (repository implementation; publication pending)
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
4. `@eonhive/prd-converter`
5. `@eonhive/prd-cli`

Changesets is the release source of truth for version planning and publish orchestration.

Under PRD-057, public npm versions are independent. Changesets `fixed` and `linked` groups remain empty; changesets and dependency updates determine each package's next version. A tooling release does not force unrelated packages to the same version. Preflight accepts mixed versions, registry audit checks each package's declared version and `latest` tag, and the CI consumer installs exact per-package versions from the release commit. `scripts/release-packages.mjs` is the shared five-package catalog used by these checks and tarball smoke.

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

- **Node.js 22** for release validation/publication
- the repo root `.nvmrc` pins local release work to Node 22

CI release validation runs on Node 22, and post-publish consumer smoke runs on Node 20 for baseline packaging, authoring and Markdown/HTML/image conversion. Optional PDF extraction requires Node 22.13+ and is covered by the separate release/tarball gates; this consumer lane does not claim Node 20 PDF support.

---

## 4. Publish Gate

No public npm release is treated as complete unless these pass in Node 22 release CI, with the separate Node 20 baseline consumer check also green:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm examples:validate`
- `pnpm examples:smoke` (canonical aggregate smoke command)
- tarball smoke tests for all five public packages, including the consumer workflow against local tarballs
- release publish preflight passes with a valid npm token and verified `eonhive` org access
- release workflow itself is healthy
- post-publish registry audit confirms npm metadata is consumer-safe (no `workspace:*` dependency values in published manifests)
- post-publish consumer smoke passes against npm-installed packages
- install and release docs match the shipped package names and commands

For CI annotation/reporting, smoke-capable release/check jobs should run:

- `pnpm examples:smoke -- --json-summary`

`--json-summary` is a supported smoke option intended for machine-readable CI summaries/artifacts.

The one-time four-package bootstrap is complete and removed from current CI. Its historical script remains available for explicitly owner-approved recovery only; new packages, including the converter, use Changesets and never use that bootstrap. Internal release/registry/consumer summary contracts are now independently versioned as `prd-release-publish-preflight-v0.2`, `prd-release-registry-audit-v0.2` and `prd-external-consumer-smoke-v0.2`. The preflight's retained `bootstrapMode` fields report `changesets-versioned`, with both eligibility/required flags false. Public CLI JSON, format, schema and library contracts are unchanged.

The Release workflow is restricted to `main` and serialized without canceling a running publish. It calls the read-only reusable consumer workflow only when [Changesets v1 reports `published == 'true'`](https://github.com/changesets/action/blob/maintenance/v1/README.md#outputs). A successful version-PR update does not trigger published-consumer checks for packages that have not shipped. Verification checks out the release commit, runs registry audit first, then installs exact declared versions with `node scripts/external-consumer-smoke.mjs --workspace-versions`. Manual read-only verification remains available through `workflow_dispatch`. The consumer receives no inherited publisher secrets.

The consumer exercises existing pack/validate/inspect, init, Markdown/HTML imports, comic image import, SDK conversion with byte-exact source/report checks, CLI conversion and validation/inspection of its output. Preparation and command failures produce failed summaries and stop subsequent steps. Registry audit rejects missing expected versions, wrong `latest`, deprecated expected releases and unsafe dependency metadata. Local code/tests passing does not mean npm publication, authenticated publisher access, GitHub execution, deployment or live Convert UI acceptance has completed.
