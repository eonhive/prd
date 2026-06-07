# PRD Hosting Runbook

## Purpose

This runbook defines the intended public hosting path for the PRD public site and reference Web Viewer demo.

It covers deployment ownership only. It does not change PRD package validity, manifest shape, viewer conformance, CLI behavior, npm releases, or runtime loading semantics.

## Public Routes

Production target:

- `https://prd.eonhive.com/` = Home
- `https://prd.eonhive.com/viewer/` = PRD Web Viewer workspace
- `https://prd.eonhive.com/docs/` = public docs index

Temporary staging/fallback target:

- GitHub Pages continues to serve the same Vite app under the repository base path `/prd/`.
- GitHub Pages routes are `/prd/`, `/prd/viewer/`, and `/prd/docs/`.

## Hosting Policy

Cloudflare Pages is the intended production host for `prd.eonhive.com`.

GitHub Pages remains a staging and fallback host until the Cloudflare custom-domain path is live, route refresh works, hosted samples load, theme persistence works, and mobile QA passes.

The public docs route is a navigation layer over the canonical repository docs. Canonical docs remain in `docs/`. Codex operational docs remain tracked in `codex/` for workflow continuity, but they are not public docs, marketing pages, or site navigation entries.

## Build Inputs

The hosted app lives in `apps/prd-viewer-web`.

Current build surfaces:

```bash
pnpm viewer:demo:assets
pnpm viewer:demo:build
pnpm viewer:demo:dev
```

`viewer:demo:assets` packs canonical examples and copies selected generated `.prd` archives into the ignored `apps/prd-viewer-web/public/examples/` directory.

Hosted sample archives are demo assets only. They do not define a PRD network-loading guarantee and do not change the reference viewer truth: eager whole-package in-memory loading.

The Vite public directory includes `_redirects` so Cloudflare Pages serves the SPA entry for `/viewer/` and `/docs/` refreshes. The GitHub Pages workflow copies `index.html` to `404.html` after build for the same staging/fallback route behavior.

## Cloudflare Setup Checklist

1. Create or select the Cloudflare Pages project for `apps/prd-viewer-web`.
2. Configure production domain `prd.eonhive.com`.
3. Build with a root-domain base path, not the GitHub Pages `/prd/` base path.
4. Ensure generated demo assets are prepared before the Vite build.
5. Verify direct refresh for `/`, `/viewer/`, and `/docs/`.
6. Verify hosted sample archives open through the same viewer path as manual `.prd` uploads.
7. Verify dark/light theme persistence on production.
8. Verify desktop and mobile layouts.

Reference docs:

- Cloudflare Pages custom domains: `https://developers.cloudflare.com/pages/configuration/custom-domains/`
- Cloudflare Pages direct upload: `https://developers.cloudflare.com/pages/get-started/direct-upload/`

## GitHub Pages Fallback

The existing `.github/workflows/viewer-demo-pages.yml` workflow remains the fallback/staging deployment path.

It builds with `PRD_VIEWER_BASE_PATH=/prd/` and deploys `apps/prd-viewer-web/dist`.

Reference docs:

- GitHub Pages custom domains: `https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site`

## Do Not Add In This Lane

- Accounts, sign-in, pricing, checkout, or free-trial behavior
- Studio, Cloud authoring, PRDc archive product behavior, or AI assistant behavior
- New manifest fields or schema semantics
- New validator rules
- New CLI commands
- New npm package exports or release behavior
- Streaming, range requests, worker unzip, lazy section fetch, or network-loading format claims
