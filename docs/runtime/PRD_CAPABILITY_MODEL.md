# PRD_CAPABILITY_MODEL.md
_Last updated: October 29, 2026_
_Status: Canonical runtime capability draft v0.2_

## 1. Capability Philosophy

PRD capability handling should stay:

- declarative
- testable
- graceful under partial support
- safe by default
- separate from the base package contract

Documents may declare capability requirements. Viewers and renderers may declare capability support. Neither side should turn optional advanced behavior into hidden core requirements.

## 1.1 Executable Alignment

The current executable runtime surfaces are:

- `packages/prd-types/src/index.ts`
  - `PrdViewerSupportState`
  - `PrdReferenceLoadMode`
  - `PrdRuntimeCapabilityDescriptor`
- `packages/prd-viewer-core/src/index.ts`
  - `PRD_REFERENCE_VIEWER_SUPPORTED_CAPABILITIES`
  - `PRD_REFERENCE_VIEWER_SUPPORT_STATES`
  - `PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR`

Rules:

- the support-state vocabulary is shared runtime canon, not a claim that every viewer emits every label today
- the current reference viewer emits only the states listed in `PRD_REFERENCE_VIEWER_SUPPORT_STATES`
- profile support and capability support are separate surfaces
- `comic` and `storyboard` support remain profile/runtime conformance truths rather than new required manifest capability identifiers

**Assumptions**

- this draft places document-side capability requirements under the manifest `compatibility` surface instead of creating a second heavy top-level manifest control plane
- the support-state labels in this draft align with `runtime/PRD_CONFORMANCE.md`, while the current reference viewer still emits only a documented subset
- localization capability names and manifest field names may be refined later by `core/PRD_LOCALIZATION_MODEL.md`

---

## 2. Capability Taxonomy

Capabilities should be grouped by function, not by product branding.

Current taxonomy:

| Capability class | Meaning |
| --- | --- |
| Base package capabilities | public-header read, manifest parse, entry resolution, packaged asset access |
| Profile capabilities | general document, comic, storyboard, or later profile-specific behaviors |
| Media capabilities | images, audio, ambient audio, narration audio, video, fonts, and other declared packaged resources |
| Localization capabilities | locale selection, text direction handling, localized metadata or asset selection, and regional formatting behavior |
| Interaction capabilities | scripting, dynamic layout behavior, text-to-speech, or other optional runtime features |
| Protected/private capabilities | protected payload access, signature checks, or optional entitlement checks |
| Fallback capabilities | safe mode, snapshot rendering, static fallback opening |
| Extension capabilities | named optional extensions declared in the manifest |

Capability taxonomy rule:

- capability names must describe supportable behaviors
- capability names must not smuggle business policy into the base model
- responsiveness is a PRD-wide architectural principle, not a profile identity by itself
- localization is a cross-profile capability, not a special feature of one profile family

---

## 3. Declaration Model

### 3.1 Document-side declaration

Documents declare capability requirements in the manifest `compatibility` object.

Current draft shape:

```json
{
  "compatibility": {
    "minViewer": "1.0",
    "capabilities": {
      "required": ["general-document-structured-root"],
      "optional": ["panel-navigation", "static-snapshot"]
    }
  }
}
```

Rules:

- `required` capabilities are needed for the intended experience
- `optional` capabilities improve the experience but are not required for base opening
- document capability declarations must stay declarative and small
- a document must not list every implementation detail as a capability
- `general-document-structured-root` is the base structured-entry capability for the first executable `general-document` foundation
- structured `comic` and `storyboard` entry support is currently tracked through profile/runtime conformance rather than new required capability identifiers
- `base-entry-html` remains relevant only for legacy HTML fallback paths; it is not the canonical base document capability for any core profile
- when the current reference viewer opens an HTML fallback path, it should report that path as restricted `safe-mode` behavior rather than the canonical fully-supported structured path

The private web host now applies PRD-051's [HTML fallback policy](PRD_HTML_FALLBACK_POLICY.md) to every HTML preparation path: local reading markup/media only, no authored navigation/CSS/active content, default-deny CSP and an opaque frame. The defensive alternate branch shares this compiler without changing the existing JSON-only localized-entry validation rule. No capability ID/public descriptor field or extra privilege for signed packages is added. Browser request/navigation acceptance is tracked separately from generated-markup tests.
- `audio-playback`, `ambient-audio`, `narration-audio`, and `text-to-speech` are examples of optional capabilities that may improve the experience without changing minimal validity
- AI reader personalities, summarizers, or other assistant behaviors remain viewer/runtime product logic unless a later higher-priority PRD spec defines a narrower interoperable declaration

### 3.2 Viewer/renderer-side declaration

Viewers and renderers may declare support using their own capability descriptor or conformance metadata.

Current executable shape:

```json
{
  "viewerId": "reference-viewer",
  "viewerVersion": "0.1.0",
  "supportedProfiles": ["general-document", "comic", "storyboard"],
  "supported": ["general-document-structured-root", "base-entry-html"],
  "supportStates": [
    "fully-supported",
    "safe-mode",
    "unsupported-required-capability"
  ],
  "safeMode": true,
  "referenceLoadMode": "eager-whole-package"
}
```

Rules:

- support claims must be testable
- unsupported capabilities should be explicit rather than guessed
- renderer declarations may be narrower than full viewer declarations
- `supportedProfiles` expresses profile/runtime support without inventing new manifest capability identifiers
- `supportStates` should list the concrete runtime labels the implementation currently emits

---

## 4. Negotiation Rules

Capability negotiation should happen in this order:

1. Open the package and read the public manifest.
2. Resolve base package validity first.
3. Read `compatibility` and declared extensions.
4. Compare declared versions/minimum viewer, document `required` capabilities and explicit required extension declarations against implemented runtime support.
5. If all required behavior is supported, open normally.
6. If required behavior is unsupported, use a truthful declared fallback when its contract is implemented, or report the unsupported state without opening content.
7. Ignore unsupported optional capabilities/extensions if base readability can still be preserved.

Rules:

- invalid packages do not enter capability negotiation; they fail validation first
- optional capabilities must not block the base open path
- unsupported required extensions must not be silently ignored
- negotiation must prefer safety and truthful reporting over speculative rendering

Current executable required-capability handling (October 27, 2026):

- `openPrdDocument` compares `compatibility.capabilities.required` with `PRD_REFERENCE_VIEWER_SUPPORTED_CAPABILITIES` after profile normalization and before reading the content entry.
- The legacy `compatibility.capabilities: string[]` form is also interpreted as required capabilities.
- Unsupported requirements return `unsupported-required-capability`, normalized manifest/profile/entry facts and a message naming missing capabilities. No structured or HTML render payload is read or returned, and no undeclared fallback is invented.
- The web app stops content/resource preparation for this state, including localized alternate entries, while retaining validation and package facts.
- Supported requirements and unknown optional capabilities preserve existing opening behavior. Package validity remains the validator's responsibility.
- Version compatibility now follows PRD-046 and the exact [reference opening policy](../core/PRD_VERSIONING_POLICY.md#42-reference-viewer-opening-baseline). General static-fallback declarations and migration remain separate follow-up work.

Current executable required-extension handling (October 27, 2026):

- Only array-form `extensions` declarations with the explicit boolean `required: true` declare required behavior. False or omitted requirements remain optional. The accepted object-form placeholder stays opaque metadata; field names inside it are not reinterpreted as declarations.
- Viewer-core currently implements no required extension contracts. Every explicit required extension therefore returns the existing `unsupported-required-capability` state before entry, extension payload, asset or locale reads. The message names its extension ID; combined capability/extension failures report both categories. No new support-state label or public descriptor field is introduced.
- Normalized manifest/profile/entry/localization facts remain available. The web app's existing unsupported-state guard also stops localized alternate entries and resource URL preparation. No fallback is inferred from an ordinary root, HTML entry or optional capability.
- This is an interpretation boundary after structural validation, not a partial-loading claim: archive bytes are still loaded eagerly and the validator still inspects content before runtime opening.
- Optional unknown IDs/versions preserve base opening and existing legacy HTML safe-mode behavior. Structural validation and CLI validation/inspection remain unchanged.
- Capability identifiers and extension identifiers are separate namespaces. Supporting a capability with the same name does not establish extension support. The host's optional `eonhive.signature` verification does not make it a viewer-core required-extension handler; signature-v1 itself requires `required: false`.
- No required-extension version is accepted merely because its ID is familiar. A later handler needs a specified version/payload contract and positive/negative conformance evidence before this unsupported baseline can change. Version migration, fallback contracts and a general extension registry are outside this implementation.

Current version checks (October 28, 2026) retain structural validity as a separate result. Unsupported format/manifest/canonical-profile versions or minimum-viewer requirements stop before entry reads. Unsupported structured root, referenced section or localized alternate versions stop before a render payload is returned. They reuse `unsupported-required-capability` and the web host's existing no-locale/resource-preparation guard. The runtime checks only declared presentation files; it does not infer new version fields for unversioned controls or unrelated JSON. Numeric two-part legacy minimums such as `0.1` remain supported.

### 4.1 Safe mode

Safe mode is the restricted opening path used when normal behavior is unsafe or unsupported.

In safe mode, the viewer should:

- prefer public/header metadata and static content paths
- avoid executing unsupported or risky runtime features
- avoid assuming network access
- avoid opening protected/private payloads unless explicitly supported

### 4.2 Static fallback

Static fallback is the use of a declared snapshot or other static representation when the intended dynamic or profile-specific path is unavailable.

Static fallback should:

- be optional
- be explicitly declared or conventionally discoverable through the package layout
- not replace the base package contract

### 4.3 Unsupported extensions

Unsupported extension behavior should be:

- ignore and report, if the extension is optional and base readability survives
- block full experience and drop to safe mode or static fallback, if the extension is required
- fail clearly, if neither safe mode nor fallback can preserve a truthful read path

---

## 5. Support-State Labels

The current support-state labels are:

| Label | Meaning |
| --- | --- |
| `fully-supported` | all required capabilities are supported and the intended path is used |
| `partially-supported` | base content opens, but some optional or non-blocking capability is unavailable |
| `safe-mode` | document opens under a restricted execution model |
| `static-fallback` | a snapshot or other static fallback path is used instead of the intended live or rich path |
| `protected-unavailable` | protected/private material is not available, but the public/base path remains readable |
| `unsupported-extension-ignored` | an optional unsupported extension was ignored without breaking the base path |
| `unsupported-required-capability` | the intended experience cannot be honored because a required capability, extension or version requirement is unsupported |

These labels describe runtime state. They do not change whether the package is structurally valid.

Current reference viewer subset:

- `fully-supported`
- `safe-mode`
- `unsupported-required-capability`

The other labels remain part of the shared runtime vocabulary for future viewers or later reference-viewer milestones, but they are not claimed by `PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR` today.

---

## 6. Sample Scenarios

### 6.1 Minimal document on a basic viewer

Document:

```json
{
  "compatibility": {
    "capabilities": {
      "required": ["general-document-structured-root"],
      "optional": []
    }
  }
}
```

Viewer:

```json
{
  "supportedProfiles": ["general-document", "comic", "storyboard"],
  "supported": ["general-document-structured-root"],
  "supportStates": ["fully-supported", "safe-mode", "unsupported-required-capability"],
  "safeMode": true,
  "referenceLoadMode": "eager-whole-package"
}
```

Result: `fully-supported`

### 6.2 Comic document on a viewer without panel navigation

Document:

```json
{
  "compatibility": {
    "capabilities": {
      "required": [],
      "optional": ["panel-navigation"]
    }
  }
}
```

Viewer:

```json
{
  "supportedProfiles": ["general-document", "comic", "storyboard"],
  "supported": [],
  "supportStates": ["fully-supported", "safe-mode", "unsupported-required-capability"],
  "safeMode": true,
  "referenceLoadMode": "eager-whole-package"
}
```

Result: `partially-supported`

Assumption:

- the viewer already supports the base structured `comic` opening path through profile/runtime conformance
- `panel-navigation` is optional enhancement behavior rather than a base opening requirement

### 6.3 Protected document on a viewer without protected-content support

Document:

```json
{
  "compatibility": {
    "capabilities": {
      "required": ["general-document-structured-root"],
      "optional": ["protected-content", "static-snapshot"]
    }
  }
}
```

Viewer:

```json
{
  "supportedProfiles": ["general-document", "comic", "storyboard"],
  "supported": ["general-document-structured-root", "static-snapshot"],
  "supportStates": ["fully-supported", "safe-mode", "unsupported-required-capability"],
  "safeMode": true,
  "referenceLoadMode": "eager-whole-package"
}
```

Result: `protected-unavailable` or `static-fallback`, depending on whether the document exposes enough public content without the protected path.

### 6.4 Required extension unsupported

Document:

```json
{
  "compatibility": {
    "capabilities": {
      "required": ["general-document-structured-root"],
      "optional": ["static-snapshot"]
    }
  },
  "extensions": [
    { "id": "custom-renderer-x", "version": "1.0", "required": true }
  ]
}
```

Viewer:

```json
{
  "supportedProfiles": ["general-document", "comic", "storyboard"],
  "supported": ["general-document-structured-root", "static-snapshot"],
  "supportStates": ["fully-supported", "safe-mode", "unsupported-required-capability"],
  "safeMode": true,
  "referenceLoadMode": "eager-whole-package"
}
```

Result:

- `unsupported-required-capability` in the current reference viewer, with no content read
- a later runtime may use `static-fallback` only when an explicit fallback contract is implemented; the optional `static-snapshot` capability alone does not define one

### 6.5 Web novel package with optional narration and TTS

Document:

```json
{
  "compatibility": {
    "capabilities": {
      "required": ["general-document-structured-root"],
      "optional": ["narration-audio", "text-to-speech"]
    }
  }
}
```

Viewer:

```json
{
  "supportedProfiles": ["general-document", "comic", "storyboard"],
  "supported": ["general-document-structured-root", "text-to-speech"],
  "supportStates": ["fully-supported", "safe-mode", "unsupported-required-capability"],
  "safeMode": true,
  "referenceLoadMode": "eager-whole-package"
}
```

Result: `partially-supported`

The document still opens normally. Recorded narration is unavailable, but the base reading path survives and read-aloud may still work through viewer-side TTS.
