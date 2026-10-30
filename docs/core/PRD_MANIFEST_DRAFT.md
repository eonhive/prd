# PRD_MANIFEST_DRAFT.md
_Last updated: April 12, 2026_
_Status: Manifest draft v0.1_

## 1. Manifest Philosophy

The PRD manifest is the package control surface.

It should stay:

- lean
- declarative
- versioned
- public-first
- extension-ready

The manifest exists to declare what a package is, how it should be opened, what profile it uses, what assets or extensions it declares, and what compatibility or protected/private boundaries apply.
The profile declaration identifies document family, not a PRD-wide architectural property such as responsiveness. The `profile` value is a canonical machine-readable ID, not a human-facing UI label.

The manifest does not exist to carry heavy business logic, runtime state, analytics streams, payment engines, or large protected payloads.

Design rules:

- keep the base manifest small
- keep required fields public and interoperable
- declare optional behavior instead of embedding it
- reserve advanced systems for extensions or separate payloads
- preserve portability and graceful degradation

---

## 2. What Belongs In Manifest

The manifest should contain declarative package facts and declarations such as:

- PRD format/spec version
- manifest version
- package/document identity
- supplemental identity references, when needed
- lean collection/series relationship references, when needed
- profile declaration
- profile version, if needed
- title and light reader-facing public metadata
- primary entry path
- lean localization declarations, when present
- compatibility declarations
- asset declarations
- attachment declarations
- public/protected declaration boundaries
- extension declarations

What belongs in the manifest should be:

- small enough to read before loading the full package
- stable enough to support validation and compatibility checks
- descriptive rather than procedural

---

## 3. What Stays Outside Manifest

The manifest must not become a dumping ground.

These should stay outside the base manifest:

- full content bodies
- large binary asset payloads
- rich author bios or "about" pages
- release notes, acknowledgements, or long editorial notes
- rendered page snapshots or print exports
- viewer UI state such as scroll position, pane layout, or local preferences
- analytics events, counters, telemetry streams, or dashboards
- payment provider logic, checkout flows, entitlement engines, or transaction histories
- rights enforcement engines or large legal policy payloads
- PRDc archive indexes, Cloud sync state, or service-only metadata
- large encrypted or protected/private payloads
- full localized content bodies or large per-locale resource maps

If those systems exist, the manifest may declare their presence or extension entry points, but the heavy data and logic must live outside the base manifest.

---

## 4. Required Fields

The required manifest baseline extends the accepted minimal package fields.

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `prdVersion` | string | Yes | declares the PRD format/spec version |
| `manifestVersion` | string | Yes | declares the manifest schema version |
| `id` | string | Yes | declares package/document identity |
| `profile` | string | Yes | declares the intended PRD profile |
| `title` | string | Yes | declares the human-readable package title |
| `entry` | string | Yes | declares the single primary public entry path |

Required field rules:

- these fields must remain in the public readable manifest
- these fields must be sufficient to identify and open the base package
- none of these fields may exist only inside a protected/private area

Versioning surfaces required at the base level:

- `prdVersion`
- `manifestVersion`

The minimum profile declaration is the required `profile` field. No separate profile manifest is required in the base manifest.

---

## 5. Optional Fields

Optional fields may extend the manifest without bloating the minimum baseline.

| Field | Type | Purpose |
| --- | --- | --- |
| `profileVersion` | string | version for profile-specific behavior |
| `identity` | object | supplemental durable references beyond the required top-level `id` |
| `public` | object | additional visible public metadata beyond the required top-level fields |
| `localization` | object | lean locale declarations defined by the localization model |
| `compatibility` | object | viewer/renderer compatibility hints or requirements |
| `assets` | array | declared packaged asset resources |
| `attachments` | array | declared bundled or linked attachments |
| `extensions` | array or object | declared optional extension hooks |
| `protected` | object | declaration of optional protected/private material |

Optional field rules:

- optional fields must remain declarative
- optional fields must not hide or replace the required top-level fields
- optional fields may be ignored by simpler viewers if the base package remains readable
- optional fields must not force payments, rights, analytics, or Cloud logic into every manifest
- `identity` should supplement the required top-level `id`, not duplicate or replace it
- localization declarations should stay small and follow `PRD_LOCALIZATION_MODEL.md`
- asset and attachment declaration rules should follow `PRD_ASSETS_AND_ATTACHMENTS.md`
- lean collection and series relationship rules should follow `PRD_COLLECTION_AND_SERIES_MODEL.md`
- core asset declarations are packaged-first; linked supplemental references belong under `attachments`, not `assets`

Public/protected declaration guidance:

- `identity` may hold supplemental durable references such as `revisionId`, `parentId`, `originId`, `authorRefs`, `publisherRef`, reserved `ownerRef`, and the lean collection/series relationship refs defined in `PRD_COLLECTION_AND_SERIES_MODEL.md`
- `public` may hold lean reader-facing metadata such as `subtitle`, `summary`, `byline`, `contributors`, `publisher`, `series`, `collections`, `genres`, `subgenres`, `tags`, `contentWarnings`, `contentRating`, `status`, or `cover`
- `contributors`, when present, should be a small array of objects with `name` and `role`; `displayName` may be used when needed for presentation
- `cover`, when present, should be a non-empty lightweight asset reference rather than embedded binary data
- locale/language declarations belong under `localization`, not as a loose top-level metadata field
- rich author/about pages, acknowledgements, or series notes belong in content, attachments, or later profile-specific payloads rather than the base manifest
- `protected` should declare the existence and location of protected/private material, not embed large protected payloads directly in the base manifest
- friendly profile labels and descriptions belong to registries and product UI, not the manifest
- bundled attachment `href` values should resolve under `attachments/`; linked attachments may use `http` or `https` URLs for supplemental material
- current schema/validator truth still allows `extensions` as either an array of declarations or an object placeholder surface; this slice documents that reality rather than changing the executable model

---

## 5.1 Field-Level Conformance Coverage

| Field group | Schema surface | Validator issue-code family / current truth | Positive example / fixture | Negative fixture / test |
| --- | --- | --- | --- | --- |
| Required opening fields | top-level `prdVersion`, `manifestVersion`, `id`, `profile`, `title`, `entry` | `*-required` families for each required field | `examples/document-basic` and `validManifest` fixture coverage | required-field tests in `packages/prd-validator/src/index.test.ts` |
| `identity` | `#/$defs/identity` | `identity-shape`, `identity-*`, `identity-series-*`, `identity-collection-*` | valid identity/series metadata tests | malformed identity tests in `packages/prd-validator/src/index.test.ts` |
| `public` | `#/$defs/publicMetadata` | `public-shape`, `public-cover`, `public-contributor-*`, `public-series-*`, `public-collections-*` | valid public metadata tests and `examples/document-basic` cover metadata | malformed public metadata tests in `packages/prd-validator/src/index.test.ts` |
| `localization` | `#/$defs/localization` | `localization-shape`, `localization-default-locale`, `localization-available-locales`, `localization-default-missing`, `localization-text-direction` | `examples/document-basic` localized overlay path and localized package tests | malformed localization-block tests in `packages/prd-validator/src/index.test.ts` |
| `compatibility` | `#/$defs/compatibility` | `compatibility-shape`, `compatibility-min-viewer`, `compatibility-capabilities-*` | canonical example manifests using optional capability declarations | malformed compatibility-block tests in `packages/prd-validator/src/index.test.ts` |
| `assets` | `assets[]` with `assetDeclaration` | `assets-shape`, `asset-id-*`, `asset-href-*`, `asset-file-missing`; profile/media-specific image checks when referenced | canonical examples and valid asset manifest fixtures | malformed asset tests in `packages/prd-validator/src/index.test.ts` |
| `attachments` | `attachments[]` with `attachmentDeclaration` | `attachments-shape`, `attachment-id-*`, `attachment-href-*`, `attachment-file-missing` | valid bundled/linked attachment tests and `examples/document-basic` | malformed attachment tests in `packages/prd-validator/src/index.test.ts` |
| `extensions` | `extensions` oneOf array or object | current schema/validator truth accepts array or object; declaration arrays additionally use `extension-id-required` and item-shape checks | positive object-shaped `extensions` coverage in `packages/prd-validator/src/index.test.ts` | malformed `extensions` block tests in `packages/prd-validator/src/index.test.ts` |
| `protected` | `#/$defs/protectedDeclaration` | `protected-shape` plus current shape-only truth for `present` and `ref` | positive protected declaration coverage in `packages/prd-validator/src/index.test.ts` | malformed `protected` block tests in `packages/prd-validator/src/index.test.ts` |

This table is descriptive, not a second schema. If implementation and this table diverge, schema and validator truth win until the docs are updated in the same slice.

---

## 6. Extension Mechanism

The base manifest should expose extensions through a small declaration surface.

Current draft shape:

- `extensions` is an array of extension declarations
- each declaration must identify the extension
- each declaration may declare version and whether the extension is required
- each declaration may point to a separate extension-specific payload or manifest fragment

Recommended declaration shape:

```json
{
  "id": "protected-content",
  "version": "1.0",
  "required": false,
  "ref": "protected/manifest.json"
}
```

Extension mechanism rules:

- extension declarations must stay small and declarative
- extension declarations must not embed heavy rights, payment, analytics, or service logic in the base manifest
- unsupported optional extensions should degrade gracefully when possible
- required extensions must be declared explicitly rather than inferred from other fields
- future extension namespaces should be registry-based, not ad hoc field sprawl

Current reference runtime alignment: array declarations with boolean `required: true` are checked before content is read. Viewer-core currently implements no required extension contracts and reports these as `unsupported-required-capability`, preserving public manifest facts. False/omitted requirements remain optional; accepted object-form placeholder metadata remains opaque for compatibility. This runtime check changes neither structural validity nor extension field shapes. See [capability negotiation](../runtime/PRD_CAPABILITY_MODEL.md) for the exact boundary and optional-signature distinction.

Versioning surfaces across the manifest draft are therefore:

- `prdVersion` for the base format/spec
- `manifestVersion` for the manifest schema
- `profileVersion` when profile-specific versioning is needed
- per-extension `version` inside each extension declaration

Reference opening compatibility is now explicit under PRD-046: format/manifest and optional canonical-profile contract declarations support `1.0` / `1.0.0`; numeric `minViewer` requirements are compared against the runtime descriptor. Otherwise structurally valid unknown/newer/malformed runtime requirements produce an unsupported opening result, rather than silently claiming full support. This does not change manifest shapes or structural validate/inspect output. See [versioning policy](PRD_VERSIONING_POLICY.md) for syntax, content/locale/section checks and legacy behavior.

---

## 7. Examples: Minimal, Normal, Advanced

### 7.1 Minimal

```json
{
  "prdVersion": "1.0",
  "manifestVersion": "1.0",
  "id": "urn:uuid:11111111-1111-1111-1111-111111111111",
  "profile": "general-document",
  "title": "Hello PRD",
  "entry": "content/root.json"
}
```

### 7.2 Normal

```json
{
  "prdVersion": "1.0",
  "manifestVersion": "1.0",
  "id": "urn:uuid:22222222-2222-2222-2222-222222222222",
  "profile": "general-document",
  "profileVersion": "1.0",
  "title": "Field Guide",
  "entry": "content/root.json",
  "identity": {
    "revisionId": "rev-3",
    "authorRefs": ["author:kira-stone"],
    "publisherRef": "publisher:eonhive-press",
    "series": {
      "ref": "urn:prd-series:example:field-guide",
      "sequence": {
        "volume": 1,
        "chapter": 3
      }
    }
  },
  "localization": {
    "defaultLocale": "en",
    "availableLocales": ["en"],
    "textDirection": "ltr"
  },
  "public": {
    "subtitle": "Arc One",
    "summary": "A serialized fantasy web novel.",
    "byline": "Kira Stone",
    "series": {
      "title": "Field Guide"
    },
    "contributors": [
      {
        "name": "Kira Stone",
        "role": "author"
      },
      {
        "name": "Min Seo",
        "role": "illustrator"
      }
    ],
    "publisher": "EonHive Press",
    "genres": ["fantasy", "romance"],
    "subgenres": ["progression-fantasy", "academy"],
    "tags": ["academy", "slow-burn"],
    "contentWarnings": ["violence"],
    "contentRating": "teen",
    "status": "ongoing",
    "cover": "assets/cover.webp"
  },
  "compatibility": {
    "minViewer": "1.0"
  },
  "assets": [
    {
      "id": "cover",
      "href": "assets/cover.webp"
    }
  ],
  "attachments": [
    {
      "href": "attachments/checklist.pdf"
    }
  ]
}
```

### 7.3 Advanced

```json
{
  "prdVersion": "1.0",
  "manifestVersion": "1.0",
  "id": "urn:uuid:33333333-3333-3333-3333-333333333333",
  "profile": "comic",
  "profileVersion": "1.0",
  "title": "Issue 01",
  "entry": "content/issue-root.json",
  "compatibility": {
    "minViewer": "1.0",
    "capabilities": {
      "required": [],
      "optional": ["panel-navigation", "audio-playback"]
    }
  },
  "public": {
    "summary": "Opening issue of a serialized comic.",
    "byline": "Studio Team",
    "series": {
      "title": "Sequential Dawn"
    },
    "contentRating": "teen",
    "cover": "assets/cover.webp"
  },
  "identity": {
    "series": {
      "ref": "urn:prd-series:example:sequential-dawn",
      "sequence": {
        "volume": 1,
        "issue": 1
      }
    }
  },
  "assets": [
    {
      "id": "cover",
      "href": "assets/cover.webp"
    }
  ],
  "extensions": [
    {
      "id": "protected-content",
      "version": "1.0",
      "required": false,
      "ref": "protected/manifest.json"
    },
    {
      "id": "rights-metadata",
      "version": "1.0",
      "required": false,
      "ref": "metadata/rights.json"
    }
  ],
  "protected": {
    "present": true,
    "ref": "protected/manifest.json"
  }
}
```

The advanced example is still declarative. It declares optional extension surfaces, but it does not inline heavy payment, rights, analytics, or protected payload logic into the base manifest.

For the current executable foundation, this comic example also reflects the canonical visual-profile direction:

- structured `comic` and `storyboard` packages should use a JSON `entry` under `content/`
- optional behaviors like `panel-navigation` remain optional
- legacy HTML visual-profile entries may still exist for fallback packages, but they are no longer the canonical example path
