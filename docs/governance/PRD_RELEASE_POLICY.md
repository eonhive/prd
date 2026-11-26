# PRD Release Policy

This document defines the current npm release posture for the PRD reference tooling workspace.

---

## 1. Current Release Baseline

The npm preview line began at `0.1.0`; that release leaked `workspace:*`
internal dependency metadata in some packages. The corrective `0.1.1` release
established the consumer-safe preview baseline and deprecated the broken initial
versions with upgrade guidance.

The current release remains pre-1.0 and independently versioned. On November
25, 2026, main Release run `45701384261` published the four new versions from
commit `474d5e0`, retaining the existing types version. Exact registry/latest and
48-step npm consumer verification pass on its second attempt; the initial
post-publish audit encountered stale registry metadata.

| Public package | npm `latest` | Provenance verification |
| --- | --- | --- |
| `@eonhive/prd-types` | `0.1.1` | Unchanged historical release; registry signature verified, no provenance attestation advertised. |
| `@eonhive/prd-validator` | `0.2.0` | Registry signature and provenance verified. |
| `@eonhive/prd-packager` | `0.2.0` | Registry signature and provenance verified. |
| `@eonhive/prd-converter` | `0.2.0` | First public converter release; registry signature and provenance verified. |
| `@eonhive/prd-cli` | `0.3.0` | Registry signature and provenance verified. |

The registry audit passes for all five expected versions and `latest` tags,
with no deprecated expected release or unsafe internal dependency metadata.
The [main Release run](https://github.com/eonhive/prd/actions/runs/45701384261)
completed publication and its publish-gated consumer passed all 48 checks using
those exact versions. The four new provenance statements bind the downloaded
tarball SHA-512 digests to commit `474d5e02979dac3f162d01080648f9f892dfa427`,
`.github/workflows/release.yml`, `refs/heads/main`, and that run's first attempt.
An isolated Node 22.22.2/npm 10.9.7 core install passed `npm audit signatures`:
six registry signatures (the five PRD packages plus fflate) and four attestations.
Optional dependencies were omitted from this signature audit; the unchanged
types release is not claimed to have provenance. See the
[verification record and repeatable commands](PRD_NPM_RELEASE_RUNBOOK.md#published-release-verification--november-25-2026).

The release channel is:

- npm `latest`

The release-check catalog includes all five public packages:

- `@eonhive/prd-types`
- `@eonhive/prd-validator`
- `@eonhive/prd-packager`
- `@eonhive/prd-converter`
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

Under PRD-057, public npm versions are independent. Changesets `fixed` and `linked` groups remain empty; changesets and dependency updates determine each package's next version. A tooling release does not force unrelated packages to the same version. Preflight accepts independently selected stable versions (including the converter’s first version), rejects malformed/prerelease install specs, registry audit checks each package's declared version and `latest` tag, and the CI consumer installs exact per-package versions from the release commit. `scripts/release-packages.mjs` is the shared five-package catalog used by these checks and tarball smoke.

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

Codex CI also runs `node ./scripts/release-smoke.mjs` on Node 22 after its existing checks/build and example packaging, for pull requests, configured branch pushes and manual runs. It packs and installs all five public packages in temporary consumer projects and runs the same 48 consumer checks plus the existing package/optional-dependency/PDF smoke checks. A failure fails validation. The `tarball-consumer-smoke-summary` artifact retains `examples/dist/tarball-consumer-smoke-summary.json` after an attempted smoke run, including failures; it reports the consumer portion, while the step result covers the full smoke script. Missing expected artifacts fail the upload. PR validation has read-only repository permissions, leaves checkout credentials unpersisted and receives no publisher credentials. This gate checks candidate tarballs; npm registry and post-publish checks remain required.

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

The current consumer requires 48 steps: baseline install/pack/validate/inspect, all three profile starters, Markdown and both comic/storyboard image imports with directory/archive validation and inspection, HTML import, SDK conversion with byte-exact source/report checks, and CLI conversion with validation/inspection. The upstream `authoringRequired` flag and stable-CLI-version check remain; current CLI `0.2.0+` and local tarball verification require the full authoring matrix. Preparation and command failures produce failed summaries and stop subsequent steps. Registry audit rejects missing expected versions, wrong `latest`, deprecated expected releases and unsafe dependency metadata. Local code/tests passing does not mean npm publication, authenticated publisher access, GitHub execution, deployment or live Convert UI acceptance has completed.
