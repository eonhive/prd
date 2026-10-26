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

Chapter geometry is measured on resize, not on each scroll event. Scroll and
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
- `LivingViewer.test.ts`
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
- `pnpm-lock.yaml`

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
