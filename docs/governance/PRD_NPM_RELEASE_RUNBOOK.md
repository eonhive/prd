# PRD npm Release Runbook

This runbook is for maintainers publishing the PRD tooling packages.

---

## 1. Preconditions

Before release work:

- use Node 22 for release validation/publication; the separate Node 20 consumer lane checks the baseline package floor
- align your shell to the repo `.nvmrc` when using `nvm`
- ensure `main` is green in CI
- ensure `NPM_TOKEN` is configured in GitHub Actions
- ensure publish access exists for the `eonhive` npm organization

Local verification commands:

```bash
pnpm release:check
pnpm release:preflight
pnpm release:audit:registry
```

`pnpm release:preflight` is the publish-identity gate. It verifies:

- `NPM_TOKEN` is present
- npm auth works for the token
- the token owner is visible in the `eonhive` npm org
- the repo is still targeting the expected `@eonhive/prd-*` package set
- all five public targets are present, including `@eonhive/prd-converter`
- package versions may differ; each is released through Changesets
- the historical initial-preview bootstrap is not used

It emits `examples/dist/release-publish-preflight-summary.json` with contract `prd-release-publish-preflight-v0.2`. `packageTargets.versionPolicy` is `independent`; retained `bootstrapMode` fields report `changesets-versioned`, `previewEligible: false` and `bootstrapRequired: false`. No token or publishing permissions were configured by the October 30 implementation task. Maintainers must verify the existing CI token also permits publishing the new converter package.

`pnpm release:audit:registry` is the post-publish registry metadata gate. It verifies:

- each public package resolves on npm
- the expected version is published
- npm `latest` resolves to that expected version
- the expected version is not deprecated
- published dependencies contain no `workspace:*` values
- internal `@eonhive/prd-*` dependency edges resolve to concrete semver ranges

It emits `examples/dist/release-registry-audit-summary.json` with contract `prd-release-registry-audit-v0.2`. Each target is compared against its own workspace version; equality across the toolchain is not required. Before first converter publication, its missing-package failure is expected and prevents claiming the release has shipped.

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

Public versions follow independent Changesets planning with empty `fixed`/`linked` groups. Review each planned version and concrete internal dependency range in the version PR; do not bump unchanged packages just to match another package's number. A real versioning preview applied only to a temporary workspace on October 30 left `prd-types` at `0.1.1`, planned `prd-validator`, `prd-packager`, `prd-converter` and `prd-cli` at `0.2.0`, and updated their internal ranges accordingly. This is evidence for the then-current queue, not a hardcoded next-release version. Checkout manifests were not changed by that preview.

Release runs are serialized and restricted to `main`. After an actual Changesets publish, the Release job calls the reusable `Post-Publish Consumer Smoke` workflow at the release commit. Creating/updating a version PR does not trigger it. The consumer audits registry metadata and runs `node scripts/external-consumer-smoke.mjs --workspace-versions`, installing each commit-declared version rather than assuming one shared version or following changing dist-tags. It has read-only repository permissions and no inherited publisher secrets. Maintainers can also dispatch read-only verification manually.

The consumer's `prd-external-consumer-smoke-v0.2` summary records five install specs and 18 steps: existing package operations, init and validation, Markdown/HTML/image imports and validation, SDK conversion with source/report parity, and CLI conversion with validation/inspection. The identical runner executes against five local tarballs during `pnpm release:check` before publication. `PRD_NPM_VERSION`/`PRD_NPM_DIST_TAG` and explicit programmatic `packageSpecs` remain available for manual checks; `--workspace-versions` is the normal exact-version CI path. A setup failure is a failed summary, not a passing run with no commands.

Do not publish manually from a workstation unless the release workflow is unavailable and the repo owner explicitly approves that exception.

---

## 3. First Public Preview — Historical

The original first public preview used the then-unpublished `0.1.0` versions of the four original packages.

That means:

- the historical workflow ran preflight and the one-time bootstrap
- it checked npm for the original `0.1.0` versions
- it published missing original packages in dependency order
- current releases use normal Changesets version PR flow

That automatic bootstrap step is retired from CI. The script's original four-package allowlist is deliberately unchanged and does not include the converter. Its local publish mode is historical owner-approved recovery tooling, not the path for onboarding or releasing new packages.

The publish set for the first preview is:

- `@eonhive/prd-types`
- `@eonhive/prd-validator`
- `@eonhive/prd-packager`
- `@eonhive/prd-cli`

After an actual publish on `main`, the current reusable consumer workflow must pass. Its expanded scope is described above; the initial four-package flow exercised `pack`, `validate` and `inspect` without workspace linking.

## 4. Corrective 0.1.1 Release

`0.1.0` was published on npm, but it leaked `workspace:*` internal dependency metadata for consumer-installed packages. The corrective `0.1.1` patch is now the clean public preview baseline.

The completed `0.1.1` closeout state is:

1. the corrective changeset is merged to `main`
2. `0.1.1` is published on npm `latest`
3. post-publish registry audit passes
4. post-publish consumer smoke passes
5. the broken `0.1.0` versions are deprecated with an upgrade message

Deprecation command pattern used after `0.1.1` was live:

```bash
npm deprecate @eonhive/prd-types@0.1.0 "Broken preview release. Upgrade to 0.1.1."
npm deprecate @eonhive/prd-validator@0.1.0 "Broken preview release. Upgrade to 0.1.1."
npm deprecate @eonhive/prd-packager@0.1.0 "Broken preview release. Upgrade to 0.1.1."
npm deprecate @eonhive/prd-cli@0.1.0 "Broken preview release. Upgrade to 0.1.1."
```

If `release:preflight` fails:

1. confirm the `eonhive` npm organization is the intended owner of the `@eonhive` scope
2. confirm the npm account that created `NPM_TOKEN` belongs to that org
3. confirm that account can publish public scoped packages for the org
4. regenerate `NPM_TOKEN` from that exact authorized account if there is any doubt
5. rerun the `Release` workflow on `main`

---

## 5. Quick Checks

Useful release commands:

```bash
pnpm release:status
pnpm release:check
pnpm release:preflight
pnpm release:audit:registry
pnpm release:version
pnpm release:publish
```

Release/check flows should keep smoke gating consistent:

- `release:check` must include canonical `pnpm examples:smoke`
- `release:preflight` must run before first-preview bootstrap publish and fail clearly on npm auth or org-membership problems
- `release:audit:registry` must pass before post-publish consumer smoke is treated as authoritative
- CI jobs that annotate smoke outcomes should use `pnpm examples:smoke -- --json-summary`
- post-publish verification should run in this order:
  1. `pnpm release:audit:registry`
  2. `node ./scripts/external-consumer-smoke.mjs`

`release:publish` exists for workflow use and emergency maintainer recovery. It is not the default day-to-day path.
