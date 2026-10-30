# PRD_DECISIONS.md
> Canonical decision log location: `docs/decisions/PRD_DECISIONS.md`.
> Duplicate ledgers must be merged here; non-canonical copies must be archived to prevent drift.

_Last updated: October 30, 2026_
_Status: Working decision log v0.2 (canonical)_

## Purpose
This file records major PRD decisions, current leanings, and explicit design directions so future work stays consistent.

Use this as a decision ledger.  
When a decision changes, do not silently overwrite history. Add a new entry or mark the prior one as superseded.


---

## Consolidation Note (2026-04-15)

Legacy decisions from `docs/foundation/04_PRD/PRD_DECISIONS.md` were reviewed during consolidation to this canonical file. Their unique directional content is represented by existing accepted decisions (notably PRD-018, PRD-026, PRD-027, and PRD-028), and the foundation-path file now serves as an archived pointer only.

## Decision Format
Each decision uses:

- **ID**
- **Title**
- **Status**
- **Decision**
- **Why**
- **Implication**
- **Follow-up**

---

## PRD-001 — Canonical source-of-truth markdown is required
**Status:** Accepted

**Decision:**  
PRD work should be grounded in a canonical markdown foundation/architecture/structure document that future master prompts read before generating additional PRD materials.

**Why:**  
Without a source-of-truth file, the project risks drift, contradictions, and loss of important context over time.

**Implication:**  
PRD should maintain a small set of core markdown control files such as:
- `docs/foundation/04_PRD/PRD_FOUNDATION.md`
- `docs/decisions/PRD_DECISIONS.md`
- `docs/foundation/04_PRD/PRD_GLOSSARY.md`
- `docs/foundation/04_PRD/PRD_ROADMAP.md`

**Follow-up:**  
Expand these files and keep them versioned.

---

## PRD-002 — PRD is more than a file extension
**Status:** Accepted

**Decision:**  
PRD should be treated as a broader document system/ecosystem, not merely a single file type.

**Why:**  
The project direction includes format/spec, rendering, tooling, archive/codex use, and possible cloud/service layers.

**Implication:**  
Architecture must separate the core format from product/platform layers.

**Follow-up:**  
Define boundaries between format, runtime, authoring tools, and services.

---

## PRD-003 — PRD should beat PDF on modern strengths
**Status:** Accepted

**Decision:**  
PRD should aim to outperform PDF where PDF is weakest, especially in responsiveness, structure, extensibility, and modern reading/publishing behavior.

**Why:**  
Trying to replace PDF by copying PDF is pointless. PRD needs a clear strategic advantage.

**Implication:**  
PRD should not be built as page-snapshot-first architecture.

**Follow-up:**  
Define profile-based render and layout behaviors.

---

## PRD-004 — Responsive-first over page-first
**Status:** Accepted

**Decision:**  
PRD should be responsive-first at the system level, even if some profiles or export modes support fixed-page output.

**Why:**  
Modern reading happens across phones, tablets, laptops, desktops, TVs, and possibly embedded viewers.

**Implication:**  
Layout systems and profiles must adapt to viewport and reading mode.

**Follow-up:**  
Define responsive layout rules and fallback print/page behavior.

---

## PRD-005 — Manifest-centered architecture
**Status:** Accepted

**Decision:**  
PRD should use a strong manifest-centered architecture.

**Why:**  
The manifest gives the system a clean way to describe document identity, structure, assets, profile, capabilities, and extension hooks.

**Implication:**  
The manifest becomes one of the core architecture surfaces.

**Follow-up:**  
Define minimal manifest fields vs optional extension fields.

---

## PRD-006 — Public header vs protected/private sections
**Status:** Accepted

**Decision:**  
PRD should support a separation between public interoperable metadata and protected/private content or metadata.

**Why:**  
This balances portability with future premium, private, or secure use cases.

**Implication:**  
The format likely needs optional protected zones or layered wrappers.

**Follow-up:**  
Define how protection/encryption is layered without breaking simple reader compatibility.

---

## PRD-007 — Clear versioning from the start
**Status:** Accepted

**Decision:**  
PRD must have explicit versioning at the beginning of the project.

**Why:**  
Without versioning, growth becomes messy and compatibility becomes fragile.

**Implication:**  
Multiple version surfaces may be needed:
- format/spec version
- manifest version
- profile version
- extension version

**Follow-up:**  
Create a version policy document later.

---

## PRD-008 — Comics are first-class
**Status:** Accepted

**Decision:**  
Comics must be treated as a first-class PRD publishing/document profile.

**Why:**  
This was explicitly requested and strategically broadens PRD beyond plain text documents.

**Implication:**  
PRD cannot assume prose-only structure.

**Follow-up:**  
Define a comic profile with panel-aware layout and reading modes.

---

## PRD-009 — Storyboards are first-class
**Status:** Accepted

**Decision:**  
Storyboards must be treated as a first-class PRD publishing/document profile.

**Why:**  
This was explicitly requested and aligns with production/visual planning workflows.

**Implication:**  
PRD must support shot/scene/image/note relationships.

**Follow-up:**  
Define a storyboard profile with timing/annotation/layout behavior.

---

## PRD-010 — PRD should support simple and large documents
**Status:** Accepted

**Decision:**  
PRD should scale from lightweight documents to large narrative or media-heavy works.

**Why:**  
The project includes questions around novels, comics, and other potentially large formats.

**Implication:**  
Chunking, streaming, modular packaging, and collections may be needed.

**Follow-up:**  
Define package segmentation strategies.

---

## PRD-011 — Attachments must be supported
**Status:** Accepted

**Decision:**  
Attachment support should be designed in early, not bolted on late.

**Why:**  
Attachments affect packaging, portability, file size, security, and workflow.

**Implication:**  
Manifest and asset model must account for them.

**Follow-up:**  
Define attachment classes and embedding/reference rules.

---

## PRD-012 — Crypto/ownership/payment must be optional extensions
**Status:** Accepted

**Decision:**  
Ownership, rights, payment, and future crypto-linked capabilities should be supported through extension-ready architecture, not forced into all PRD files.

**Why:**  
The project wants future ecosystem strength without making the base format bloated or dependent on unfinished systems.

**Implication:**  
Base PRD remains usable without wallet, chain, or token integrations.

**Follow-up:**  
Define extension namespaces/modules later.

---

## PRD-013 — v1 should not depend on full AeonHive/Nectar rollout
**Status:** Accepted

**Decision:**  
PRD v1 should be practical and independent enough to ship without waiting on deeper AeonHive/Nectar infrastructure.

**Why:**  
This reduces risk and keeps the project grounded.

**Implication:**  
Advanced ecosystem features should be staged later.

**Follow-up:**  
Roadmap should clearly split v1 core from future ecosystem phases.

---

## PRD-014 — White paper and foundation/spec are different deliverables
**Status:** Accepted

**Decision:**  
The PRD foundation/spec documents and the PRD white paper should be treated as separate but related deliverables.

**Why:**  
One explains how it works; the other explains why it matters.

**Implication:**  
Do not mix internal architecture truth with pitch-language fluff.

**Follow-up:**  
Create white paper later after the core architecture stabilizes.

---

## PRD-015 — PRD architecture must use wider cross-project history
**Status:** Accepted

**Decision:**  
PRD decisions should be informed by the full relevant discussion history across PRD, EonHive, and AeonHive, not only isolated PRD threads.

**Why:**  
Important future-facing design considerations live across multiple project conversations.

**Implication:**  
PRD design work should remain ecosystem-aware.

**Follow-up:**  
Keep history records and cross-reference major concepts.

---

## PRD-016 — Core format must stay practical
**Status:** Accepted

**Decision:**  
PRD should not become an overengineered monster in its base form.

**Why:**  
A format that solves everything at once usually solves nothing well.

**Implication:**  
Minimal valid PRD should stay small and implementable.

**Follow-up:**  
Define a minimal valid PRD package/spec.

---

## PRD-017 — Format and product family must be separated
**Status:** Accepted

**Decision:**  
PRD format/spec should be conceptually separated from tools/products like Studio, Viewer, Cloud, SDK, and Renderer.

**Why:**  
Mixing core standard design with app-specific behavior causes architecture confusion.

**Implication:**  
Clear layer boundaries are required.

**Follow-up:**  
Create a product boundary map later.

---

## PRD-018 — PRDc means Document Archive Codex
**Status:** Accepted

**Decision:**  
PRDc currently refers to the Document Archive Codex in AeonHive, not unrelated older interpretations.

**Why:**  
This was explicitly clarified in project memory.

**Implication:**  
Naming should stay consistent across future docs.

**Follow-up:**  
Add glossary definitions and product boundary docs.

---

## PRD-019 — Graceful degradation should be preserved
**Status:** Accepted

**Decision:**  
Documents using advanced extensions should still expose useful base behavior whenever possible on simpler viewers.

**Why:**  
This improves portability and long-term resilience.

**Implication:**  
Extension design must avoid all-or-nothing fragility where possible.

**Follow-up:**  
Define capability negotiation later.

**Implementation alignment (October 27, 2026):**
The reference viewer now enforces required capabilities and explicit array-form required extensions before content reads. It currently implements no required extension contracts, so those declarations use the existing `unsupported-required-capability` state with their IDs; optional declarations and opaque object placeholders preserve readability. The web host also blocks alternate locale/resource preparation for this state. Supporting optional signature checks does not imply a required signature handler. Structural validation, public descriptor/CLI JSON shapes and profile contracts stay unchanged. See [runtime capability rules](../runtime/PRD_CAPABILITY_MODEL.md). No fallback/version/registry implementation is inferred from this correction.

---

## PRD-020 — First deliverables should be architecture before hype
**Status:** Accepted

**Decision:**  
The immediate focus should be architecture/foundation/source-of-truth docs before hype-heavy ecosystem storytelling.

**Why:**  
The project needs a hard backbone first.

**Implication:**  
Core docs take priority over visual/marketing docs.

**Follow-up:**  
Next likely docs: manifest draft, package layout draft, profile specs.

---

## PRD-021 — Minimal valid PRD uses `.prd` ZIP transport
**Status:** Accepted

**Compatibility update (October 27, 2026):** PRD-040 retains this ZIP baseline and adds an opt-in PRD 1.0 envelope around the ZIP payload. Default output remains the original ZIP form; the manifest remains at the payload root.

**Decision:**  
The minimal valid PRD defined for Phase 1 uses `.prd` as the transport form, and that transport form is a ZIP archive with `manifest.json` at the archive root.

**Why:**  
This gives PRD a portable single-file package baseline while still allowing an unpacked tree for authoring, inspection, and validation workflows.

**Implication:**  
Minimal viewers can implement one clear opening path. The unpacked tree is informative for tooling, not the normative transport contract.

**Follow-up:**  
Define fuller internal package layout rules later in `core/PRD_PACKAGE_LAYOUT_DRAFT.md`.

---

## PRD-022 — Minimal valid PRD uses one declared primary entry path
**Status:** Accepted

**Decision:**  
The minimal valid PRD must declare exactly one public primary entry path via `manifest.json`. A required spine model is deferred.

**Why:**  
This keeps v1 small and machine-readable while staying compatible with future richer structure and profile-specific sequencing.

**Implication:**  
A small reference viewer can open a minimal PRD without implementing full spine, segmentation, or profile-specific reading-flow logic.

**Follow-up:**  
Define ordered multi-entry reading and spine behavior later in manifest, package-layout, runtime, and profile docs.

---

## PRD-023 — Minimal manifest baseline is fixed before the full schema
**Status:** Accepted

**Decision:**  
The minimal valid PRD spec must freeze a small public manifest baseline with required fields `prdVersion`, `manifestVersion`, `id`, `profile`, `title`, and `entry`. Optional reserved fields may include `profileVersion`, `extensions`, `compatibility`, `assets`, `attachments`, and `protected`.

**Why:**  
Phase 1 needs a concrete manifest baseline without turning the manifest into a dumping ground or pretending the full schema is already done.

**Implication:**  
Later manifest work must extend this baseline rather than silently replace it. The exact schema remains open beyond the minimal field set.

**Follow-up:**  
Keep `PRD-P002` open for exact field constraints, reserved namespaces, invalid forms, and backward-compatibility rules.

---

## PRD-024 — Attachments are reserved-optional in the minimal valid spec
**Status:** Accepted

**Decision:**  
Attachments remain part of PRD direction and are allowed in the minimal package, but the minimal valid PRD does not require attachments or define their full model.

**Why:**  
Attachment support matters, but full classes and behaviors belong in dedicated assets/attachments work rather than the smallest Phase 1 package.

**Implication:**  
A minimal PRD stays lightweight while preserving a clean lane for bundled or linked attachment behavior later.

**Follow-up:**  
Define attachment classes and embedding/reference rules in `core/PRD_ASSETS_AND_ATTACHMENTS.md`.

---

## PRD-025 — PRD allows community profiles without making them canonical automatically
**Status:** Accepted

**Decision:**  
PRD reserves `general-document`, `comic`, and `storyboard` as canonical core profile identifiers. Additional community/custom profiles are allowed if they keep the PRD core package and manifest contract intact and do not present themselves as canonical core profiles without source-of-truth acceptance.

**Why:**  
PRD needs profile-based extensibility without collapsing into profile-name chaos or allowing third parties to redefine the base format by convention.

**Implication:**  
Open-source communities and other third parties may define their own PRD profiles, but interoperability depends on their published profile rules and tool support. Canonical first-class status remains controlled by PRD source-of-truth docs.

**Follow-up:**  
Define profile-governance details in `governance/PRD_PROFILE_REGISTRY.md` and add dedicated specs for canonical core profiles.

---

## PRD-026 — Responsiveness is cross-profile; the general-purpose profile is `general-document`
**Status:** Accepted

**Decision:**  
Responsiveness belongs to PRD as a system-wide architectural principle across all profiles. The general-purpose reading/document profile is named `general-document`, not `responsive-document`.

**Why:**  
The prior naming made a PRD-wide design principle sound like the identity of one top-level profile, which blurred the difference between document family and architectural behavior.

**Implication:**  
Future docs should treat profile names as document-family identifiers. Layout and presentation behavior should remain separate from top-level profile identity unless a later higher-priority spec defines exact field names and rules.

**Follow-up:**  
Update foundation, glossary, roadmap, registry, manifest examples, minimal-package examples, and future profile-spec filenames to use `general-document`. Allow `responsive-document` only as a legacy explanatory alias during transition.

---

## PRD-027 — Manifest profile values are canonical machine IDs; UI labels are separate
**Status:** Accepted

**Decision:**  
The manifest `profile` field uses canonical machine-readable profile identifiers such as `general-document`, `comic`, and `storyboard`. Friendly display labels such as `Document`, `Comic`, and `Storyboard` belong to registries, SDKs, validators, and product UI rather than the base package contract.

**Why:**  
The spec needs stable identifiers for validation and interoperability. Human-facing labels are useful, but they should not replace the machine contract or leak product wording into the manifest.

**Implication:**  
Viewers, Studio, SDKs, and validators may map canonical profile IDs to friendly labels. New packages should emit canonical IDs, not UI labels or legacy aliases. Registry guidance should define label, description, and alias metadata without changing the manifest baseline.

**Follow-up:**  
Update the profile registry, manifest draft, minimal package docs, capability model, architecture docs, and active prompts to distinguish canonical profile IDs from UI labels clearly.

---

## PRD-028 — Localization is a cross-profile optional capability
**Status:** Accepted

**Decision:**  
Localization is a cross-profile PRD capability. A PRD package may declare locale-aware behavior, but localization is optional per package and must not bloat or replace the lean base manifest.

**Why:**  
PRD should be able to adapt not only to viewport and reading mode, but also to language, region, and text-direction context when a package declares that behavior. At the same time, tiny packages must stay lightweight.

**Implication:**
Locale-aware behavior belongs in a standardizable model that works across `general-document`, `comic`, and `storyboard`. The base manifest may carry small localization declarations, while localized payloads and per-locale resources remain outside the base manifest.

**Follow-up:**
Add `core/PRD_LOCALIZATION_MODEL.md` and align manifest, capability, and architecture docs with localization as a cross-profile optional capability.

---

## PRD-029 — Manifest metadata split uses top-level required fields, optional `identity`, and optional `public`
**Status:** Accepted

**Decision:**
PRD keeps the accepted fixed top-level manifest baseline for package identity and opening. Optional supplemental durable references belong in an `identity` object. Optional lean reader-facing display and discovery metadata belongs in a `public` object. Rich about/creator/series material stays in content, attachments, or later profile-specific payloads.

**Why:**
The older PRD manifest direction had a useful separation between durable identity and reader-facing metadata, but reviving a heavy nested `header` / `metadata` / `structure` manifest shape would conflict with the current minimal-valid baseline and make the manifest harder to keep lean.

**Implication:**
The manifest should not revive nested required `header`, `metadata`, or `structure` top-level sections. The required top-level fields remain `prdVersion`, `manifestVersion`, `id`, `profile`, `title`, and `entry`. Optional `identity` may hold things like `revisionId`, `parentId`, `originId`, `authorRefs`, and `publisherRef`. Optional `public` may hold things like `subtitle`, `summary`, `byline`, `contributors`, `publisher`, `genres`, `subgenres`, `tags`, `contentWarnings`, `contentRating`, `status`, and `cover`.

**Follow-up:**
Add `core/PRD_METADATA_MODEL.md` and align manifest, foundation, glossary, and active `04_PRD` docs with this split.

---

## PRD-030 — Audio and read-aloud features are optional capability lanes
**Status:** Accepted

**Decision:**
Packaged audio playback, ambient audio, narration audio, and text-to-speech support are optional capability lanes in PRD. AI-reader behavior remains a viewer/runtime/product feature unless a later higher-priority spec defines a narrower interoperable declaration.

**Why:**
PRD should be able to support richer web novel, comic, and accessibility experiences without turning audio or AI behavior into a minimal-validity requirement for every package and viewer.

**Implication:**
Audio assets and read-aloud declarations may improve the user experience, but they must not block base readability or redefine minimal package validity. Unsupported optional audio or read-aloud features should degrade gracefully.

**Follow-up:**
Align `runtime/PRD_CAPABILITY_MODEL.md` and later profile specs with optional audio and narration capability handling.

---

## PRD-031 — Reference tooling may validate unpacked package directories
**Status:** Accepted

**Decision:**
Normative minimal PRD distribution remains a `.prd` ZIP archive. The reference validator and CLI (`validatePackage` in `packages/prd-validator`, `prd validate <path>`) MAY accept a **directory path** whose relative file layout matches the archive root, applying the same structural checks to the resulting file map. The `.prd` extension and ZIP-open checks apply only when the validation target is a `.prd` file.

**Why:**
Authors and CI almost always work on unpacked trees; requiring zip-on-disk for every validation loop slows the golden path. The distinction must stay explicit so the format contract is not reinterpreted as “directories are interchangeable with `.prd` for interchange.”

**Implication:**
Minimal spec docs (`core/PRD_MINIMAL_VALID_SPEC.md`, `core/PRD_MINIMAL_VALID_PRD.md`) describe both the normative transport and this reference behavior. Third-party validators may support only `.prd` files if they choose.

**Follow-up:**
None required for baseline; optional future doc: full validator error-code catalog.

---

## PRD-032 — npm scope for published packages uses eonhive org
**Status:** Accepted

**Decision:**
Published package names use the **`@eonhive/prd-*` scope** (for example `@eonhive/prd-cli`, `@eonhive/prd-types`). The short **`@prd`** npm scope is not used because it is unavailable. The **PRD** product name and format acronym stay unchanged in documentation; only npm package identifiers include the org scope.

**Why:**
Scoped packages must resolve to an org or account the project controls. Using **`eonhive`** matches the GitHub org and avoids fighting for an unavailable **`@prd`** namespace.

**Implication:**
Install commands use `npx @eonhive/prd-cli` (or `npm i -g @eonhive/prd-cli`); imports use `@eonhive/prd-types`, `@eonhive/prd-validator`, and so on. The CLI binary name remains `prd` where declared.

**Follow-up:**
None for the rename itself; publish order remains types → validator → packager → cli.

---

## PRD-033 — First public npm release is a CI-driven 0.1.0 tooling preview
**Status:** Accepted

**Decision:**
The first public npm release is a **`0.1.0` public preview** published on the npm `latest` tag. The public package set is limited to `@eonhive/prd-types`, `@eonhive/prd-validator`, `@eonhive/prd-packager`, and `@eonhive/prd-cli`. Private viewer packages are not published. Public release publication happens from **`main` through CI automation**, not from ad hoc local machines.

**Why:**
The publishable tooling surface is coherent enough for early public use, but the project is still pre-1.0 and should be framed honestly as an early preview. CI-driven publication reduces accidental drift between package versions, docs, and release gates.

**Implication:**
Release gating requires Node 20+ CI checks, example validation, tarball smoke tests, and release docs that match the shipped package names and commands. Changesets is the release-management source of truth for ongoing versioning and publish orchestration.

**Follow-up:**
Keep the release policy and maintainer runbook aligned with the actual workflow and publish set.

---

## PRD-034 — Large `general-document` works segment through top-level section files, not a heavy spine
**Status:** Accepted

**Decision:**
For the current Phase 3 executable baseline, larger `general-document` works may segment content by keeping `manifest.entry` on `content/root.json` and allowing top-level `section` nodes to reference packaged section files under `content/sections/`. This is a packaging rule for one document, not a collection model and not a new profile.

**Why:**
PRD needs a scale path that stays smaller and cleaner than duplicating full roots or reviving a heavy spine system too early. Root plus section files keeps the manifest-first contract intact while giving larger works a disciplined way to grow.

**Implication:**
Section file roots use `type: "document-section"` and must match the parent section `id` and `title`. Nested segmented section references are not part of v0.1. Localization overlays should apply after segmented sections are resolved into one effective document tree.

**Follow-up:**
Add `core/PRD_SEGMENTATION_MODEL.md` and keep `PRD_PROFILE_GENERAL_DOCUMENT.md`, package-layout docs, validator behavior, and example packages aligned with the root-plus-section-files baseline.

**Schema/validator alignment (October 27, 2026):**
`schemas/content.schema.json` now covers the accepted general-document nodes, optional leaf IDs, top-level section references and `document-section` roots through `#/$defs/documentSectionRoot`, keeping its existing schema ID. Inline/src forms remain mutually exclusive and nested segmentation remains invalid. The validator's previous array-only exclusivity check incorrectly accepted `src` with null/non-array `children`; a patch now checks field presence using the same issue code. Shape tests do not replace package/resource, uniqueness, table/chart or parent-section relationship checks. Valid existing packages and declared-version acceptance stay unchanged.

---

## PRD-035 — Core PRD assets are packaged-first and array-declared
**Status:** Accepted

**Decision:**
The executable core PRD baseline treats `manifest.assets` as an array of packaged asset declarations only. Core asset `href` values must stay package-internal and resolve under `assets/`. External asset URLs are not part of the interoperable baseline and remain future extension-only behavior.

**Why:**
PRD should stay portable, smaller, and more disciplined than a linked web bundle. Leaving object-form asset groups or external asset URLs in the baseline keeps the package contract ambiguous and weakens the file-size-versus-portability boundary right where large-work strategy depends on it.

**Implication:**
Types, schema, validator behavior, and docs should all agree that `assets` is array-only in the current executable model. Linked `http` or `https` references remain allowed only for supplemental `attachments`, not for core asset resolution.

**Follow-up:**
Keep `core/PRD_ASSETS_AND_ATTACHMENTS.md`, the manifest draft, minimal-valid docs, schema, and validator tests aligned with the packaged-first asset baseline.

---

## PRD-036 — Collection and series relationships stay lean, cross-package, and manifest-declared
**Status:** Accepted

**Decision:**
PRD handles collection and series behavior for large works through a lean manifest relationship model, not through a spine, package-of-packages container, or multi-entry open contract. The current executable baseline allows one primary `series` membership under `identity` with optional sequence numbers, optional unordered `collections` memberships under `identity`, and matching lean display labels under `public`.

**Why:**
PRD needs a way to group and order related packages such as comic issues, storyboard sets, or serialized documents without bloating `manifest.entry`, reviving a heavy EPUB-style spine, or pushing service-only catalog state into every package. A small relationship layer preserves portability while giving libraries and viewers stable grouping hints.

**Implication:**
Segmentation remains the large-single-document rule inside one package. Collection and series relationships operate across packages and do not add new directories, collection manifests, or required library files to the core baseline. Rich "about the series" material still belongs in normal content or attachments rather than the lean base manifest.

**Follow-up:**
Add `core/PRD_COLLECTION_AND_SERIES_MODEL.md` and align the metadata model, manifest draft, validator behavior, schema, example manifests, and viewer metadata surface with the lean relationship baseline.

---

## PRD-037 — Product layers must not redefine PRD validity
**Status:** Accepted

**Decision:**
PRD Core defines package validity. The Reference Stack proves the core is executable. Product layers such as Studio, Cloud, SDK product surfaces, advanced Viewer apps, Renderer implementations, and PRDc consume PRD but must not redefine what counts as a valid PRD package.

**Why:**
The project needs a public product path without blurring the standard, reference tooling, and future service/product layers. Keeping those boundaries explicit prevents PRD from becoming a viewer app, a Cloud product, or an archive system by accident.

**Implication:**
The current public preview consists of docs, schemas, examples, conformance fixtures, and the public `@eonhive/prd-*` tooling packages. Viewer packages remain private npm surfaces. Studio, Cloud, PRDc, and broad SDK/product surfaces remain future ecosystem lanes above the core.

**Follow-up:**
Keep `docs/product/PRD_PRODUCT_BOUNDARIES.md`, architecture docs, README navigation, and future Phase 5 authoring/tooling plans aligned.

---

## PRD-038 — Format, manifest, runtime, and npm versions are separate surfaces
**Status:** Accepted

**Decision:**
PRD versioning uses separate surfaces for package-declared `prdVersion`, package-declared `manifestVersion`, optional profile and extension versions, runtime/viewer versions, CLI JSON contract versions, and public npm package versions. These surfaces may align in docs and tooling, but they must not be treated as interchangeable.

**Why:**
The current executable package examples use `prdVersion: "1.0"` and `manifestVersion: "1.0"` while the public npm tooling preview is `0.1.1`. Without explicit policy, contributors and consumers can mistake npm preview maturity for format finality or mistake manifest version values for package release numbers.

**Implication:**
Changes to format or manifest semantics need docs, validator/schema alignment, and decision coverage. Public npm releases remain Changesets-driven, CI-published, and registry-audited. Published package metadata must not contain `workspace:*` dependency values.

**Follow-up:**
Keep `docs/core/PRD_VERSIONING_POLICY.md`, `docs/governance/PRD_RELEASE_POLICY.md`, release runbooks, and package docs aligned.

---

## PRD-039 - Public reference site uses Workers Static Assets without a backend
**Status:** Accepted

**Decision:**
The public Home, Docs, and reference Web Viewer remain routes in one static Vite app. Production targets Cloudflare Workers Static Assets at `prd.eonhive.com`, replacing the earlier Pages-specific setup. GitHub Pages remains staging/fallback under `/prd/` until production launch QA passes.

**Why:**
Workers Static Assets supports the existing static output and SPA route refreshes without introducing backend services or changing PRD's offline-first package contract.

**Implication:**
Wrangler declares the built asset directory and native SPA fallback; no Worker script or new API is needed. User-selected packages are parsed in-browser. Hosted sample downloads remain demo behavior, not a format-level network-loading guarantee. Build/dry-run success must not be reported as verified production launch.

**Follow-up:**
Complete authenticated deployment, custom-domain setup, and launch QA using `docs/governance/PRD_HOSTING_RUNBOOK.md`. Keep the fallback deployment and public product copy aligned.

---

## PRD-040 — PRD container identification is additive and preserves legacy ZIP
**Status:** Accepted for the reference stack; staged writer rollout

**Decision:**
Use the owner's requested `50 52 44 00` magic with the fixed 16-byte container 1.0 header defined in [PRD_CONTAINER_FORMAT.md](../core/PRD_CONTAINER_FORMAT.md). Major/minor occupy one byte each; reserved flags and payload length use little-endian 16/64-bit fields. Flags are zero, versions are checked exactly, and payload length must match available bytes. Payload remains ZIP with root `manifest.json`.

**Why:**
The supplied container proposal calls for unique binary identification while preserving existing package compatibility. A ZIP-native marker cannot provide the requested offset-zero PRD bytes. Replacing default output immediately would strand older readers and published consumers.

**Implication:**
Readers accept both forms. Packager/CLI emit the envelope only through the additive `container: "prd"` / `--container prd` option; default ZIP output and directory authoring remain supported. Container version is separate from manifest/profile/npm versions. The shared reader enforces documented, configurable archive budgets and member safety; these implementation limits do not become universal format maxima. Magic is not authenticity, encryption or a cryptographic signature.

**Follow-up:**
Complete the normal Changesets release path before claiming this feature published. Any default-writer migration needs a separate compatibility/release decision. PRD-041 defines optional integrity/signing separately; keep fallback isolation and deeper hostile-archive coverage tracked under PRD-P010.

---

## PRD-041 — Optional signatures cover logical files and require explicit key trust
**Status:** Accepted for the reference stack, October 27, 2026; pending release

**Decision:**
Implement the owner's requested optional signing phase as `eonhive.signature` version `1.0`, declared through the existing optional extension array. [PRD_SIGNATURE_V1.md](../extensions/PRD_SIGNATURE_V1.md) defines exact SHA-256 coverage of every logical file except the signature metadata, a domain-separated deterministic tuple message, native Ed25519 signing, and unsigned/untrusted/verified/invalid/unsupported results. The exact updated manifest bytes are covered; no new core manifest field or container flag is introduced.

**Why:**
Magic identifies the transport and structural validation establishes format correctness. Neither authenticates content. Covering the complete logical file set prevents unsigned manifest/assets/locales from retaining a verified label while allowing harmless ZIP recompression and transport changes. An embedded key alone cannot establish publisher trust.

**Implication:**
Browser-safe verification belongs in the existing validator's `signature` subpath; Node signing belongs in the packager's `signing` subpath. CLI `sign` writes a separate new archive; `verify` exits zero only with a cryptographically valid signature and independently supplied matching public key. Existing validation/inspection contracts remain structural. The Viewer preserves unsigned readability, displays verification status and blocks known-invalid signed contents before rendering. Unsupported verification never receives a verified label.

**Boundaries / follow-up:**
One signer and explicit public-key pins only. No encryption, PKI, account identity, timestamps, revocation, key management or URK dependency is accepted. Removing both declaration and metadata produces unsigned content; authenticity-required workflows must require verified status. Public APIs ship through Changesets; no release or default-container migration is implied. Future trust infrastructure remains PRD-P012.

---

## PRD-042 — Import output is shared while conversion remains optional tooling
**Status:** Accepted for the reference implementation, October 27, 2026; pending release

**Decision:**
Keep source parsing and resource selection in adapters/importers. Share canonical manifest/content serialization and directory output between the existing Markdown/image CLI importers, preserving generated bytes, JSON shapes, warning behavior and natural image order. HTML directory import reuses the already-implemented converter adapter and preparation stage, then the same CLI writer; it does not implement another parser, schema, renderer or ZIP engine. No additional npm package is introduced by this continuation.

**Output and diagnostics:**
`prd import html` produces a structured `general-document` package directory with a declared `prd-import-report-v1` diagnostic attachment. It omits raw source HTML and reports that omission. Operational source/target paths remain in CLI output; exported diagnostics contain generated package resource paths and element-name references, not original filesystem/URL provenance. Structural validation, partial fidelity and unassessed reading quality are separate claims. Existing convert/validate/inspect/Markdown/image contracts remain unchanged; new HTML command success/failure output uses `prd-cli-html-import-v1`.

**Evidence / follow-up:**
See [HTML implementation policy](../architecture/PRD_CONVERT_HTML.md) and source/compatibility tests. The exact source → directory → validator → packager → archive → Viewer path is executable. PRD-015 is unchanged; PRD-P015 remains the earlier separate proposed ecosystem-positioning entry. EPUB/CBZ are the next planned formats under the owner's revised order; DOCX/PDF/Office/web conversion remain out of this task. Follow normal Changesets/CI release governance.

---

## PRD-043 — CBZ reuses bounded archive decoding and canonical comic panels
**Status:** Accepted for the reference implementation, October 27, 2026; pending release

**Decision:**
Extend the existing converter with one CBZ adapter using the validator's bounded archive reader. Do not extract source members to disk or introduce a second ZIP engine. Map supported raster members to whole-page canonical `comic` panels and collect their bytes through the existing resource map. Share natural filename comparison/title helpers with the legacy image importer without changing its output. CBZ uses a raw string tie-break for otherwise equivalent paths.

**Fidelity and safety:**
Natural full-path order and filename alternative text are inferred and always warned. Metadata, reading direction, spreads, OCR and sub-page geometry are not interpreted. Every member, including ignored files/directories, is subject to existing archive byte/count/path checks. Exact source retention remains the direct converter default, with explicit opt-out. Existing report, CLI, PRD manifest and Viewer contracts remain unchanged.

**Evidence / follow-up:**
See [CBZ implementation policy](../architecture/PRD_CONVERT_CBZ.md), the real source/archive/report example, security tests, installed-tarball smoke and existing Viewer opening in both transports. Local browser acceptance also closes the HTML directory rendering/link/report checks. EPUB is next and requires a separate bounded XML/spine policy. DOCX/PDF/Office/web conversion and public release remain separate work. PRD-015 and existing accepted decisions are unchanged.

---

## PRD-044 — EPUB maps a bounded XML spine into canonical document sections
**Status:** Accepted for the reference implementation, October 27, 2026; pending release

**Decision:**
Add one reflowable EPUB adapter to the existing converter. Reuse the bounded archive reader and HTML semantic extractor; use an optional, lazily loaded namespace-aware XML parser for container, OPF and XHTML. Canonical `general-document` sections express spine chapter order. Map retained same-book anchors across chapters, share declared raster resources, and fold matching opening headings into section titles while retaining their anchors. No EPUB-specific PRD schema, renderer or runtime execution environment is introduced.

**Fidelity and safety:**
Keep existing conversion/CLI report contracts and default opaque source retention. Separate structural validity from partial conversion fidelity. Bound every archive member, cumulative XML work and nesting. Refuse DTDs/custom entities, XML base/processing instructions, encryption/obfuscation, recognized fixed layouts and unsafe/ambiguous spine relationships. Original navigation hierarchy, CSS, media overlays and metadata beyond title are reported as unmapped. No remote retrieval or decryption is performed.

**Evidence / follow-up:**
See [EPUB mapping and XML policy](../architecture/PRD_CONVERT_EPUB.md), actual source/archive/report example, both-transport CLI/Viewer opening and security/optional-dependency tests. Local browser acceptance covers rendering, chapter links and byte-exact attachment retrieval. DOCX follows with its own bounded ZIP/XML/relationships policy; PDF/Office/frontend and public release remain separate work. Existing accepted decisions, including PRD-015, remain unchanged.

---

## PRD-045 — DOCX body conversion shares bounded XML and canonical content
**Status:** Accepted for the reference implementation, October 27, 2026; pending release

**Decision:**
Add one transitional DOCX adapter to the existing converter. Discover the Word body through bounded OPC content types/relationships, share the EPUB-established optional XML parser, and map structural paragraphs/styles, simple lists/tables, bookmark links and declared raster assets directly to canonical general-document content. Do not introduce a Word renderer, new PRD schema or independent package writer.

**Safety and fidelity:**
Preserve existing input/archive/resource limits and output/report contracts. DOCX XML work is capped at twice the output-node budget to account for ordinary shared style definitions; XML/style depth remains capped. Reject unsafe/ambiguous relationships, DTDs/entities, malformed XML, cyclic styles, unsupported encodings and recognized macro-enabled sources. No remote retrieval, field execution or decryption. Report layout, visibility/revision limitations, notes, equations, objects and other unsupported Word behavior. Default opaque source retention is not redaction.

**Evidence / follow-up:**
See [DOCX mapping and OPC policy](../architecture/PRD_CONVERT_DOCX.md), the real authored/rendered Word source, actual generated PRD/report, semantic/security tests and both-transport CLI/Viewer opening. Fresh manual PRD Viewer acceptance remains pending because local browser use is disabled. PDF requires a separate extraction/reading-order/scan-fallback policy. OCR, cloud, Office execution, frontend and public release remain separate work. Existing accepted decisions, including PRD-015, are unchanged.

---

**October 28 acceptance update:** DOCX local Viewer rendering, list/table/image checks, bookmark navigation and byte-exact source/report retrieval now pass after browser access became available. The subsequent PDF implementation is recorded under PRD-047; the earlier pending-browser/PDF statement above is historical.

---

## PRD-046 — Reference version negotiation preserves structural validity
**Status:** Accepted for the reference runtime, October 28, 2026

**Decision:**
Implement the owner's next version-compatibility phase with exact reference contracts `1.0` / `1.0.0` for format, manifest, canonical profile declarations and canonical structured roots/sections. Keep structural validation and CLI JSON unchanged. Minimum-viewer declarations use bounded numeric two/three-component comparison against the existing runtime descriptor; unrecognized, empty or newer requirements cannot open content. See [versioning policy](../core/PRD_VERSIONING_POLICY.md) for grammar, comparison and compatibility.

**Why:**
Non-empty future declarations previously produced fully-supported results without an implemented future contract. Structural well-formedness must not become a semantic compatibility claim. Current examples and documented legacy paths should remain readable under their supported base declarations.

**Implication:**
The private viewer-core checks manifest requirements before entry reads, and version metadata in default roots, referenced sections and localized alternates before returning render payloads. It reuses `unsupported-required-capability` with preserved public facts and actionable declaration/path messages. The existing web guard blocks locale/resource preparation for this state. Unknown optional extensions and custom profile versions keep their existing fallback boundaries; optional signature verification does not bypass version compatibility.

**Limits / follow-up:**
No general semver range inference, older decoder, payload migration, streaming, per-locale substitution, new public type/JSON field or required dependency is introduced. Exact contract support and minimum-viewer ordering are separate rules. Unversioned localization controls and unrelated JSON stay unversioned. Existing schema/validator acceptance, binary/signature contracts and npm versions are unchanged. Add supported contracts or migration only with explicit policy and conformance evidence.

---

## PRD-047 — PDF conversion uses bounded extraction and explicit page fallback
**Status:** Accepted for the reference implementation, October 28, 2026; pending release

**Decision:**
Add one PDF adapter to the existing converter. Extract text into canonical page sections and responsive paragraphs; rasterize textless pages without OCR. Reuse PRD types, resources, validator, packager and Viewer. Isolate pinned optional PDF.js/native canvas dependencies in a separate Node process with a deadline, heap setting and byte/count/pixel caps. This is import tooling, not a new PRD renderer or format schema.

**Safety and fidelity:**
Refuse encrypted PDFs, including empty-password encryption. Do not execute document actions, XFA, annotation widgets or remote retrieval. Restrict auxiliary reads to installed parser data. Reject failed/diagnostic raster fallbacks instead of publishing silently blank pages. Report uncertain extraction order, omitted text-page graphics and unsupported semantics explicitly. Source/report retention and existing JSON contracts remain unchanged; source retention is not sanitization. JavaScript heap limits do not cap native RSS or provide an OS sandbox.

**Evidence / follow-up:**
See [PDF policy](../architecture/PRD_CONVERT_PDF.md), the actual mixed text/scanned source and generated PRD/report, security/lifecycle tests, CLI/installed-consumer checks and both-transport Viewer opening. Local Viewer acceptance covers responsive text, scan decoding, page navigation and exact attachment retrieval. Convert Web follows as a separately specified product increment; OCR, layout reconstruction, faithful/hybrid output, Office execution, cloud and public release remain separate. Existing accepted IDs are preserved.

---

## PRD-048 — Convert Web shares canonical assembly and memory packaging
**Status:** Accepted for the reference implementation, October 28, 2026; pending release/deployment

**Decision:**
Add a focused local Markdown conversion surface at `/convert/` inside the existing web app. Run the existing Markdown adapter in a cancellable module worker through an explicit converter browser export. Extract shared canonical assembly and add a packager memory-file export; Node and browser use the same manifest/content/report/validation/package authority. Existing filesystem APIs, CLI contracts and renderer remain intact.

**Execution and limits:**
Accept only bounded explicit source/resource selections. Do not retrieve source URLs, enumerate files, load Node/native PDF dependencies or execute source markup. Match reference byte/count/node budgets with a 20-second UI job deadline; browser callers can tighten limits. This is not an OS/browser-memory sandbox. Preserve exact source/report attachments by default, warn on omissions, and enable download/Viewer preview only after actual conversion and validation. Object URLs and workers have explicit cleanup; in-memory results clear on reload.

**Evidence / follow-up:**
See [Convert Web policy](../architecture/PRD_CONVERT_WEB.md), the actual browser-downloaded example, Node/browser logical parity, both-transport Viewer opening, worker lifecycle/security tests and installed-tarball browser exports. HTML is next under a browser parser policy. Simultaneous previews, repair/recipes, other browser adapters, OCR, faithful/hybrid strategies, Office execution, cloud, public release and deployment remain separately scoped. Existing decision IDs and canonical format contracts are preserved.

---

## PRD-049 — Unpacked directories share bounded reference loading
**Status:** Accepted for the reference tooling, October 28, 2026; pending release

**Decision:**
Share one Node directory reader between validation, inspection and packaging. Reuse reference archive defaults for per-file bytes (32 MiB), total file bytes (128 MiB) and visited entries (10,000), with positive-safe-integer overrides. Count every enumerated entry, including directories and ignored names, before exclusion; omit the supplied root and unvisited hidden descendants. Retain existing dotfile/subtree and non-regular-entry exclusions. The compressed archive budget has no directory equivalent.

**Why:**
Directory validation and packaging previously collected files with duplicated unbounded `readdir` / `readFile` loops. Archive budgets alone did not protect the authoring path. Checking only stat metadata would still allow file growth to bypass byte limits.

**Implication:**
Incrementally enumerate directories, check opened-file metadata and read bounded chunks with actual-byte checks before retaining output. Export the reader, limits and coded error through the existing validator `/node` entry point; add optional limits to Node validation/inspection and `PrdPackOptions`. Apply packaging overrides to emitted archive checks too. Validation/inspection preserve JSON shapes and report directory reader failures as existing issue objects; direct directory I/O failures now return invalid results rather than uncaught filesystem exceptions. Packaging throws before output creation/replacement. ZIP defaults, both transports, manifests, profiles and the browser-safe packager boundary remain intact.

**Limits / follow-up:**
These are reference resource policies, not portable format maxima, memory/CPU ceilings or an atomic filesystem snapshot. Source trees must be stable. Skipped symlinks and leaf no-follow checks where supported do not isolate against concurrent ancestor replacement. No CLI budget flags or new npm package is introduced. Tests cover inclusive/custom limits, entry exclusions/counts, declared/actual growth, cleanup, error shapes and packaging parity. PRD-P010 remains pending for ZIP integrity/malformed-archive coverage and HTML fallback resource/navigation isolation. Publication follows Changesets/CI release governance.

---

## PRD-050 — Reference ZIP readers verify member CRC and bounded records
**Status:** Accepted for the reference tooling/runtime, October 28, 2026; pending release

**Decision:**
Before document interpretation, require bounded, consistent ZIP end/central/local/descriptor records and CRC-32 verification of every decoded member. Keep `fflate` for DEFLATE decoding and the existing declared/actual output limits. Feed the inflater indexed compressed slices rather than scanning content for ZIP record markers. Both legacy ZIP and PRD-envelope payloads use this path without changing the container or manifest version.

**Why:**
Source-backed regression tests demonstrated accepted stored-byte corruption, forged checksums, incorrect central-directory extents and ignored encryption flags. The prior streaming scanner could confuse marker-like bytes inside stored content with descriptors. Header identity and byte lengths alone do not establish ZIP data integrity.

**Compatibility and diagnostics:**
Retain stored/DEFLATE entries, comments, bounded extra fields, physical/central order differences, signed/signatureless data descriptors and safe single-disk ZIP64 records, including small forced-ZIP64 sources. Reject overlapping/missing/unlisted records, inconsistent names/flags/sizes/CRC, unsupported encryption/patch/reserved flags and unsafe wide values. `archive-checksum-mismatch` is additive; other structural record failures use `archive-read-invalid` and existing budget/path codes remain. Node/CLI and web inherit the shared reader without new JSON fields or public functions. ZIP-level signature metadata is opaque and establishes no PRD trust.

**Limits / follow-up:**
CRC-32 covers decoded member bytes and detects corruption; it is not cryptographic authentication or protection for all ZIP metadata/compressed representations. Optional PRD signing and explicit key trust remain under PRD-041. Bounded regression/mutation fixtures are not exhaustive fuzzing or an independent security audit. No new dependency, parser package, archive transport, streaming guarantee, memory/CPU ceiling or default-writer migration is introduced. PRD-P010 remains open for HTML fallback resource/navigation isolation and broader hostile-input testing. Follow Changesets/CI release governance.

**Implementation note (October 29, 2026):** [Current-loader measurements](../core/PRD_PERFORMANCE_AND_LOADING.md#13-current-loader-measurements-and-stored-windows-october-29-2026) retain this decision's checks and eager loading. Stored source windows increase to 64 KiB after preflight proves compressed/original lengths match; DEFLATE remains at 1 KiB compressed pushes. Actual byte limits, CRC and independent returned buffers stay intact. This is an internal allocation/callback optimization under the existing contract, not a new format limit, API or writer migration. Rejected trials and raw Node samples are retained; browser/GC memory guarantees are not inferred.

**Allocation follow-up (October 30, 2026):** [The next experiment](../core/PRD_PERFORMANCE_AND_LOADING.md#14-allocation-investigation-and-viewer-blob-preparation-october-30-2026) rejected full declared-size output preallocation after measuring a 32 MiB extra reservation for three malformed output bytes. Retain actual-chunk collection and final validation-before-assembly; new tests cover declared-length/aggregate/ownership and allocation boundaries. The selected optimization removes a redundant private-Viewer pre-Blob clone outside the container boundary. No decoder policy, API, budget, writer or format change is accepted by that experiment.

**Filename/mutation follow-up (October 30, 2026):** Enforce declared UTF-8 name bytes strictly and preserve a literal leading U+FEFF, retaining exact identifier spelling rather than replacement/BOM stripping. A prefixed name must not satisfy root `manifest.json`; valid replacement characters and normalization forms stay literal. Existing unflagged byte interpretation remains. New source/Node/installed-consumer/signing regressions and bounded seeded mutation tooling support the [filename policy](../core/PRD_CONTAINER_FORMAT.md#member-filename-encoding). Signature path round trips use a separate literal-preserving decoder while keeping JSON parsing and the v1 preimage/trust rules. This corrects malformed-name acceptance and identifier rewriting under the existing manifest/record contract, using `archive-read-invalid` without an API, version, budget, writer or signature-algorithm change. A patch Changeset follows release governance; bounded mutation coverage does not close PRD-P010's live/cross-engine/security-assurance work.

---

## PRD-051 — HTML fallback is a contained local reading preview
**Status:** Accepted for the private reference Viewer, October 29, 2026; live browser acceptance pending

**Decision:**
Replace permissive DOMParser/rewrite presentation with a bounded parse5 data-tree reading compiler, an early default-deny CSP and the existing opaque sandboxed iframe. Preserve semantic text/tables and selected declared packaged raster/native media, while removing authored scripts/CSS, nested documents, SVG/foreign content, forms and navigation including fragments. Apply the same compiler to every HTML preparation path, including the defensive alternate branch. Localized alternate validity remains JSON-only. See [HTML fallback policy](../runtime/PRD_HTML_FALLBACK_POLICY.md).

**Why:**
The previous iframe sandbox did not constrain resource URLs or the frame's own navigation, and detached browser parsing could initiate resource requests before output rewriting. CSS/imports, refresh/base metadata, unresolved URLs and active attributes survived. HTML alternates could also combine with a base structured presentation through per-field fallbacks.

**Implementation boundary:**
Reuse the existing parse5 version as a dynamically loaded app dependency rather than creating another parser/package or adding a mandatory dependency to PRD Core. Emit only allowlisted escaped HTML and Viewer-created, MIME/header-screened media URLs. Cache selected media per package with documented preview budgets. Stage/dispose URLs around async opening and select a complete alternate presentation. Suppress automatic outer cover/Files images while HTML is active. Keep raw source/signature bytes, structural validation, core `safe-mode`, canonical profiles, public npm/JSON contracts and structured presentation intact.

**Evidence / follow-up:**
Automated parser/serialization/CSP/resource/lifecycle checks and real both-transport localized fixtures establish code behavior. Browser use was disabled in Work settings; live no-request/navigation, media, disposal, screenshot and accessibility acceptance remains open under PRD-P010/item 54. This is not an independent audit, full media decode/sanitization, exact memory/CPU ceiling or cross-engine assurance. Functional links, authored CSS, SVG and richer HTML experiences require separate policies. No public-package Changeset, format version bump, publication or deployment is part of this private Viewer increment.

---

## PRD-052 — Browser HTML reuses bounded extraction and factual conversion review
**Status:** Accepted for repository implementation, October 29, 2026; pending live UI acceptance/release/deployment

**Decision:**
Add `convertInBrowser` for Markdown/static HTML while preserving the existing Markdown-only export. Lazy-load the existing HTML adapter and optional parser in an ES module worker, using the same semantic extraction, limits, source/resource policy, canonical assembly, validator and packager as Node. HTML source never becomes the primary reading entry or a live preview document.

**Product boundary:**
Adapt the owner's converter reference into upload/selected-file, actual options and factual quality/assets/source review panels. Reuse PRD branding and the existing Viewer. Do not expose illustrative PSD/AI/layer/batch/history controls as working features. Use actual counts and indeterminate work state rather than synthetic progress/confidence.

**Evidence / follow-up:**
See [browser HTML/workspace policy](../architecture/PRD_CONVERT_WEB_HTML.md), real output, Node parity, both transports, malicious-input/parser/lifecycle tests and installed exports. Browser automation is disabled; fresh visual/interaction acceptance is pending and no older screenshot substitutes for it. Existing format, CLI/report contracts and accepted IDs are preserved. Further browser formats, PSD, AI, editing, cloud, release and deployment remain separate work.

---

## PRD-053 — Browser CBZ shares bounded archive import and canonical page sequence
**Status:** Accepted for repository implementation, October 29, 2026; pending live UI acceptance/release/deployment

**Decision:**
Extend generic browser dispatch with the existing CBZ adapter and bounded validator archive reader. Share portable ordering/label helpers without changing the public Node image-sequence wrapper. Collect archive images in memory through the existing adapter contract, preserving literal paths, source/report retention, canonical Comic output, validation and packaging. Browser budgets can only tighten; source members are never extracted to disk or fetched.

**Product / format boundary:**
The current Comic model has ordered panels and no reading-direction field. Expose natural/reversed filename sequence through additive shared `comicPageOrder` settings, preserving source page IDs/assets and reporting explicit reversal. Default Node/browser output and CLI flags remain unchanged. This does not imply manga direction, cover/spread detection, OCR or new profile metadata. The web workspace uses actual Comic/page counts and a binary-source explanation; separate supporting files are not accepted for CBZ.

**Evidence / follow-up:**
See [browser CBZ policy](../architecture/PRD_CONVERT_WEB_CBZ.md), actual three-page output, Node parity/both transports, hostile archive/lifecycle/component tests and Buffer-free/optional-parser-absent installed consumers. Fresh live UI/worker/download/Viewer acceptance remains open while browser automation is disabled. The owner's continuation authorizes this implementation alongside that pending review; it does not close prior acceptance tasks. New browser formats, repair/editing, PSD, AI/cloud, release and deployment remain separately scoped.

---

## PRD-054 — Conversion page-order repair reruns the canonical pipeline
**Status:** Accepted for repository implementation, October 29, 2026; live UI acceptance/release/deployment pending

**Decision:**
Add one focused CBZ repair action: draft a complete page sequence, reset it or apply through the existing source adapter, assembly, validator and packager. Retain the explicitly selected immutable File/settings in the local conversion session; this context is separate from optional source packaging and is not persisted or exported. Successful apply replaces the completed result; failed/cancelled apply keeps the previous package.

**Contract / scope:**
Add shared Node/browser `comicPageIds` as a snapshotted, bounded complete source-ID permutation, mutually exclusive with filename ordering. Keep every imported page's ID/assets/descriptions and report explicit review through the existing quality v1 contract. Do not add format fields, CLI flags, archive mutation infrastructure, a renderer or a general authoring surface. The native filename list changes sequence only; Studio retains full editing. Download URLs must belong to the current result.

**Evidence / follow-up:**
See [page-review policy](../architecture/PRD_CONVERT_PAGE_REVIEW.md), actual reviewed example, Node/browser parity, invalid-order/source/context/lifecycle tests and both-transport Viewer opening. Browser automation remains disabled, so fresh draft/apply/reset/focus/cancel/recovery, latest downloads, Viewer return and mobile/theme acceptance remain open. The owner's continuation authorizes this focused implementation alongside that pending review. Further repair features, browser adapters, release and deployment remain separately scoped.

---

## PRD-055 — Comic description repair uses canonical text and source-backed session drafts
**Status:** Accepted for repository implementation, October 29, 2026; full live UI acceptance/release/deployment pending

**Decision:**
Extend focused CBZ review with explicitly supplied plain-text page descriptions mapped to existing canonical panel `alt`. Add bounded, copied `comicPageDescriptions` settings on Node/browser conversion and a shared tooling length limit. Keep source IDs, assets, ordering choices, default/CLI/report contracts and the existing validation/package authority. This adds no format field, renderer, AI/OCR or general authoring surface.

**Product / data boundary:**
Apply reruns the source-backed pipeline; repeated/order-only review retains already supplied text. Report actual supplied/remaining filename-derived counts without assessing accuracy or claiming accessibility conformance. Keep unapplied order/text drafts with the selected File/settings in the existing local session across Viewer return, separately from package source retention. Drafts never enter exports until Apply succeeds; failure/cancel preserves the previous package and draft. Reload/source/configuration changes end the session; no persistent history or source upload.

**Evidence / follow-up:**
See [description and session-draft policy](../architecture/PRD_CONVERT_COMIC_DESCRIPTIONS.md), actual described example, both-transport Node/browser/Viewer tests, invalid-input/snapshot/source-opt-out/repeated-review/component cases and installed-consumer smoke. Browser availability briefly returned and native CBZ selection was observed, then access stopped before conversion ran. Full live field/edit/apply/reset/focus/download/Viewer-return/theme/mobile acceptance remains open. The owner's continuation authorizes this focused repair alongside pending acceptance. Broader editing remains Studio-owned; further diagnostics, adapters, release and deployment stay separate.

---

## PRD-056 — Convert quality review presents existing diagnostic provenance
**Status:** Accepted for repository implementation, October 29, 2026; live UI acceptance/deployment pending

**Decision:**
Expose existing quality-report codes, conversion stages/source references and distinct package-validator severities/paths in the Convert workspace. Add category and literal text filters over the complete warning list before its bounded display, with real visible/matching/total counts and the existing full-report download. Preserve warning messages/order and all public/report/package contracts; no new dependency, schema, adapter or renderer.

**Product / data boundary:**
Filters are local view state and do not mutate conversion outputs or comic drafts. A replacement report starts unfiltered; metadata-only draft changes retain the current filters. Render locations and diagnostic text inertly without inventing missing provenance or navigation. Reviewed choices do not establish resolution, fidelity, confidence or accessibility. Structural validation remains Core-owned; full editing stays Studio-owned.

**Evidence / follow-up:**
See [quality-review policy](../architecture/PRD_CONVERT_QUALITY_REVIEW.md), category/search/bounds/provenance/nonmutation/security/markup tests and actual Markdown/HTML/CBZ report rendering. Existing both-transport Viewer integration remains authoritative for opening packages. Browser use is disabled in Work settings, so live filters/reset/keyboard/theme/mobile/download and earlier conversion/repair acceptance remain open. The owner's continuation authorizes this focused implementation alongside pending acceptance; additional adapters, release and deployment remain separate.

---

## PRD-057 — Converter release onboarding uses independent package versions and publish-gated verification
**Status:** Accepted for repository implementation, October 30, 2026; CI execution, first converter publication and live UI acceptance pending

**Decision:**
Use one five-package public release catalog for types, validator, packager, converter and CLI across preflight, registry audit, tarball checks and published consumers. Keep Changesets' independent version planning with empty fixed/linked groups. Remove preflight/audit's toolchain-wide version equality requirement; verify each package against its own version and dependency metadata. Preserve source/format/schema/public CLI contracts and leave checkout package versions unchanged in this implementation task.

**CI / contract boundary:**
Retire the completed original four-package bootstrap from automatic CI; preserve its historical script without adding the converter. Publish only through Changesets on `main`, serialize runs without canceling a running publish, and invoke the read-only reusable consumer only when the action actually reports a publish. Pin verification to the release commit and exact per-package workspace versions. Consumer checks include authoring/import commands and SDK/CLI conversion. Its runner is also exercised against clean local tarball installs before publication. Release, registry and consumer report contracts become separately versioned v0.2; retained bootstrap fields are explicitly inactive. These are not changes to CLI document JSON or PRD wire versions.

**Evidence / follow-up:**
See [release policy](../governance/PRD_RELEASE_POLICY.md) and [maintainer runbook](../governance/PRD_NPM_RELEASE_RUNBOOK.md), independent-version/target/registry/failure tests, real local consumer round trips and workflow syntax/guard checks. A Changesets preview applied only in a temporary workspace retains types at `0.1.1`, plans the other four public packages at `0.2.0`, and updates internal ranges for the current queue. Read-only npm checks still find the four original `latest` versions at `0.1.1` and no published converter. Publisher credentials/rights, real GitHub execution, publication and deployment are not established by local gates. Browser-disabled status and earlier live Convert/archive/Viewer acceptance remain open.

---

## Open Decisions Still Pending

### PRD-P001 — Minimal valid package structure
**Status:** Pending

**Note:**  
Narrowed by PRD-021 and PRD-022. Remaining work includes exact internal layout conventions beyond the root `manifest.json` and the single declared primary entry path.

### PRD-P002 — Exact manifest schema
**Status:** Pending

**Note:**  
Narrowed by PRD-023. Remaining work includes exact field constraints, value syntax, reserved-field structure, invalid examples, and backward-compatibility rules.

### PRD-P003 — Asset embedding vs external linking rules
**Status:** Pending

**Note:**
Narrowed by PRD-035. Remaining work is whether any later extension should standardize external asset references without weakening the packaged-first core baseline.

### PRD-P004 — Encryption/protection model
**Status:** Pending

### PRD-P005 — Exact relation of PRD / PRDc / Studio / Viewer / Cloud / SDK / Renderer
**Status:** Pending

**Note:**
Narrowed by PRD-037 and `docs/product/PRD_PRODUCT_BOUNDARIES.md`. Remaining work is detailed product implementation planning for Studio, Cloud, SDK product surfaces, Renderer implementations, and PRDc workflows.

### PRD-P006 — Collection/series model for large works
**Status:** Pending

**Note:**
Narrowed by PRD-036. Remaining work includes whether later drafts should define richer collection manifests, multiple simultaneous series memberships, or ecosystem/library sync behavior beyond the current lean manifest relationship baseline.

### PRD-P007 — Viewer capability negotiation model
**Status:** Pending

### PRD-P008 — Rights/payment metadata model
**Status:** Pending

### PRD-P009 — Four logical implementation stages within existing packages
**Status:** Pending

**Proposal:**
Organize modernization around Package Reader, Semantic Interpreter, Adaptive Presentation and Optional Experience Runtime responsibilities while retaining the package graph, public APIs, three profile root shapes and format/viewer separation. Do not create a new engine or replace the wire model without demonstrated need.

**Evidence and alternatives:**
The [October 26 source assessment](../architecture/PRD_ARCHITECTURE_ASSESSMENT_2026-10-26.md) maps these stages to current code. Pure section/locale interpretation is concentrated in the app; a broad engine/AST rewrite would add migration work before closing demonstrated defects.

**Acceptance / follow-up:**
Review a narrow implementation slice and parity tests before accepting ownership changes. Existing architecture remains authoritative; “PRD 2.0” changes no version surface.

### PRD-P010 — Archive budgets and fallback resource isolation
**Status:** Pending

**Implementation note (October 29, 2026):** PRD-040 supplies bounded archive decoding, unsafe/conflicting member rejection and configurable reference defaults. PRD-049 adds directory budgets; PRD-050 adds record/ZIP64 checks and CRC. PRD-051 implements contained HTML reading preparation and frame/resource policy. Live browser request/navigation/disposal and archive-integrity acceptance plus broader hostile-input/fuzz assurance remain open; these implementation slices do not close this entry.

**Proposal:**
Define configurable compressed/member/expanded-byte/count limits and member-name screening at archive boundaries, plus an explicit HTML fallback resource policy. Keep runtime safety limits distinct from portable format identity and preserve documented diagnostic/API contracts.

**Evidence and alternatives:**
The original assessment reproduced unsafe unreferenced member acceptance and bounded high-ratio expansion, and identified sandbox-only HTML fallback without sanitization/resource isolation. Subsequent accepted decisions above implement those bounded reader and presentation policies. Unbounded decoding, permissive authored URLs and undocumented format-wide limits are unsuitable alternatives.

**Acceptance / follow-up:**
PRD-040, PRD-049, PRD-050 and PRD-051 define reference budgets, decoded-member integrity and contained HTML output without ratifying universal format maxima or whole-archive authentication. Continue testing real package distributions, malformed fixtures and live browser requests/navigation/resource cleanup before closing this entry. Preserve directory/archive/presentation distinctions. Bounded mutation and serialization coverage do not establish exhaustive fuzz or browser assurance.

### PRD-P011 — Optional packaged experiences and uRK integration
**Status:** Pending

**Proposal:**
If packaged experiences are added, declare capability/version requirements, accessible static fallback, activation/resource policy and disposal behavior. uRK may execute supported app-level experiences on demand; it must not become a required PRD Core dependency.

**Evidence and alternatives:**
The Living Homepage already uses uRK as a private app presentation dependency. It is not an interoperable `.prd` experience contract. Requiring it for ordinary documents would conflict with accepted portability/layering rules.

**Acceptance / follow-up:**
Specify/test one bounded experience after foundation corrections. No new manifest field, product rename, script permission or runtime requirement is accepted by this proposal.

### PRD-P012 — Cryptographic package integrity and optional signing
**Status:** Narrowed by PRD-041; advanced trust infrastructure deferred

**Proposal:**
PRD-041 resolves logical file coverage, canonical signature encoding, self-exclusion, native algorithms, key fingerprints, explicit public-key trust and unsigned/invalid/untrusted verification states for the reference version 1 extension. It does not introduce an always-required signature or alter the core package model.

**Evidence and follow-up:**
Key rotation/revocation, certificates, account/publisher identity, timestamps, multiple signers and trust distribution remain unimplemented and require separate evidence and decisions. PRD-040 still concerns identification only. No magic header, hash-only field or successful structural validation is an authenticity claim.


### PRD-P015 — PRD Convert as a first-class ingestion product
**Status:** Proposed ecosystem positioning; Phase 1 reference implementation delivered on October 27, 2026

**Proposal:**
PRD Convert is a first-class product and the primary ingestion pathway for existing documents. It shares PRD Core's canonical semantic model, validation and packaging. PRD Studio owns authoring/editing on the same foundations. Viewer owns reading; PRDc owns archive/codex workflows. These boundaries do not require separate services or packages for every product or source format.

**Phase 1 implementation:**
The owner-requested foundation adds one converter package and an additive `prd convert` command. The shared Markdown extraction path produces a canonical structured `general-document`, declares collected resources and source/quality attachments, validates, packages and opens through the existing Viewer. Existing import commands and core contracts remain compatible. See [the source inventory and architecture record](../architecture/PRD_CONVERT_PHASE_1.md).

**Acceptance / follow-up:**
A real source-to-archive-to-Viewer path is required; interfaces alone are insufficient. Broader product positioning remains proposed. A converter web UI, faithful/hybrid strategies, additional formats, Office execution, OCR, AI and exports require later scoped phases. Source retention and explicit quality warnings are required where information cannot be represented; unsupported or inaccessible resources must be reported. No new manifest, renderer, account or Cloud dependency is introduced.


**PRD-P015 implementation continuation — October 27, 2026:** The [HTML increment](../architecture/PRD_CONVERT_HTML.md) adds one optional parser-backed adapter under the same converter boundary. It emits canonical structured PRD, preserves inert source/quality attachments and never promotes active HTML/CSS or browser behavior into Core. This advances Phase 2 without claiming DOCX or converter-web completion; the broader product positioning remains proposed.
