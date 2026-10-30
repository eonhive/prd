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

The CLI also prints the status of each check and required recovery actions.
Inside Actions it appends the same report to the job's step summary, preserving
earlier content. The JSON contract and failing exit status remain authoritative;
an unavailable step-summary file does not change the preflight result. Reports
project known check states and recovery actions rather than dumping raw npm
command output or credential fields. The workflow still uploads the full JSON
artifact on failure.

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

The consumer's `prd-external-consumer-smoke-v0.2` summary records five install specs and 48 steps: six baseline package checks, 36 authoring round-trip checks (three profile starters, Markdown, and comic/storyboard image imports), then six HTML/SDK/CLI conversion checks. The original JSON/profile/source-byte/order verifiers remain active; `authoringRequired` still identifies the complete authoring matrix. The identical runner executes against five local tarballs during `pnpm release:check` before publication. `PRD_NPM_VERSION`/`PRD_NPM_DIST_TAG` and explicit programmatic `packageSpecs` remain available for manual checks; `--workspace-versions` is the normal exact-version CI path. A setup failure is a failed summary, not a passing run with no commands.

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

### Missing token diagnosis — October 28, 2026

[Release run 40704420548](https://github.com/eonhive/prd/actions/runs/40704420548)
passed `release:check` but failed preflight. Its uploaded artifact
`release-publish-preflight-summary` (ID `12823406512`, SHA-256
`597bc7ea4e2c75e2a4c4403cbd6e6a4047800799eac0ede9c6b1ed8e7fe8b990`)
confirms:

- package targets and Changesets release mode passed for the existing `0.1.1` set
- `token` failed because the job received an empty `NPM_TOKEN`
- npm authentication and organization membership were skipped

The job then skipped bootstrap publication and Changesets version/publish.

This is an unavailable workflow credential, not evidence of a bad package version
or invalid npm account. No authentication request occurred, so account validity
has not been assessed. GitHub documents that an unset secret expression resolves
to an empty string in [Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

A repository maintainer must configure `NPM_TOKEN` in
[Actions secrets](https://github.com/eonhive/prd/settings/secrets/actions), or verify
that an existing organization secret is available to this repository. The value
must come from the intended authorized npm publisher. The current Release job
does not select a GitHub environment, so an environment-only secret is not its
configured source. Configure the value through GitHub's secret interface; do not
commit it or include it in diagnostic artifacts.

After configuration, rerun Release on the reviewed `main` revision. Require the
token, auth, membership, target, and release-mode checks to pass. Review the
resulting version PR separately, retain the CI-only publish path, and verify the
actual published versions and external authoring commands before updating feature
availability claims. Do not skip preflight or substitute a local publication.

### Publisher token wiring - October 29, 2026

PR #68 merged the CLI-only `0.2.0` version preparation. Retries of
[Release run 40941252926](https://github.com/eonhive/prd/actions/runs/40941252926)
then passed token, authentication, organization membership, package-target and
release-mode preflight checks. The old missing-secret diagnosis is historical,
not the current outcome of those retries.

Publishing still failed: one retry hit Sigstore `TLOG_CREATE_ENTRY_ERROR` (409),
and the next generated provenance but received `E404` from the registry PUT.
The public registry still did not contain CLI `0.2.0`. Neither a transparency-log
entry nor successful preflight establishes a published package or publish rights.

The workflow had a separate credential-path defect. With `registry-url` set,
`setup-node` selects an npm userconfig whose auth entry reads `NODE_AUTH_TOKEN`.
Changesets writes its `NPM_TOKEN` configuration to `HOME/.npmrc`, which does not
replace that selected userconfig. Preflight checks `NPM_TOKEN` directly and uses
its own temporary npmrc for organization checks, so preflight can succeed while
the publisher still uses setup-node's placeholder. See the
[setup-node publishing example](https://github.com/actions/setup-node/blob/v4/docs/advanced-usage.md#publish-to-npmjs-and-gpr-with-npm)
and the [Changesets action implementation](https://github.com/changesets/action/blob/a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d/src/index.ts).

PR #71 mapped the same existing secret to both variable names for the then-existing publishers. The integrated converter workflow retains this mapping on Changesets publication and retires automatic bootstrap:

```yaml
env:
  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  NPM_CONFIG_PROVENANCE: "true"
```

Do not create a second secret named `NODE_AUTH_TOKEN` or expose the token to
installation/tests at job scope. The fix retains the existing secret source,
preflight order, CI-only publication and provenance requirement. A loopback-only
npm test reproduces the shadowed-home-npmrc failure and confirms the corrected
mapping with fake credentials; it does not prove real registry write access.

The workflow correction is merged in main. A future Release must use that corrected
revision or a reviewed descendant; rerunning an older revision does not apply the fix. If the
corrected publisher still receives `E404`, inspect the npm account's package/team
write access and the granular token's package scope and publishing permissions;
do not infer those permissions from organization membership alone. Keep CLI
`0.2.0` unpublished in availability notes until registry audit and the current 48-step npm
authoring/conversion consumer flow pass. Do not bump the version or disable provenance to
hide a failed publish.

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

## Integrated converter review — October 30, 2026

The review branch preserves PR #71’s step-scoped `NODE_AUTH_TOKEN` mapping and preflight reporting. Only the Changesets publishing step remains: completed first-preview bootstrap is retired from automatic CI under PRD-057. Codex CI and release validation use Node 22; the separate read-only post-publish baseline consumer remains Node 20.

Read-only npm checks on October 30 still show the original four packages at `0.1.1`, no CLI `0.2.0`, and no converter publication. The newly calculated Changesets plan is CLI `0.3.0`, validator/packager/converter `0.2.0`, with types unchanged at `0.1.1`. This is a candidate plan, not a publication or a manual version update. Review the version PR’s actual versions and concrete dependency ranges after this implementation merges.
