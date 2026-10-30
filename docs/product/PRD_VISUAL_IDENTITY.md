# PRD Visual Identity

_Updated: October 27, 2026_

## Scope

The owner's light/dark PRD reference boards guide the existing public Home,
Web Viewer, Docs, Convert, and their navigation. The folded document mark, purple
accents, cool light surfaces, and navy dark surfaces form one product identity.
This is a presentation baseline, not a change to PRD Core or package validity.

## Shared foundations

`apps/prd-viewer-web/src/prdBrand.css` owns the public theme tokens, navigation,
buttons, links, profile cards, and footer. `styles.css` retains structural
styles; `livingHomepage.css` owns chapter/document choreography;
`viewerWorkspace.css` owns the reader workspace. Page styles consume the shared
palette rather than defining separate Home and Viewer palettes.

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#F7F8FD` | `#0B0D1F` |
| Main surface | `#FFFFFF` | `#171A32` |
| Primary violet | `#713DF1` | `#A57BFF` |
| Primary text | `#20203F` | `#F5F2FF` |
| Secondary text | `#65708A` | `#A6ACC8` |
| Border | `#E4E6F1` | `#303452` |
| Primary action | purple gradient with white text | purple gradient with white text |

These six color roles match the owner's explicit rebrand specification. Shared
page, panel, and document surfaces consume those roles; quieter accents and
emphasis borders remain derived details. Primary action fills use a darker
violet gradient so white button labels remain readable. The lighter dark-theme
violet is used for accent text, selection, and keyboard focus.

Interface typography uses the operating system sans-serif stack. Document
content retains its own readable typography. Purple identifies primary
actions, active navigation, focus, and selected controls; document content
remains visually dominant.

Navigation links, reading controls, outline labels/search, file-opening
actions, and package facts use at least 12px at the default root size. Existing
44px mobile control targets remain intact. The Docs hero uses the shared soft
accent wash rather than a stronger tint behind secondary text.

`ViewerSiteNavigation` supplies Home, Viewer, Convert, Docs, Profiles, and Examples on
every public page. Profiles and Examples lead to real Home sections. Public
pages link to Open Viewer; the Viewer retains its native Open .prd action.
`PrdSiteFooter` provides the shared byline and public journeys on Home and Docs.
Native new-tab and modified-click behavior remains available for route links.

Theme changes persist when storage is available and synchronize already-open
same-origin pages and the mounted embedded Viewer. Receiving a storage change
does not write it back or reload the document. SPA route navigation focuses
the main landmark or selected section; Docs cards and the Examples section
are focusable anchor targets.

## Home and Docs

Home retains six chapters, one document object, the existing uRK lifecycle,
optional sound, reduced-motion settings, package inspection, and one persistent
real Viewer. Its hero follows the new reference through a purple headline,
clear actions, document artwork, and floating format labels. The three profile
cards open the existing document, comic, and storyboard packages. A fourth
link opens the segmented general-document example. Illustrative artwork does
not claim to be the contents of those canonical packages.

Docs uses the same header, theme toggle, action styling, panels, and footer.
Section links and canonical repository documentation remain the navigation
source; the rebrand does not create a second documentation corpus. Routes
include `/`, `/viewer/`, `/convert/`, and `/docs/`, with `/prd/` supported as a hosting base.

The reference board's AI, sharing, Studio, and other future controls do not
create implementation requirements for this visual change. Supported Viewer
behavior and runtime support reporting remain separate from package validity.

## Assets and generation

- `apps/prd-viewer-web/public/brand/prd-mark.svg`: code-authored favicon matching
  the existing inline folded-document mark.
- `apps/prd-viewer-web/public/brand/prd-world.webp`: original decorative fantasy
  landscape generated with the built-in imagegen tool. The WebP is the deployed
  derivative; the PNG master is retained under ignored `examples/dist/brand/`
  and the image tool's generated-image directory. No runtime dependency on
  those local master locations is introduced.

The reference image supplies the visual direction. The generated artwork is
new illustration rather than an edited copy of the reference board. Interface
text, links, controls, and document layouts are implemented in React/CSS.

Exact image-generation prompt:

```text
Use case: illustration-story. Asset type: original decorative landscape artwork placed inside a document preview on the PRD landing page. Primary request: an elegant panoramic fantasy world of floating islands and a luminous castle, with cascading waterfalls, a winding mountain path and layered distant peaks, in a rich editorial illustration style. Composition: wide landscape, approximately 3:2, clear main castle in the middle distance, detailed but calm enough to read at thumbnail size, artwork fills the image edge to edge. Lighting: soft golden sunrise through lavender clouds. Palette: deep indigo, violet, periwinkle, icy blue, warm pale gold. Polished painterly illustration with crisp architectural silhouettes and soft atmospheric depth. Constraints: artwork only, no lettering, no logos, no UI, no frames, no mockup devices, no watermark, no extra characters. Opaque background.
```

## Acceptance

Local type, markup/link, runtime regression, build, and docs checks are recorded
in `BUILD_STATUS.md`. On October 27, fresh local browser review covered the
rebranded Home, Viewer, and Docs at 1280 × 720 and mobile viewports of
390 × 844 and 320 × 800. The checked layouts had no horizontal overflow.

- Light/dark presentation and reload persistence; theme synchronization across
  open pages and the single embedded Viewer while retaining French content
  and the same prepared image URL.
- Public route links, Docs section focus, Examples focus and real package
  handoffs for document, comic, and storyboard profiles.
- Mobile outline filtering/selection and drawer closure, storyboard keyboard
  continuation, reading width, and Escape from focus reading.
- Native `.prd` selection, invalid-package feedback and recovery to a valid
  document. No browser warnings/errors were observed in these checks.

Fresh screenshots and `browser-summary.json` are local generated evidence under
ignored `examples/dist/rebrand-qa/`. Both hosting-base production builds pass;
browser interactions were reviewed on the local development server. Physical
touch, real OS drag/drop, screen-reader acceptance, constrained-device profiling,
deployment and production route checks remain in launch items 44/48. Signature
public-key/trust interaction acceptance remains separate under item 62.

## Convert workspace — October 29, 2026

The supplied light/dark converter mockup guides the tool layout rather than introducing another identity or landing page. `convertWeb.css` uses shared violet/light/navy tokens, folded-document marks, modest borders and readable 12px-or-larger labels. Upload and selected files sit beside a compact options rail; factual quality/assets/plain-source review follows beneath. Native browse/drop, removal and actual conversion actions remain distinguishable and keyboard-accessible; narrow layouts stack the panels and button targets are at least 44px.

Only supported Markdown/HTML options appear. The reference's PSD/PSB, AI analysis, layer switches, 2GB limit, percentages, history and templates do not create capability claims. Source is never rendered as live HTML. See [Convert HTML/workspace policy](../architecture/PRD_CONVERT_WEB_HTML.md). Browser automation is disabled for this continuation, so new light/dark/mobile screenshots and interaction acceptance remain pending.
