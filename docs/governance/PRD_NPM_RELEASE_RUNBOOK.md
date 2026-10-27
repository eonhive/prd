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
- release mode is correct for the package-specific versions: all four at `0.1.0` may use historical first-preview bootstrap; stable versions above `0.1.0`, including unequal versions, use normal Changesets mode
- malformed versions, unconfigured prerelease/build-label channels, or mixed `0.1.0`/post-preview sets fail closed

It emits `examples/dist/release-publish-preflight-summary.json`.

`pnpm release:audit:registry` is the post-publish registry metadata gate. It verifies:

- each public package resolves on npm
- each package's own expected version is published
- each package's npm `latest` resolves to its own expected version; versions need not match across packages
- published dependencies contain no `workspace:*` values
- internal `@eonhive/prd-*` dependency edges resolve to concrete semver ranges

It emits `examples/dist/release-registry-audit-summary.json`.

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

Review `pnpm release:status` before versioning. Keep CLI-only changesets CLI-only unless real dependency changes require coordinated bumps. The version PR may legitimately contain different public versions; `release:preflight` must not require version equality. On an independent release, leave `PRD_NPM_VERSION` unset for post-publish consumer smoke so it installs each package's `latest`. That optional single-version override is for deliberate coordinated-version checks only.

The gate fix alone does not ship queued features. After its merge, review the version PR's exact packages, versions, and dependency ranges; run `release:check`; publish only through the existing `main` workflow; and require per-package registry audit plus clean external-consumer verification before updating availability claims. Do not version or publish unfinished primary-checkout changes as part of a gate-only patch.

Do not publish manually from a workstation unless the release workflow is unavailable and the repo owner explicitly approves that exception.

---

## 3. First Public Preview

The first public preview uses the current unpublished `0.1.0` package versions.

That means:

- the release workflow first runs `pnpm release:preflight`
- the release workflow first runs `pnpm release:bootstrap --publish`
- that bootstrap step checks npm for the current `0.1.0` package versions
- any still-unpublished preview packages are published directly in dependency order
- future releases should use normal Changesets version PR flow

For stable unpublished post-preview versions, whether unified or package-specific, `pnpm release:preflight` should pass in normal Changesets mode (with auth/org checks satisfied) and `pnpm release:bootstrap --publish` should no-op. Only an all-`0.1.0` workspace is bootstrap-eligible.

The publish set for the first preview is:

- `@eonhive/prd-types`
- `@eonhive/prd-validator`
- `@eonhive/prd-packager`
- `@eonhive/prd-cli`

After a successful publish on `main`, the `Post-Publish Consumer Smoke` workflow should also pass. That workflow installs the published packages from npm in a clean temp project and exercises `pack`, `validate`, and `inspect` without workspace linking.

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
