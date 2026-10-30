# PRD_PRODUCT_BOUNDARIES.md
_Last updated: October 29, 2026_
_Status: Canonical product-boundary baseline v0.1_

## 1. Purpose

This document defines the current boundary between the PRD core format, the reference implementation, and future product layers.

Its job is to prevent PRD from drifting into an unclear mix of standard, viewer, Studio, Cloud, SDK, and archive product behavior.

PRD is the **Portable Responsive Document** format and ecosystem direction. PRDc is the **Document Archive Codex** side of the broader ecosystem. They are related, but they are not the same product or layer.

---

## 2. Boundary Rule

The core rule is:

- PRD Core defines what a valid PRD package is.
- The Reference Stack proves the core can be validated, packed, inspected, opened, and tested.
- Product layers consume PRD. They do not redefine package validity.

Lower layers must remain usable without upper layers. A valid PRD package must not depend on Studio, Cloud, PRDc, payment systems, wallets, or private service infrastructure for its base readable path.

---

## 3. Layer Map

| Layer | Current role | Public status | Owns | Must not own |
| --- | --- | --- | --- | --- |
| PRD Core | Format and conformance baseline | Public docs, schemas, examples | manifest rules, package layout, profiles, content contracts, extension seams | product UX, hosting, accounts, payment, Cloud behavior |
| PRD Reference Stack | Executable proof of the core | Public repo; selected npm packages public | validator, packager, CLI, conformance fixtures, reference viewer behavior | product lock-in, private-only behavior, new hidden format rules |
| Product Ecosystem | Optional tools and services around PRD | Future/productized unless explicitly published | authoring, hosted services, distribution, advanced viewers, SDK products, archive workflows | changing what counts as a valid PRD package |

---

## 4. Current Public Surface

The current public PRD preview consists of:

- canonical documentation under `docs/`
- schemas under `schemas/`
- example packages under `examples/`
- conformance and runtime fixture corpora
- the public npm tooling packages:
  - `@eonhive/prd-types`
  - `@eonhive/prd-validator`
  - `@eonhive/prd-packager`
  - `@eonhive/prd-cli`

The current clean public npm baseline is `0.1.1`.

The web viewer and viewer-core packages are present in the repository as reference implementation surfaces, but they are not part of the public npm publish set.

The hosted PRD Web Viewer demo is a public reference-stack demo surface. It lives in `apps/prd-viewer-web`, deploys as one static app, and separates Home (`/`), the actual reference Web Viewer workspace (`/viewer/`), and the public docs index (`/docs/`). Cloudflare Workers Static Assets is the intended production host for `prd.eonhive.com`; GitHub Pages remains the temporary staging/fallback path under `/prd/`. Workers hosts static files only: it does not introduce Cloud authoring, server-side document parsing, or an upload service. It may include generated sample `.prd` archives for demonstration. Those hosted samples are demo assets only; they do not add a PRD network-loading guarantee or change the package validity model.

The Living Homepage uses uRK only as an app-level presentation dependency. Its chapter transforms, audio, quality controls, and illustrative layout studies do not redefine package validity or promote document kinds to profile families. The embedded Viewer keeps the same validation and rendering pipeline; see [PRD_LIVING_HOMEPAGE.md](PRD_LIVING_HOMEPAGE.md) for supported behavior and the capability audit.

Home, Viewer, and Docs share the purple folded-document identity described in
[PRD_VISUAL_IDENTITY.md](PRD_VISUAL_IDENTITY.md). Public navigation and profile
example links use the existing routes. Reference-board Studio, AI, sharing, and
other future concepts remain separate from the implemented public surface.

Codex operational files under `codex/` may remain tracked for implementation continuity, but they are not part of the public product docs, public site navigation, or canonical format documentation.

Home, Viewer, and Docs share the purple PRD visual identity and public
navigation. Profiles and Examples are real Home sections rather than separate
product applications. The rebrand preserves the three-route static app,
existing profile families, and normal sample-package opening. See
[PRD_VISUAL_IDENTITY.md](PRD_VISUAL_IDENTITY.md) for presentation ownership,
asset provenance, and the pending browser/production acceptance checks.

---

## 5. Product Roles

### 5.1 PRD Core

PRD Core includes the manifest, package layout, profiles, content models, asset/attachment rules, localization model, runtime conformance vocabulary, and future extension seams.

PRD Core is the standard-defining layer. It must stay portable, profile-aware, structured, and viewer-independent.

### 5.2 Reference Viewer

The reference viewer demonstrates one truthful opening path for valid packages.

It may expose package facts, support states, and render-mode behavior, but it does not define PRD validity. Current reference viewer loading is eager whole-package in-memory loading.

The branded workspace provides a searchable outline, collapsible navigation and
details, reading width and focus controls, and Info/Files views over the existing
package facts and declared resources. At 1000 CSS pixels or less, the side panels
use native modal drawers. Outline selection closes the mobile drawer and focuses
the authored section or selected panel/frame through the existing namespaced
target map. Reading state and prepared resources remain mounted. This is an
application presentation change with no new package requirements or core APIs.

Structured `general-document` content also offers continuous and paginated
reading around the same renderer, including resolved segmented sections and the
existing resume presentation. Native CSS layout supplies temporary page breaks;
app controls preserve semantic anchors across mode, locale and viewport changes.
Page numbers are private presentation state, not manifest semantics, capability
declarations, canonical locators or print/export guarantees. Visual-profile and
HTML fallback presentations retain their existing controls. See the Living
Homepage implementation notes for behavior and browser acceptance limits.

### 5.3 Studio

Studio is the future authoring, editing, preview, validation, and export surface.

Studio belongs to the Product Ecosystem. It may use the validator, packager, reference viewer, renderer code, and SDK helpers, but it must emit normal PRD packages rather than private product-only bundles.

The first practical Phase 5 lane is now the minimal `prd init` authoring surface. It creates valid starter package directories without pretending that a full visual Studio exists yet.

### 5.4 Cloud

Cloud is an optional service layer for hosting, sync, publishing, collaboration, distribution, entitlement, or analytics.

Cloud must not be required for the base readable path of a minimal valid PRD package.

### 5.5 SDK

SDK surfaces are developer-facing helpers for creating, validating, converting, rendering, or integrating PRD.

Core conformance helpers may align closely with the Reference Stack. Broader automation, hosted conversion, analytics, or product integration SDKs belong to the Product Ecosystem.

### 5.6 Renderer

Renderer is the engine that turns PRD structure, profile behavior, layout rules, and assets into readable output.

The render contract belongs to PRD Core and runtime docs. Concrete renderer implementations may be reference, product, platform-specific, or third-party.

### 5.7 PRDc

PRDc is the Document Archive Codex role.

It may index, organize, relate, analyze, and operate over PRD packages and related archive material. It is not the base format, and PRD packages must remain useful without PRDc.

---

### 5.8 PRD Convert

PRD Convert is the ingestion product for reconstructing existing content into structured, responsive PRD. It uses Core's semantic types, validator and packager. Studio remains responsible for authoring/editing, Viewer for reading, and PRDc for archive management. Product boundaries need not be separate services.

The repository implements its [Phase 1 foundation](../architecture/PRD_CONVERT_PHASE_1.md): one converter package, bounded Markdown, HTML, CBZ, EPUB, DOCX and PDF adapters, profile selection, source/quality attachments and `prd convert`. Node CLI/library tooling remains pending public release. A [local browser Markdown/HTML/CBZ surface](../architecture/PRD_CONVERT_WEB.md) now runs at `/convert/` using explicit browser exports and the same canonical assembly/packager; it is not yet deployed. HTML is a Phase 2 increment with a [specified static semantic subset](../architecture/PRD_CONVERT_HTML.md). CBZ maps whole raster pages to canonical comic panels under its [bounded archive policy](../architecture/PRD_CONVERT_CBZ.md). EPUB maps bounded reflowable spine chapters through the [EPUB policy](../architecture/PRD_CONVERT_EPUB.md). DOCX maps a bounded transitional Word body under the [DOCX policy](../architecture/PRD_CONVERT_DOCX.md). PDF maps text/page fallbacks under the [PDF policy](../architecture/PRD_CONVERT_PDF.md), with optional dependencies isolated to Node import tooling. Additional browser formats and faithful/hybrid or simultaneous previews remain later phases. Existing Markdown/image import commands retain their contracts.

---

## 6. Initial Product Beachhead

PRD should not launch as "everything for everyone."

The strongest initial public-product wedge remains:

- responsive premium documents
- indie comics
- storyboard and review packages

These use cases prove PRD's core strengths quickly:

- responsive reading matters
- profile-specific behavior is visible
- packaged media and structure matter
- future premium or access layers can remain optional

Generic office-document replacement, full conversion platforms, Cloud collaboration, payments, rights systems, and crypto-linked ownership are later lanes.

---

## 7. Public Vs Productized

### Public/open foundation

The public/open foundation should include:

- core PRD docs
- manifest and package rules
- profile specs
- schemas
- validator rules
- reference examples
- conformance fixtures
- public CLI, validator, packager, and type packages

### Productized layers

Productized layers may include:

- Studio
- hosted conversion
- advanced viewer products
- Cloud sync and publishing
- library/distribution services
- PRDc archive workflows
- premium creator tools
- analytics or entitlement services

Productized layers may add value, but they must not become hidden dependencies for the core package contract.

---

## 8. Non-goals For The Current Public Preview

The current public preview does not ship:

- full visual Studio
- broad import/conversion platform
- Cloud hosting, sync, or collaboration
- payments, commerce, or entitlement infrastructure
- crypto ownership or wallet infrastructure
- full protection, encryption, or signature stack
- certification or formal compatibility badge program

The repository now implements the narrow optional [signature-v1 extension](../extensions/PRD_SIGNATURE_V1.md): local archive signing, public-key verification and Viewer status. It is pending the normal release path. This does not provide encryption, identity accounts, certificate trust, key management or revocation, and unsigned reading stays available.

Those remain later optional lanes and must be introduced through explicit docs, extensions, or product plans when they are ready.

---

## 9. Next Product Step

The current Phase 5 authoring docs are:

- `docs/product/PRD_AUTHORING_WORKFLOW.md`
- `docs/product/PRD_IMPORT_EXPORT_MATRIX.md`

The current Phase 5 executable authoring lanes are `prd init`, `prd import markdown`, `prd import images`, `prd import html`, and the direct-archive `prd convert` pipeline. Together they cover starter package scaffolding, structured `general-document` import from a small Markdown subset, and ordered image-folder import for `comic` and `storyboard`.

The current public-product lane is the hosted PRD Home page, public docs index, and reference Web Viewer demo. It shows the real create/import, validate, inspect, pack, and open flow; separates `/` Home, `/viewer/` workspace, and `/docs/` public docs; includes light and premium dark modes; and targets Cloudflare Workers Static Assets at `prd.eonhive.com` with GitHub Pages as staging/fallback. Deployment and live launch QA remain separate acceptance steps from local build verification. Limited HTML, EPUB, DOCX and PDF conversion now exists as repository CLI/library tooling pending release. The local Markdown/HTML/CBZ Convert Web route is implemented but not yet deployed; server conversion, full Studio, Cloud publishing, PRDc workflows and broad visual editing remain deferred product lanes.


The HTML directory workflow now shares output helpers with Markdown/image imports and emits a separately versioned diagnostic report. [PRD-042](../decisions/PRD_DECISIONS.md#prd-042--import-output-is-shared-while-conversion-remains-optional-tooling) records this optional tooling boundary. Structural validity remains Core-owned; reading quality and conversion fidelity are separate. No additional package/service/renderer is introduced by this consolidation.

### Convert workspace continuation — October 29, 2026

The owner's reference informs the current local `/convert/` workspace: upload/files, supported conversion options and factual review/download. HTML now shares the bounded Node adapter through generic browser dispatch and lazy parsing; the existing Markdown-only API remains compatible. See [execution/UI boundary](../architecture/PRD_CONVERT_WEB_HTML.md). Source review is escaped text; the existing Viewer owns reading/rendering. PSD/AI/layers, editing, templates/history, cloud, additional browser formats and deployment remain separate capabilities rather than decorative controls.

The subsequent [browser CBZ increment](../architecture/PRD_CONVERT_WEB_CBZ.md) reuses the bounded archive adapter and Comic profile in the same workspace. Natural/reversed page sequence is a conversion setting, not new profile metadata or manga-direction behavior. Binary source gets an explicit retention explanation rather than a text preview. No separate service, package, renderer or authoring scope is introduced; fresh live acceptance and deployment remain open.

PRD-054 adds one [conversion repair action](../architecture/PRD_CONVERT_PAGE_REVIEW.md): draft and apply a complete comic page sequence by rerunning the selected CBZ through the existing pipeline. It preserves every imported page/asset and the current result on failure. Selected source/settings remain only in session memory, independently of optional package source retention. This does not establish a general document/package editor, Studio authoring or a new rendering engine. Fresh UI acceptance remains open.

PRD-055 extends focused repair with [supplied comic descriptions and session drafts](../architecture/PRD_CONVERT_COMIC_DESCRIPTIONS.md). Existing canonical `alt` holds plain text keyed by source page ID; no new schema/renderer or automated image analysis is involved. Unapplied text/order stays in local memory across Viewer return, outside exports until successful Apply. Source retention is separate and reload/input changes end the review. Full editing stays Studio-owned; accuracy assessment, further repair tools and live/deployed acceptance remain separately scoped.

PRD-056 adds [quality diagnostic review](../architecture/PRD_CONVERT_QUALITY_REVIEW.md) as app presentation of existing report facts: codes, conversion stages/source references, package-validator paths and complete-list filtering. Filters do not change outputs or establish resolution/confidence/fidelity. Report v1, Core validation, canonical package contracts and the Viewer rendering boundary remain unchanged. Live workspace acceptance, release and deployment remain separate.
