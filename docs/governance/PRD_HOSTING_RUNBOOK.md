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
pnpm viewer:demo:check:hosted
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

For comic/storyboard examples, preparation also writes adjacent
`.prd.preview.json` and `examples/previews/<sample-id>/` images for Chapter 04.
Deploy those alongside their archives. The excerpts contain the first three
ordered source images, copied byte-for-byte from manifest-declared resources,
plus authored alt text and captions/notes. They are private homepage assets;
the embedded reference Viewer continues to open the original valid archive.

`viewer:demo:build:cloudflare` builds production assets with root-domain base path `/`.

`viewer:demo:check:cloudflare` rebuilds production assets and runs `wrangler deploy --dry-run`. It validates the deployment configuration without publishing or requiring Cloudflare login.

`viewer:demo:preview:cloudflare` rebuilds and serves those assets through the local Workers runtime, rather than Vite's development server.

`viewer:demo:deploy:cloudflare` rebuilds and deploys the production assets. It requires authorized Cloudflare credentials. It is not an npm release command.

`viewer:demo:build:github-pages` is the staging/fallback GitHub Pages build. It uses base path `/prd/`.

Hosted sample archives are demo assets only. They do not define a PRD network-loading guarantee and do not change the reference viewer truth: eager whole-package in-memory loading.

The root `wrangler.toml` declares `assets.directory = "./apps/prd-viewer-web/dist"` and `assets.not_found_handling = "single-page-application"`. Workers serves existing static files directly and handles SPA navigation to `/viewer/` and `/docs/`. The former Pages `_redirects` catch-all is removed so it does not override native asset routing. The GitHub Pages workflow still copies `index.html` to `404.html` for fallback route refreshes.

## Hosted HTTP And Package Smoke

After a deployment, run from the repository root:

```bash
pnpm viewer:demo:check:hosted
pnpm viewer:demo:check:hosted -- --url https://your-preview.workers.dev/
pnpm viewer:demo:check:hosted -- --url https://eonhive.github.io/prd/
```

The command builds the existing validator and defaults to `https://prd.eonhive.com/`. Run it against a demo deployment you own, without credentials, query strings, or fragments in its base URL. It never publishes, uploads a user document, changes hosting settings, or executes the downloaded JavaScript.

The check verifies Home/Viewer/Docs HTML shells, their same-origin/base-path module and CSS entry assets, all four canonical hosted sample archives, and their adjacent inspection JSON. Archives pass the existing validator with their expected profiles. Inspection metadata must match the downloaded archive's manifest, archive bytes, logical file count, and logical byte total. This catches stale/missing JSON and HTTP 200 SPA fallbacks rather than trusting a successful HTTP status.

The profile follow-up adds preview metadata and exact image-byte/MIME checks
against each validated visual archive. A healthy deployment now reports 21
checks (the earlier 13 plus two preview JSON files and six source images).
Older deployments without these assets are expected to fail the new checks.
This verifies source correspondence, not browser decoding or visual acceptance.

Diagnostics are written to ignored `examples/dist/viewer-hosted-smoke-summary.json` using contract `prd-hosted-demo-smoke-v0.1`: generation time, normalized base URL, overall status, and individual URL/check results. Successful archive results include a SHA-256 diagnostic digest; it is not a signature or authenticity claim. Ordinary check failures retain the artifact and exit nonzero. Each response has a 15-second timeout and a 16 MiB smoke-download safety budget; these are operator guardrails for the fixed demo assets, not PRD validity limits. Temporary downloads are removed after inspection. Redirects and out-of-base/origin entry assets are rejected.

The summary explicitly reports `scope: "http-assets-and-packages-only"` and `browserAcceptance: "not-assessed"`. A passing smoke check does **not** verify rendering, pointer/touch behavior, drag/drop, focus/history/theme persistence, screen readers, hardware performance, or deployment account ownership. Keep launch items 44/48 open until their real checks pass. The command stays separate from `foundation:gate` so offline/local conformance does not depend on the public host.

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

### Viewer Target Follow-Up: October 27, 2026

PR #51 is merged. Its review identified that a valid authored panel/frame/root ID could duplicate a viewer-shell ID such as `document-stage`, `main-content`, or `package-details`. The follow-up maps document, content-node, panel, and frame IDs into separate viewer-local DOM namespaces and maps outline/content fragment links to the same targets. Package IDs and validator validity rules are unchanged.

PR #54 is now merged at `9075994`; its CI passed and Cloudflare reported a successful commit preview. A fresh `viewer:demo:check:hosted` run passed all 13 checks against the production domain, including the four archives and matching inspection facts. Browser use is currently disabled in Work settings, so no new deployed pointer/anchor, drag/drop, or visual acceptance is claimed by this follow-up.

Local production-build browser checks opened validator-valid static comic/storyboard collision archives and confirmed no duplicate DOM IDs. Keyboard activation resolved outline links to the intended cards and root, not shell controls. Document Basic's in-content rationale link and interactive comic selection/focus/Left navigation also passed. Rendered-markup tests cover both static and active visual views, structured/resume nodes, shared root/visual IDs, and escaped fragments. These checks are not a production deployment claim or a substitute for real drag/drop, physical-device, or assistive-technology acceptance. Recheck the namespaced targets after deployment and retain the fallback host.

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

The October 27 sample-continuity follow-up adds an authenticated application
message bridge so sample choices inside the embedded Viewer update the Home
inspector and final download, and Home choices load in the existing iframe.
DOM integration tests exercise actual React updates and canonical sample bytes,
including repeated-command locale/resource continuity, late fetch success/error,
late file reads, local-file privacy, failed-load recovery and Strict Mode startup.
Local browser use was disabled again in Work settings during this follow-up;
these tests are not a new visual, touch, screen-reader or production interaction
pass. After review/deployment, select a different example inside the iframe,
confirm the Home inspector/download follow it, return to the same example after
a local open, and confirm Escape/focus and mobile layout still work.


### Profile Presentation Follow-Up: October 27, 2026

Browser access returned for the Chapter 04 profile follow-up. Local production-
build checks covered six compositions at desktop width, stacked 390px/320px
layouts, the 236px document surface, keyboard wrapping/Home/End, 44px tab targets,
actual comic/storyboard image decoding, and expanded descriptions remaining above
the shared sheet. The real comic Viewer opened valid bytes and retained panel 2
through close/reopen. No browser console warnings/errors were observed. DOM/runtime
tests additionally cover stale requests, metadata/image retry, persistent nodes,
finite tween completion, dynamic reduced-motion cancellation, and offscreen work.

Local HTTP/package smoke passed all 21 checks under both hosting bases. Browser
use was disabled again before final hosted-preview review, so no fresh hosted
browser acceptance is claimed. After review and
deployment, rerun it against the new preview/public build; older production builds
lack these new media assets. Recheck profile selection, source descriptions,
Viewer/inspector/download continuity, and motion-off behavior on that build.
Physical touch, assistive technologies, lower-end hardware, deployment ownership,
and production launch acceptance remain open under items 44/48.

### October 27 Rebrand Rollout And Reader Keyboard Follow-Up

[PR #59](https://github.com/eonhive/prd/pull/59) merged at `8438760`. Its GitHub
validation and Workers preview build passed. The automatic production rollout
was then observed on `prd.eonhive.com`; the served app contains the reviewed
purple rebrand, and all 21 production HTTP/asset/package checks passed. This
updates the earlier browser-disabled records without replacing their history.

| Check | Evidence and remaining work |
| --- | --- |
| Hosted rebrand | Home artwork decoded; preview theme persistence, Docs/Viewer hard refresh and a rendered Document Basic example passed. Production Home showed the new brand and the 21-check HTTP/package gate passed. |
| Desktop keyboard correction | Production closing of either side panel dropped focus to the body. The local built correction restores Navigate/Details focus, with Tab continuation and retained French content/image URL. Recheck the correction after deployment. |
| Search and completion feedback | Local browser accessibility state exposes matching/total and zero-result counts plus the active package title. DOM tests cover dynamic counts, busy transitions and retained document state. Actual screen-reader speech remains unverified. |
| Mobile drawers | Local 390px browser checks retain native Escape/close focus restoration and have no horizontal overflow. This is viewport testing, not physical touch acceptance. |
| Launch sign-off | Real OS file drag/drop, physical touch, actual screen readers, constrained-device profiling and deployment-owner confirmation remain open under items 44/48. |

The keyboard/status follow-up changes only private app chrome and tests. It adds
no dependency, upload service, package rule or runtime capability. Generated
screenshots and acceptance notes belong under ignored
`examples/dist/reader-accessibility/`.

### October 27 Reader Deployment And File-Drop Follow-Up

[PR #60](https://github.com/eonhive/prd/pull/60) merged at `2367123`. A fresh
production HTTP/package run passed all 21 checks. The served JavaScript and CSS
also matched the reviewed build byte-for-byte; diagnostic SHA-256 values are
retained under ignored `examples/dist/production-acceptance/reviewed-assets.json`.
This confirms deployed assets, not execution or screen-reader speech. Local
browser use reported disabled in Work settings, so fresh production interactions
were not exercised and the remaining launch matrix stays open.

The file-drop follow-up is app-only: file drags retain their highlight across
nested controls, clear on exit/drop and show a copy cursor; text drags do not
cause archive-open errors. DOM tests dispatch the real React event handlers with
explicit transfer fixtures and actual canonical archive bytes, covering absent
related targets, privacy markers, unsupported-file rejection and recovery.
Selection and the validator/renderer path are unchanged. After review/deployment,
exercise real OS file drags into the named drop area, across its children, out
of the region, and through valid/invalid/recovery opens. Keep items 44/48 open
until those and the physical assistive/device checks pass.
### Motion Lifecycle Follow-Up: October 27, 2026

The motion hardening slice settles in-flight device widths as well as profile
reveals when the Viewer takes focus, the story is offscreen/finished, the page
is hidden, or reduced motion is requested. Pending offscreen paints and stale
ambient wake-ups are released. New suspended selections apply immediately;
return-to-view uses the latest native scroll state, and repeated disposal is safe.

Runtime regressions exercise the actual uRK scheduler with deterministic frame
fixtures, including 30 mount/dispose cycles without retained frame/timer work.
Browser automation is disabled for this follow-up. After deployment, repeat a
device switch followed immediately by Viewer entry, story exit/return, and tab
hide/return; verify the final device width, selection, and normal interaction.
Measure real frame time and heap behavior on constrained hardware separately.
These tests do not close physical/accessibility/production launch items 44/48.

### October 28 Merged Deployment Verification

PR #61 and PR #62 are merged through main `317c365`. The combined foundation
gate passes 429 tests across 34 files, and PR #62's final head `97b7adc` has
successful GitHub validation and Cloudflare build checks. Fresh production
HTTP/package checks pass all 21 cases. Served entry JS/CSS match the tested
integrated build byte-for-byte; diagnostic hashes are retained under ignored
`examples/dist/production-acceptance/merged-file-drop-assets.json`.

This is static deployment and package evidence. Browser use remains disabled
in Work settings. Repeat the deployed focus/search, file-drop and motion
interaction checks when browser access is available, and complete the real
OS/assistive/device and deployment-owner checks before closing items 44/48.

### Optional Audio Lifecycle Follow-Up: October 28, 2026

Homepage startup now invalidates delayed audio requests when the page is hidden,
muted or disposed. Returning to view requires a fresh opt-in; stale playback or
analysis completion cannot announce playing or produce a playback-error message.
Fresh opt-in can proceed before a cancelled native promise settles; a second
toggle can cancel a pending opt-in. Current playback errors retain feedback,
missing Web Audio retains plain sound, and mute clears the spectrum level
immediately. Existing uRK transport pause,
analysis disable and kernel cleanup own the resources; no runtime dependency or
package semantics change.

Deterministic tests exercise the real audio adapter using substituted native
media/context APIs, including source URL cleanup and reuse after cancellation.
Browser automation is disabled for this follow-up. After review/deployment, test
sound opt-in followed quickly by tab hide/return during a throttled first load;
verify sound stays off, then enable it explicitly. Check mute and the visual level
with motion off, ordinary playback without analysis, and genuine playback-error
feedback/retry. Audible/browser autoplay, physical devices, accessibility and
production sign-off remain under items 44/48.

### October 29 Runtime-Unavailable Follow-Up

PR #66 is merged at `5afc1d9`; its validation, Pages and Workers builds passed.
Fresh production HTTP/assets/package checks passed all 21 cases on
`prd.eonhive.com`. Local browser use still reports disabled in Work settings;
these checks do not establish audible playback or deployed interaction acceptance.

Source review and five failing DOM regressions exposed a fallback gap: rejected
uRK startup left chapter selection at Awakening and device widths unchanged.
The correction uses cached geometry with native scroll/resize events only after
startup fails. It preserves the same paper and Viewer, enables reversible chapter
selection, applies device widths immediately and disables unavailable sound.
Eight DOM cases cover navigation, inline Viewer access, keyboard profiles,
focus/return, geometry refresh, missing ResizeObserver, cleanup, delayed rejection
and healthy-runtime ownership. Native dialog methods are substituted in DOM tests;
browser focus containment remains a separate acceptance check.

When browser use is available, block the runtime chunk in a production build and
reload Home. Scroll forward/backward through all chapters, change devices and
profiles, expand mobile descriptions, and enter/exit the real Viewer. Confirm
chapter progress, sheet placement, sample/download continuity and unavailable
sound feedback. Then remove the block and confirm the normal uRK path owns
animation again. Do not close launch items 44/48 without those deployed checks
and the existing physical-device, assistive-technology, performance and hosting
owner acceptance.

### October 29 Paginated Reading Follow-Up

The full and embedded Viewer now offer Continuous/Paginated reading for structured
general documents. The same article and asset URLs remain mounted. Native CSS
columns provide reflow, with app-owned page controls and semantic reading anchors.
Comic/storyboard navigation and restricted HTML previews remain separate. No
package loading behavior, manifest fields, runtime descriptor or uRK scheduler
changes. Page counts describe the current reading space, not canonical pages.

DOM tests model column measurements and exercise real canonical archives,
segmented-section resolution, French overrides, resource continuity, fragment
navigation, keyboard boundaries and lifecycle cleanup. Browser use remains
disabled in Work settings; these tests do not establish actual CSS fragmentation,
visual layout, screen-reader speech or physical touch acceptance.

After deploying the reviewed build, check Document Basic and the segmented
example in both modes at desktop and 320/390px widths. Follow outline and
in-document fragments, use keyboard page controls, select/copy text across a
break and tab into links/media on later pages. Change locale, reading width,
side panels and focus mode, and close/reopen the Chapter 05 Viewer. Verify the
same semantic reading location remains visible after reflow and image/font load;
opening a different package must start on page one. Check tall tables/media,
long paragraphs, zoom, first/last-page focus and horizontal touch scrolling.
Repeat with reduced motion and a real screen reader, retaining continuous mode
as the default. Launch items 44/48 remain open until this and the existing
device, performance and deployment-owner acceptance are complete.

### October 29 Fractional Column Bounds

Browser access returned after PR #69 merged at `55ca353`. Production Document
Basic showed seven pages for six rendered columns: a 606.296875px column was
treated as integer `clientWidth` 606. Rounding accumulated across columns, so
End could report page 6 of 7, while Next could relabel the same final content as
page 7 of 7. The correction uses the fractional rendered flow width for both
page count and navigation stride. Three regressions cover widths rounded in
either direction, native scroll clamping and final/previous-page navigation.

The corrected local reader passed real-browser boundary checks at 1280px desktop
and 390/320px viewport widths. Document Basic reports six actual pages, End
reaches the last page with Next unavailable, and no page-wide horizontal overflow
occurs. Initial browser review also checked the segmented sample, French content
and embedded Viewer close/reopen. Screenshots are retained under ignored
`examples/dist/pagination-acceptance/`. The concurrent mobile-outline handoff
edits were preserved in their original checkout and are separate from this fix.

Recheck the reviewed preview/production revision. Viewport checks do not establish
physical touch, actual screen-reader speech or constrained-hardware performance;
the remaining long-content/media and deployment-owner acceptance stay open under
launch items 44/48. No format, package, public API, CSS or scheduler changes.

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
