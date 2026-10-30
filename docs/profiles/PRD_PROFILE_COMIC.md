# PRD_PROFILE_COMIC.md
_Last updated: October 28, 2026_
_Status: Comic profile draft v0.1_

## 1. Purpose

This document defines the current executable baseline for the `comic` PRD profile.

Its job is to make the first comic-aware runtime path concrete enough for:

- authoring
- validation
- viewer behavior
- fallback expectations
- later comparison against richer comic behavior

This draft works with the PRD core manifest and package contract. It does not redefine the base manifest model, extension rules, or future high-fidelity comic rendering.

---

## 2. Scope

This draft defines:

- what `comic` means in current PRD canon
- the current minimal structured entry model
- the legacy HTML fallback path
- current validator expectations
- current reference viewer behavior

This draft is intentionally narrow and aligned to the current reference implementation.

---

## 3. Non-goals

This draft does not define:

- panel geometry
- spread/page composition
- guided transitions
- speech bubble structure
- hotspot interactivity
- advanced reading modes

Those remain later profile work.

---

## 4. Profile Identity

`comic` is a canonical core PRD profile.

Its role is the panel-oriented reading family for works whose baseline experience is not just section-and-block document flow.

Current family examples include:

- digital comics
- webcomics
- manhua-style works
- manhwa-style works

Responsiveness remains a PRD-wide rule rather than a comic-only concern.

---

## 5. Current Executable Entry Model

For the current reference foundation, a `comic` package uses:

- manifest `profile: "comic"`
- one declared public `entry`
- a canonical structured JSON root under `content/`, typically `content/root.json`
- optional legacy fallback HTML entry support for older packages

The declared `entry` remains the only required readable path.

The structured root is now the intended fully-supported baseline.

Legacy HTML entry paths remain readable as fallback behavior, but they are no longer the canonical profile contract.

---

## 6. Structured Comic Root Shape

The current structured comic root uses this baseline shape:

```json
{
  "schemaVersion": "1.0",
  "profile": "comic",
  "type": "comic",
  "id": "comic-basic",
  "title": "Comic Basic",
  "panels": [
    {
      "id": "panel-1",
      "asset": "panel-1-art",
      "alt": "Optional accessible panel description",
      "caption": "Optional panel caption"
    }
  ]
}
```

Current rules:

- the root must be one JSON object
- `schemaVersion` must be a non-empty string
- `profile` must be `"comic"`
- `type` must be `"comic"`
- `id` must be a non-empty string
- `title` must be a non-empty string
- `panels` must be a non-empty array
- each panel must have a non-empty `id`
- each panel must have a non-empty `asset` that resolves to a declared image asset
- each panel must have a non-empty `alt`
- `caption`, when present, must be a non-empty string
- panel ids must be unique within the file

This is the current typed entry contract, not yet a full comic scene/layout model.

### 6.1 Legacy fallback metadata

Older HTML-first comic packages may still carry:

```json
{
  "profile": "comic",
  "panels": [
    {
      "id": "panel-1",
      "asset": "panel-1-art",
      "alt": "Optional accessible panel description",
      "caption": "Optional panel caption"
    }
  ]
}
```

at `profiles/comic/panels.json`.

That legacy file is fallback metadata only. It no longer defines the canonical open path for the profile.

---

## 7. Current Viewer Expectations

The current reference viewer behaves like this:

- when the declared `entry` is a structured comic JSON root, the package opens as `fully-supported`
- the current reference viewer renders that structured root as a static vertical strip of image-backed panel cards by default
- when the manifest declares optional `panel-navigation`, the current reference viewer can also expose a one-panel-at-a-time reading surface with previous/next and direct panel jumps
- when the declared `entry` is legacy HTML, the package opens as `safe-mode`
- HTML fallback remains readable, but it is not treated as the intended fully-supported comic path
- the current viewer still does not implement high-fidelity comic layout, geometry, or guided reading behavior

This keeps runtime claims truthful while giving `comic` a real canonical typed entry contract.

---

## 8. Validator Implications

Structural validity and reference runtime version support are separate. Under PRD-046, supported format/manifest/canonical-profile/content contracts are `1.0` / `1.0.0`, and minimum-viewer requirements must be met. A future comic root or localized alternate returns the existing unsupported state without a render payload. Existing HTML safe-mode behavior remains available when base requirements pass. See [versioning policy](../core/PRD_VERSIONING_POLICY.md); validation string checks and profile shapes are unchanged.

For the current executable baseline:

1. manifest validation remains unchanged
2. structured comic entries should resolve to `content/*.json`
3. a structured comic root must match the current typed root shape
4. each panel asset must resolve through the manifest asset list to an image-compatible packaged asset
5. each panel must carry its own accessible `alt` text
6. legacy HTML comic entries remain valid, but they should warn that the HTML-first path is legacy
7. `profiles/comic/panels.json`, when present for a legacy HTML fallback package, must match the current legacy panel metadata shape
8. malformed structured or legacy comic profile data is an error

This keeps the package model disciplined:

- `entry` stays canonical
- structured roots stay primary
- legacy profile-local files stay fallback-only
- viewers do not silently invent alternate primary paths

---

## 9. Open Questions

- When should panel geometry become part of the profile rather than an extension lane?
- Should future comic drafts support page/spread grouping in core profile data?
- Should guided panel navigation stay optional capability behavior or later become part of the baseline comic profile?
