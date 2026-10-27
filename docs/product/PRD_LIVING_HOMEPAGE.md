# PRD Living Homepage

Implemented locally October 26, 2026. Production deployment and launch acceptance
remain separate from the local checks recorded in `BUILD_STATUS.md`.

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

## Inspected uRK capabilities

The upstream main branch was checked at commit
[`8fb03fbb9e09b2cdb432fe51da3f72cda67476ff`](https://github.com/eonhive/urk/commit/8fb03fbb9e09b2cdb432fe51da3f72cda67476ff).
The sibling development checkout contains uncommitted additions and was not
used as a dependency. See the app's `vendor/README.md` for archive provenance.

| Capability in inspected main | Homepage use or limit |
| --- | --- |
| Kernel, `frameMode: "auto"`, scoped frame work, lifecycle cleanup | One kernel owns presentation work. Each requested paint releases its frame demand. |
| `@urk/adapters/motion` scoped numeric tweens and finite DOM motion | Device widths tween through the kernel; interrupted motion is canceled by scope. |
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

Device transforms, layer separation, and reassembly change presentation only.
The small document object is explicitly illustrative. Canonical package content
is rendered by the real reference viewer in Chapter 05.

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

Supported modes are responsive document flow, comic panel navigation, and
storyboard review. Pagination is not implemented by the reference renderer and
is not advertised or simulated as a working mode.

## Accessibility and follow-up

The page supplies native chapter anchors, a main skip target, named controls,
pressed states, visible focus, live layer explanations, system reduced-motion
handling, and opt-in sound. Mobile stacks text above the same document object
and limits its perspective effects through the conservative quality default.

Before public deployment, verify with assistive technologies and physical touch
devices, profile long-session and low-end device performance, and complete the
existing hosting launch checklist. Richer animated profile transitions and
WebGL-specific polish remain bounded follow-ups. Upstream timelines or scene
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
