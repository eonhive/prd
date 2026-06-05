# SESSION_HANDOFF.md

## Current status

- PR `#43` (`[stannesi] add public viewer demo ux`) is merged into `main` at `2f3e2221a70fcc13a843b9e0db204d0ca22b0b8a`.
- Local `main` was fast-forwarded to `origin/main`.
- Current branch is `thehive/prd-landing-viewer-dashboard`, based on merged `main`.
- This branch implements `NEXT_STEPS.md` item `42`: hosted PRD landing page plus reference web viewer demo/deployment path.
- Scope remains one deployable app under `apps/prd-viewer-web`.
- No manifest, schema, validator, CLI command, package export, npm package, Studio, Cloud, PRDc, AI assistant, account/library, payment, crypto, rights, universal viewer, or broad conversion behavior was added.
- No changeset was added.

## Completed work

- Added a premium dark/light PRD landing page and viewer workspace inside the existing web viewer app.
- Added persistent theme selection with dark mode as the default.
- Added landing content for the real public loop: `prd init/import -> validate -> inspect -> pack -> open`.
- Added dashboard-style viewer chrome while preserving the existing validator-first archive open path and renderer behavior.
- Added hosted sample archive loading for generated examples. Hosted samples load through the same eager whole-package in-memory open path as user-selected `.prd` archives.
- Added `apps/prd-viewer-web/src/viewerArchiveFiles.ts` and tests for `.prd` archive selection and hosted sample URL behavior.
- Expanded `apps/prd-viewer-web/src/viewerDemoContent.ts` and tests for landing capabilities, profile cards, command copy, sample archive labels, and future-lane disclaimers.
- Added `scripts/prepare-viewer-demo-assets.mjs` and tests to copy generated `.prd` archives from `examples/dist` into ignored `apps/prd-viewer-web/public/examples/`.
- Added root scripts: `viewer:demo:assets`, `viewer:demo:build`, and `viewer:demo:dev`.
- Added `.github/workflows/viewer-demo-pages.yml` for GitHub Pages deployment using `PRD_VIEWER_BASE_PATH=/prd/`.
- Updated README, docs index, product-boundary docs, authoring workflow, import/export matrix, roadmap, build status, and backlog state.
- Marked `NEXT_STEPS.md` item `42` complete and added item `43` for hosted-demo launch QA.

## In-progress work

- Implementation and validation are complete locally.
- Commit, push, and open PR `[stannesi] add hosted landing and viewer dashboard`.

## Changed files

- [.gitignore](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/.gitignore)
- [viewer-demo-pages.yml](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/.github/workflows/viewer-demo-pages.yml)
- [package.json](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/package.json)
- [App.tsx](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/apps/prd-viewer-web/src/App.tsx)
- [styles.css](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/apps/prd-viewer-web/src/styles.css)
- [viewerArchiveFiles.ts](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/apps/prd-viewer-web/src/viewerArchiveFiles.ts)
- [viewerArchiveFiles.test.ts](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/apps/prd-viewer-web/src/viewerArchiveFiles.test.ts)
- [viewerDemoContent.ts](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/apps/prd-viewer-web/src/viewerDemoContent.ts)
- [viewerDemoContent.test.ts](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/apps/prd-viewer-web/src/viewerDemoContent.test.ts)
- [vite.config.ts](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/apps/prd-viewer-web/vite.config.ts)
- [prepare-viewer-demo-assets.mjs](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/scripts/prepare-viewer-demo-assets.mjs)
- [prepare-viewer-demo-assets.test.ts](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/scripts/prepare-viewer-demo-assets.test.ts)
- [README.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/README.md)
- [docs/README.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/docs/README.md)
- [PRD_PRODUCT_BOUNDARIES.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/docs/product/PRD_PRODUCT_BOUNDARIES.md)
- [PRD_AUTHORING_WORKFLOW.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/docs/product/PRD_AUTHORING_WORKFLOW.md)
- [PRD_IMPORT_EXPORT_MATRIX.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/docs/product/PRD_IMPORT_EXPORT_MATRIX.md)
- [PRD_ROADMAP.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/docs/foundation/04_PRD/PRD_ROADMAP.md)
- [BUILD_STATUS.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/BUILD_STATUS.md)
- [NEXT_STEPS.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/NEXT_STEPS.md)
- [SESSION_HANDOFF.md](/Users/nappy.cat/Labs/eonHive.lab/prd.lab/prd/codex/SESSION_HANDOFF.md)

## Commands run

- `git status --short --branch`
- `git fetch origin main`
- `git switch main`
- `git pull --ff-only origin main`
- `git switch -c thehive/prd-landing-viewer-dashboard`
- `PATH="/opt/homebrew/bin:$PATH" node_modules/.bin/tsc -b apps/prd-viewer-web/tsconfig.json --pretty false`
- `PATH="/opt/homebrew/bin:$PATH" pnpm exec vitest run apps/prd-viewer-web/src/viewerDemoContent.test.ts apps/prd-viewer-web/src/viewerArchiveFiles.test.ts scripts/prepare-viewer-demo-assets.test.ts`
- `PATH="/opt/homebrew/bin:$PATH" pnpm exec vitest run apps/prd-viewer-web/src/viewerDemoContent.test.ts apps/prd-viewer-web/src/viewerArchiveFiles.test.ts scripts/prepare-viewer-demo-assets.test.ts apps/prd-viewer-web/src/viewerRenderMode.test.ts apps/prd-viewer-web/src/viewerRenderMode.integration.test.ts`
- `PATH="/opt/homebrew/bin:$PATH" pnpm viewer:demo:build`
- `PATH="/opt/homebrew/bin:$PATH" pnpm docs:check -- --include-root-docs`
- `git diff --check`
- `PATH="/opt/homebrew/bin:$PATH" pnpm typecheck`
- `PATH="/opt/homebrew/bin:$PATH" pnpm viewer:demo:dev -- --host 127.0.0.1 --port 5173`
- Browser verification at `http://localhost:5173/`
- `PATH="/opt/homebrew/bin:$PATH" pnpm foundation:gate`

## Tests / verification

- `PATH="/opt/homebrew/bin:$PATH" node_modules/.bin/tsc -b apps/prd-viewer-web/tsconfig.json --pretty false` passed.
- Targeted viewer/script tests passed: 5 files, 18 tests.
- `PATH="/opt/homebrew/bin:$PATH" pnpm viewer:demo:build` passed and generated ignored hosted sample archives.
- `PATH="/opt/homebrew/bin:$PATH" pnpm docs:check -- --include-root-docs` passed.
- `git diff --check` passed.
- `PATH="/opt/homebrew/bin:$PATH" pnpm typecheck` passed.
- `PATH="/opt/homebrew/bin:$PATH" pnpm foundation:gate` passed: 18 test files, 177 tests, docs consistency, example validation, and aggregate example smoke.
- Browser desktop verification passed for:
  - premium dark landing surface
  - light mode toggle and theme DOM state
  - hosted sample buttons
  - dashboard viewer workspace
  - hosted `document-basic`, `comic-basic`, and `storyboard-basic` sample open paths
  - no browser console warnings/errors
- Browser mobile verification passed for light/dark single-column layout with samples and drop zone present.
- Screenshot artifacts:
  - `/tmp/prd-hosted-viewer-screens/desktop-dark.png`
  - `/tmp/prd-hosted-viewer-screens/desktop-light.png`
  - `/tmp/prd-hosted-viewer-screens/desktop-loaded-storyboard.png`
  - `/tmp/prd-hosted-viewer-screens/mobile-light.png`
  - `/tmp/prd-hosted-viewer-screens/mobile-dark.png`

## Known issues

- GitHub Pages must be enabled/configured for the repository environment before the new workflow can publish a live URL.
- Hosted sample archives are generated build assets and are intentionally ignored in git.
- Hosted sample loading is web-demo behavior only and does not change PRD's packaged-first loading semantics.
- The in-app Browser Playwright subset still does not expose local file upload control, so manual file-picker/drop upload could not be automated visually. Archive selection is covered by `viewerArchiveFiles` tests, and hosted sample loading exercises the same package-open/render path after bytes are available.

## Next recommended task

- Commit, push, and open PR `[stannesi] add hosted landing and viewer dashboard`.
- After the PR lands, run `NEXT_STEPS.md` item `43`: launch QA against the live GitHub Pages URL and choose the next focused viewer/product polish step.

## Important decisions

- Use one app: `apps/prd-viewer-web`.
- Use GitHub Pages for the public hosted demo path.
- Support both light mode and premium dark mode; dark mode is default.
- Keep hosted samples as generated demo assets instead of committed `.prd` binaries.
- Keep the viewer truth as eager whole-package in-memory loading.

## Do not redo

- Do not redo npm publication, deprecation, registry audit, or consumer smoke for `0.1.1`.
- Do not add Studio, Cloud, PRDc, AI assistant, library/accounts, payment, crypto, rights, universal file viewer, DOCX/EPUB/PDF conversion, HTML import, or visual-editor behavior to this slice.
- Do not add new manifest fields, schema rules, validator issue codes, viewer support states, CLI commands, package exports, or npm release behavior for this slice.
