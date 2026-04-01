# PRD_CAPABILITY_MODEL.md
_Last updated: April 1, 2026_  
_Status: Capability model draft v0.1_

## 1. Capability Philosophy

PRD capability handling should stay:

- declarative
- testable
- graceful under partial support
- safe by default
- separate from the base package contract

Documents may declare capability requirements. Viewers and renderers may declare capability support. Neither side should turn optional advanced behavior into hidden core requirements.

**Assumptions**

- this draft places document-side capability requirements under the manifest `compatibility` surface instead of creating a second heavy top-level manifest control plane
- the support-state labels in this draft are the current baseline until `PRD_CONFORMANCE.md` formalizes them
- localization capability names and manifest field names may be refined later by `PRD_LOCALIZATION_MODEL.md`

---

## 2. Capability Taxonomy

Capabilities should be grouped by function, not by product branding.

Current taxonomy:

| Capability class | Meaning |
| --- | --- |
| Base package capabilities | public-header read, manifest parse, entry resolution, packaged asset access |
| Profile capabilities | general document, comic, storyboard, or later profile-specific behaviors |
| Media capabilities | images, audio, video, fonts, and other declared packaged resources |
| Localization capabilities | locale selection, text direction handling, localized metadata or asset selection, and regional formatting behavior |
| Interaction capabilities | scripting, dynamic layout behavior, or other optional runtime features |
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
      "required": ["base-entry-html"],
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

### 3.2 Viewer/renderer-side declaration

Viewers and renderers may declare support using their own capability descriptor or conformance metadata.

Current draft shape:

```json
{
  "viewerId": "reference-viewer",
  "viewerVersion": "1.0",
  "supported": ["base-entry-html", "static-snapshot"],
  "safeMode": true
}
```

Rules:

- support claims must be testable
- unsupported capabilities should be explicit rather than guessed
- renderer declarations may be narrower than full viewer declarations

---

## 4. Negotiation Rules

Capability negotiation should happen in this order:

1. Open the package and read the public manifest.
2. Resolve base package validity first.
3. Read `compatibility` and declared extensions.
4. Compare document `required` capabilities against viewer/renderer supported capabilities.
5. If all required capabilities are supported, open normally.
6. If some required capabilities are unsupported, attempt safe mode or a declared static fallback when available.
7. Ignore unsupported optional capabilities if base readability can still be preserved.

Rules:

- invalid packages do not enter capability negotiation; they fail validation first
- optional capabilities must not block the base open path
- unsupported required extensions must not be silently ignored
- negotiation must prefer safety and truthful reporting over speculative rendering

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
| `unsupported-required-capability` | the intended experience cannot be honored because a required capability is missing |

These labels describe runtime state. They do not change whether the package is structurally valid.

---

## 6. Sample Scenarios

### 6.1 Minimal document on a basic viewer

Document:

```json
{
  "compatibility": {
    "capabilities": {
      "required": ["base-entry-html"],
      "optional": []
    }
  }
}
```

Viewer:

```json
{
  "supported": ["base-entry-html"],
  "safeMode": true
}
```

Result: `fully-supported`

### 6.2 Comic document on a viewer without panel navigation

Document:

```json
{
  "compatibility": {
    "capabilities": {
      "required": ["base-entry-html"],
      "optional": ["panel-navigation"]
    }
  }
}
```

Viewer:

```json
{
  "supported": ["base-entry-html"],
  "safeMode": true
}
```

Result: `partially-supported`

### 6.3 Protected document on a viewer without protected-content support

Document:

```json
{
  "compatibility": {
    "capabilities": {
      "required": ["base-entry-html"],
      "optional": ["protected-content", "static-snapshot"]
    }
  }
}
```

Viewer:

```json
{
  "supported": ["base-entry-html", "static-snapshot"],
  "safeMode": true
}
```

Result: `protected-unavailable` or `static-fallback`, depending on whether the document exposes enough public content without the protected path.

### 6.4 Required extension unsupported

Document:

```json
{
  "compatibility": {
    "capabilities": {
      "required": ["base-entry-html", "custom-renderer-x"],
      "optional": ["static-snapshot"]
    }
  }
}
```

Viewer:

```json
{
  "supported": ["base-entry-html", "static-snapshot"],
  "safeMode": true
}
```

Result:

- `static-fallback`, if a truthful static fallback exists
- otherwise `unsupported-required-capability`
