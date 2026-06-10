# SESSION_HANDOFF.md

## Current status

- PR `#47` (`[stannesi] add public docs and hosting path`) is merged into `main`.
- Local `main` was fast-forwarded to `origin/main`.
- Current branch is `thehive/cloudflare-pages-build-config`.
- This branch addresses Cloudflare Pages build ambiguity after the hosted public site/docs lane.
- The user pasted only the Cloudflare dependency-install portion of the failing build log, so the exact failing line was not available.

## Completed work

- Added root script `viewer:demo:build:cloudflare` for production Cloudflare Pages builds with root-domain base path `/`.
- Added root script `viewer:demo:build:github-pages` for GitHub Pages staging/fallback builds with base path `/prd/`.
- Updated `.github/workflows/viewer-demo-pages.yml` to use `pnpm viewer:demo:build:github-pages`.
- Added root `wrangler.toml` declaring Cloudflare Pages output directory `apps/prd-viewer-web/dist`.
- Updated the hosting runbook with exact Cloudflare dashboard settings:
  - project root: repository root
  - build command: `pnpm viewer:demo:build:cloudflare`
  - output directory: `apps/prd-viewer-web/dist`
- Updated README, docs index, build status, and backlog state.

## In-progress work

- Implementation and validation are complete locally.
- Branch is ready for commit/push/PR.

## Changed files

- `.github/workflows/viewer-demo-pages.yml`
- `BUILD_STATUS.md`
- `NEXT_STEPS.md`
- `README.md`
- `codex/SESSION_HANDOFF.md`
- `docs/README.md`
- `docs/governance/PRD_HOSTING_RUNBOOK.md`
- `package.json`
- `wrangler.toml`

## Commands run

- `git status --short --branch`
- `git fetch origin main`
- `git switch main`
- `git pull --ff-only origin main`
- `git switch -c thehive/cloudflare-pages-build-config`
- `PATH="/opt/homebrew/bin:$PATH" pnpm viewer:demo:build:cloudflare`
- `PATH="/opt/homebrew/bin:$PATH" pnpm docs:check -- --include-root-docs`
- `git diff --check`
- `PATH="/opt/homebrew/bin:$PATH" pnpm viewer:demo:build:github-pages`
- `PATH="/opt/homebrew/bin:$PATH" pnpm foundation:gate`

## Tests / verification

- `PATH="/opt/homebrew/bin:$PATH" pnpm viewer:demo:build:cloudflare` passed.
- `PATH="/opt/homebrew/bin:$PATH" pnpm viewer:demo:build:github-pages` passed.
- `PATH="/opt/homebrew/bin:$PATH" pnpm docs:check -- --include-root-docs` passed.
- `git diff --check` passed.
- `PATH="/opt/homebrew/bin:$PATH" pnpm foundation:gate` passed: build, tests, docs consistency, example validation, and aggregate example smoke.

## Known issues

- The exact Cloudflare failing command/error line was not included in the pasted log.
- Cloudflare Pages still needs to be configured in the dashboard to build from repository root with `pnpm viewer:demo:build:cloudflare` and output `apps/prd-viewer-web/dist`.
- Cloudflare launch QA is still pending after build succeeds.

## Next recommended task

- Commit, push, and open a PR for the Cloudflare build-config fix.
- After merge, retry Cloudflare Pages with the documented settings.

## Important decisions

- Cloudflare production uses base path `/`.
- GitHub Pages staging/fallback uses base path `/prd/`.
- Cloudflare Pages must build from repo root, not `apps/prd-viewer-web`, because hosted sample preparation needs the CLI and examples.
- No PRD manifest, schema, validator, CLI command, viewer runtime, npm package, Studio, Cloud authoring, PRDc, payment, crypto, rights, or broad conversion behavior changes belong in this fix.

## Do not redo

- Do not redo npm release work.
- Do not change PRD package format semantics.
- Do not replace the one-app Home/docs/viewer route model.
- Do not remove `codex/PLANS.md` or `codex/SESSION_HANDOFF.md`; keep them tracked but hidden from public docs/site navigation.
