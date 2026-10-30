# PRD Living Homepage

Implemented locally October 26, 2026. Production deployment and launch acceptance
remain separate from the local checks recorded in `BUILD_STATUS.md`.

The October 27 public rebrand keeps this experience and its runtime ownership
while applying the shared purple identity across Home, Viewer, and Docs. The
header and footer are shared public components. The hero adds original
decorative document artwork and direct Viewer/Examples/Docs actions; profile
cards below the story open the existing example packages. Theme tokens now
come from `prdBrand.css`; see [PRD_VISUAL_IDENTITY.md](PRD_VISUAL_IDENTITY.md)
for assets, generation provenance, route behavior, and acceptance limits.

## Experience and boundaries

The existing Vite app keeps Home (`/`), Viewer (`/viewer/`), and Docs (`/docs/`).
Home presents six chapters around one persistent HTML document object:
Awakening, Responsive, Structure, Profiles, Viewer, and Portable. Native scroll
position drives reversible presentation sampling; no wheel or touch scrolling
is intercepted. Chapter links and ordinary document content remain available
when motion cannot initialize. A `noscript` reading outline links to source docs.

The homepage is an application experience, not a PRD format extension. No
manifest semantics, schemas, profile identities, validator rules, content models,
or viewer-core APIs change. Report, resume, and magazine are illustrative
`general-document` layout studies. Comic and storyboard retain their own
first-class profile identity and open their own valid example packages.

### When motion cannot initialize

A rejected runtime import or initialization activates an event-driven static
presentation. It reuses the pure chapter-position helper and the same document
and Viewer nodes. Native scrolling updates chapter navigation in both directions,
profile visibility and the inline Viewer; device choices apply their widths
immediately. There is no fallback frame loop, ambient timer, tween or automatic
runtime retry. A healthy runtime retains sole ownership of the animated path.

The fallback measures chapter and copy bounds on entry, resize and observed
content changes, retaining the existing mobile sheet placement after chapter
copy. Scroll events read cached bounds only. Leaving the story hides the fixed
presentation; returning restores the current chapter. Observer and event cleanup
also guards callbacks already queued when Home unmounts.

Perspective, decorative particles and exploded layers are disabled. The separate
structure inspector and profile descriptions remain available, and the real
Viewer retains inline/focus presentation, sample selection and package links.
The sound button is disabled with an explicit unavailable label. A delayed
startup failure after unmount cannot activate fallback listeners or feedback.
This fallback requires JavaScript; the existing `noscript` outline remains the
no-JavaScript reading path. DOM tests verify behavior with rejected initialization,
not actual network failure or browser rendering.

## Inspected uRK capabilities

The upstream main branch was checked at commit
[`8fb03fbb9e09b2cdb432fe51da3f72cda67476ff`](https://github.com/eonhive/urk/commit/8fb03fbb9e09b2cdb432fe51da3f72cda67476ff).
The sibling development checkout contains uncommitted additions and was not
used as a dependency. See the app's `vendor/README.md` for archive provenance.

| Capability in inspected main | Homepage use or limit |
| --- | --- |
| Kernel, `frameMode: "auto"`, scoped frame work, lifecycle cleanup | One kernel owns presentation work. Each requested paint releases its frame demand. |
| `@urk/adapters/motion` scoped numeric tweens and finite DOM motion | Device widths and profile reveals tween through the same kernel; interrupted motion is canceled by scope or target. |
| Seekable motion timelines | Absent on inspected main. Pure progress sampling interpolates chapter poses without allocating animations per scroll event. |
| Standalone scene-flow API | Absent on inspected main. A small application coordinator selects the six chapters; no second scene framework is added. |
| Three adapter, render invalidation, context handling | Available; this implementation uses CSS perspective and semantic HTML instead. WebGL is never required. |
| Audio transport and optional spectrum analysis | Lazy registration after opt-in; original generated ambient WAV, visible mute control, graceful analysis failure. |
| Input and pointer adapters | Available. Native anchors, buttons, pointer events, and the browser dialog supply this page's input; no 3D picking is needed. |
| UI overlay/widgets compatibility | Available for runtime feedback and mounted panels. The page uses native React controls and a native modal dialog, not an invented widget API. |
| Video and loading adapters | Available but not needed by the current samples or this presentation. |
| Dedicated particle system and automatic quality controller | Absent on inspected main. A bounded decorative field and app-owned conservative quality selection cover the homepage. |

## State and frame ownership

`livingExperienceModel.ts` owns pure chapter sampling and profile/quality helpers.
`livingExperienceRuntime.ts` owns one kernel and the presentation lifecycle.
`LivingHomepage.tsx` owns accessible UI and document selections.
`LivingViewer.tsx` owns one embedded workspace and its inline/modal presentation.

- Scroll state holds the current native offset and cached chapter bounds.
- Experience state holds motion intensity, quality choice, and viewer focus.
- Document state holds the selected device, layout study, layer, and sample.

Chapter geometry and the ends of chapter copy are measured on resize, not on
each scroll event. Mobile uses the measured copy ends to place the shared sheet
after the content, so an expanded package disclosure cannot overlap it. The
existing ResizeObserver watches chapter copy as well as chapter sections. Scroll and
pointer input coalesce into a single pending kernel paint. Ambient float wakes
at approximately 12.5 Hz in high quality and 7 Hz in low quality; there is no
permanent 60 Hz ambient loop. Motion off and the system reduced-motion preference
release idle frame demand completely. Viewer focus, page visibility, and leaving
the story pause ambient work. Quality uses viewport, CPU/memory hints, data-saving
preferences, and repeated costly active paints; it does not claim to benchmark
GPU performance or adjust a nonexistent WebGL framebuffer.

Pointer parallax is also suspended while the experience is offscreen or the
visitor has passed the story. Returning to the story resumes input-driven work.
Runtime tests cover those boundaries and verify scroll/pointer bursts reuse
cached chapter geometry until a resize requires a new measurement.

Device width and profile reveals now share the same suspension rules. Viewer
focus, leaving the visible story, hiding the page, reaching the story end, or
requesting reduced motion settles the selected layout and cancels finite motion.
Hidden/offscreen suspension also releases a pending presentation paint. Every
paint clears the previous ambient wake-up before deciding whether to schedule
another, so reaching the story end cannot leave a stale timer behind.

Selections made during suspension apply immediately. Scroll position and resize
measurements stay current while offscreen, with no presentation frame request;
returning to view paints the latest position and resumes eligible ambient work.
Disposal cancels motion, timers, and pending paints before kernel shutdown; repeated
cleanup, late observer callbacks, and later runtime commands are harmless.

These boundaries are exercised against the real pinned uRK scheduler using
deterministic browser frame/timer fixtures. Tests include interrupted device
motion, selections during suspension, return-to-view interaction, and 30 repeated
mount/dispose cycles with no retained frame/timer work. This is scheduler ownership
evidence, not a browser frame-rate, heap-memory, GPU, or physical-device benchmark.

Device transforms, layer separation, and reassembly change presentation only.
The general-document studies are explicitly illustrative. Canonical package
content is rendered by the real reference viewer in Chapter 05.

## Optional audio lifecycle

Sound remains opt-in and lazy. A private request generation now guards startup
across module loading, adapter registration, native playback and optional Web
Audio analysis. Hiding the page invalidates the request, pauses the existing uRK
transport and disables analysis. Returning to the page does not revive an older
request or announce paused audio as playing; a fresh visible opt-in is required.
Hidden pages cannot initiate startup through a runtime command.

Explicit mute and disposal also invalidate the request and immediately clear the
audio visual level, including with motion off. Toggling while startup is pending
cancels that opt-in. Cancellation resolves quietly as false; genuine playback
failures from a current request still reach the existing sound feedback.
Unavailable analysis retains ordinary playback. One shared initialization reuses
the adapter, track and generated WAV URL. A fresh opt-in can proceed while an
older cancelled native promise is pending; older completions cannot clear the
new request's loading state, pause it or publish stale feedback. In-flight
registration may finish a reusable track setup after visibility changes, but it
cannot play that track until a fresh request. Disposal revokes the URL after the
existing kernel cleanup, with no late playing callback.

Runtime tests use the actual pinned uRK audio adapter with deterministic native
media/Web Audio substitutes. They cover hide-and-return at startup, track setup,
playback and analysis; immediate cancellation/retry; unavailable analysis; real playback
errors; mute level reset; and disposal/URL cleanup. These are transport/lifecycle
checks, not audible browser, autoplay-policy or physical-device acceptance.
No audio API, format rule, dependency, or animation scheduler is introduced.

## Profile presentations

Chapter 04 keeps the same paper element while selecting six compositions.
Document, report, resume, and magazine rearrange one shared study's headings,
sections, and facts without changing their DOM reading order. These are layout
studies within `general-document`, not additional canonical profiles or converted
packages. The real authored example remains available through the Viewer.

Comic and storyboard show the first three source images from their canonical
packages. After archive validation, the demo build resolves the ordered content
items against manifest-declared assets and copies the original image bytes.
Adjacent `.prd.preview.json` files identify the sample, profile, entry, images,
authored alt text, and captions/notes. `prd-home-profile-preview-v0.1` is a private
homepage asset contract, not a package member, profile renderer, format extension,
or public API. The real Viewer still opens and validates the original `.prd`.

Metadata loads as the chapter approaches. Image elements mount only while the
profile presentation is active and the Viewer is not focused. The client accepts
only known visual samples, bounded metadata, and exact sample-local image paths
under the hosting base. Interrupted requests cannot replace a newer selection.
Missing metadata, HTML fallbacks, and image failures retain Viewer access and
offer retry; retry remounts failed image elements.

The floating artwork is decorative. A labeled tab panel follows the controls in
the chapter's semantic reading order and exposes the complete shared study or
source image descriptions through a native disclosure. Arrow keys wrap through
the tabs; Home/End select the endpoints; Tab and vertical scrolling retain native
behavior. All six controls have targets at least 44px high.

Profile selection uses one finite opacity/translation reveal on the existing
scoped uRK motion adapter: 420ms in full mode, 160ms in subtle mode, immediate
settlement with motion off or the system reduced-motion preference. New choices
cancel the previous reveal; chapter exit, hidden/offscreen state, Viewer focus,
and dynamic reduced-motion changes settle it. No extra render loop, scene
manager, layout-morph API, or animation dependency is introduced. Sample selection
continues to drive the inspector, persistent Viewer, and final download.

## Viewer integration

The existing Viewer route accepts a known sample ID in `?sample=...` and the
optional `embed=1` presentation flag. Only entries from
`viewerDemoExampleArchives` can be selected; the query cannot load an arbitrary
remote URL. Embedding removes the site navigation while keeping the actual
workspace, validation status, semantic renderer, outline, metadata, attachments,
and locale controls.

The iframe mounts near Chapter 05, then uses the existing hosted-archive fetch,
`handleFile`, package validation, `openPrdDocument`, and profile renderers.
The same iframe stays mounted in a native dialog. Inline presentation sets the
dialog's `open` property without invoking automatic focus changes during scrolling.
Focus mode promotes that same element to the browser's modal top layer; it does
not move the iframe to another parent or create another Viewer. Closing restores
the story position and invoking control. Locale, selected comic/storyboard item,
and the existing reading workspace survive presentation changes and chapter exits.
Selecting a different example deliberately loads a different package.

The October 27 continuity follow-up also keeps the iframe URL fixed after its
first mount. Parent sample changes use the app-only `prd-viewer:select-sample`
message after `prd-viewer:ready`; the embedded app accepts requests only from
its exact parent window and origin, and only for allowlisted example IDs. A
command matching the current or in-flight example is a no-op, preserving locale,
panel selection, and resource URLs. If the frame boots again, readiness requests
the homepage's latest selection rather than relying on the original URL query.

Samples explicitly chosen through the embedded Viewer's own controls send
`prd-viewer:sample-selected`. The parent updates its inspector, profile study,
and final package links without echoing another load command. This message reports
selection intent; the real Viewer validation result remains authoritative.
Bootstrap and parent-requested loads do not emit selection echoes.

Opening a local file sends only `prd-viewer:local-file`, without a filename,
manifest, resource, or file bytes. The outer selector shows that a local file is
open and can explicitly return to the same canonical example. The homepage's
download remains the selected public example; it never publishes the local file.
All message parsing strips unrelated fields and authenticates both origin and
browsing context. These messages, including Escape, are application UI contracts
and introduce no PRD capability, extension, or runtime requirement.

File reads and sample fetches share an app-owned load generation. A newer
selection aborts the older fetch and invalidates any older file read or pending
open. Stale success/error/finally paths cannot replace package state, change
loading feedback, or allocate current resource URLs. Unmount cleanup invalidates
pending work; the initial sample also survives React Strict Mode cleanup/replay.

Chapter 03 now includes an actual example-package inspector. The demo asset
build uses the existing Node `inspectPrdArchive` API on each generated `.prd`
archive, rejects invalid packages, and writes an adjacent
`.prd.inspection.json` asset containing the validated manifest, archive size,
uncompressed size, and file count. These generated assets remain ignored with
the demo archives. `prd-home-sample-v0.1` is an app-only metadata contract, not
a PRD format, manifest, CLI, or runtime contract.

The inspector fetches these small metadata assets when its chapter approaches;
it does not unzip or render another copy of the document. It checks the selected
allowlisted sample, contract, numeric facts, canonical manifest validity, and
expected profile. Missing assets, including an HTTP 200 HTML fallback, show
retry feedback and retain Viewer access. Selection changes cancel stale
requests. The inspector shell remains mounted during backward scrolling and
does not depend on uRK initializing successfully.

Its layer disclosures show the actual manifest or the content entry, resources,
and profile declarations drawn from that manifest. They do not pretend to render
the content entry or implement format validation in the UI. Inspection is
explicitly identified as build-time evidence; the real Viewer validates the
archive again when it opens.

The inspector, profile studies, and outer Viewer toolbar share the homepage's
selected example. All four hosted samples, including the segmented document,
are available in the inspector and toolbar. Chapter 06 downloads that selected
archive and links to the same example in the full workspace, under either `/`
or `/prd/`. Downloading does not convert a layout study into a newly authored
package. A local file opened inside the Viewer remains local to that workspace;
the homepage's sample download continues to name its selected canonical example.

Escape pressed inside the iframe is forwarded by the embedded web app using the
app-only `prd-viewer:exit-focus` message. The parent accepts that request only
from its current iframe window and its own exact origin. This UI message does not
change PRD format or viewer-core contracts. Packaged media is paused when the
workspace becomes hidden; it is not automatically restarted on return.

Supported modes are continuous and paginated structured-document reading, comic
panel navigation, and storyboard review. The embedded Viewer uses the same
reading-mode implementation as the full workspace.

### Structured-document reading modes

The October 29 reading slice adds Continuous/Paginated controls around the
existing structured `general-document` renderer, including resolved segmented
content and the existing resume presentation. Comic, storyboard and restricted
HTML previews retain their existing presentations without document-page controls.

Pagination uses native CSS columns with a bounded viewport-relative height and
the actual available content width. Browser layout determines column breaks and
page count. Page numbers are temporary presentation state, not authored pages,
manifest fields, canonical locators, print pagination or a format extension.
The current reference presentation remains left-to-right. No new direction or
writing-mode interpretation is introduced by this slice.

`ViewerReadingView.tsx` retains one renderer tree and exposes mode controls,
Previous/Next and an announced page count. Its private `viewerPagination.ts`
controller observes resize, media load and font completion, with window resize
as the fallback when ResizeObserver is unavailable. There is no render loop,
animation framework, clone, screenshot or second package load. CSS columns
fragment normal block flow; paginated resume grids become a linear presentation
of the same DOM. Images are bounded to the page height, while native overflow
keeps oversized content reachable. Printing releases the column constraints.

Cached semantic anchors retain the current section or paragraph fragment across
mode changes, width/height changes, locale updates and hidden/reopened embedded
panes. Reflow approximates position within a split paragraph; it does not promise
an identical line or page number after font/width changes. Missing authored IDs
fall back to the existing node position and containing section. A newly opened
package resets to page one. Native horizontal scroll updates page feedback;
ordinary wheel/touch scrolling is not intercepted.

Left/Right, Page Up/Down and Home/End operate only on the focused paginated
viewport. Modifier keys, text selection, focused links/media, vertical arrows,
Tab and Escape retain native behavior. Outline and in-content fragments reveal
their target page, retain fragment history and focus the semantic target.
Modified/new-tab links are left to the browser. Focused content on another page
is revealed, and unavailable page actions use `aria-disabled` to preserve button
focus at a boundary. All content stays in semantic DOM order without page-based
`aria-hidden` or duplicate IDs. Continuous mode remains the default.

Tests model column geometry in jsdom and exercise real validated sample bytes,
segmented-section resolution, French overrides and resource/node continuity.
They do not execute a browser's CSS fragmentation engine. Browser access returned
for the October 29 column-bounds follow-up. Actual desktop and 390/320px checks
found and corrected phantom final pages caused by rounding each column to integer
`clientWidth`. Page counts and navigation now use the fractional rendered flow
width. Detailed browser evidence and remaining rich-content, physical-device and
assistive-technology acceptance are recorded in the hosting runbook.
Browser behavior references: [CSS column filling](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/column-fill)
and [fragment rectangles](https://developer.mozilla.org/en-US/docs/Web/API/Element/getClientRects).

## Accessibility and follow-up

The page supplies native chapter anchors, a main skip target, named controls,
pressed states, visible focus, live layer explanations, system reduced-motion
handling, and opt-in sound. Mobile stacks text above the same document object
and limits its perspective effects through the conservative quality default.

Before public deployment, verify with assistive technologies and physical touch
devices, profile long-session and low-end device performance, and complete the
existing hosting launch checklist. WebGL-specific polish remains a bounded
follow-up. Upstream timelines or scene
flow should be adopted only after their actual public contracts exist.

## Changed files

New app sources under `apps/prd-viewer-web/src/`:

- `LivingHomepage.tsx`
- `LivingViewer.tsx`
- `LivingPackageInspector.tsx`
- `livingPackageInspection.ts`
- `livingPackageInspection.test.ts`
- `LivingViewer.test.ts`
- `LivingViewer.integration.test.ts`
- `viewerLoading.integration.test.ts`
- `livingViewerMessages.ts`
- `livingViewerMessages.test.ts`
- `livingExperienceModel.ts`
- `livingExperienceRuntime.ts`
- `livingExperienceAudio.ts`
- `livingHomepage.css`
- `livingExperienceModel.test.ts`
- `livingExperienceRuntime.test.ts`
- `LivingProfilePreview.tsx`
- `livingProfileMedia.ts`
- `livingProfilePreview.css`
- `livingProfileMedia.test.ts`
- `LivingHomepage.profiles.integration.test.ts`

Updated app files:

- `apps/prd-viewer-web/src/App.tsx`
- `apps/prd-viewer-web/src/viewerDemoContent.ts`
- `apps/prd-viewer-web/src/viewerDemoContent.test.ts`
- `apps/prd-viewer-web/src/viewerExperience.test.ts`
- `apps/prd-viewer-web/index.html`
- `apps/prd-viewer-web/package.json`
- `package.json` (test-only DOM environment)
- `pnpm-lock.yaml`

The package handoff follow-up also updates
`scripts/prepare-viewer-demo-assets.mjs`, its tests, and
`apps/prd-viewer-web/src/viewerExperience.test.ts`. It reuses existing validator
inspection APIs without changing uRK, format, or viewer-core public interfaces.
The profile follow-up also adds
`apps/prd-viewer-web/scripts/prepare-profile-previews.mjs` and extends the hosted
smoke script/tests to compare preview metadata and copied artwork with the
validated archive.

New pinned dependencies and provenance:

- `apps/prd-viewer-web/vendor/urk-core-0.2.0.tgz`
- `apps/prd-viewer-web/vendor/urk-adapters-0.2.0.tgz`
- `apps/prd-viewer-web/vendor/README.md`

Documentation:

- `docs/product/PRD_LIVING_HOMEPAGE.md`
- `docs/product/PRD_PRODUCT_BOUNDARIES.md`
- `docs/governance/PRD_HOSTING_RUNBOOK.md`
- `docs/README.md`
- `README.md`
- `BUILD_STATUS.md`
- `NEXT_STEPS.md`
