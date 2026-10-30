# PRD_ROADMAP.md
_Last updated: May 24, 2026_
_Status: Roadmap draft v0.1_

## Purpose
This roadmap breaks PRD into practical phases so the project does not turn into a giant vague ambition blob.

The goal is to move from **clear foundation** to **minimal real format** to **profile support** to **ecosystem expansion**.

---

## Roadmap Philosophy

PRD should be built in layers:

1. Foundation first
2. Minimal viable format second
3. Profile support third
4. Tooling and renderer maturity next
5. Advanced rights/payment/crypto extensions later

Do not build late-stage fantasy systems before the base format is real.

---

# Phase 0 — Foundation Lock
**Goal:** Define the backbone before implementation.

## Deliverables
- PRD history archive
- PRD foundation doc
- PRD decisions log
- PRD glossary
- PRD roadmap
- PRD system blueprint
- PRD master prompts
- initial product-family map
- initial manifest philosophy
- initial scope boundaries

## Exit criteria
- project vocabulary is stable enough
- first principles are explicit
- v1 boundaries are clear enough to start technical design
- milestone execution method is explicit enough to guide future docs

---

# Phase 1 — Minimal Valid PRD Spec
**Goal:** Define the smallest real PRD package that works.

## Deliverables
- minimal valid PRD package structure
- base manifest draft
- identity/version fields
- content entry rules
- asset declaration basics
- compatibility rules
- validation rules
- one simple reader/render prototype target

## Questions to answer
- What files are mandatory?
- What is the simplest legal PRD?
- How does a viewer know where content starts?
- How are assets declared?
- What is embedded vs referenced?

## Exit criteria
- a tiny PRD example can be authored and opened
- the base spec is understandable and testable
- there is no dependency on crypto or cloud systems

---

# Phase 2 — Core Profiles
**Goal:** Make PRD real across multiple document types.

## Priority profiles
1. General document
2. Comic
3. Storyboard

## Deliverables
- profile definitions
- structure rules per profile
- layout/render rules per profile
- example sample docs per profile
- fallback behavior for unsupported features

## Exit criteria
- at least one valid example exists for each core profile
- viewers can tell profiles apart and render accordingly
- the profile concept proves its value over one-size-fits-all document design

---

# Phase 3 — Assets, Attachments, and Large-Content Strategy
**Goal:** Make PRD scale beyond tiny demo files.

## Deliverables
- attachment model
- embedded vs linked asset rules
- chunking/segmentation strategy
- collection/series strategy
- large-work packaging approach
- performance/loading notes

## Focus areas
- novels
- comics
- storyboards
- media-heavy docs
- portability tradeoffs

## Exit criteria
- PRD can describe and package non-trivial works
- file size and loading strategy are not hand-wavy anymore
- attachment behavior is defined enough for tooling

---

# Phase 4 — Renderer and Viewer Capabilities
**Goal:** Define how PRD actually gets interpreted consistently.

## Deliverables
- capability model
- graceful degradation rules
- reader/viewer compatibility behavior
- print/export strategy
- runtime/render responsibilities
- baseline renderer architecture concept

## Exit criteria
- it is clear what a minimal viewer must support
- extension support does not break older/simple viewers completely
- rendering expectations are documented

---

# Phase 5 — Authoring and Tooling Surface
**Goal:** Make the format usable by humans, not just theoretical.

## Deliverables
- Studio concept
- SDK boundary draft
- validation tooling ideas
- import/export ideas
- conversion strategy from existing formats
- sample authoring workflow

## Questions
- What does authoring feel like?
- How much is code/schema-driven vs visual editing?
- What creator workflows matter first?

## Exit criteria
- there is a believable path from concept to usable toolchain

## Current next slice
- `prd init` now provides the minimal starter-package scaffold path for existing first-class profiles
- `prd import markdown` now provides deterministic Markdown-to-structured-`general-document` import
- `prd import images` now provides deterministic ordered image-folder import for `comic` and `storyboard`
- the current authoring workflow and import/export matrix docs define how those commands fit into public authoring
- the current executable lane is public Home/docs/viewer polish that demonstrates the create/import, validate, pack, and open flow
- the current executable lane is the hosted PRD Home page, public docs index, and reference Web Viewer demo, with `/` for Home, `/viewer/` for the workspace, and `/docs/` for public docs
- Cloudflare Workers Static Assets at `prd.eonhive.com` is the intended production host; no backend is required, and GitHub Pages remains staging/fallback under `/prd/` until Cloudflare launch QA passes
- the next product lane should launch-QA the Cloudflare production path, keep GitHub Pages as fallback, and then choose the next focused viewer/product polish step
- defer full visual Studio, broad conversion, and hosted conversion workflows until the hosted public demo/viewer path is proven

---

# Phase 6 — PRDc / Archive / Ecosystem Mapping
**Goal:** Clarify product-family boundaries.

## Deliverables
- PRD vs PRDc boundary map
- Studio / Viewer / Cloud / SDK / Renderer map
- open vs private layer discussion
- archive/codex role clarification
- ecosystem dependency boundaries

## Exit criteria
- product naming stops being fuzzy
- core format and surrounding services are clearly separated

---

# Phase 7 — Rights / Access / Protection Extensions
**Goal:** Add advanced control layers without polluting the base format.

## Deliverables
- protected/private section model
- access-control extension draft
- rights metadata model
- licensing/ownership extension concepts
- signature/verification concept
- optional entitlement hooks

## Rule
This phase must stay layered on top of the minimal core format.

## Exit criteria
- sensitive/premium use cases are supported conceptually
- simple PRD documents remain simple

---

# Phase 8 — Payments / Economy / Optional Crypto Extensions
**Goal:** Explore future-facing ecosystem power without hijacking base PRD.

## Possible deliverables
- payment hook extension design
- premium unlock model
- creator entitlement concepts
- optional chain-linked verification model
- crypto-PRD experimental layer
- Nectar-PRD exploratory concepts

## Rule
This phase is optional ecosystem growth, not the base definition of PRD.

## Exit criteria
- advanced economy features are clearly modular
- v1/v2 boundaries remain sane

---

# Phase 9 — White Paper / External Positioning
**Goal:** Tell the story properly after the architecture is grounded.

## Deliverables
- PRD white paper
- PRD vs PDF strategic positioning
- creator value proposition
- publishing use-case framing
- ecosystem/future vision deck or narrative

## Exit criteria
- external narrative matches the actual architecture
- the message is strong without being fake hype

---

# Canonical Doc Sequence

## Highest priority
1. `docs/architecture/PRD_SYSTEM_BLUEPRINT.md`
2. `docs/prompts/PRD_MASTER_PROMPTS.md`
3. `docs/core/PRD_MINIMAL_VALID_SPEC.md`
4. `docs/core/PRD_MANIFEST_DRAFT.md`
5. `docs/core/PRD_PACKAGE_LAYOUT_DRAFT.md`
6. `docs/runtime/PRD_CAPABILITY_MODEL.md`
7. `docs/runtime/PRD_CONFORMANCE.md`
8. `docs/profiles/PRD_PROFILE_GENERAL_DOCUMENT.md`
9. `docs/profiles/PRD_PROFILE_COMIC.md`
10. `docs/profiles/PRD_PROFILE_STORYBOARD.md`

## After that
11. `docs/product/PRD_PRODUCT_BOUNDARIES.md`
12. `docs/core/PRD_VERSIONING_POLICY.md`
13. `docs/core/PRD_ASSETS_AND_ATTACHMENTS.md`
14. `docs/extensions/PRD_PROTECTION_MODEL.md` *(planned; not yet created)*
15. `docs/core/PRD_LOCALIZATION_MODEL.md`

---

# Practical v1 Scope Recommendation

## Include in v1
- base PRD spec
- minimal manifest
- general document profile
- comic profile
- storyboard profile
- asset/attachment baseline
- viewer capability basics
- clean versioning
- optional reserved extension points

## Exclude from v1 hard dependency
- deep AeonHive coupling
- Nectar dependency
- mandatory blockchain/wallet systems
- full payment rails
- overcomplicated security stack
- giant cloud-first assumptions

---

# Risk List

## Risk 1 — Overengineering
Trying to solve every future dream in v1 can kill the project.

## Risk 2 — PDF mimic trap
If PRD copies PDF too closely, it loses the reason to exist.

## Risk 3 — Weak boundaries
If format, viewer, studio, archive, and cloud all blur together, architecture gets messy fast.

## Risk 4 — Bloated manifest
If the manifest becomes a dumping ground, the whole system gets ugly and fragile.

## Risk 5 — Feature dependency trap
If ownership/payment/crypto features become mandatory too early, adoption gets harder.

---

# Blunt Strategy Summary

The correct path is:

- lock the foundation
- define the minimal valid PRD
- define the three core profiles
- define package + manifest + assets
- define viewer/render behavior
- then grow into ecosystem and advanced extensions

Anything else is noise.


## PRD Convert Phase 1 (October 27, 2026)

The owner-requested converter foundation now adds one complete adaptive Markdown path through existing validation, packaging and Viewer opening. It shares canonical semantic roots and the existing parser; produces source/quality attachments; and enforces input/resource budgets. This is a CLI/library foundation, pending release. The later conversion web app, additional formats, faithful/hybrid strategies and optional advanced features remain separate phases. See [the architecture record](../../architecture/PRD_CONVERT_PHASE_1.md).


### Phase 2 HTML increment

The next converter increment implements a static UTF-8 HTML adapter using the same normalized content, resource limits, quality reporting, validator and packager. It includes real source/archive/report fixtures and CLI/Viewer checks. [HTML mapping and safety policy](../../architecture/PRD_CONVERT_HTML.md) defines the supported subset and omissions. The owner's revised sequence puts EPUB/CBZ next, then DOCX; release onboarding and the conversion web app remain separate.


### Shared importer output and HTML directory workflow

`prd import html` now completes the source → directory → validation → packaging → Viewer path, sharing canonical output helpers with Markdown/image imports and using separately versioned diagnostics. PRD-042 records the implementation boundary. The later CBZ continuation below closes local HTML directory visual acceptance. DOCX/PDF/Office/cloud/frontend work remains separate.

### CBZ archive increment

CBZ now produces canonical whole-page comic panels through the same converter and the existing bounded archive decoder, with explicit order/metadata/alternative-text warnings. CLI, both-transport Viewer opening, malformed archive tests, a real example and local browser acceptance are included. PRD-043 and the [CBZ policy](../../architecture/PRD_CONVERT_CBZ.md) define limits and fidelity. HTML directory rendering, fragment navigation and report retrieval were also checked locally. EPUB is next, with its own spine/XML/relationships policy before implementation; DOCX, PDF, Convert Web and Office/advanced lanes follow. Release onboarding remains separate.

### EPUB chapter increment

EPUB now completes a bounded reflowable XML → spine-ordered canonical chapter sections → existing validation/packaging → Viewer path. It reuses HTML semantics and raster collection, maps chapter anchors, reports navigation/layout/metadata losses, and isolates its optional XML parser. PRD-044 and the [EPUB policy](../../architecture/PRD_CONVERT_EPUB.md) define the accepted subset and safety limits. Real example, security tests, CLI/Viewer round trips and local browser acceptance are included. DOCX is next after a separate ZIP/XML/relationships policy; PDF, Convert Web, Office/advanced work and release onboarding remain separate.

### DOCX body increment

DOCX now completes a bounded transitional Word body → canonical content → existing validator/packager → Viewer-opening path. It reuses XML/resource foundations, resolves OPC relationships and structural styles, and maps simple lists/tables, bookmark links and raster assets. PRD-045 and the [DOCX policy](../../architecture/PRD_CONVERT_DOCX.md) define limitations and budgets. A real Word fixture is rendered and visually inspected; automated PRD Viewer opening is covered in both transports. Local browser acceptance completed on October 28, including lists/table/image, bookmark navigation and exact attachments. The subsequent PDF increment is recorded below; OCR, web conversion, Office execution and release onboarding remain separate.

### PDF extraction and fallback increment — October 28, 2026

PDF now completes a bounded byte snapshot → isolated extraction/page fallback → canonical page sections → existing validator/packager → Viewer path under PRD-047 and [PDF policy](../../architecture/PRD_CONVERT_PDF.md). Text follows extraction order with explicit review warnings; textless pages become bounded PNGs without OCR. Optional PDF.js/native canvas dependencies load only for Node import. The real mixed-page example passes security/lifecycle, CLI, both-transport Viewer-opening and local browser checks. Convert Web is the next separately specified product increment. Office/advanced work, OCR, faithful/hybrid output and public release remain separate.

### Convert Web Markdown increment — October 28, 2026

PRD-048 and [Convert Web policy](../../architecture/PRD_CONVERT_WEB.md) add a real local `/convert/` route in the existing app. The existing Markdown adapter shares canonical assembly/validation with Node and a packager memory export. A bounded cancellable worker produces actual quality/source attachments, downloads and exact-archive Viewer preview. Browser-downloaded example, Node parity, both transports, resource/lifecycle/security cases and local production-browser checks prove the first path. Browser HTML follows under its own parser policy. Simultaneous preview/repair, other browser adapters, public release and deployment remain separate.

### Browser HTML and conversion workspace — October 29, 2026

PRD-052 and [browser HTML/workspace policy](../../architecture/PRD_CONVERT_WEB_HTML.md) extend the existing browser seam to bounded static HTML with lazy optional parsing and ES module workers. The original Markdown-only export stays compatible. The owner reference informs upload/options/review layout without inventing PSD/AI/layer/history functionality. Real HTML output, Node parity and both-transport Viewer checks establish the semantic/package path. Fresh visual/interaction acceptance is pending while automation is disabled. Further browser adapters, repair/editor work, release and deployment remain separate.

### Browser CBZ comics — October 29, 2026

PRD-053 and [browser CBZ policy](../../architecture/PRD_CONVERT_WEB_CBZ.md) reuse the existing bounded archive adapter and canonical Comic output in the local worker. Shared page-sequence settings preserve default output and stable source-page identities; they add no reading-direction field. The workspace handles binary source explicitly and shows real pages/resources/diagnostics. Node parity, both transports, hostile archives and installed consumers cover the executable path; fresh live UI/Viewer interaction acceptance stays open. The owner authorized this focused implementation while that review is pending. Additional browser formats, repair/editing, PSD/AI/cloud, release and deployment remain separate.

### Focused comic sequence repair — October 29, 2026

PRD-054 and [page-review policy](../../architecture/PRD_CONVERT_PAGE_REVIEW.md) add source-backed filename move/reset/apply for CBZ results. A bounded complete page-ID permutation reruns the same conversion/validation pipeline; page identities/assets and previous output on failure remain intact. Selected File/settings are session context, separate from package source retention. Actual reviewed output and Node/browser/Viewer/lifecycle evidence cover the executable path. Live controls/focus/download/Viewer-return acceptance remains pending. Full editing, further repair actions and additional browser formats require separate scope.

### Supplied comic descriptions and session drafts — October 29, 2026

PRD-055 and [description/draft policy](../../architecture/PRD_CONVERT_COMIC_DESCRIPTIONS.md) extend source-backed repair with bounded plain text in existing canonical panel `alt`, preserving source IDs/images and page ordering. The UI retains unapplied text/order across Viewer return in the same nonpersistent session and exports it only after successful revalidation/packaging. Actual supplied/remaining counts replace no quality assessment. Automated Node/browser/Viewer/security/lifecycle evidence and the real described example cover the executable path. Browser access briefly returned for native file selection, then stopped before conversion; full live/responsive acceptance stays open. Quality diagnostics follow below before further adapters or general editing.

### Quality diagnostic review — October 29, 2026

PRD-056 and [quality-review policy](../../architecture/PRD_CONVERT_QUALITY_REVIEW.md) expose existing report codes, conversion stages/source references and distinct package-validator paths. Category/text filtering scans the complete list before its bounded display, with truthful counts and unchanged downloads. This is private-app presentation, preserving report v1, Core/package authority and source limitations after review. Automated provenance/filter/bounds/security/real-conversion tests cover implementation; live filters, keyboard, reset, themes/mobile and earlier workspace acceptance remain open while browser use is disabled. Finish that review before additional browser formats or editing; release onboarding and deployment remain separate.
