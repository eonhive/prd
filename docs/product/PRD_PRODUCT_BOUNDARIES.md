# PRD_PRODUCT_BOUNDARIES.md
_Last updated: May 24, 2026_
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

The hosted PRD Web Viewer demo is a public reference-stack demo surface. It lives in `apps/prd-viewer-web`, deploys as a static GitHub Pages app, and may include generated sample `.prd` archives for demonstration. Those hosted samples are demo assets only; they do not add a PRD network-loading guarantee or change the package validity model.

---

## 5. Product Roles

### 5.1 PRD Core

PRD Core includes the manifest, package layout, profiles, content models, asset/attachment rules, localization model, runtime conformance vocabulary, and future extension seams.

PRD Core is the standard-defining layer. It must stay portable, profile-aware, structured, and viewer-independent.

### 5.2 Reference Viewer

The reference viewer demonstrates one truthful opening path for valid packages.

It may expose package facts, support states, and render-mode behavior, but it does not define PRD validity. Current reference viewer loading is eager whole-package in-memory loading.

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

Those remain later optional lanes and must be introduced through explicit docs, extensions, or product plans when they are ready.

---

## 9. Next Product Step

The current Phase 5 authoring docs are:

- `docs/product/PRD_AUTHORING_WORKFLOW.md`
- `docs/product/PRD_IMPORT_EXPORT_MATRIX.md`

The current Phase 5 executable authoring lanes are `prd init`, `prd import markdown`, and `prd import images`. Together they cover starter package scaffolding, structured `general-document` import from a small Markdown subset, and ordered image-folder import for `comic` and `storyboard`.

The current public-product lane is the hosted PRD landing page and reference web viewer demo. It shows the real create/import, validate, inspect, pack, and open flow, includes light and premium dark modes, and deploys through GitHub Pages as a static app. HTML, DOCX, EPUB, PDF, hosted conversion, full Studio, Cloud publishing, PRDc workflows, and broad visual editing remain deferred product lanes.
