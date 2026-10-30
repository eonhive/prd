# PRD_PROFILE_STORYBOARD.md
_Last updated: October 28, 2026_
_Status: Storyboard profile draft v0.1_

## 1. Purpose

This document defines the current executable baseline for the `storyboard` PRD profile.

Its job is to make the first storyboard-aware runtime path concrete enough for:

- authoring
- validation
- viewer behavior
- fallback expectations
- later comparison against richer storyboard review behavior

This draft works with the PRD core manifest and package contract. It does not redefine the base manifest model, extension rules, or future high-fidelity storyboard rendering.

---

## 2. Scope

This draft defines:

- what `storyboard` means in current PRD canon
- the current minimal structured entry model
- the legacy HTML fallback path
- current validator expectations
- current reference viewer behavior

This draft is intentionally narrow and aligned to the current reference implementation.

---

## 3. Non-goals

This draft does not define:

- timing tracks
- camera metadata
- scene hierarchy
- side-by-side review layouts
- animatic playback
- production annotations beyond simple notes

Those remain later profile work.

---

## 4. Profile Identity

`storyboard` is a canonical core PRD profile.

Its role is the shot-and-board planning family for works whose baseline experience is production review rather than normal document flow or comic panel reading.

Current family examples include:

- film storyboards
- animation boards
- previsualization review boards

Responsiveness remains a PRD-wide rule rather than a storyboard-only concern.

---

## 5. Current Executable Entry Model

For the current reference foundation, a `storyboard` package uses:

- manifest `profile: "storyboard"`
- one declared public `entry`
- a canonical structured JSON root under `content/`, typically `content/root.json`
- optional legacy fallback HTML entry support for older packages

The declared `entry` remains the only required readable path.

The structured root is now the intended fully-supported baseline.

Legacy HTML entry paths remain readable as fallback behavior, but they are no longer the canonical profile contract.

---

## 6. Structured Storyboard Root Shape

The current structured storyboard root uses this baseline shape:

```json
{
  "schemaVersion": "1.0",
  "profile": "storyboard",
  "type": "storyboard",
  "id": "storyboard-basic",
  "title": "Storyboard Basic",
  "frames": [
    {
      "id": "frame-1",
      "asset": "frame-1-art",
      "alt": "Optional accessible frame description",
      "notes": "Optional frame notes"
    }
  ]
}
```

Current rules:

- the root must be one JSON object
- `schemaVersion` must be a non-empty string
- `profile` must be `"storyboard"`
- `type` must be `"storyboard"`
- `id` must be a non-empty string
- `title` must be a non-empty string
- `frames` must be a non-empty array
- each frame must have a non-empty `id`
- each frame must have a non-empty `asset` that resolves to a declared image asset
- each frame must have a non-empty `alt`
- `notes`, when present, must be a non-empty string
- frame ids must be unique within the file

This is the current typed entry contract, not yet a full storyboard planning/review model.

### 6.1 Legacy fallback metadata

Older HTML-first storyboard packages may still carry:

```json
{
  "profile": "storyboard",
  "frames": [
    {
      "id": "frame-1",
      "asset": "frame-1-art",
      "alt": "Optional accessible frame description",
      "notes": "Optional frame notes"
    }
  ]
}
```

at `profiles/storyboard/frames.json`.

That legacy file is fallback metadata only. It no longer defines the canonical open path for the profile.

---

## 7. Current Viewer Expectations

The current reference viewer behaves like this:

- when the declared `entry` is a structured storyboard JSON root, the package opens as `fully-supported`
- the current reference viewer renders that structured root as image-backed storyboard review content
- when optional `review-grid` is declared, the viewer exposes one active frame with button, keyboard, and direct-grid review controls
- when optional `review-grid` is not declared, the viewer falls back to a static responsive grid of image-backed frame cards
- when the declared `entry` is legacy HTML, the package opens as `safe-mode`
- HTML fallback remains readable, but it is not treated as the intended fully-supported storyboard path
- the current viewer still does not implement timing, scene grouping, or side-by-side board comparison behavior

This keeps runtime claims truthful while giving `storyboard` a real canonical typed entry contract.

---

## 8. Validator Implications

Structural validity and reference runtime version support are separate. Under PRD-046, supported format/manifest/canonical-profile/content contracts are `1.0` / `1.0.0`, and minimum-viewer requirements must be met. A future storyboard root or localized alternate returns the existing unsupported state without a render payload. Existing HTML safe-mode behavior remains available when base requirements pass. See [versioning policy](../core/PRD_VERSIONING_POLICY.md); validation string checks and profile shapes are unchanged.

For the current executable baseline:

1. manifest validation remains unchanged
2. structured storyboard entries should resolve to `content/*.json`
3. a structured storyboard root must match the current typed root shape
4. each frame asset must resolve through the manifest asset list to an image-compatible packaged asset
5. each frame must carry its own accessible `alt` text
6. legacy HTML storyboard entries remain valid, but they should warn that the HTML-first path is legacy
7. `profiles/storyboard/frames.json`, when present for a legacy HTML fallback package, must match the current legacy frame metadata shape
8. malformed structured or legacy storyboard profile data is an error

This keeps the package model disciplined:

- `entry` stays canonical
- structured roots stay primary
- legacy profile-local files stay fallback-only
- viewers do not silently invent alternate primary paths

---

## 9. Open Questions

- When should timing/scene metadata become part of the profile rather than an extension lane?
- Should future storyboard drafts support grouped scenes or sequences in core profile data?
- Should future storyboard drafts keep `review-grid` as optional capability behavior, or should a focused review surface become part of the baseline profile contract?
