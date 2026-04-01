# PRD_MANIFEST_DRAFT.md
_Last updated: April 1, 2026_  
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
| `public` | object | additional visible public metadata beyond the required top-level fields |
| `localization` | object | lean locale declarations defined by the localization model |
| `compatibility` | object | viewer/renderer compatibility hints or requirements |
| `assets` | object or array | declared package assets or asset groups |
| `attachments` | array | declared bundled or linked attachments |
| `extensions` | array | declared optional extension hooks |
| `protected` | object | declaration of optional protected/private material |

Optional field rules:

- optional fields must remain declarative
- optional fields must not hide or replace the required top-level fields
- optional fields may be ignored by simpler viewers if the base package remains readable
- optional fields must not force payments, rights, analytics, or Cloud logic into every manifest
- localization declarations should stay small and follow `PRD_LOCALIZATION_MODEL.md`

Public/protected declaration guidance:

- `public` may hold extra reader-facing metadata such as language, summary, tags, or author display info
- `protected` should declare the existence and location of protected/private material, not embed large protected payloads directly in the base manifest
- friendly profile labels and descriptions belong to registries and product UI, not the manifest

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

Versioning surfaces across the manifest draft are therefore:

- `prdVersion` for the base format/spec
- `manifestVersion` for the manifest schema
- `profileVersion` when profile-specific versioning is needed
- per-extension `version` inside each extension declaration

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
  "entry": "content/index.html"
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
  "entry": "content/index.html",
  "localization": {
    "defaultLocale": "en-US",
    "availableLocales": ["en-US", "fr-FR"],
    "textDirection": "ltr"
  },
  "public": {
    "summary": "A short guide.",
    "tags": ["guide", "reference"]
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
  "entry": "content/issue.html",
  "compatibility": {
    "minViewer": "1.0",
    "capabilities": ["panel-navigation"]
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
