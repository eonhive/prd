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

Cloudflare Workers Static Assets is the intended production host for `prd.eonhive.com` (PRD-039). The same Vite app serves Home, Docs, the Web Viewer, and generated sample archives. It needs no Worker script, API, database, or document-upload service.

This replaces the earlier Cloudflare Pages configuration. Do not deploy this repository with `wrangler pages deploy` or configure it as a new Pages project.

GitHub Pages remains a staging and fallback host until the Cloudflare custom-domain path is live, route refresh works, hosted samples load, theme persistence works, and mobile QA passes.

The public docs route is a navigation layer over the canonical repository docs. Canonical docs remain in `docs/`. Codex operational docs remain tracked in `codex/` for workflow continuity, but they are not public docs, marketing pages, or site navigation entries.

## Build Inputs

The hosted app lives in `apps/prd-viewer-web`.

Current build surfaces:

```bash
pnpm viewer:demo:assets
pnpm viewer:demo:build
pnpm viewer:demo:build:cloudflare
pnpm viewer:demo:check:cloudflare
pnpm viewer:demo:preview:cloudflare
pnpm viewer:demo:deploy:cloudflare
pnpm viewer:demo:build:github-pages
pnpm viewer:demo:dev
```

`viewer:demo:assets` packs canonical examples and copies selected generated `.prd` archives into the ignored `apps/prd-viewer-web/public/examples/` directory.

It also inspects each archive using the existing validator and emits an adjacent
`.prd.inspection.json` file for the Home structure inspector. Invalid archives
fail asset preparation. Deploy these metadata files with the matching archives;
verify their sample IDs, manifest profile/entry, and archive byte counts as well
as the actual `.prd` bytes. A missing JSON asset may receive the SPA HTML shell
with HTTP 200; the inspector rejects it and offers retry while retaining access
to the reference Viewer. These files are app demo assets, not package members or
new PRD format contracts.

`viewer:demo:build:cloudflare` builds production assets with root-domain base path `/`.

`viewer:demo:check:cloudflare` rebuilds production assets and runs `wrangler deploy --dry-run`. It validates the deployment configuration without publishing or requiring Cloudflare login.

`viewer:demo:preview:cloudflare` rebuilds and serves those assets through the local Workers runtime, rather than Vite's development server.

`viewer:demo:deploy:cloudflare` rebuilds and deploys the production assets. It requires authorized Cloudflare credentials. It is not an npm release command.

`viewer:demo:build:github-pages` is the staging/fallback GitHub Pages build. It uses base path `/prd/`.

Hosted sample archives are demo assets only. They do not define a PRD network-loading guarantee and do not change the reference viewer truth: eager whole-package in-memory loading.

The root `wrangler.toml` declares `assets.directory = "./apps/prd-viewer-web/dist"` and `assets.not_found_handling = "single-page-application"`. Workers serves existing static files directly and handles SPA navigation to `/viewer/` and `/docs/`. The former Pages `_redirects` catch-all is removed so it does not override native asset routing. The GitHub Pages workflow still copies `index.html` to `404.html` for fallback route refreshes.

## Workers Builds Setup

Use Cloudflare's Git-connected Workers Builds for production publication from `main`:

| Setting | Value |
| --- | --- |
| Project type | Worker, not Pages |
| Worker name | `prd-worker` (must match `wrangler.toml`) |
| Repository | `eonhive/prd` |
| Production branch | `main` |
| Root directory | Repository root |
| Node version | Node 22 (`NODE_VERSION=22`) |
| Package manager | `pnpm@10.32.1`, as pinned in `package.json` |
| Build command | `pnpm viewer:demo:build:cloudflare` |
| Deploy command | `pnpm exec wrangler deploy` |
| Assets output | `apps/prd-viewer-web/dist`, configured in `wrangler.toml` |

Let the build environment install dependencies using `pnpm install --frozen-lockfile`. Wrangler is pinned in the root dev dependencies; do not rely on an unpinned global CLI. Workers has no Pages-style dashboard build-output field.

Do not set the Cloudflare project root to `apps/prd-viewer-web`. The production build needs the repository root so it can build the CLI, pack example archives, copy hosted demo assets, and then build the Vite app.

If a failed Pages project already exists, leave its domain configuration alone until the Worker is verified on its assigned `workers.dev` URL. Do not configure both hosts to publish the same production hostname.

For an authorized manual deployment, run `pnpm exec wrangler whoami` to confirm the account, then `pnpm viewer:demo:deploy:cloudflare`. Use `pnpm exec wrangler login` when interactive authentication is needed or an old Pages-only login lacks Workers permissions. Have the account owner review and authorize the requested scopes. Never commit credentials or paste API tokens into chat. Workers Builds can manage its own deployment token; an external CI runner needs a secret `CLOUDFLARE_API_TOKEN` and the intended `CLOUDFLARE_ACCOUNT_ID`.

## Custom Domain And Launch QA

1. Verify the Worker on its assigned `workers.dev` URL first.
2. Confirm `eonhive.com` is an active zone in the intended Cloudflare account.
3. In the Worker's Settings, Domains & Routes, add Custom Domain `prd.eonhive.com`. If an old Pages assignment or CNAME conflicts, resolve that assignment deliberately before cutover; do not delete unrelated DNS records.
4. Verify HTTPS on `https://prd.eonhive.com/`, then direct navigation and hard refresh at `/viewer/` and `/docs/`.
5. Open `document-basic.prd`, `comic-basic.prd`, and `storyboard-basic.prd` through the hosted sample buttons. Confirm archive responses contain the actual package bytes, not the HTML shell.
6. Verify manual `.prd` upload/drop, package status/facts, attachments/localization where declared, and structured rendering.
7. Verify dark/light theme persistence after reload, browser back/forward, and single-column mobile layouts.
8. Check archive response bytes, not just HTTP success: native SPA fallback can return `index.html` with HTTP 200 for a missing archive URL. The existing viewer rejects that response during package parsing; a successful response alone is not proof that a sample exists.
9. Keep GitHub Pages as fallback and leave `NEXT_STEPS.md` item 44 open until production QA passes. A local build or dry run does not prove that the public domain is live.

When diagnosing a failed Cloudflare build, capture the first failing command and error after dependency installation. A successful install log alone does not establish the deployment failure.

### Verification Record: October 25, 2026

PR #50 is merged at `a9d77d9`, and `https://prd.eonhive.com/` shows the merged usability pass. Browser access is now enabled. Earlier live HTTP checks passed for all three routes, JavaScript/CSS, and four downloaded sample archives; the archives were unzipped and validated with the existing validator and expected profiles.

| Check | Verified surface | Result / remaining work |
| --- | --- | --- |
| Home/Docs/Viewer presentation | Production browser | Desktop dark/light Home and mobile Home/Docs/Viewer reviewed; mobile document stage precedes rails without horizontal overflow. |
| Routes/history | Production browser | Home to Docs, back/forward, and direct Viewer/Docs navigation and refresh passed. |
| Theme persistence | Production browser | Saved light theme survived a Home reload. |
| Sample rendering | Production browser | Document Basic, Comic Basic, and Storyboard Basic opened as fully supported with real package facts. |
| Localization/attachments | Production browser | Document Basic exposed its attachment and French locale; changing locale changed both text and the inline image resource. |
| Native archive selection | Production browser | The header Open action selected a local canonical comic archive and opened it successfully. |
| Outline/keyboard corrections | Local Workers preview | Outline selects panel/frame 3, focus continues on the active stage, Left returns to item 2, and repeated selection works. Same-file reopen resets to item 1. Authored document/heading anchors resolve, with root targets clear of the sticky header. |
| Invalid-package correction | Local Workers preview | A ZIP missing required `entry` shows `entry-required` and a validation-failure message, not an unsupported runtime entry-mode message. Reopening a valid archive recovers. |
| Mobile corrections | Local Workers preview | Dark/light comic layout and exact theme-toggle accessible labels passed at a 390px viewport; no horizontal overflow. |
| Actual file drag/drop | Not exercised | Native chooser checks and file-helper unit tests are not proof of OS drag/drop. |
| Deployment ownership/configuration | Not independently confirmed | A reachable app does not prove the intended Cloudflare account, Worker name, build command, or deployment branch is configured. |

The corrective outline/feedback changes are not yet a production verification claim. After review and deployment, repeat those local regression checks on the public domain, finish real drag/drop, and confirm Workers Builds settings with the account owner. Keep backlog item 44 open and GitHub Pages available until those checks pass. No hosting credentials, permissions, DNS, or production deployment were changed during this QA pass.

Reference docs:

- [Workers Static Assets migration from Pages](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Workers SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

### Living Homepage Review: October 26, 2026

The initial Living Homepage review was prepared on
`thehive/prd-living-homepage`, based on `main` after PR #51 merged, and subsequently
merged in PR #52. That local review is not a production launch verification.
Keep backlog items 44 and 48 open.

| Acceptance area | Evidence | Remaining check |
| --- | --- | --- |
| Six chapters and controls | Earlier local browser checks covered desktop dark/light, narrow layouts, devices, layers, and layout studies. | Repeat interactive checks on the reviewed production build. |
| Embedded reference Viewer | Earlier local browser checks opened valid document/comic/storyboard packages and retained locale/panel selections across focus changes. | Recheck public samples and Escape inside the iframe after deployment. |
| Scheduler/performance boundaries | Automated tests cover input coalescing, cached geometry, offscreen/finished-story pointer suspension, reduced motion, visibility, and cleanup. | Physical lower-end hardware and long-session profiling. |
| Accessibility | Semantic markup, browser accessibility-tree inspection, focus restoration, and iframe Escape were checked locally. | Physical touch and actual screen-reader announcement/navigation checks. |
| Interactive QA access at initial review | Local browser automation became disabled in Work settings during launch-readiness review. | Access returned for the package handoff follow-up recorded below; physical checks still remain. |

Builds and dry runs validate source and deployment configuration only. Review
the pinned uRK provenance in `apps/prd-viewer-web/vendor/README.md`, then deploy
through the existing `main`/Cloudflare path after review. This work does not
change hosting credentials, account access, DNS, or release automation.

The package handoff follow-up on `thehive/prd-package-handoff` adds actual
archive-derived inspection and selection-preserving download/workspace links.
Fresh local browser checks cover metadata disclosures, document/comic/segmented
sample selection, the real segmented renderer, Viewer-toolbar selection,
iframe Escape/focus restoration, missing-metadata retry recovery, dark/light
themes, and 390px/320px layouts. Mobile review found a fixed stage offset could
overlap the inspector; the shared runtime now caches copy-end measurements on
resize and places the sheet below the content, including open disclosures.
Keyboard disclosure activation and motion-off idle suspension passed. A
storyboard downloaded using the final CTA passed CLI validation. These are
local browser checks, not physical touch, screen-reader, lower-end hardware,
or production launch sign-off.

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
