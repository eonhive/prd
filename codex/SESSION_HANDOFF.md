# SESSION_HANDOFF.md

## Current status

- October 25, 2026: PR #50 is merged at `a9d77d9`; local `main` was fast-forwarded before creating `thehive/prd-viewer-outline-qa`.
- Browser access is enabled. The public site shows PR #50's Home/Viewer/Docs usability pass; the earlier browser-disabled note is historical.
- [PR #51](https://github.com/eonhive/prd/pull/51) is ready for review with the narrow corrective viewer changes found during live launch QA. It has not been merged or deployed.
- Item 45's visual review is complete. Launch item 44 remains open for deployed correction checks, real drag/drop, and production pipeline confirmation. CLI release item 46 remains a separate slice.

## Completed work

- Reviewed production Home on desktop in dark/light mode and Home/Docs/Viewer on mobile. Hero/navigation and document-first narrow-screen presentation were readable without horizontal overflow.
- Verified production Viewer/Docs direct navigation and refresh, Home/Docs back/forward, and saved light theme after Home reload.
- Opened hosted document/comic/storyboard samples as fully supported; inspected package facts, attachments, and localization. French Document Basic changed both text and its inline image resource.
- Selected a local canonical comic archive through the production header's native file chooser.
- Fixed comic/storyboard outline selection by sharing active visual state with the outline. Outline buttons now activate the real panel/frame and focus its viewing stage for keyboard continuation.
- Added rendered authored root/static visual IDs, stopped inventing heading anchors without IDs, and added scroll clearance below the sticky header.
- Added an exact accessible name to the mobile theme toggle. Invalid archives now show validation failure rather than a misleading unsupported runtime entry-mode message.
- Added regression helper/markup tests; no new dependency or changeset.

## In-progress work

- Review PR #51, then recheck the deployed revision on the public domain after merge/deployment.
- Finish actual OS file drag/drop. Confirm Cloudflare account/Workers Builds settings with the owner before launch sign-off.
- No hosting account, credentials, permissions, DNS, npm release, or production deployment changes were made.

## Changed files

- `apps/prd-viewer-web/src/App.tsx`, `styles.css`
- `apps/prd-viewer-web/src/viewerChrome.tsx`, `viewerChrome.test.ts`
- `apps/prd-viewer-web/src/viewerDocumentOutline.ts`, `viewerDocumentOutline.test.ts`
- `README.md`, `BUILD_STATUS.md`, `NEXT_STEPS.md`
- `docs/governance/PRD_HOSTING_RUNBOOK.md`, `codex/SESSION_HANDOFF.md`

## Commands run

- Bundled Git: status, fetch, fast-forward main, create corrective branch, diff review/check. System Git's Xcode license restriction was not bypassed or accepted.
- Published the verified staged tree through the authorized GitHub connector because local HTTPS push credentials are unavailable; remote tree SHA matched the local index. Opened ready PR #51, with no merge or production deployment performed.
- Targeted Vitest: outline, chrome, experience, and render-mode unit/integration tests.
- `pnpm foundation:gate`
- `pnpm typecheck`
- `pnpm viewer:demo:build:github-pages`
- `pnpm viewer:demo:check:cloudflare`
- `pnpm docs:check -- --include-root-docs`
- `pnpm exec wrangler dev --local` for real browser checks against the production build.
- Browser QA used the supported browser tools; screenshots/builds and a temporary invalid archive remain generated test artifacts, not canonical source fixtures.

## Tests / verification

- Node `22.22.2` and pnpm `10.32.1` used.
- Targeted tests: 43 passed across 5 files. Foundation gate: 224 tests across 23 files, workspace build, docs consistency, canonical example validation, and aggregate example smoke passed.
- Root typecheck, GitHub Pages fallback build, Cloudflare production build plus Wrangler dry run, docs consistency (including root docs), and diff check passed.
- Local browser checks: panel/frame selection, keyboard Left continuation, repeated selection, root/heading anchors, mobile dark/light comic layout, invalid archive feedback/recovery, and same-file reopen/reset passed. Local browser console check reported no warnings/errors.
- Production vs local verification is separated in the hosting runbook matrix. Do not treat local fixes as already deployed.

## Known issues

- Actual OS file drag/drop is still unverified. Native chooser and helper unit tests do not replace this check.
- Deployment-owner/build settings confirmation remains open. Do not infer account/pipeline configuration from HTTP success.
- npm latest CLI was last verified at `0.1.1` (pack/validate/inspect). Three CLI-only minor authoring changesets are queued, while preflight currently requires matching public package versions. Resolve that conflict deliberately in item 46 before versioning.
- System Git needs an unaccepted Xcode license; use bundled Git. Local HTTPS push lacks credentials; use the authorized GitHub connector if needed.
- SPA fallback can return HTML for missing archive URLs. Validate actual package bytes, not only HTTP status.

## Next recommended task

- Review/merge this corrective PR, verify the deployed fixes, complete drag/drop, and confirm the production Workers Builds settings. Keep GitHub Pages fallback until item 44 is accepted.
- Then take item 46 separately: reconcile preflight/version policy, ship queued authoring CLI changes through existing CI, and verify an external npm consumer's init/import/validate/inspect/pack flow.
- Change repository-vs-published availability notes only after that release is verified live.

## Important decisions

- This is a private-app launch correction, not a new feature lane or format change.
- No manifest, schema, validator, capability, runtime support-state, archive parsing, public npm API, CLI implementation, or release automation changes.
- Eager whole-package in-memory loading remains unchanged. No Studio, Cloud authoring, accounts, AI, PRDc, payment, crypto, or conversion expansion.
- Keep Codex docs tracked, sanitized, and out of public navigation. Generated QA screenshots are ignored artifacts.

## Do not redo

- Do not redo merged PR #50, Workers migration, or resolved npm 0.1.0/0.1.1 recovery.
- Do not claim this branch's corrections are deployed or mark item 44 complete without the remaining real checks.
- Do not broaden browser permissions or modify production credentials/DNS to finish QA.
- Do not mix CLI release/preflight changes into this UI PR.
