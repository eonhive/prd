# BUILD STATUS

## 2026-10-29

### CLI 0.2.0 Version PR Preparation

- Started from reviewed main `4ac480d`, which includes merged release diagnostics PR #64 and authoring consumer verification PR #65. `release:status` planned exactly one minor bump, `@eonhive/prd-cli@0.2.0`, from the three existing authoring changesets.
- Ran the existing `release:version` command on isolated `thehive/prd-cli-0-2-0-version-pr`. Only the CLI version changed and the three intended changesets were consumed. Library versions and internal `^0.1.1` ranges remain unchanged; the lockfile-only refresh produced no lockfile diff. Added an explicitly unreleased CLI changelog entry instead of claiming publication.
- Latest main Release run `40932175825` passed its release gate but failed preflight because the job still received an empty `NPM_TOKEN`; bootstrap and version/publish were skipped. Preparing a reviewable version PR does not bypass that guard. A maintainer must repair the intended Actions secret before CI can publish.
- Release-candidate validation passed on Node 22: full `release:check` with **476 tests / 35 files**, typecheck/build/canonical validation and real installed-tarball smoke with all 42 authoring consumer steps. Aggregate example smoke, root-inclusive docs consistency and whitespace checks also passed; bootstrap correctly no-ops. Item 46 remains open until reviewed CI publication, expected-version registry audit and all 42 npm-installed checks succeed. Public availability remains CLI `0.1.1`; no credentials, workflow settings, format, schema, runtime or original-checkout work were changed, and nothing was published.

### Homepage Runtime-Unavailable Fallback

- Continued in isolated `thehive/prd-home-runtime-fallback` from merged PR #66/main `5afc1d9`. Production's 21 HTTP/assets/package checks pass, and the merge's CI, Pages and Workers checks passed. Browser use remains disabled in Work settings; no fresh browser or audible acceptance is claimed.
- Five failing DOM regressions reproduced frozen chapter state, unchanged device widths and absent geometry/cleanup when uRK startup rejects. The homepage now uses a static, event-driven path only after runtime failure. It shares the existing pure chapter sampler, caches chapter/copy bounds outside scrolling, updates both directions, and retains the same paper and real inline/focus Viewer. Device widths apply immediately, decorative motion is disabled and sound is explicitly unavailable. There is no extra animation loop, retry scheduler, dependency, public API or format change.
- Eight new DOM cases cover all chapters, device choices, geometry refresh, story exit/return, initial deep positions, absent ResizeObserver, profile keyboard controls, Viewer focus/return, cleanup, delayed startup rejection and healthy-runtime ownership. Dialog methods are substituted; these checks do not prove actual modal containment, mobile layout, network failures or assistive-technology speech.
- Validation passed: **60 targeted tests**, root typecheck, the **473-test / 35-file foundation gate**, workspace build, canonical example validation/aggregate smoke, root-inclusive docs consistency, both hosting bases, Workers dry run and whitespace checks. Updated homepage behavior docs, hosting acceptance notes and backlog. Launch items 44/48 and the separate CLI publisher-credential blocker remain open.

## 2026-10-28

### Release Preflight Diagnosis And CI Reporting

- Continued from merged main `317c365` in isolated `thehive/prd-release-preflight-diagnostics`. Downloaded the failed Release run `40704420548`'s preflight artifact `12823406512` and verified its recorded SHA-256. Package targets and Changesets mode passed; the workflow received an empty `NPM_TOKEN`, so authentication/org checks were skipped and publication/version steps never ran. This is a credential-availability blocker, not a package-version or authenticated-account failure.
- The preflight CLI now prints known check states and required recovery actions, and appends the same report to `GITHUB_STEP_SUMMARY` when present. It preserves the JSON contract/artifact marker and exit status; advisory step-summary write errors do not alter the publish gate. Reports exclude raw npm command errors and credential fields. No token/auth/org check, workflow permission, package/version/dependency, Changesets plan, format/viewer behavior, or publication policy changed.
- Three new regression cases first failed, then passed: real missing-token CLI behavior with/without an Actions summary, append preservation, unchanged JSON/failing exit, and a passing report that excludes private raw-error fields. Validation on Node 22 passed: root typecheck, all 28 preflight tests, the **432-test / 34-file foundation gate**, workspace build, canonical example validation/aggregate smoke, docs consistency, and whitespace checks. Live read-only preflight with an intentionally empty token also prints the exact remediation and fails as required; auth/org success was exercised with test doubles, not real publisher credentials.
- Updated the npm release runbook and active release backlog with the confirmed evidence and maintainer recovery. Read-only Changesets status still plans only CLI `0.2.0` from the three queued authoring changesets, with no library bump. Release remains blocked until a maintainer makes `NPM_TOKEN` available to the existing main-branch job. No secret/access setting was changed, no version bump or workflow rerun was performed, and no package was published.
### Authoring Consumer Release Verification

- Continued from merged main `2cf4980` in isolated `thehive/prd-authoring-consumer-smoke`. The pending release plan remains CLI `0.2.0` only from the three existing authoring changesets; package versions, dependency ranges and release workflows are unchanged. The original checkout's independent unfinished work remains untouched.
- Added shared consumer authoring checks for three profile starters, Markdown with a local image, and comic/storyboard image imports. Each scenario validates and inspects its directory and packed archive. Checks assert profiles, JSON success/source facts, preserved import bytes and natural image order; missing commands and incorrect successful output fail with the precise step. Preparation failures now retain a failed summary and nonzero CLI exit rather than a misleading passing summary.
- The existing release tarball smoke now runs all 42 consumer steps against installed local tarballs with authoring required. Post-publish smoke enables authoring automatically when the checked-out CLI targets stable `0.2.0` or later; legacy `0.1.x` retains the original six checks. The additive summary field `authoringRequired` records which mode ran. No help-text inference, optional failing-command skip, new dependency or public CLI/format contract change.
- Validation passed: 29 targeted tests, full `release:check` with **451 tests across 34 files**, typecheck/build/canonical validation and tarball smoke, including all 42 installed authoring consumer steps. Live registry audit and clean npm consumer smoke pass for the unchanged public `0.1.1` baseline (six checks, authoring not claimed). Updated release policy, maintainer runbook, README, backlog and handoff.
- Publication remains incomplete under item 46. The separate release diagnostics PR #64 reports an empty Actions `NPM_TOKEN`; a maintainer must repair the intended CI credential configuration before the normal version-PR/publication path can proceed. Keep command availability notes unchanged until the expected release, registry audit and 42-step npm authoring flow pass. No local versioning, token access, workflow rerun, npm publication or production deployment was performed. Physical/browser launch items 44/48 remain separate.

### Optional Audio Startup And Cancellation

- Continued in isolated `thehive/prd-audio-lifecycle` from main `2cf4980`, then incorporated merged authoring-smoke main `1b003a5`. The separate release diagnostics PR #64 and its missing-publisher-credential blocker remain outside this change. No original-checkout work was included.
- Six initial regression cases reproduced stale audio startup/playing feedback across page hide/return, native cancellation leaking as a playback error, missing mute-level reset, and late playback rejection after disposal. Three further cases reproduced blocked fresh opt-in while a cancelled native promise was pending. Private request generations now invalidate delayed module/adapter/playback/analysis work. A hidden page cannot initiate audio, and returning requires a fresh opt-in. Cancellation resolves quietly; genuine current playback failures still reach the existing UI feedback.
- Reused the pinned uRK audio transport pause, analysis disable and kernel cleanup. Explicit mute/hide/disposal immediately clear the visual level; toggling during startup cancels the pending opt-in. One shared initialization caches a reusable adapter/track/WAV URL. A newer request can proceed while an older cancelled promise remains pending, and late completions cannot clear the new loading state or pause playback. Disposal releases the URL after kernel cleanup and cannot emit late playing feedback. Plain playback without Web Audio remains supported. No vendor, scheduler, dependency, format, public API, release workflow or package version changed.
- Added fourteen audio cases to the existing runtime suite using the actual uRK adapter with deterministic native audio/context substitutes. The suite now has **38 runtime tests**. Implementation/hosting notes and backlog describe the cancellation contract and remaining acceptance.
- Final validation on Node 22 passed: root typecheck, the **465-test / 34-file foundation gate**, workspace build, canonical example validation/aggregate smoke, root-inclusive docs consistency, both hosting builds, Workers dry run and whitespace checks.
- Browser automation remains disabled in Work settings. These tests establish lifecycle/resource behavior, not audible playback, real autoplay policy, browser/mobile behavior, or hardware performance. Physical/production launch items 44/48 remain open. No manual production deployment or npm release was performed.

### Merged Viewer And Homepage Verification

- PR #61's homepage motion hardening and PR #62's file-drop feedback are merged on main `317c365`. The combined foundation gate passes **429 tests across 34 files**, workspace build, root-inclusive docs consistency, canonical validation and aggregate smoke. Root typecheck also passes. PR #62's final head `97b7adc` has successful GitHub validation and a successful Cloudflare preview build.
- Fresh production HTTP/package checks pass all 21 cases. Served entry JavaScript and CSS match the tested integrated build byte-for-byte; ignored diagnostic hashes are in `examples/dist/production-acceptance/merged-file-drop-assets.json`. This confirms static asset rollout, not browser interaction or actual assistive-technology behavior.
- Reconciled duplicate backlog entries: reader feedback remains item 66, file-drop feedback item 67, and motion lifecycle item 68. Updated hosting evidence and handoff without changing source, dependencies, package contracts or release behavior. Browser access remains disabled in Work settings; launch items 44/48 retain fresh interactions, real OS drag/drop, actual screen-reader speech, physical touch, constrained-device profiling and deployment-owner sign-off. No manual production deployment or npm publication was performed.

## 2026-10-27

### File-Drop Feedback And Deployed Reader Assets

- Continued from merged reader-accessibility main `2367123` in isolated `thehive/prd-file-drop-feedback`; the original checkout remains untouched. Fresh production HTTP/package checks passed all 21 cases, and served JavaScript/CSS matched the reviewed PR #60 build byte-for-byte. Diagnostic hashes are under ignored `examples/dist/production-acceptance/reviewed-assets.json`. This is static deployment evidence; browser use was disabled in Work settings and no new interactive acceptance is claimed.
- Source/DOM review reproduced child-to-child drag-leave clearing the file highlight and plain-text drops causing archive errors. The named drop area now identifies file drags through their protected-phase type, counts nested targets even without `relatedTarget`, uses a copy cursor and clears feedback on real exit/drop. Text drags retain normal browser handling. Existing archive selection, opening, validation, rendering and private local-file notifications are preserved; no global drop interception, dependency or package/API change.
- Added five integration cases: nested events with/without related targets, ignored text retaining French content/resource URLs, valid local drops with privacy markers, and unsupported-file rejection/recovery. Initial tests reproduced both faults; an added missing-related-target case also failed before the nested-entry fix. Final checks pass: root typecheck, foundation gate **417 tests / 34 files** (200 app tests), workspace build, canonical validation/aggregate smoke, both hosting builds, Workers dry run, root-inclusive docs consistency and whitespace checks.
- Updated the brand guide, hosting acceptance ledger, backlog and handoff. Real OS drag/drop, fresh browser interactions, actual screen-reader speech, physical touch, constrained-device profiling and deployment-owner acceptance remain in launch items 44/48. No manual production deployment or npm release was performed.
### Living Homepage — Motion Lifecycle Hardening

- Continued from merged reader-accessibility main `2367123` in the isolated `thehive/prd-motion-lifecycle` branch. The purple rebrand, reader controls, persistent Viewer, canonical content and package semantics are preserved; the shared checkout's independent unfinished work remains untouched.
- Regression tests first reproduced seven scheduler failures: device-width tweens outlived Viewer focus/offscreen/hidden/finished boundaries, offscreen selections/input retained frame demand, a queued ambient paint survived story exit, and commands after disposal still wrote styles. The story-end case also exposed a stale ambient timer.
- Device widths and profile reveals now share eligibility checks and settle to their selected endpoints during suspension. Offscreen/hidden transitions release pending paints; every paint clears its old ambient wake-up before scheduling another. Offscreen native scroll/resize state remains current, return-to-view resumes eligible interaction, and disposal cancels motion/frame/timer ownership before kernel shutdown. Repeated cleanup and late callbacks/commands are harmless. No uRK, format, core, dependency, public API or release behavior changes, and no second scheduler is added.
- Reused the existing pinned uRK scope cancellation and frame-work release APIs. Upstream main remains `8fb03fbb9e09b2cdb432fe51da3f72cda67476ff`; no vendor change is needed. The 24 runtime tests include 12 new cases for active/suspended selection, return-to-view motion, pending work, disposal and 30 repeated mount/dispose cycles without retained frame/timer work.
- Validation passed on Node 22: root typecheck, the foundation gate with **424 tests across 34 files**, workspace build, root-inclusive docs consistency, canonical example validation/aggregate smoke, both hosting builds and the Wrangler dry run. Updated implementation notes, hosting guidance and backlog. Browser automation remains disabled; deterministic scheduler ownership checks are not frame-time/heap measurements or physical-device/accessibility/production acceptance. Items 44/48 remain open. No production deployment or npm release was performed.

### Reader Keyboard Focus And Status Feedback

- Continued from merged rebrand main `8438760` on isolated `thehive/prd-reader-accessibility`. PR #59's automatic rollout was observed on the public site and all 21 production HTTP/package checks passed. The primary checkout and its independent format/security/converter work remain untouched.
- Reproduced a real desktop keyboard bug in production: activating either side-panel close button left focus on the body. The correction uses toolbar button refs to restore Navigate/Details focus before hiding the panel, preserving locale, image URLs and the mounted document. Native mobile opener restoration and visual outline target focus remain intact.
- Outline search now links to a polite, atomic result count that updates for filtered/empty/cleared queries. The package-completion status includes the active document title for assistive technologies; its visible badge and validity/busy-state distinctions are retained. No dependency, package contract, core or runtime change.
- Regression tests first reproduced all four missing behaviors, then passed. Final validation: root typecheck, the foundation gate with **412 tests across 34 files** (195 web-app tests), workspace build, canonical examples/aggregate smoke, root-inclusive docs consistency, both hosting builds, Workers dry run and whitespace checks pass.
- Local built-browser checks confirmed desktop close/Tab continuation, filtered/zero counts, French status text and retained image URL, plus native Escape/close restoration at 390px without horizontal overflow. Screenshots are ignored under `examples/dist/reader-accessibility/`. These checks do not claim actual screen-reader speech, physical touch, OS drag/drop or constrained-device profiling; launch items 44/48 remain open. The new correction still requires review and deployed verification.

### Public PRD Rebrand — Isolated Review Branch

- Ported the owner's purple folded-document rebrand from the primary checkout onto current main `c8e5935` in `thehive/prd-brand-refresh`. Preserved the merged namespaced document targets, bidirectional embedded sample bridge, six profile presentations and source-artwork previews. The primary checkout's independent converter, container, signature, core and release work is untouched and excluded from this PR.
- Added shared light/dark tokens and public header/footer, original optimized hero artwork and favicon, Home profile/example journeys and Docs guidebook styling. The Viewer has a compact reading toolbar, searchable outline, desktop panels/mobile native drawers, Info/Files views, reading width and focus controls. Existing validation, renderer, profiles, loading and resource behavior are preserved; no dependency or package contract changed.
- Theme changes synchronize open same-origin pages and the persistent Viewer without echo writes or a document reload. Public route/section navigation moves keyboard focus to real targets. Mobile visual selection uses the existing namespaced target map, closes the drawer and retains arrow-key continuation. Production browser review found reading controls under the sticky site header after scroll; toolbar, desktop-panel and content-target spacing now reserves that header and removes the offset in embeds.
- Validation: root typecheck and the foundation gate passed with **408 tests across 34 files**, including **191 web-app tests**. The gate includes workspace builds, canonical example validation, aggregate smoke and docs consistency. Both `/` and `/prd/` builds, Workers dry run, 21 local production-preview HTTP/package checks, root-inclusive docs consistency and whitespace checks pass. No dependency/lockfile, public package, workflow or changeset edit is needed for this private-app change.
- Fresh browser review used the built preview at `127.0.0.1:4174`: desktop light/dark Home and Docs, decoded canonical comic excerpts, cross-page theme synchronization retaining French Viewer content and image URL, 390px/320px layouts, authored/visual outline focus, keyboard continuation, example switching and Docs section focus. The checked layouts have no horizontal overflow; the 320px Home artwork remains below its copy. No console warnings/errors were observed. Screenshots are ignored under `examples/dist/rebrand-qa/`; physical touch, screen readers, real OS drag/drop, constrained-device and deployed acceptance remain items 44/48. No production deployment or npm release was performed.

### Living Homepage — Source Profile Presentations

- Continued in isolated `thehive/prd-profile-choreography` from merged PR #56 and incorporated current main `762fc37` from PR #57. The shared checkout's independent unfinished format/security/branding work remains untouched.
- Chapter 04 now presents document, report, resume, comic, storyboard, and magazine compositions on the same paper element. The four general-document presentations share one study and reading order; comic/storyboard show actual ordered artwork, alt text, and captions/notes copied from manifest-declared resources in validated canonical archives. They remain excerpts and layout studies, with the original authored packages available in the real Viewer.
- Reused the existing uRK kernel and scoped motion adapter for finite profile reveals, canceled on replacement, chapter exit, hidden/offscreen state, Viewer focus, or reduced-motion changes. No second scheduler, animation dependency, canonical profile, format behavior, or public API was added. Missing upstream seekable timelines/scene flow remain documented limitations.
- Added keyboard tab navigation, a semantic chapter panel with complete reading copy/descriptions, lazy source-media loading, stale-request cancellation, and metadata/image failure retry. Selection continues through the existing inspector, persistent Viewer, and final download. The build emits ignored app-only preview JSON and exact copied images; hosted smoke now checks all 21 route/asset/package/metadata/image results against the original archives.
- Validation on Node 22 passed: root typecheck, foundation gate with **399 tests across 34 files**, workspace build, root-inclusive docs checks, canonical validation and aggregate smoke, both hosting builds, and Wrangler dry run. Local HTTP/package smoke passed all 21 checks under both `/` and `/prd/`. The app entry is about 104 kB gzip and the lazy runtime about 12.5 kB gzip; these are transfer sizes, not hardware benchmarks.
- Browser review covered all six compositions on desktop, 390px/320px stacked layouts, the 236px document viewport, 44px tab targets, arrow/Home/End selection, full source-image decoding, expanded-description separation, and real comic Viewer handoff/retained panel selection after reopen. Mobile review improved comic excerpts into horizontal strips. No browser console warnings/errors were observed during those checks. Browser use was disabled again before the final hosted-preview review; no hosted browser acceptance is claimed. Physical touch, actual screen-reader use, low-end/long-session profiling, and production launch acceptance remain open under items 44/48. Updated implementation notes, hosting guidance, and backlog; no production deployment or npm release was performed.

### Independent Public Package Release Gates

- Reconciled preflight and registry audit with the existing independent Changesets configuration. Normal stable post-preview versions may differ across the four public packages; only an all-`0.1.0` set enters historical bootstrap. Invalid versions, mixed bootstrap/post-preview sets, and package-name drift remain gated.
- Retained npm token/auth/org checks and per-package publication/`latest`/consumer-safe dependency checks. Added a shared version-mode helper and targeted regression cases without adding a dependency or changing workflow order, package versions, dependency ranges, or changesets.
- Read-only `release:status` on main's queued changesets confirms one minor release: `@eonhive/prd-cli@0.2.0`, with no library/patch/major bumps. This is a plan, not a published release. Updated the release policy, runbook, versioning policy, and PRD-033 clarification without allocating decision IDs used by unrelated in-progress work.
- Validation passed on Node 22: 41 targeted tests, full `release:check` (351 tests across 32 files, build/typecheck, examples, and tarball consumer smoke), root-inclusive docs consistency, and live registry audit of the unchanged `0.1.1` baseline. Refreshed the isolated install from the existing frozen lockfile for PR #56's already-declared `jsdom`; no dependency/lockfile edits were needed.
- The authoring release remains incomplete under item 46: merge the gate fix, review/version the intended changesets separately, publish through CI, and verify registry metadata plus real npm-installed authoring commands. No versioning, npm publication, token access, or production deployment was performed in this gate-only pass.

### Living Homepage — Embedded Sample Continuity

- Began from merged main `9075994` in the isolated `thehive/prd-viewer-continuity` worktree and incorporated `a50de8e`'s hosted diagnostics from PR #55. Independent unfinished Viewer, container and signing changes in the shared checkout were left untouched and are not part of this slice's validation count.
- Kept one stable iframe source after its initial mount. Home selections now use a bounded ready/select message bridge; sample choices made through the embedded Viewer's own controls update the inspector, profile study and final download. Commands matching the current or in-flight sample do not reload it, preserving locale and resource URLs.
- Authenticated each message against the expected window and exact origin and accepted only allowlisted sample IDs. Local file opens send only a state marker, without filename or content; the selector can explicitly return to the same canonical example. No PRD format, viewer-core, uRK, CLI or public npm API changed, and no animation scheduler was added.
- Added abort/generation guards across hosted fetches, archive file reads, document opening and disposal. Older results, errors and cleanup cannot replace the latest package. Tests also protect failed-load recovery and initial query loading through React Strict Mode cleanup/replay.
- Added a pinned test-only `jsdom` environment and two React DOM integration suites. After incorporating PR #55, the full foundation gate passed on Node 22: **321 tests across 32 files**, workspace build, docs consistency, canonical example validation and aggregate smoke. Typecheck, both hosting builds and the Wrangler dry run passed. The existing production HTTP/package check passed all 13 checks; this is separate from interaction acceptance. Implementation notes, hosting guidance and the active backlog were updated.
- Local browser use is disabled in Work settings. Message/authentication, persistent-node identity, French locale/resource continuity, interrupted fetch/file reads and local-file privacy were verified in DOM tests; no fresh visual, native-dialog, touch, screen-reader or production interaction pass is claimed. Launch acceptance items 44/48 remain open. No production deployment or npm release was performed.

### Hosted Demo Smoke Check

- Confirmed PR #54 merged at `9075994`, with successful CI and a reported Cloudflare commit-preview build. The isolated checkout was based on that main revision; the primary checkout's larger in-progress work remains untouched.
- Added `pnpm viewer:demo:check:hosted` and a machine-readable summary for deployed HTTP/package checks. It validates routes and entry assets, downloads the four canonical archives through bounded same-origin requests, applies existing package validation/profile checks, and compares adjacent inspection JSON with the actual archive facts.
- The live production check passed all 13 checks. No document upload, deployment, credentials, hosting permissions, format/validator behavior, public API, or release behavior changed. The command is separate from the offline foundation gate.
- Validation passed on Node 22: 24 targeted tests (16 new smoke cases), root typecheck, the foundation gate, root-inclusive docs consistency, and diff check. Failure cases include a real CLI invocation against a loopback-only broken deployment, with nonzero exit and a retained summary artifact.
- Browser use is disabled in Work settings during this pass. The summary explicitly records browser acceptance as not assessed; deployed pointer/anchor behavior, drag/drop, physical accessibility/device checks, and deployment-owner confirmation remain open under items 44/48.

### Viewer DOM Target Collision Fix

- Addressed the review finding from merged PR #51 without changing package-authored IDs or validator rules. A private-app helper now generates disjoint document/node/panel/frame target IDs using lossless encoding, preventing authored IDs from shadowing fixed viewer controls or one another across root/visual scopes.
- Applied the mapping to structured/resume content, static comic/storyboard cards, active visual stages, outline anchors, and same-document content links. External links and authored-ID-based panel/frame selection remain unchanged. No published API, capability, loading, format, or release behavior changed; no changeset is needed.
- Added rendered-markup regression tests using validator-valid packages with shell-ID collisions and shared root/panel/frame IDs, plus punctuation/Unicode and fragment-link cases. All 281 repository tests across 29 files passed through the foundation gate; root typecheck and the production app build also passed.
- Local browser checks opened generated valid static collision archives, confirmed unique DOM IDs and keyboard activation of the intended panel/frame/root targets, and verified the existing document rationale link and interactive panel selection/focus/Left navigation. No browser console warnings/errors were observed. Production deployment/launch acceptance remains open.
- Work was isolated from the primary checkout's unrelated architecture edits. The hosting runbook and session handoff record the follow-up verification path.

## 2026-10-26

### Living Homepage Package Inspection And Handoff

- Continued from merged PR #52 on `thehive/prd-package-handoff`. Chapter 03 now inspects real sample manifest, entry, resource, and profile declarations. Demo asset preparation reuses `inspectPrdArchive`, rejects invalid archives, and emits small ignored inspection JSON assets alongside all four hosted `.prd` archives. This app-only metadata does not change PRD format, CLI, validator, viewer-core, or uRK public APIs.
- The inspector, profile studies, and outer Viewer toolbar share the selected canonical example. Added the segmented document to the toolbar. Final download and full-workspace links retain that selection under both hosting bases. Layout studies remain illustrative, and opening a local file inside the Viewer does not turn it into a hosted download.
- Metadata loads near the structure chapter; the controls remain mounted without relying on uRK. Requests cancel on selection changes and unmount. Missing JSON, including the HTTP 200 HTML fallback, shows retry feedback while retaining Viewer access. Browser checks confirmed missing-metadata recovery, real segmented rendering, toolbar-to-inspector selection, iframe Escape/focus restoration, and a final-CTA storyboard download that passes CLI validation.
- Mobile browser review found the fixed sheet offset could overlap the expanded inspector. The existing runtime now caches chapter copy ends on resize and positions the shared sheet below them; no second scheduler or per-scroll measurement was added. Checks at 390px and 320px confirmed separation and no horizontal overflow. Keyboard disclosure activation, dark/light presentation, and motion-off idle suspension passed; no browser console warnings/errors were observed.
- Validation passed on Node 22: typecheck, the foundation gate with **273 tests across 28 files**, canonical example validation/smoke, root-inclusive docs consistency, both hosting builds, and the Wrangler dry run. Updated implementation notes, hosting runbook, and active backlog. Physical touch, actual screen-reader use, lower-end hardware profiling, and production launch acceptance remain open. No production deployment or npm release was performed.

### Living Homepage Launch-Readiness Review

- Moved the accumulated homepage work onto `thehive/prd-living-homepage`, based on current `main` after the outline corrections merged in PR #51. No earlier review patch is duplicated in the new feature diff.
- Fixed a performance gap where pointer movement could still request paints after the document presentation was offscreen or the visitor had passed the story. Runtime coverage now checks those boundaries, work resumption, and reuse of cached chapter geometry during scroll/pointer bursts.
- Current local browser automation is disabled in Work settings. Earlier browser checks remain recorded as historical evidence; no fresh physical-device, screen-reader, or lower-end hardware pass is claimed. Updated the hosting runbook's acceptance table and kept launch items 44 and 48 open.
- Validation passed: typecheck, the foundation gate with all 254 tests across 27 files, canonical example validation/smoke, docs consistency, both hosting builds, and the Wrangler deployment dry run. Pinned uRK archive SHA-256 hashes match their provenance record. The app bundle is about 99.5 kB gzip, with the uRK coordinator loaded separately at about 12.3 kB gzip; these transfer sizes are not a hardware performance profile.

### Living Viewer Continuity Follow-Up

- Replaced the separate inline and modal iframes with one persistent `LivingViewer` component. The native dialog changes presentation without reparenting or remounting the reference workspace. Inline opening does not move keyboard focus during native scrolling; locale and panel/frame state remain in the real Viewer.
- Browser QA confirmed French content and the same attachment blob URL survive closing, reopening, and promoting the inline workspace. The package renderer, manifest, validation, and viewer-core contracts remain unchanged.
- Found that Escape pressed inside the iframe did not reach the parent native dialog in this browser. Added an app-only keyboard message, accepted only from the current iframe window and exact origin, plus focused boundary tests. Packaged media pauses when its workspace becomes hidden.
- Confirmed the iframe Escape fix with the actual comic Next control focused. The second and third panels remain selected through inline/modal round trips, and focus returns to the inline action or header button that opened the workspace. Inline chapter entry retains focus on the chapter rather than taking it into the Viewer.
- Final validation passed: typecheck, 85 app tests, all 251 repository tests across 27 files, the production app build, docs consistency including root docs, and a Wrangler deployment dry run. No production deployment was performed. Physical touch-device, screen-reader, and lower-end hardware launch checks remain open.
- Restored local preview through the Vite server. Source `index.html` must be served over HTTP for module imports, routes, and generated sample fetches; opening it through `file://` does not launch the app.

### Living Homepage

- Implemented the six-chapter public Home in the existing Vite app: one persistent document presentation, native reversible scroll sampling, device width tweens, layer explanations, six labeled layout studies, the real embedded Viewer, and package reassembly with Viewer/docs/example actions. Home retains the repository CLI flow and its published-command availability note.
- Audited clean upstream `eonhive/urk` main at `8fb03fbb9e09b2cdb432fe51da3f72cda67476ff`. Pinned unmodified `@urk/core` and `@urk/adapters` build archives in the private web app because matching public motion/audio exports are not yet published. The dirty sibling checkout is not a dependency. Provenance, hashes, and upgrade instructions are in `apps/prd-viewer-web/vendor/README.md`.
- Reused uRK's auto-demand kernel, scoped numeric motion, lifecycle cleanup, audio transport, and optional spectrum analysis. Main lacks seekable timelines and a standalone scene-flow API; small app-owned interpolation coordinates the chapters. CSS perspective provides document depth without WebGL. Format, schemas, validator, CLI, packager, and viewer-core APIs are unchanged; no public-package changeset is required.
- Added opt-in audio, full/subtle/off motion, automatic/high/low quality, live layer feedback, native dialog focus containment and Escape, focus restoration, system reduced-motion handling, lazy viewer/audio modules, cached chapter geometry, coalesced input paints, and bounded ambient wake-ups. Motion off leaves the browser's instrumented frame counter unchanged while idle.
- Browser QA covered desktop dark/light, 390px and 320px iframe viewports, stacked mobile document layout, device switching, layer selection, profile switching, real document/comic/storyboard package opens, viewer focus/exit, sound start/mute, and motion/quality controls. No browser warnings/errors were observed in these checks. Physical touch devices, assistive technologies, and low-end hardware profiling remain unverified.
- The foundation gate passed with 237 tests across 25 files, including build, docs consistency, example validation, and aggregate example smoke. After adding observer-fallback and embed-markup coverage, final typecheck, all 239 tests across 25 files, and docs consistency passed. Both final hosting builds (`/` and `/prd/`) and the Wrangler deployment dry run passed. The runtime is lazy-loaded at approximately 12.25 kB gzip; audio code loads only after opt-in. No production deployment was performed.
- Added `docs/product/PRD_LIVING_HOMEPAGE.md` and aligned README, docs index, and product boundaries. Pagination is unavailable in the renderer and is not offered. Layout studies remain illustrative. The initial slice reset Viewer state between presentations; the continuity follow-up above removes that limitation. Existing launch QA and CLI release backlog items remain open.

## 2026-10-25

### Launch QA And Viewer Corrections

- PR #50 is merged at `a9d77d9`. Browser access is now enabled, and the production app shows the merged Home/Viewer/Docs usability pass.
- Production browser checks covered desktop dark/light Home, mobile Home/Docs/Viewer, Docs refresh, back/forward navigation, saved light-theme reload, hosted document/comic/storyboard samples, native archive selection, package facts, attachments, and localization. Switching Document Basic to French changed both its text and inline image resource.
- QA found that comic/storyboard outline links did not activate panels/frames, root links lacked rendered targets, and synthetic heading anchors could point nowhere. The corrective branch now shares visual selection state with the outline, focuses the active stage for keyboard navigation, and links only to real authored document targets with sticky-header clearance.
- Added a precise accessible theme-toggle label and separated invalid-package feedback from valid-package runtime support messages. No validator, runtime support-state, parsing, package format, CLI, or release behavior changed; no changeset is needed.
- Local browser regression checks passed for panel/frame selection, keyboard continuation, repeated selection, same-file reopen/reset, authored document anchors, mobile dark/light layout, and invalid-package feedback. Node 22 foundation gate passed with 224 tests across 23 files; final hosting/typecheck checks are recorded in the session handoff.
- Launch item 44 remains open: the corrective patch must be deployed and rechecked, real OS file drag/drop has not been exercised, and production account/build settings have not been independently confirmed. GitHub Pages remains fallback. CLI authoring release item 46 stays separate.

### Public Experience Follow-Up

- Synced `main` after PR #49 merged and started the focused public-experience branch. The production domain now serves Home, Viewer, Docs, and all four sample archives; downloaded samples passed existing validator checks with their expected profiles.
- Implemented bounded/wrapping hero typography, mobile navigation/open access, real route links, skip/focus targets, and a document-first narrow-screen workspace. The header now shows the actual document title and distinguishes empty, loading, valid, and invalid package labels without changing runtime support states.
- Replaced nested upload-button semantics with a native chooser button and hidden `.prd` input, collapsed sample guidance after a package opens, simplified the Docs entry path, and added reduced-motion/storage-blocked theme handling.
- Added server-rendered markup/status tests and source layout safeguards. Node 22 checks passed: 40 targeted tests, root typecheck, both hosting builds, Wrangler deployment dry run, docs consistency, and the foundation gate (209 tests across 23 files).
- Confirmed npm CLI latest is still `0.1.1`, exposing `pack`, `validate`, and `inspect`; public flow/CLI docs now distinguish repository authoring features from the queued release. No CLI implementation, release automation, package exports, schemas, parsing, or renderer behavior was changed.
- Browser access was disabled in Work settings. Desktop/mobile visual checks, route/history/theme interaction checks, and manual upload/drop remain unverified; backlog items 44 and 45 stay open. This UI slice has not been deployed or accepted as launch QA.

### Earlier Workers Migration

- Migrated the public Home/Docs/Web Viewer deployment configuration from Cloudflare Pages to Workers Static Assets (PRD-039), preserving the existing `prd-worker` name and GitHub Pages staging/fallback.
- Pinned Wrangler and added production rebuild plus dry-run, local preview, and authenticated deploy commands. Native Workers SPA fallback replaces the Pages `_redirects` catch-all; no backend Worker script or document-upload service was added.
- Updated public hosting copy, the hosting runbook, product/roadmap docs, and active backlog. Deployment and launch QA remain open; local validation is not a production launch claim.
- Node 22 verification passed: frozen-lockfile install, 28 targeted tests, root typecheck, docs consistency, Cloudflare build/deployment dry run (also after cleaning TypeScript outputs), GitHub Pages `/prd/` build, and `foundation:gate` with 190 tests across 21 test files.
- Local Workers HTTP checks confirmed Home/Viewer/Docs navigation, JavaScript/CSS responses, and byte-identical ZIP responses for all four hosted sample archives. Browser checks confirmed document/comic/storyboard samples render as fully supported, Viewer/Docs refresh, and light-theme persistence. Production/mobile/manual-upload launch QA is still pending.
- Deployment blocker: the saved Cloudflare OAuth login has Pages permissions but lacks Workers permissions; the account owner must refresh authorization or connect Workers Builds. `prd.eonhive.com` did not resolve from this environment. No production deployment or DNS changes were made.

## 2026-06-07

- Merged PR `#46` (`[stannesi] separate hosted landing and viewer routes`) into `main` before starting the public site/docs/hosting polish slice.
- Renamed user-facing hosted-app language from “Landing” to “Home” while keeping the route `/`.
- Added `/docs/` as a public docs index inside `apps/prd-viewer-web`, giving users a clean navigation layer for Home, Getting Started, CLI, Format, Profiles, Examples, Viewer, Conformance, and Release/Operator Notes without linking internal `codex/` workflow docs.
- Documented Cloudflare Pages as the intended production host for `prd.eonhive.com` and kept GitHub Pages as temporary staging/fallback under `/prd/`.
- Added `docs/governance/PRD_HOSTING_RUNBOOK.md` for the public hosting path, custom-domain launch checklist, and route expectations.
- Added Cloudflare Pages SPA fallback configuration through `apps/prd-viewer-web/public/_redirects` and GitHub Pages `404.html` fallback generation in the viewer demo workflow.
- Added explicit production/staging build scripts (`viewer:demo:build:cloudflare` and `viewer:demo:build:github-pages`) plus root `wrangler.toml` so Cloudflare Pages has a repo-native output directory and does not depend on ambiguous dashboard-only settings.
- This slice did not change manifest shape, schemas, validator behavior, CLI commands, npm exports, Studio, Cloud, PRDc, AI, account/library, payment, crypto, rights, or broad conversion behavior.

## 2026-06-05

- Synced local `main` after PR `#43` (`[stannesi] add public viewer demo ux`) merged, then created `thehive/prd-landing-viewer-dashboard` for the hosted landing/viewer refresh.
- Refreshed `apps/prd-viewer-web` into one deployable PRD Home page plus reference web viewer workspace with premium dark mode by default, first-class light mode, persistent theme selection, and a dashboard-style viewer surface inspired by the provided references.
- Revised the hosted app route structure so `/` is the Home page and `/viewer/` is the actual PRD Web Viewer workspace, including base-path support for GitHub Pages at `/prd/`.
- Added real package-derived outline panels for structured `general-document`, `comic`, and `storyboard` content rather than static/fake dashboard navigation.
- Added hosted sample archive support through generated demo assets under the ignored `apps/prd-viewer-web/public/examples/` path. Hosted samples load through the same eager whole-package in-memory open path as user-selected archives and do not change PRD format loading semantics.
- Added `scripts/prepare-viewer-demo-assets.mjs`, root `pnpm viewer:demo:assets`, `pnpm viewer:demo:build`, and `pnpm viewer:demo:dev` so canonical examples can be packed and copied into the web viewer demo surface without committing `.prd` binaries.
- Added `.github/workflows/viewer-demo-pages.yml` to build the static viewer with `PRD_VIEWER_BASE_PATH=/prd/` and deploy `apps/prd-viewer-web/dist` through GitHub Pages.
- Added test coverage for landing/demo content, archive file filtering/sample URL behavior, viewer route mapping, document-outline derivation, and demo asset preparation.
- Updated root README, docs index, product-boundary docs, authoring workflow, import/export matrix, roadmap, `NEXT_STEPS.md`, and `codex/SESSION_HANDOFF.md`.
- This slice did not add a changeset because it changes only the private web viewer app plus docs/operator/deployment surfaces.
- Local validation included targeted web viewer/script tests, web viewer TypeScript build, `pnpm viewer:demo:build`, docs consistency with root docs, `git diff --check`, root typecheck, `pnpm foundation:gate`, and browser desktop/mobile visual checks. Browser verification confirmed dark/light mode, hosted sample loading for `document-basic`, `comic-basic`, and `storyboard-basic`, and no console warnings/errors.

## 2026-06-02

- Merged PR `#42` (`[stannesi] add ordered image import command`) into `main` at `22d76df4e601a15508ab9475aff7924669b0e913` and synced local `main` before starting the public viewer demo UX slice.
- Added a viewer-integrated demo landing layer in `apps/prd-viewer-web` that explains the public product flow: `prd init/import`, `prd validate`, `prd inspect`, `prd pack`, then open the generated `.prd` archive in the reference viewer.
- Replaced the plain file picker with a stronger `.prd` upload/drop zone that supports click-to-browse, drag/drop, first-archive selection from multi-file drops, and clear local errors when no `.prd` archive is provided.
- Added a small testable viewer demo content module that locks the public flow copy, canonical example archive references, and local preparation commands without adding a DOM testing dependency.
- Updated root README, product-boundary docs, authoring workflow, import/export matrix, roadmap/blueprint pointers, and `NEXT_STEPS.md` so the next blocker is choosing a public hosted demo/deployment path for the reference viewer.
- This slice did not add a changeset because it changes only the private web viewer app plus docs/control state.
- Local validation included targeted web viewer tests, `pnpm --filter @eonhive/prd-web-viewer build`, docs consistency with root docs, `git diff --check`, browser desktop/mobile visual checks, and `pnpm foundation:gate` under Homebrew Node.

## 2026-05-31

- Merged PR `#41` (`[stannesi] add markdown import command`) into `main` at `668c57dc94e3b00d55d695cbb87fc871d10f3790` and synced local `main` before starting the ordered image import slice.
- Added `prd import images <sourceDir> --profile <comic|storyboard> --out <targetDir> [--title <title>] [--id <id>] [--json]` as the visual-profile import lane for ordered image folders.
- Implemented deterministic natural filename ordering for supported top-level image files (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`) so numbered page/frame names import in reading order.
- Image import now creates validator-valid `comic` packages with `panels[]` and `assets/panels/`, and validator-valid `storyboard` packages with `frames[]`, placeholder notes, and `assets/frames/`.
- Non-image files and nested directories are skipped with explicit warnings; unsupported profiles, missing source directories, empty/no-image sources, and non-empty targets fail before package output is written.
- Added CLI unit and built-binary E2E coverage for image import, including JSON output, title/id overrides, deterministic ordering, skipped files, unsupported profile, empty source, missing source, and non-empty target safety.
- Added a minor changeset for `@eonhive/prd-cli` and updated README, CLI docs, CLI JSON contract, authoring workflow, import/export matrix, product-boundary, roadmap, and blueprint docs.
- Local validation included CLI package typecheck, root typecheck, targeted CLI unit/E2E tests, docs consistency with root docs, `git diff --check`, and `foundation:gate` through a temporary local `pnpm` shim because the current Codex app shell has Node but no `pnpm` binary on PATH.

## 2026-05-27

- Merged PR `#40` (`[stannesi] define phase 5 authoring workflow`) into `main` at `b2f5b12217338f749d1733507f7b69fc39416751` and synced local `main` before starting the Markdown import slice.
- Added `prd import markdown <source.md> --out <targetDir> [--title <title>] [--id <id>] [--json]` as the first real import lane for structured `general-document` package directories.
- Implemented a small deterministic Markdown subset parser with no new Markdown dependency. It maps ATX headings, paragraphs, unordered and ordered lists, blockquotes, and standalone local relative images.
- Markdown import now copies supported local images into `assets/images/`, declares them in `manifest.assets`, and skips remote, missing, unsafe, unsupported, raw HTML, and fenced-code inputs with explicit warnings instead of creating invalid packages.
- Added CLI unit and built-binary E2E coverage for Markdown import, including JSON output, title/id overrides, local image copy, warning behavior, unsupported import source, and non-empty target safety.
- Added a minor changeset for `@eonhive/prd-cli` and updated README, CLI docs, CLI JSON contract, authoring workflow, and import/export matrix docs.
- Local validation included `pnpm exec vitest run packages/prd-cli/src/index.test.ts packages/prd-cli/src/cli.e2e.test.ts`, `pnpm docs:check -- --include-root-docs`, `git diff --check`, and `PATH="/opt/homebrew/bin:$PATH" pnpm foundation:gate`.

## 2026-05-24

- Merged PR `#39` (`[stannesi] add prd init scaffold command`) into `main` at `1135a4b4e60556fce221e6daf0395035de36d893` and synced local `main` before starting the Phase 5 authoring workflow slice.
- Added `docs/product/PRD_AUTHORING_WORKFLOW.md` to define the current public authoring path: `prd init`, edit package files, `prd validate`, `prd inspect`, `prd pack`, then open or share the `.prd` archive.
- Added `docs/product/PRD_IMPORT_EXPORT_MATRIX.md` to sequence import/export lanes without bundling broad conversion into the first authoring surface.
- Marked Markdown-to-structured-`general-document` import as the recommended next executable lane, while keeping HTML, DOCX, EPUB, PDF, full Studio, Cloud workflows, and broad conversion deferred.
- This was a docs/control slice only; it did not change manifest shape, schema, validator behavior, CLI commands, viewer behavior, package exports, or npm release behavior.
- Local validation for this docs-only slice included `pnpm docs:check -- --include-root-docs`, `git diff --check`, and `PATH="/opt/homebrew/bin:$PATH" pnpm foundation:gate` under Homebrew Node.

## 2026-05-23

- Merged PR `#37` (`[stannesi] refresh comic example raster panels`) into `main` and synced local `main` before starting the public-product canon slice.
- Added the product-boundary canon in `docs/product/PRD_PRODUCT_BOUNDARIES.md`, defining PRD Core, Reference Stack, Studio, Viewer, Cloud, SDK, Renderer, and PRDc boundaries without changing manifest, schema, validator, CLI, or viewer behavior.
- Added the versioning-policy canon in `docs/core/PRD_VERSIONING_POLICY.md`, separating PRD format versions, manifest versions, profile/extension versions, runtime contract versions, CLI JSON contract versions, and npm package versions.
- Updated root/docs navigation, architecture docs, release policy, decisions, and `NEXT_STEPS.md` so the next open lane is Phase 5 authoring/tooling, starting with a minimal `prd init` or template-scaffold slice.
- Local validation for this docs-only slice included `pnpm docs:check -- --include-root-docs`, `git diff --check`, and `PATH="/opt/homebrew/bin:$PATH" pnpm foundation:gate` under Node `v24.5.0`.
- Started Phase 5 authoring/tooling by adding `prd init`, which creates validator-valid starter package directories for `general-document`, `comic`, and `storyboard`.
- Documented the new `prd init` text/JSON contract, added a minor changeset for `@eonhive/prd-cli`, and updated CLI tests to cover successful scaffolds, JSON output, unsupported profiles, and non-empty target safety.
- Verified the authoring starter slice with `pnpm exec vitest run packages/prd-cli/src/index.test.ts packages/prd-cli/src/cli.e2e.test.ts`, `pnpm docs:check -- --include-root-docs`, `git diff --check`, and `PATH="/opt/homebrew/bin:$PATH" pnpm foundation:gate`.

## 2026-05-18

- Completed the corrective `0.1.1` release closeout: all four public packages resolve on npm `latest` at `0.1.1`, and the published dependency metadata is consumer-safe with no `workspace:*` dependency values.
- Deprecated the broken `0.1.0` public npm versions for `@eonhive/prd-types`, `@eonhive/prd-validator`, `@eonhive/prd-packager`, and `@eonhive/prd-cli` with the message `Broken preview release. Upgrade to 0.1.1.`
- Reran the failed Release workflow path; Release run `#43` completed successfully on attempt 2 for `main` commit `4e62623ab44cc7b539b392152df236b49e19dfcf`.
- Verified `Post-Publish Consumer Smoke` run `#20` completed successfully, including the registry audit and external npm consumer smoke artifact uploads.
- Re-ran local `pnpm release:audit:registry` and `pnpm consumer:smoke:npm`; both passed against the real published `0.1.1` packages. The local shell is still Node `v18.17.1`, so pnpm emitted expected engine warnings while CI remains the authoritative Node 20/22 validation lane.
- The public preview is now recorded as shipped in a clean consumer-safe state at `0.1.1`. The next work should start from a fresh planning lane rather than more release-bootstrap recovery.

## 2026-04-23

- Started the `0.1.1` corrective-release slice after confirming published `0.1.0` npm tarballs still contained `workspace:*` internal dependency metadata for `@eonhive/prd-validator`, `@eonhive/prd-packager`, and `@eonhive/prd-cli`.
- Fixed `scripts/release-publish-preflight.mjs` so unified unpublished post-preview versions such as `0.1.1` now pass in normal Changesets release mode instead of incorrectly failing unless the version stayed at `0.1.0`.
- Replaced publishable-package `workspace:*` dependency ranges with concrete internal semver ranges so future npm publishes do not rely on publish-time workspace rewriting.
- Added `scripts/release-registry-audit.mjs`, root `pnpm release:audit:registry`, and `examples/dist/release-registry-audit-summary.json` as the canonical post-publish registry metadata audit surface.
- Wired `.github/workflows/post-publish-consumer-smoke.yml` to run registry audit before npm consumer smoke and upload both audit and smoke summary artifacts.
- Strengthened `scripts/release-smoke.mjs` with explicit packed-manifest dependency checks so local tarball validation now fails if publishable package metadata still contains `workspace:*` or non-semver internal dependency ranges.
- Replaced stale unreleased minor changesets left over from the `0.1.0` bootstrap path with one corrective patch changeset for the whole public toolchain so the next intended release is `0.1.1`, not `0.2.0`.
- The preview is still **not** recorded as cleanly shipped. That status remains blocked on a real `0.1.1` npm publish, deprecation of broken `0.1.0` versions, and passing post-publish registry audit plus consumer smoke.

## 2026-04-22

- Started the `0.1.0` publish-recovery slice by adding `scripts/release-publish-preflight.mjs`, root `pnpm release:preflight`, and `examples/dist/release-publish-preflight-summary.json` as the canonical npm publish-identity diagnostic surface.
- Wired the Release workflow to run publish preflight before first-preview bootstrap publish and upload the preflight summary as a workflow artifact for CI debugging.
- Hardened the release docs (`README.md`, `docs/governance/PRD_RELEASE_POLICY.md`, `docs/governance/PRD_NPM_RELEASE_RUNBOOK.md`) so they now describe the real operator sequence for npm auth, `eonhive` org membership, and first-preview bootstrap behavior.
- Fixed a real post-publish verification defect by removing TypeScript-only `as const` syntax from `scripts/external-consumer-smoke.mjs`, keeping the downstream npm consumer smoke path executable under plain Node.
- The actual npm publish is still blocked outside the repo until the `NPM_TOKEN` owner has verified publish rights for the `eonhive` npm organization and the Release workflow is rerun successfully on `main`.

## 2026-04-16

- Added a post-publish external-consumer smoke path with `scripts/external-consumer-smoke.mjs`, root `pnpm consumer:smoke:npm`, and `.github/workflows/post-publish-consumer-smoke.yml` so published npm packages are verified from a clean temp project without workspace linking.
- Refactored `apps/prd-viewer-web` package-facts/runtime copy to consume `PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR` directly, removing duplicated app-local reference-viewer load-mode/support-state strings.
- Published a validator-valid runtime conformance corpus under `examples/runtime-conformance/`, including a machine-readable expected-results manifest for `fully-supported`, `safe-mode`, and `unsupported-required-capability` reference-viewer outcomes.
- Added `scripts/runtime-conformance-check.mjs`, root `pnpm runtime:conformance`, and `examples/dist/runtime-conformance-summary.json` as the canonical executable runtime-baseline surface for the reference viewer.
- Added manifest-driven runtime tests and script tests so the published corpus is verified through validator truth, viewer-core support-state truth, and summary artifact generation.
- Completed the runtime-contract hardening slice by aligning `docs/runtime/PRD_CAPABILITY_MODEL.md` and `docs/runtime/PRD_CONFORMANCE.md` with executable type/code surfaces in `packages/prd-types` and `packages/prd-viewer-core`.
- Added typed runtime descriptor surfaces in code: `PrdRuntimeCapabilityDescriptor`, `PrdReferenceLoadMode`, `PRD_REFERENCE_VIEWER_SUPPORTED_CAPABILITIES`, `PRD_REFERENCE_VIEWER_SUPPORT_STATES`, and `PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR`.
- Expanded `packages/prd-viewer-core` tests to lock the current reference-viewer runtime descriptor and support-state subset to the documented runtime baseline.
- Expanded root/docs navigation so canonical control docs, runtime contracts, and prompt packs are discoverable directly from `README.md` and `docs/README.md`.
- Completed the conformance-lock slice by ratifying `docs/core/PRD_MINIMAL_VALID_SPEC.md`, replacing provisional `TBD` conformance-matrix rows with concrete validator/runtime truth, and cross-linking the minimal-valid baseline to live manifest/profile/runtime docs.
- Added field-level conformance coverage to `docs/core/PRD_MANIFEST_DRAFT.md`, including current schema/validator truth for `required`, `identity`, `public`, `localization`, `compatibility`, `assets`, `attachments`, `extensions`, and `protected`.
- Published a non-canonical invalid conformance fixture corpus under `examples/conformance/` for `general-document`, `comic`, and `storyboard`, and wired those directories into validator and built-CLI test coverage.
- Added `scripts/foundation-gate.mjs`, root `pnpm foundation:gate`, and `examples/dist/foundation-gate-summary.json` as the canonical repo-level conformance gate/artifact surface, with dedicated script tests for summary generation and failure reporting.
- Updated contributor-facing docs to treat `pnpm foundation:gate` as the canonical one-command local conformance gate while leaving `release:check` unchanged.
- Revised `docs/core/PRD_MINIMAL_VALID_SPEC.md` (draft v0.2) to align with accepted decisions and reviewer feedback by restoring `.prd` ZIP transport as a normative interchange requirement, restoring MUST-level portability/openability constraints, and making `general-document` structured JSON entry conformance explicit.
- Started NEXT_STEPS item 23 by adding `docs/core/PRD_MINIMAL_VALID_SPEC.md` (draft v0.1) with MVP-scoped normative rules, explicit non-goals, manifest/entry constraints, and a starter conformance matrix to map requirements to validator checks and fixtures.
- Added a new active next-phase backlog slice in `NEXT_STEPS.md` (items 23-28) covering minimal valid spec ratification, manifest conformance mapping, profile fixture hardening, foundation-gate automation, capability/conformance docs, and docs discoverability alignment.
- Added a unified orchestration artifact to `docs/prompts/PRD_MASTER_PROMPTS.md` (`Prompt 00. Unified Next-Steps Execution Prompt`) so all active next-step tasks can be planned and executed together under canonical PRD constraints.
- Completed contributor-guidance extraction by adding `docs/contributing.md` and linking it from the README contributor MVP gate section so onboarding details can evolve without overloading top-level docs.
- Completed a versioned machine-readable CLI contract doc by adding `docs/runtime/PRD_CLI_JSON_CONTRACT.md` (validate/inspect JSON schema snippets plus `prd-cli-json-v0.1` compatibility rules) and linking it from README + `packages/prd-cli/README.md`.
- Completed optional root-doc canonical path enforcement by extending `scripts/check-docs-consistency.mjs` with `--include-root-docs` support for selected non-archive root docs (`BUILD_STATUS.md`, `NEXT_STEPS.md`), and documented the scope/rationale in README.
- Hardened docs-consistency allowlist matching by requiring the explicit decisions-ledger allowance to match at the specific snippet span, preventing unrelated forbidden references in `docs/decisions/PRD_DECISIONS.md` from being silently ignored.
- Corrected `docs/runtime/PRD_CLI_JSON_CONTRACT.md` inspect schema snippet to a satisfiable single-object contract so payloads that include both validate fields and `inspection` validate as intended for downstream automation.
- Completed roadmap/glossary canonical path cleanup by normalizing stale references to `docs/...` paths and explicitly labeling still-missing planned docs in `docs/foundation/04_PRD/PRD_ROADMAP.md`.
- Completed docs consistency guard expansion in `scripts/check-docs-consistency.mjs` by scanning markdown across canonical `docs/` paths, excluding archive/history trees by default, and preserving forbidden-pattern checks with an explicit intentional legacy-reference allowance in the canonical decisions ledger.
- Completed package-level CLI contract documentation by adding `packages/prd-cli/README.md` (commands, exit codes, stable text/JSON contracts for `pack`, `validate`, and `inspect`) and linking it from repository top-level docs.
- Completed canonical render-mode helper alignment by introducing typed render-mode utilities in `packages/prd-viewer-core`, refactoring `apps/prd-viewer-web/src/viewerRenderMode.ts` to consume the core helper, and extending viewer-core/web tests to guard against contract drift.

## 2026-04-15

- Completed NEXT_STEPS item 18 by updating `README.md` plus release governance docs to explicitly define `pnpm examples:smoke` as the canonical aggregate smoke command, document `--json-summary` as CI annotation/reporting support, and align smoke-gate wording across release/check flow guidance.
- Completed NEXT_STEPS item 5 by adding table-driven validator coverage for entry-path validation branches (`entry-empty`, `entry-absolute`, `entry-backslash`, `entry-url`, `entry-traversal`, `entry-directory`) and preserving stable issue-code assertions.
- Completed NEXT_STEPS item 6 by adding a validator manifest-level profile/entry compatibility matrix test for `general-document`, `comic`, and `storyboard`, including structured JSON, HTML legacy fallback, and invalid non-canonical entry cases.
- Completed NEXT_STEPS item 15 by adding built CLI E2E invalid-package snapshots for `validate` and `inspect` in both text and `--json` modes.
- Completed NEXT_STEPS items 10 and 17 by adding a docs consistency guard script that fails on stale canonical path references in control docs and wiring it into the `codex:check` pipeline via `docs:check`.
- Completed NEXT_STEPS item 11 by adding a CI step to run `pnpm examples:smoke -- --json-summary` and uploading generated summary JSON artifacts from `examples/dist/smoke-summaries/*.json`.
- Extended smoke summary behavior to emit per-example JSON files under `examples/dist/smoke-summaries/` when `--json-summary` is enabled, so CI artifact upload can reliably capture machine-readable outputs.
- Consolidated the canonical PRD decisions ledger into `docs/decisions/PRD_DECISIONS.md`, merged unique historical decisions from legacy foundation decisions-path pointer, and converted the foundation-path file into an archived pointer to prevent future drift.
- Updated source-of-truth decision-log references in `README.md`, `AGENTS.md`, `docs/governance/PRD_PROMPT_DOCTRINE.md`, and `docs/prompts/PRD_MASTER_PROMPTS.md` to point to `docs/decisions/PRD_DECISIONS.md`.
- Completed a CLI test-hardening task by adding built-CLI snapshot coverage for `validate` and `inspect` text/`--json` output using the existing E2E fixture flow, including byte-field normalization to keep snapshots deterministic while still catching contract drift.
- Completed NEXT_STEPS item 1 by aligning the README contributor MVP gate to current root script names (`typecheck`, `test`, `build`, `examples:smoke`) and clarifying script-name sync expectations.
- Completed NEXT_STEPS item 2 by updating README changeset guidance to match current CI-driven `main` release workflow policy and non-publishing change expectations.
- Completed NEXT_STEPS item 6 by adding dedicated `apps/prd-viewer-web` tests that assert rendering-mode message behavior for structured JSON, HTML fallback, and unsupported modes.
- Completed NEXT_STEPS item 7 by adding a cross-package integration test that validates support-state/render-mode alignment across validator results, viewer-core document opening, and web render-mode mapping.
- Consolidated and formatting-standardized `NEXT_STEPS.md` as the single checklist-style canonical backlog, confirmed `NEXT_STEPS copy.md` items were already merged, and verified the duplicate file remains removed.
- Updated control docs and docs index references from legacy `foundation/PRD_*.md` paths to canonical `docs/foundation/04_PRD/PRD_*.md` paths (`docs/README.md`, `docs/architecture/PRD_SYSTEM_BLUEPRINT.md`, `docs/decisions/PRD_DECISIONS.md`) and verified with repo-wide search.
- Updated canonical reference lists in `README.md`, `AGENTS.md`, `docs/governance/PRD_PROMPT_DOCTRINE.md`, and `docs/prompts/PRD_MASTER_PROMPTS.md` to use real `docs/foundation/04_PRD/*` file paths; verified no stale legacy foundation-path references remain.
- Consolidated `NEXT_STEPS.md` into a single canonical numbered backlog format, added a top-line canonical note, and recorded that `NEXT_STEPS copy.md` was not present for merge/archival during this update.
- Added a contributor-facing README section documenting the MVP local gate flow (workspace linking, required local checks, changeset guidance, and deferred npm publication policy).
- Included exact commands and expected outcomes so contributors can validate fully without npm credentials.
- Completed: Defined a stable PRD CLI output contract for `validate` and `inspect` with explicit, documented fields used by both text and `--json` output.
- Completed: Added deterministic human-readable section ordering and consistent unknown-command failure behavior for the limited command surface (`pack`, `validate`, `inspect`).
- Completed: Expanded CLI tests to cover missing-argument usage errors, exit code behavior (`0` valid / `1` invalid), expected JSON key presence, and deterministic text section ordering.
- Expanded validator schema tests to assert canonical top-level manifest required fields.
- Expanded validator unit tests to cover required manifest field issue codes, entry path compatibility, and profile/entry mismatch failures.
- Added a fixture-style helper for validator tests to quickly build `PrdFileMap` test inputs.
- Stabilized manifest required-field and profile-entry-format issue code selection in `packages/prd-validator/src/index.ts` via shared constants.
- Added an MVP smoke-gate script for `examples/document-basic` that runs pack, source validate, packed validate, and packed inspect in a strict sequence.
- Added root script target `examples:smoke:document-basic` with a prebuild hook for `@eonhive/prd-cli`.
- Verified the new smoke-gate command succeeds end-to-end.
- Added explicit viewer UI rendering-mode messages in `apps/prd-viewer-web` to distinguish:
  - structured JSON entry rendering,
  - HTML fallback rendering,
  - unsupported entry mode detection.
- Clarified messaging that validator package validity and viewer rendering capability are separate concerns.
- Expanded `packages/prd-viewer-core` tests to verify viewer unsupported/fallback states can still coexist with validator-valid packages.
- Completed: Replaced assertion-only CLI output-contract checks with snapshot coverage for both `validate`/`inspect` text output and `--json` output shapes.
- Completed: Added built-binary E2E CLI coverage that executes `packages/prd-cli/dist/cli.js` for `pack`, `validate`, and `inspect` against temporary fixtures.
- Completed: Added smoke scripts for `examples/resume-basic`, `examples/comic-basic`, and `examples/storyboard-basic`.
- Completed: Added `examples:smoke` root aggregator command that runs all example smoke gates.
- Completed: Added optional machine-readable smoke summary emission via `--json-summary` in smoke scripts.

- Refined built-CLI E2E test naming to explicitly assert dist-binary command execution for `pack`, `validate`, and `inspect` as the command-surface gate.
- Added aggregate smoke orchestrator script `scripts/examples-smoke-all.mjs` and wired root `examples:smoke` to that single command entrypoint.
- Completed housekeeping request to keep NEXT_STEPS as canonical backlog with a single numbered checklist style; confirmed NEXT_STEPS copy file is absent and consolidated note retained.
- Updated stale canonical-doc references in `README.md`, `AGENTS.md`, `docs/governance/PRD_PROMPT_DOCTRINE.md`, and `docs/prompts/PRD_MASTER_PROMPTS.md` to point at `docs/decisions/PRD_DECISIONS.md`.
- Updated `NEXT_STEPS.md` checked and pending decisions-path items to consistently reference the finalized canonical path `docs/decisions/PRD_DECISIONS.md`, while explicitly treating foundation-path mentions as duplicate legacy references.
