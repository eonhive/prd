# SESSION_HANDOFF.md

## Current status

- October 27, 2026: PR #54 is merged at `9075994`; its CI passed, and the Cloudflare integration reported a successful commit-preview build.
- Reused the clean isolated checkout `prd-viewer-dom-targets` and created `thehive/prd-hosted-demo-smoke` from that main revision.
- The primary checkout now contains larger in-progress format/security/UI/architecture changes. Those files and its branch were not modified or staged by this task.
- Browser use is disabled in Work settings. Post-merge pointer/anchor, drag/drop, visual/device/assistive-technology, and deployment-owner acceptance remain open under items 44/48.
- This branch adds a repeatable HTTP/package smoke surface, not a workaround for disabled browser access or a claim of launch acceptance.

## Completed work

- Added `pnpm viewer:demo:check:hosted`, defaulting to the public production domain and accepting `-- --url https://your-host/base/` for owned preview/staging deployments.
- The prehook builds the existing validator. The runner verifies Home/Viewer/Docs shells, their same-origin/base-path module/CSS entry assets, four canonical sample archives with expected profiles, and adjacent inspection JSON against the actual downloaded facts.
- Added a stable summary contract at ignored `examples/dist/viewer-hosted-smoke-summary.json`, including per-check failures, HTTP/byte facts, archive diagnostic hashes, and explicit `browserAcceptance: "not-assessed"`.
- Ordinary failures retain diagnostics and exit nonzero. Requests reject redirects, bound time and streamed bytes, remove temporary downloads, and do not execute remote JavaScript.
- Added tests for root/subpath hosting, missing trailing slash, HTML fallbacks, invalid/wrong-profile archives, stale metadata, HTTP/network failures, timeout/budget cancellation, out-of-base assets, safe arguments, and real CLI failure exit/artifact behavior.
- Live production HTTP/package smoke passed all 13 checks, including all four archives and their matching inspection files.
- Updated README, hosting runbook, build status, backlog, and this handoff. No app/renderer, format, schema, validator behavior, public npm API, capabilities, dependency, or release automation changes; no changeset.

## In-progress work

- Publish/review the hosted-smoke operator PR; no merge, production deployment, npm release, or hosting credential/DNS/permission change was performed.
- Browser use must be restored or manual QA performed before closing deployed interaction acceptance. Do not infer it from HTTP success or the earlier local browser results.

## Changed files

- New `scripts/viewer-hosted-smoke.mjs`, `scripts/viewer-hosted-smoke.test.ts`
- `package.json` (operator script and validator-build prehook only)
- `README.md`, `BUILD_STATUS.md`, `NEXT_STEPS.md`
- `docs/governance/PRD_HOSTING_RUNBOOK.md`, `codex/SESSION_HANDOFF.md`

## Commands run

- Bundled Git: status, fetch main, create/rename a branch in the existing isolated checkout, diff review/check.
- Read PR #54 metadata, review summary, CI result, and Cloudflare preview notification through the GitHub connector.
- Attempted the supported browser entry point once; Work settings reported browser use disabled. No alternate browser runtime or permission changes were used.
- `pnpm exec vitest run scripts/viewer-hosted-smoke.test.ts scripts/viewer-hosting.test.ts scripts/prepare-viewer-demo-assets.test.ts`
- `pnpm viewer:demo:check:hosted`
- `pnpm typecheck`
- `pnpm foundation:gate`
- `git diff --check`

## Tests / verification

- Node `22.22.2` and pnpm `10.32.1`.
- Targeted tests: 24 passed across 3 files, including 16 new hosted-smoke cases. A loopback-only server verifies the real CLI failure path; unit tests make no public network requests.
- Foundation gate passed: workspace build, full test suite, root-inclusive docs consistency, canonical example validation, and aggregate smoke.
- Root typecheck and diff check passed. The new live operator command passed all 13 HTTP/package checks against production.
- Live checks do not execute the app or prove exact deployment account/branch configuration. Browser acceptance remains explicitly not assessed.
- No new browser, pointer, touch, screen-reader, memory/hardware, or drag/drop QA was completed.

## Known issues

- Browser access is currently disabled in Work settings. The previously inconclusive scrolled-rail pointer behavior remains unverified; do not claim it fixed without reproducing it.
- Launch items 44/48 still require deployed interaction checks, actual OS drag/drop, intended Workers Builds account/config confirmation, physical touch/assistive technology, and constrained-hardware profiling.
- The queued authoring CLI release remains item 46 and must reconcile preflight/version policy separately. Larger uncommitted primary-checkout work is not part of this branch.
- System Git remains subject to the unaccepted Xcode license. Use bundled Git without accepting it automatically. HTTPS push has lacked credentials; use the authorized GitHub connector when needed.
- Smoke-download guardrails (15 seconds, 16 MiB per response) apply only to the fixed hosted-demo probe, not PRD validity or format limits.

## Next recommended task

- Review/merge the hosted-smoke operator PR and run it after deployments using the summary artifact to diagnose missing/stale/HTML-fallback assets.
- Complete deployed pointer/anchor and real drag/drop QA when browser access is available, then finish launch items 44/48 with the owner. Keep GitHub Pages fallback until acceptance.
- Coordinate the primary checkout's format/security/UI work separately; do not silently import or revert its unfinished changes.
- Take the CLI release-policy reconciliation and publication as a separate reviewed slice.

## Important decisions

- `scope: "http-assets-and-packages-only"` and `browserAcceptance: "not-assessed"` are explicit artifact fields so automation cannot mistake a passing download check for launch sign-off.
- The command is separate from `foundation:gate`; offline/local conformance must not depend on a public host.
- Authored IDs, namespaced DOM targets, eager package loading, and current public contracts remain unchanged.
- Hashes are diagnostics, not cryptographic authenticity/signature claims.
- Operational Codex docs stay tracked, sanitized, and out of public navigation. Generated summaries and temporary archives are not canonical source files.

## Do not redo

- Do not redo merged PR #54's namespace fix or the prior Workers/npm recovery work.
- Do not bypass disabled browser access, claim fresh visual QA, or close launch acceptance from this smoke result.
- Do not touch/stage the primary checkout's unrelated in-progress format/security/UI/architecture changes.
- Do not add a network dependency to the foundation gate or change package validity because of this probe's download budget.
