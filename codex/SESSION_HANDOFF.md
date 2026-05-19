# SESSION_HANDOFF.md

## Current status

- Public npm packages are live at `0.1.1`:
  - `@eonhive/prd-types`
  - `@eonhive/prd-validator`
  - `@eonhive/prd-packager`
  - `@eonhive/prd-cli`
- Published `0.1.1` dependency metadata is consumer-safe and no longer uses `workspace:*`.
- Broken `0.1.0` npm versions are deprecated with `Broken preview release. Upgrade to 0.1.1.`
- Release run `#43` succeeded on attempt 2 for `main` commit `4e62623ab44cc7b539b392152df236b49e19dfcf`.
- Post-Publish Consumer Smoke run `#20` succeeded and uploaded both registry-audit and external-consumer-smoke summaries.
- The current local branch is `thehive/prd-0-1-1-closeout`.
- PR `#36` is open at `https://github.com/eonhive/prd/pull/36`.
- Codex CI passed on the closeout branch and PR-triggered run `#151`.
- The worktree has unrelated dirty changes in the comic example and web viewer styles.

## Completed work

- Fixed release preflight so unified unpublished post-preview versions such as `0.1.1` can pass in normal Changesets release mode.
- Landed the manual versioning path for `0.1.1` so public package versions and internal public-package ranges now target `^0.1.1`.
- Confirmed the corrective `0.1.1` release is published on npm.
- Confirmed published `0.1.1` package dependencies are concrete semver ranges:
  - validator depends on `@eonhive/prd-types@^0.1.1`
  - packager depends on `@eonhive/prd-types@^0.1.1` and `@eonhive/prd-validator@^0.1.1`
  - cli depends on `@eonhive/prd-types@^0.1.1`, `@eonhive/prd-validator@^0.1.1`, and `@eonhive/prd-packager@^0.1.1`
- Deprecated the broken `0.1.0` npm versions for all four public packages.
- Re-ran local registry audit and external npm consumer smoke against the published `0.1.1` packages.
- Verified GitHub Release and Post-Publish Consumer Smoke workflows are green for the `0.1.1` closeout path.
- Updated closeout docs so the repo no longer describes the preview as unshipped.
- Created and pushed the release closeout branch.
- Opened ready PR `#36`: `[stannesi] close out prd 0.1.1 release`.
- Verified Codex CI run `#151` passed for PR `#36`.

## In-progress work

- Local uncommitted edits exist and need owner review before any unrelated release or docs cleanup:
  - `apps/prd-viewer-web/src/styles.css`
  - `examples/comic-basic/content/root.json`
  - `examples/comic-basic/manifest.json`
  - deleted SVG panel assets under `examples/comic-basic/assets/panels/`
  - added PNG panel assets under `examples/comic-basic/assets/panels/`
- The closeout docs and codex handoff files are part of the current closeout change. The unrelated comic/viewer edits remain separate local worktree changes.

## Changed files

Current dirty worktree files:

- [styles.css](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/apps/prd-viewer-web/src/styles.css)
- [root.json](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/examples/comic-basic/content/root.json)
- [manifest.json](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/examples/comic-basic/manifest.json)
- [panel-1.svg](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/examples/comic-basic/assets/panels/panel-1.svg)
- [panel-2.svg](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/examples/comic-basic/assets/panels/panel-2.svg)
- [panel-3.svg](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/examples/comic-basic/assets/panels/panel-3.svg)
- [panel-1.png](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/examples/comic-basic/assets/panels/panel-1.png)
- [panel-2.png](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/examples/comic-basic/assets/panels/panel-2.png)
- [panel-3.png](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/examples/comic-basic/assets/panels/panel-3.png)

Recently relevant release-control files that were updated in the last release recovery cycle:

- [release-publish-preflight.mjs](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/scripts/release-publish-preflight.mjs)
- [release-publish-preflight.test.ts](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/scripts/release-publish-preflight.test.ts)
- [README.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/README.md)
- [PRD_NPM_RELEASE_RUNBOOK.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/docs/governance/PRD_NPM_RELEASE_RUNBOOK.md)
- [BUILD_STATUS.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/BUILD_STATUS.md)
- [NEXT_STEPS.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/NEXT_STEPS.md)
- [PRD_RELEASE_POLICY.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/docs/governance/PRD_RELEASE_POLICY.md)
- [PLANS.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/codex/PLANS.md)
- [SESSION_HANDOFF.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/codex/SESSION_HANDOFF.md)

## Commands run

- `git status --short`
- `git branch --show-current`
- `git log --oneline -5`
- `npm view @eonhive/prd-types version`
- `npm view @eonhive/prd-validator version`
- `npm view @eonhive/prd-packager version`
- `npm view @eonhive/prd-cli version`
- `npm view @eonhive/prd-validator@0.1.1 dependencies --json`
- `npm view @eonhive/prd-packager@0.1.1 dependencies --json`
- `npm view @eonhive/prd-cli@0.1.1 dependencies --json`
- `npm view @eonhive/prd-types@0.1.0 deprecated`
- `npm view @eonhive/prd-validator@0.1.0 deprecated`
- `npm view @eonhive/prd-packager@0.1.0 deprecated`
- `npm view @eonhive/prd-cli@0.1.0 deprecated`
- `npm deprecate @eonhive/prd-types@0.1.0 "Broken preview release. Upgrade to 0.1.1."`
- `npm deprecate @eonhive/prd-validator@0.1.0 "Broken preview release. Upgrade to 0.1.1."`
- `npm deprecate @eonhive/prd-packager@0.1.0 "Broken preview release. Upgrade to 0.1.1."`
- `npm deprecate @eonhive/prd-cli@0.1.0 "Broken preview release. Upgrade to 0.1.1."`
- `pnpm release:audit:registry`
- `pnpm consumer:smoke:npm`
- `pnpm docs:check -- --include-root-docs`
- GitHub connector: reran/fetched Release workflow state for run `24838700450`
- GitHub connector: fetched Post-Publish Consumer Smoke run `26076492445` jobs and artifacts
- `git switch -c thehive/prd-0-1-1-closeout origin/main`
- `git add BUILD_STATUS.md NEXT_STEPS.md README.md docs/governance/PRD_NPM_RELEASE_RUNBOOK.md docs/governance/PRD_RELEASE_POLICY.md codex/PLANS.md codex/SESSION_HANDOFF.md`
- `git commit -m "docs: close out prd 0.1.1 release"`
- `git push -u origin thehive/prd-0-1-1-closeout`
- GitHub connector: created PR `#36`
- GitHub API: checked PR mergeability and Codex CI run `#151`

## Tests / verification

- Verified all four public packages resolve on npm at `0.1.1`.
- Verified published `0.1.1` dependency metadata contains no `workspace:*` values for:
  - `@eonhive/prd-validator`
  - `@eonhive/prd-packager`
  - `@eonhive/prd-cli`
- Verified all four `0.1.0` package versions are deprecated with `Broken preview release. Upgrade to 0.1.1.`
- Verified `pnpm release:audit:registry` passed against `0.1.1`.
- Verified `pnpm consumer:smoke:npm` passed against npm `latest`.
- Verified `pnpm docs:check -- --include-root-docs` passed.
- Verified GitHub Post-Publish Consumer Smoke run `#20` passed with registry audit and consumer smoke artifact uploads.
- Verified Codex CI run `#151` passed for PR `#36`.
- Local validation ran under Node `v18.17.1`, which emits expected engine warnings. GitHub release/smoke workflows are the authoritative Node 20/22 validation lane.

## Known issues

- There are unrelated local comic/style edits in the worktree that should not be overwritten casually.
- This shell is on Node `v18.17.1`; use Node 20+ or Node 22 for full repo validation.

## Next recommended task

- Merge PR `#36` after review.
- After closeout lands on `main`, choose the next planning lane: Phase 5 authoring/tooling surface or missing governance canon such as versioning policy and product boundaries.

## Important decisions

- Public package dependency metadata now uses concrete semver ranges, not `workspace:*`.
- `release:preflight` supports two valid modes:
  - bootstrap preview for `0.1.0`
  - normal versioned release mode for later unified versions such as `0.1.1`
- CI publish from `main` remains the canonical release path.
- `0.1.0` deprecation should apply to the full public toolchain for simpler user guidance.
- The clean public preview baseline is `0.1.1`, not the deprecated `0.1.0` first publish.

## Do not redo

- Do not rerun `pnpm release:version` on the current branch unless you intentionally want another versioning pass.
- Do not recreate `0.1.1`; it is already live on npm.
- Do not assume the dirty comic/style files are safe to revert; they look like separate in-progress work.
- Do not re-open release bootstrap recovery unless a new publish failure appears; the remaining work is commit hygiene and next-lane planning.
