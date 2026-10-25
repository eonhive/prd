# SESSION_HANDOFF.md

## Current status

- October 25, 2026: Workers Static Assets migration is implemented and locally verified, not deployed.
- Branch: `thehive/prd-workers-static-assets`, created from current `origin/main` at `73c0b31`. PR #48 is already in that history; do not recreate its Pages build fix.
- The existing `prd-worker` name is preserved. The only pre-existing local edit was that same name change, already on current `origin/main`; it was saved in a safety stash before switching branches.
- Preparing a hosting-only review PR. Production launch remains backlog item 44, with item 45 reserved for later focused product polish.

## Completed work

- Replaced Pages-only Wrangler config with Workers Static Assets and native SPA fallback. No Worker script, backend, API, or document-upload service was added.
- Pinned Wrangler `4.152.0` and added `viewer:demo:check:cloudflare`, `viewer:demo:preview:cloudflare`, and `viewer:demo:deploy:cloudflare`. Each rebuilds root-domain assets first.
- Removed the broad Pages `_redirects` rule. GitHub Pages retains its separate `/prd/` build and workflow-generated `404.html` fallback.
- Added four hosting-configuration tests and updated public hosting copy/tests.
- Updated README, hosting runbook, product docs, roadmap, and decision PRD-039. `codex/PLANS.md` now uses a portable handoff link.
- Completed Node 22 checks, including a build/dry run after cleaning TypeScript outputs and browser checks through the local Workers runtime.

## In-progress work

- Review/merge this migration, connect the Git-backed Worker to `main`, verify its assigned `workers.dev` URL, and connect `prd.eonhive.com`.
- The saved OAuth session is Pages-only; the account owner must authorize Workers access. No broader permissions were granted automatically.
- Local preview server was stopped after checks. No production deployment or DNS changes were made.

## Changed files

- `wrangler.toml`, `package.json`, `pnpm-lock.yaml`, `.gitignore`
- Removed `apps/prd-viewer-web/public/_redirects`
- `apps/prd-viewer-web/src/viewerDemoContent.ts` and `viewerDemoContent.test.ts`
- New `scripts/viewer-hosting.test.ts`
- `README.md`, `docs/README.md`, `docs/governance/PRD_HOSTING_RUNBOOK.md`
- `docs/decisions/PRD_DECISIONS.md`, `docs/foundation/04_PRD/PRD_ROADMAP.md`
- `docs/product/PRD_PRODUCT_BOUNDARIES.md`, `PRD_AUTHORING_WORKFLOW.md`, `PRD_IMPORT_EXPORT_MATRIX.md`
- `BUILD_STATUS.md`, `NEXT_STEPS.md`, `codex/PLANS.md`, `codex/SESSION_HANDOFF.md`

## Commands run

- Git status/diff, fetch `origin/main`, safety stash, and branch creation using the bundled Git wrapper.
- `pnpm install --no-frozen-lockfile`, then `pnpm install --frozen-lockfile`
- Targeted Vitest run covering hosting config, demo asset preparation/content, archive helpers, routes, and render-mode unit/integration tests.
- `pnpm viewer:demo:check:cloudflare`, `pnpm viewer:demo:build:github-pages`
- `pnpm exec tsc -b --clean`, then `pnpm viewer:demo:check:cloudflare` again
- `pnpm exec wrangler dev --local --ip 127.0.0.1 --port 8787`
- HTTP checks for routes, built JS/CSS, four sample archives, and a missing archive.
- `pnpm exec wrangler whoami` (read-only scope check; no credentials recorded here)
- `pnpm typecheck`, `pnpm docs:check -- --include-root-docs`, `pnpm foundation:gate`, `git diff --check`
- `curl -I --max-time 15 https://prd.eonhive.com/`

## Tests / verification

- Node `22.22.2`, pnpm `10.32.1`, Wrangler `4.152.0` used for validation.
- Targeted suite: 28 tests passed across 7 files.
- Foundation gate passed, including 190 tests across 21 files, build, docs, canonical example validation, and aggregate example smoke. Summary remains generated under `examples/dist/`.
- Frozen-lockfile install, root typecheck, Cloudflare build/dry run, GitHub Pages base-path build, docs check, and diff check passed.
- Workers HTTP checks: three routes serve the app shell; JS/CSS have correct content types; all four sample downloads match the built ZIP bytes.
- Browser checks: Home/Viewer/Docs render locally; document/comic/storyboard samples validate/render as fully supported; Viewer/Docs direct refresh and light-theme persistence pass.
- Production, full mobile/responsive QA, and manual upload/drop were not verified in this pass.

## Known issues

- Saved Cloudflare OAuth authorization lacks Workers permissions. Refresh with `pnpm exec wrangler login` on Node 22, or configure Workers Builds in the intended account. The account owner must review authorization; do not request tokens in chat.
- `prd.eonhive.com` did not resolve from this environment. This does not establish global DNS state; verify the account/zone and domain during launch.
- Native SPA fallback can return HTML with HTTP 200 for nonexistent archive paths. Existing samples were verified as ZIP bytes; do not treat HTTP success alone as sample validation. The viewer rejects non-package responses during parsing.
- System Git is blocked by an unaccepted Xcode license. A bundled Git wrapper works; no license was accepted or machine configuration changed.
- Default shell Node is 18. Use installed Node 22 for builds and Wrangler.
- pnpm reports ignored install scripts for Wrangler's esbuild/workerd dependencies; optional platform binaries nevertheless passed local runtime/dry-run checks. No broad build-script permission was enabled.

## Next recommended task

- Review/merge the migration. Configure Workers Builds: repository root, `main`, Node 22, Worker name `prd-worker`, build `pnpm viewer:demo:build:cloudflare`, deploy `pnpm exec wrangler deploy`.
- Verify the assigned `workers.dev` URL before domain cutover. Resolve any previous Pages domain assignment/CNAME intentionally, then attach `prd.eonhive.com`.
- Complete the hosting-runbook launch checklist, including mobile, theme persistence, route refresh, all sample profiles, and manual upload/drop. Only then close item 44; retain GitHub Pages fallback.

## Important decisions

- PRD-039: Workers Static Assets replaces the Pages production target; the app is still static and package parsing stays in-browser.
- Production uses `/`; GitHub Pages uses `/prd/`. New local operator commands rebuild production assets first.
- Do not claim deployment success based on a dry run, local checks, or historical release checks.
- No changeset: private app copy, hosting/operator config, tests, and docs only.
- Keep Codex docs tracked/sanitized but out of public navigation.

## Do not redo

- Do not redo npm publishing, deprecation, registry audit, or consumer smoke recovery.
- Do not recreate merged PR #48 or revert the preserved `prd-worker` name.
- Do not change PRD format/manifest/schema/validator/CLI/runtime semantics to solve hosting.
- Do not add a backend, Studio, Cloud authoring, accounts, AI, PRDc, payments, crypto, rights, or broad conversion.
- Do not remove GitHub Pages fallback or mark production QA complete before live verification.
