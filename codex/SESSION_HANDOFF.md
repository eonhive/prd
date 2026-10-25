# SESSION_HANDOFF.md

## Current status

- October 25, 2026: PR #49 is merged; local `main` was fast-forwarded to `0b8def2`. Current branch: `thehive/prd-public-experience-polish`.
- The public domain now serves the app and sample archives. The prior DNS failure is no longer current.
- The Home/Viewer/Docs usability implementation is complete locally and automated checks pass. Preparing a draft review PR; these UI changes have not been deployed.
- Browser access is disabled in Work settings. Items 44 (production launch QA) and 45 (visual acceptance) remain open.

## Completed work

- Bounded hero typography and copy, visible mobile navigation/open action, actual route anchors with modified-click behavior, and skip/focus targets.
- Extracted small navigation/header components to `viewerChrome.tsx`; invalid packages no longer show the empty-workspace label. Loaded packages show their real title.
- Native chooser button plus hidden `.prd` input replaces nested button semantics. Existing archive selection, drag/drop, parsing, validation, and eager loading remain intact.
- Sample guidance collapses once a package is opened. Loaded content precedes rails in the narrow-screen grid; workspace anchor links expose Document, Outline, and Package details.
- Docs now prioritizes first steps and section jump links, with hosting details in a disclosure.
- Reduced-motion handling and graceful theme fallback when browser storage is blocked.
- Published CLI availability is now explicit: npm latest `0.1.1` provides pack/validate/inspect; init/import are repository features awaiting their queued minor release.
- Live HTTP checks passed for all three routes, static JS/CSS, and four downloaded archives. Each archive was unzipped and validated using the existing validator with the expected profile.

## In-progress work

- Publish a draft PR and complete code review, then browser/visual acceptance before merge or production launch sign-off.
- Browser checks were not bypassed through another automation runtime after Work settings reported browser use disabled.
- No hosting account, DNS, production deployment, npm publication, or permissions were changed.

## Changed files

- `apps/prd-viewer-web/src/App.tsx`, `styles.css`
- `apps/prd-viewer-web/src/viewerDemoContent.ts`, `viewerDemoContent.test.ts`
- New `apps/prd-viewer-web/src/viewerChrome.tsx`, `viewerChrome.test.ts`, `viewerExperience.test.ts`
- `README.md`, `docs/README.md`, `packages/prd-cli/README.md`
- `docs/governance/PRD_HOSTING_RUNBOOK.md`, `docs/product/PRD_AUTHORING_WORKFLOW.md`
- `BUILD_STATUS.md`, `NEXT_STEPS.md`, `codex/SESSION_HANDOFF.md`

## Commands run

- Git status, fetch `origin/main`, switch/fast-forward `main`, create the public-experience branch (bundled Git wrapper).
- Targeted Vitest runs covering chrome, route markup, content, archive helpers, route paths, and render-mode unit/integration cases.
- `pnpm typecheck`
- `pnpm viewer:demo:build:github-pages`
- `pnpm viewer:demo:check:cloudflare`
- `pnpm docs:check -- --include-root-docs`
- `pnpm foundation:gate`
- `git diff --check`
- Live HTTP/package checks using fetch, unzip, and the existing validator; no remote JavaScript was executed by this check.
- `npm view @eonhive/prd-cli version --json` returned `0.1.1`.
- `npm exec --yes --package=@eonhive/prd-cli@0.1.1 -- prd --help` returned usage listing pack/validate/inspect with exit 1 (the old CLI does not expose that help option). This was an availability probe, not a passing CLI smoke run.

## Tests / verification

- Node `22.22.2` and pnpm `10.32.1` used.
- Targeted checks: 40 tests passed across 7 files.
- Foundation gate: passed with 209 tests across 23 files, build, docs consistency, example validation, and aggregate example smoke.
- Typecheck, GitHub Pages build, Cloudflare build plus Wrangler dry run, docs check, and diff check passed.
- Production HTTP/package baseline passed for Home, Viewer, Docs, built JS/CSS, and document-basic/document-segmented-basic/comic-basic/storyboard-basic archives.
- New UI tests cover server-rendered semantics, package labels, saved/blocked theme reads, and source layout safeguards, not actual rendered desktop/mobile layouts.
- No browser interaction, upload/drop, visual, theme-persistence, or back/forward checks were completed in this pass.

## Known issues

- Enable browser use in Work settings or perform manual QA to finish desktop/mobile, refresh/history, keyboard, theme persistence, and file-picker/drop acceptance.
- CLI authoring release is a separate public-product blocker. Three CLI-only minor changesets are queued; preflight currently insists all public package versions match. Resolve that policy/implementation conflict intentionally before versioning.
- System Git remains subject to the Xcode license restriction; use the bundled Git wrapper without accepting the license automatically. HTTPS push previously lacked credentials; use the authorized GitHub connector if still unavailable.
- Do not infer the active Cloudflare deployment's account/pipeline configuration merely from successful HTTP responses.
- Native SPA fallback can return HTML for missing archive URLs. Current hosted samples were validated as packages, not just HTTP successes.

## Next recommended task

- Review the draft UI PR and complete visual/browser QA against its deployed revision; retain GitHub Pages fallback and leave items 44/45 open until verified.
- Then take item 46 as a separate release slice: reconcile preflight/version policy, version/publish the queued authoring CLI changes through CI, and verify a clean npm consumer's init/import/validate/inspect/pack flow.
- Update repository-vs-published availability notes only after the release is verified live.

## Important decisions

- No manifest, schema, capability, runtime support-state, archive parsing, structured renderer, public npm API, or release automation changes.
- One static app still serves Home, Viewer, and Docs. No Studio, Cloud authoring, accounts, AI, PRDc, payments, crypto, or broad conversion.
- No changeset for this private-app/documentation slice; existing CLI changesets remain untouched.
- Passing markup/style assertions or HTTP checks is not visual/browser launch acceptance.
- Keep Codex docs tracked, sanitized, and out of public navigation.

## Do not redo

- Do not redo the merged Workers migration or old npm publish/deprecation recovery.
- Do not claim these UI changes are deployed before review/merge.
- Do not mark launch QA complete or broaden browser permissions automatically.
- Do not fold CLI release/preflight changes into this UI PR.
