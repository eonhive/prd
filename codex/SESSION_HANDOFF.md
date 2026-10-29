# SESSION_HANDOFF.md

## Latest Continuation - October 29, 2026: CLI 0.2.0 Version PR

- Main `4ac480d` includes merged PRs #64/#65/#66/#67. Reused the clean isolated checkout on `thehive/prd-cli-0-2-0-version-pr`; original-checkout work and other worktrees remain untouched.
- Before versioning, read-only `release:status` confirmed exactly CLI `0.2.0` from `.changeset/prd-init-scaffold.md`, `.changeset/prd-markdown-import.md`, and `.changeset/prd-image-import.md`. Ran the existing `release:version` command once. Only the CLI package version changed and those three changesets were consumed; library versions/internal ranges stay `0.1.1`/`^0.1.1`, with no lockfile diff after its refresh.
- Added an explicitly unreleased CLI changelog entry. Updated build status and consolidated only the duplicate active item 46 introduced by the merged release docs; other unrelated backlog numbering is outside this version PR.
- Latest main Release run [40932175825](https://github.com/eonhive/prd/actions/runs/40932175825) passed release checks, then failed preflight with an empty `NPM_TOKEN`. Auth/org checks did not succeed and version/publish was skipped. npm still reports CLI `0.1.1`. No credential was accessed or changed, no workflow was rerun, and no package was published.
- Release-candidate validation passed on Node 22: full `release:check` (476 tests / 35 files), typecheck/build/canonical validation and real installed-tarball smoke with all 42 authoring steps; aggregate example smoke, root-inclusive docs consistency, and whitespace checks also pass. Explicit assertions confirm only CLI `0.2.0`, unchanged library versions and internal ranges. Bootstrap correctly no-ops.
- The optional post-version `release:status` invocation exited 1 because the intended changesets are now consumed while the CLI manifest differs from main. The pre-version plan was verified before applying it; do not add an empty or duplicate changeset to disguise the normal version-PR state.
- Ready review PR: [#68](https://github.com/eonhive/prd/pull/68), `[stannesi] prepare CLI 0.2.0 authoring release`. Published the staged release-candidate tree through the connected GitHub API after verifying an exact local/remote tree match, then attached the PR. No merge was performed.
- Review PR #68 and repair the intended Actions secret before CI publication. Keep availability notes unchanged until reviewed main/CI publication, expected-version registry audit and all 42 npm-installed authoring checks pass. Preserve launch acceptance under items 44/48 separately. Local tarball success is not published npm success; no live publisher-auth or future-version registry success is claimed.
- Earlier sections below are historical; their task-specific no-versioning instructions describe prior gate-only work, not this explicitly separate version PR.

## Latest continuation — October 28, 2026: Authoring Consumer Verification

- Ready review PR: [#65](https://github.com/eonhive/prd/pull/65), `[stannesi] verify CLI authoring in installed consumer smoke`. Continued the existing branch with the owner's authorization; did not duplicate the implementation or mix in the original checkout's independent work.
- Final continuation verification passed on Node 22: 29 targeted tests and the full `release:check` (451 tests / 34 files), including all 42 real installed-tarball consumer steps. Repeated live registry audit, six-step npm `0.1.1` baseline, root-inclusive docs consistency and whitespace checks passed. The npm baseline reports `authoringRequired: false`; only the tarball run reports `authoringRequired: true`. No new authoring publication is claimed. This continuation needed no source changes after reviewing the existing implementation.
- Isolated branch `thehive/prd-authoring-consumer-smoke` starts at merged main `2cf4980`. The original checkout and unrelated work remain untouched. Read-only Changesets status still plans only CLI `0.2.0`; live registry audit and six-step npm consumer smoke pass for published `0.1.1`.
- Added `scripts/consumer-authoring-smoke.mjs`, used by external consumer smoke and, through it, release tarball smoke. It checks `init` across all three profiles, Markdown/local-image import, and both visual image imports, including natural order/source bytes and directory/archive validation/inspection. JSON/profile/source failures and missing commands fail the exact step; preparation failures also fail the retained summary and CLI exit.
- Installed tarballs always require all 42 steps. Normal post-publish smoke decides from the checked-out CLI version: stable `0.2.0+` requires authoring, while `0.1.x` keeps the six baseline checks. The summary's additive `authoringRequired` field makes that distinction explicit; the contract identifier and existing npm summary path are unchanged.
- Validation passed: 29 targeted tests; full `release:check` with **451 tests / 34 files**, typecheck/build/canonical validation and real installed tarball authoring smoke; read-only registry audit and real npm baseline smoke. The tarball authoring summary is ignored at `examples/dist/release-authoring-consumer-smoke-summary.json`. Release policy/runbook, README and active item 46 are updated. No dependency, package version, changeset or workflow edit.
- Publication is still pending. Separate PR #64 reports missing Actions `NPM_TOKEN`; a maintainer must repair that configuration before reviewed CI versioning/publication, expected-version registry audit and the 42-step npm authoring run can complete item 46. No secret/token access, local versioning, workflow rerun, publication or deployment was performed. Browser/physical launch acceptance remains under items 44/48.
- Earlier sections below are historical.

## Latest continuation — October 28, 2026: Merged Launch Verification

- PR #61 and PR #62 are merged; reviewed main is `317c365`. Reused the isolated checkout on `thehive/prd-launch-verification` for this documentation follow-up. The original checkout's independent work remains untouched. The file-drop change retains nested feedback, ignores text drags, and preserves the archive/validation/rendering and privacy paths.
- The combined foundation gate passes **429 tests / 34 files**, workspace build, canonical validation/aggregate smoke and root-inclusive docs consistency. Root typecheck passes. GitHub validation and Cloudflare build are successful on PR #62's final head `97b7adc`.
- All 21 fresh production HTTP/package checks pass. Entry JS/CSS match the tested integrated build byte-for-byte; ignored evidence is in `examples/dist/production-acceptance/merged-file-drop-assets.json`. The earlier branch preview also passed all 21 HTTP/package checks. These are static/package checks, not fresh browser acceptance.
- Removed duplicate backlog records and retained distinct items 66/67/68 for reader, file-drop and motion fixes. Launch items 44/48 stay open while browser use is disabled: fresh deployed interactions, real OS drag/drop, actual screen-reader speech, physical touch, constrained-device profiling and intended deployment-owner sign-off remain. No manual deployment or npm publication was performed.
- Earlier sections below are historical.

## Latest continuation — October 27, 2026: File-Drop Feedback

- Reused the clean isolated checkout and branched `thehive/prd-file-drop-feedback` from main `2367123` (merged PR #60). The original checkout and its independent work remain untouched. All 21 production HTTP/package checks pass; served JS/CSS exactly match the reviewed reader build. Evidence is ignored at `examples/dist/production-acceptance/reviewed-assets.json`.
- Browser use is disabled in Work settings. Source/DOM tests reproduced file-highlight loss when crossing nested controls and false archive errors for text drops. Fixed these in the existing named drop area with file-type filtering, nested enter/leave tracking and a copy cursor. Existing mixed-file selection, local opening, validation/rendering and private parent notifications are preserved.
- Added five DOM cases, including missing related targets, text/French-resource retention, valid archive/private marker and unsupported/recovery opens. Final checks: root typecheck, foundation gate **417 tests / 34 files** (200 app tests), workspace build, examples/smoke, both hosting builds, Workers dry run and docs/whitespace checks pass. No dependency, public package or changeset edit.
- Prepare a focused review PR. This is not fresh browser or real OS drag/drop acceptance. Items 44/48 retain actual screen-reader, physical touch, OS drag/drop, constrained-device and deployment-owner checks. No manual production deployment or npm release was performed.
- Earlier sections below are historical.

## Latest continuation — October 27, 2026: Reader Accessibility

- Reused the clean isolated checkout and branched `thehive/prd-reader-accessibility` from merged main `8438760`. PR #59 is merged and its automatic rebrand rollout was observed on production with all 21 HTTP/package checks passing. The original checkout's unrelated work remains untouched.
- Reproduced desktop panel-close focus loss on the public Viewer and fixed it with stable toolbar refs. Added polite/atomic outline result counts and active-title completion feedback. Locale, resource URLs, native mobile dialogs, namespaced outline targets and package/runtime boundaries are preserved. No dependency or changeset.
- Four new DOM cases failed before implementation and pass afterward. Final checks pass: root typecheck, foundation gate **412 tests / 34 files** (195 app tests), workspace build, canonical validation/smoke, both hosting builds, Workers dry run, docs and whitespace checks. Real local built-browser review covers close/Tab continuation, search counts, French title/image continuity and 390px native dialog dismissal.
- Generated evidence is ignored under `examples/dist/reader-accessibility/`. Physical-device, actual screen-reader, OS drag/drop, constrained-device and production correction acceptance remain launch items 44/48. Prepare a focused review PR for this correction; no manual production deployment or npm release was performed.
- Earlier sections below are historical.

## Latest continuation — October 27, 2026: Public Rebrand Review

- Isolated branch `thehive/prd-brand-refresh` starts at current main `c8e5935` (PR #58). Ported the earlier Home/Viewer/Docs rebrand while preserving merged source-profile presentations, namespaced document targets and the sample-selection bridge. The primary checkout and its converter/container/signature work were left untouched.
- Shared palette, folded mark/favicon, original WebP hero artwork, public navigation/footer, real example links, branded Docs and responsive Viewer panels are implemented. Theme changes preserve localized content/resource URLs. Mobile outline focus uses the namespaced target map. Corrected sticky toolbar/panel/fragment offsets after real browser testing.
- Validation: root typecheck, foundation gate **408 tests / 34 files** (191 app tests), workspace builds, canonical examples/aggregate smoke, both hosting-base builds, Workers dry run, 21 local HTTP/package checks and docs/whitespace checks pass. Fresh browser checks used the built `127.0.0.1:4174` preview with desktop themes and 390px/320px layouts; generated screenshots are under ignored `examples/dist/rebrand-qa/`.
- No dependency, lockfile, public package, CLI, core, release workflow or changeset changes. No npm release or production deployment. Review the focused PR before merge; launch items 44/48 still require physical touch, screen-reader, real OS drag/drop, constrained-device and deployed acceptance.
- Earlier sections below are historical context.

## Current status

- October 27, 2026: PR #55 is merged at `a50de8e`; main also includes the embedded Viewer continuity follow-up in PR #56 (`4e7710d`).
- Reused isolated checkout `prd-viewer-dom-targets` and created `thehive/prd-independent-release-gates` from `4e7710d`. The primary checkout's substantial unfinished format/security/UI/architecture edits remain untouched.
- This branch fixes item 46's repo-side release-gate mismatch: stable post-preview public package versions may differ, in line with the existing Changesets configuration.
- Ready review PR: [#57](https://github.com/eonhive/prd/pull/57), `[stannesi] allow independent public package release versions`. Published through the connected GitHub API after its tree matched the verified local index exactly.
- Package versions, dependency ranges, lockfile, changesets, release workflow, and published availability were not changed. No versioning or npm publication was performed.
- Browser/production launch acceptance remains separate under items 44/48. This is not another UI or format slice.

## Completed work

- Added dependency-free `scripts/release-package-versions.mjs`, shared by preflight and registry audit.
- Preserved all-`0.1.0` historical bootstrap; normal releases accept stable per-package versions above that preview, including CLI `0.2.0` with unchanged libraries at `0.1.1`.
- Kept invalid versions, mixed bootstrap/post-preview targets, unconfigured prerelease/build-label versions, and public package-name drift gated.
- Preserved npm token/auth/org checks and registry per-package publication/`latest`/consumer-safe dependency checks. The existing post-publish consumer defaults already install each package's own `latest`.
- Added positive independent-version cases, failure/regression cases, artifact checks, and an actual bootstrap-script no-op test without publishing.
- Clarified release/versioning policies, runbook, README, and PRD-033 in place. Did not allocate IDs used by the primary checkout's unfinished container/signature decisions.
- Read-only `release:status` confirms current main's three queued authoring changesets plan only `@eonhive/prd-cli@0.2.0`, with no patch/library/major bumps.
- Live registry audit passes for the existing unchanged `0.1.1` baseline. The planned `0.2.0` release is not claimed live.

## In-progress work

- Review/merge PR #57, then separately review the intended version PR and CI publication. Local verification does not imply GitHub CI has passed.
- Item 46 remains open until actual authoring publication and external init/Markdown/image import verification. Existing post-publish smoke covers pack/validate/inspect, not all new authoring commands.
- No real-token/auth/org preflight was run locally; those checks were exercised with mocks. CI remains the publisher/auth authority.

## Changed files

- New `scripts/release-package-versions.mjs`
- `scripts/release-publish-preflight.mjs`, `release-publish-preflight.test.ts`
- `scripts/release-registry-audit.mjs`, `release-registry-audit.test.ts`
- `docs/governance/PRD_RELEASE_POLICY.md`, `PRD_NPM_RELEASE_RUNBOOK.md`
- `docs/core/PRD_VERSIONING_POLICY.md`, `docs/decisions/PRD_DECISIONS.md`
- `README.md`, `BUILD_STATUS.md`, `NEXT_STEPS.md`, `codex/SESSION_HANDOFF.md`

## Commands run

- Bundled Git: status, fetch main, create isolated branch, diff review/check.
- Read PR #55 merge/CI/preview discussion and current release scripts/policies before edits.
- `pnpm exec vitest run scripts/release-publish-preflight.test.ts scripts/release-registry-audit.test.ts scripts/external-consumer-smoke.test.ts`
- `pnpm release:status` (read-only; no changeset versioning)
- `pnpm install --frozen-lockfile` under Node 22 to refresh the isolated install for main's existing jsdom dependency
- `pnpm release:check`
- `pnpm release:audit:registry` (public registry metadata only)
- `pnpm docs:check -- --include-root-docs`
- `git diff --check`
- Published the verified tree to the isolated PR branch through the GitHub connector; attached PR #57 and recorded this handoff before stopping.

## Tests / verification

- Node `22.22.2` and pnpm `10.32.1`.
- 41 targeted tests across three files passed, including shared mode classification, unchanged bootstrap behavior, independently versioned publication states, auth failure, and retained metadata failure checks.
- Full `release:check` passed: 351 tests across 32 files, typecheck, workspace build, canonical example validation, and packed-tarball consumer smoke.
- The initial full run lacked PR #56's jsdom install; all existing dependencies were restored with the frozen lockfile and the full rerun passed. No dependency source or lockfile change.
- Docs consistency including root docs and diff checks passed.
- Registry audit passed against the still-published `0.1.1` package set. Independently versioned future publication was tested with mocks, not falsely reported published.
- No live token/org verification, versioning, npm publish, production deployment, or fresh browser acceptance was performed.

## Known issues

- The version/publish workflow can still need external GitHub/npm operational attention; this code change is not proof that a future workflow or version PR has succeeded.
- Current queued authoring status is based only on reviewed main. The primary checkout has other unfinished changesets/features that must be reviewed and sequenced separately.
- Browser acceptance under items 44/48 remains open; prior browser-disabled/pointer uncertainty is not resolved by release-gate tests.
- System Git requires an unaccepted Xcode license; use bundled Git. Put Node 22's bin before the fallback tool directory when supplying Git through PATH, to avoid selecting the fallback pnpm runtime.
- HTTPS push has lacked credentials; use the authorized GitHub connector when needed.
- Keep `PRD_NPM_VERSION` unset for independent-version post-publish consumer verification; its existing single-version override is only for intentional coordinated checks.

## Next recommended task

- Review/merge PR #57, confirm `release:status` again on intended main, then review or recover a separate Changesets version PR for the authoring release.
- Validate exact versions/dependency ranges and publish only through the existing main/CI path. Do not consume changesets in this gate-only PR.
- Require successful per-package registry audit and clean npm-installed init/import/validate/inspect/pack verification before updating public availability or marking item 46 complete.
- Coordinate unfinished primary-checkout work separately and preserve pending launch acceptance.

## Important decisions

- Changesets already has no fixed/linked release group. Per-package versions are the intended normal path; whole-toolchain equality is not a release invariant.
- First-preview bootstrap stays coordinated and separate. The current latest lane permits stable post-preview versions only; prerelease/build-label channels need explicit future policy.
- Existing summary contracts and release-mode names remain unchanged; `versionSet` can legitimately have multiple values, and per-package versions drive audit.
- The shared helper has no third-party dependency so the standalone Node 20 post-publish workflow still runs without an install step.
- Public package boundaries, auth/org gates, internal semver metadata requirements, CI-only publication, format/manifest versions, and runtime support states remain unchanged.
- No changeset is needed for root release scripts/docs. Keep Codex docs tracked, sanitized, and out of public navigation.

## Do not redo

- Do not redo merged PRs #54/#55/#56, Workers migration, or old npm recovery/deprecation work.
- Do not bump unchanged libraries solely to align version numbers.
- Do not run release:version/publish or access publisher tokens as part of this gate-only patch.
- Do not modify/stage the primary checkout's unfinished changes or reuse its unreviewed decision IDs.
- Do not claim the authoring release shipped or launch QA completed from local gate results.
