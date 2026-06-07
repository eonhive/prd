# SESSION_HANDOFF.md

## Current status

- PR `#46` (`[stannesi] separate hosted landing and viewer routes`) was merged into `main`.
- Local `main` was synced, then branch `thehive/prd-public-site-docs-hosting` was created.
- Current branch implements the public site/docs/hosting polish lane.
- The hosted app still lives in one deployable Vite app: `apps/prd-viewer-web`.
- Public app routes are now `/` = Home, `/viewer/` = PRD Web Viewer, and `/docs/` = public docs index.
- Cloudflare Pages at `prd.eonhive.com` is documented as the intended production host.
- GitHub Pages remains staging/fallback under `/prd/` until Cloudflare launch QA passes.

## Completed work

- Renamed user-facing hosted-app navigation from “Landing” to “Home” while keeping route `/`.
- Added `/docs/` to the app route helper and browser app shell.
- Added an in-app public docs index for Home, Getting Started, CLI, Format, Profiles, Examples, Viewer, Conformance, and Release/Operator Notes.
- Kept public docs as a navigation layer over canonical repo docs rather than copying or replacing `docs/`.
- Ensured public docs do not link tracked `codex/` planning or handoff files.
- Added Cloudflare/GitHub Pages hosting notes to the public docs surface.
- Added Cloudflare Pages `_redirects` SPA fallback for `/viewer/` and `/docs/` refreshes.
- Added GitHub Pages `404.html` fallback generation in the Pages workflow.
- Added `docs/governance/PRD_HOSTING_RUNBOOK.md`.
- Updated README, docs index, product docs, roadmap, build status, and backlog state.
- Marked `NEXT_STEPS.md` item `43` complete and added next launch-QA/polish items.

## In-progress work

- No code work is currently in progress.
- Branch is ready for commit/push/PR after final review.

## Changed files

- `BUILD_STATUS.md`
- `NEXT_STEPS.md`
- `README.md`
- `.github/workflows/viewer-demo-pages.yml`
- `apps/prd-viewer-web/public/_redirects`
- `apps/prd-viewer-web/src/App.tsx`
- `apps/prd-viewer-web/src/styles.css`
- `apps/prd-viewer-web/src/viewerDemoContent.ts`
- `apps/prd-viewer-web/src/viewerDemoContent.test.ts`
- `apps/prd-viewer-web/src/viewerRoutes.ts`
- `apps/prd-viewer-web/src/viewerRoutes.test.ts`
- `docs/README.md`
- `docs/foundation/04_PRD/PRD_ROADMAP.md`
- `docs/governance/PRD_HOSTING_RUNBOOK.md`
- `docs/product/PRD_AUTHORING_WORKFLOW.md`
- `docs/product/PRD_IMPORT_EXPORT_MATRIX.md`
- `docs/product/PRD_PRODUCT_BOUNDARIES.md`
- `codex/SESSION_HANDOFF.md`

## Commands run

- `git status --short --branch`
- GitHub connector: inspected and merged PR `#46`
- `git fetch origin main`
- `git switch main`
- `git pull --ff-only origin main`
- `git switch -c thehive/prd-public-site-docs-hosting`
- `PATH="/opt/homebrew/bin:$PATH" node_modules/.bin/tsc -b apps/prd-viewer-web/tsconfig.json --pretty false`
- `PATH="/opt/homebrew/bin:$PATH" pnpm exec vitest run apps/prd-viewer-web/src/viewerRoutes.test.ts apps/prd-viewer-web/src/viewerDemoContent.test.ts apps/prd-viewer-web/src/viewerArchiveFiles.test.ts apps/prd-viewer-web/src/viewerDocumentOutline.test.ts apps/prd-viewer-web/src/viewerRenderMode.test.ts apps/prd-viewer-web/src/viewerRenderMode.integration.test.ts`
- `PATH="/opt/homebrew/bin:$PATH" pnpm docs:check -- --include-root-docs`
- `git diff --check`
- `PATH="/opt/homebrew/bin:$PATH" pnpm viewer:demo:build`
- `PATH="/opt/homebrew/bin:$PATH" pnpm viewer:demo:dev -- --host 127.0.0.1 --port 5173`
- Browser verification at `http://localhost:5173/`
- Browser verification at `http://localhost:5173/viewer/`
- Browser verification at `http://localhost:5173/docs/`
- `PATH="/opt/homebrew/bin:$PATH" pnpm foundation:gate`

## Tests / verification

- Viewer route/content/render targeted tests passed: 6 files, 24 tests.
- `apps/prd-viewer-web` TypeScript build passed.
- `pnpm docs:check -- --include-root-docs` passed.
- `git diff --check` passed.
- `pnpm viewer:demo:build` passed and regenerated ignored hosted sample archives.
- Cloudflare Pages `_redirects` is expected to be copied into `apps/prd-viewer-web/dist` during Vite build.
- GitHub Pages workflow now creates `apps/prd-viewer-web/dist/404.html` during CI deployment.
- Browser verification confirmed:
  - `/` renders Home with route state `home`
  - `/viewer/` renders the PRD Web Viewer with route state `viewer`
  - `/docs/` renders the public docs index with route state `docs`
  - public docs sections render in the expected order
  - Cloudflare Pages and GitHub Pages hosting copy is visible
  - public docs contain no `codex/` links
  - browser console had no errors or warnings
- `pnpm foundation:gate` passed: build, tests, docs consistency, example validation, and aggregate example smoke.

## Known issues

- Cloudflare Pages production deployment is not configured or launch-QA verified yet.
- GitHub Pages remains staging/fallback until `prd.eonhive.com` passes launch QA.
- Hosted sample archives are generated ignored build assets and should not be committed.
- Manual `.prd` file-picker/drop upload was not automated in-browser; archive filtering remains covered by tests, and hosted sample loading exercises the same in-memory open path after archive bytes are available.

## Next recommended task

- Commit and open PR `[stannesi] add public docs and hosting path`.
- After merge, run `NEXT_STEPS.md` item `44`: configure/verify Cloudflare Pages for `prd.eonhive.com`, then launch-QA `/`, `/viewer/`, `/docs/`, hosted samples, route refresh, theme persistence, mobile layout, and manual `.prd` upload.

## Important decisions

- Keep one deployable app: `apps/prd-viewer-web`.
- Use route labels `/` Home, `/viewer/` Web Viewer, and `/docs/` public docs.
- Use Cloudflare Pages as intended production hosting for `prd.eonhive.com`.
- Keep GitHub Pages as staging/fallback under `/prd/`.
- Keep canonical docs in `docs/`; public `/docs/` is an index/navigation layer.
- Keep `codex/PLANS.md` and `codex/SESSION_HANDOFF.md` tracked but hidden from public docs/site navigation.
- Do not add a changeset; this is private app/docs/operator state.

## Do not redo

- Do not redo npm publication, deprecation, registry audit, or consumer smoke for `0.1.1`.
- Do not add Studio, Cloud authoring, PRDc product behavior, AI assistant, accounts/library, payment, crypto, rights, universal file viewer, DOCX/EPUB/PDF conversion, HTML import, or visual-editor behavior in this slice.
- Do not add new manifest fields, schema rules, validator issue codes, viewer support states, CLI commands, package exports, or npm release behavior in this slice.
