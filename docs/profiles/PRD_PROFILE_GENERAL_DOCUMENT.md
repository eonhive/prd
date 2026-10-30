# PRD_PROFILE_GENERAL_DOCUMENT.md
_Last updated: October 28, 2026_
_Status: General-document profile draft v0.1_

## 1. Purpose

This document defines the current `general-document` PRD profile.

Its job is to make the first executable profile concrete enough for:

- authoring
- validation
- viewer behavior
- fallback expectations
- future profile comparison

This is a profile spec. It works with the PRD core manifest and package contract. It does not redefine the manifest baseline, extension model, or product UX.

---

## 2. Scope

This draft defines:

- what `general-document` means in current PRD canon
- what document kinds belong inside this family today
- the current structured root shape
- the currently supported content node set
- baseline rendering expectations
- validator and fallback implications

This draft is intentionally narrow and aligned to the current executable reference stack.

---

## 3. Non-goals

This draft does not define:

- every future rich-text structure
- footnotes, embeds, comments, or annotations
- a print-layout model
- full long-work segmentation rules beyond the current packaged section baseline
- a standardized variant field
- authoring UI behavior for Studio

Those remain later profile or core follow-on work.

---

## 4. Profile Identity

`general-document` is a canonical core PRD profile.

Its role is the broad structured reading family for documents whose baseline experience is section and block-oriented reading rather than panel navigation or shot-board review.

The `general-document` family currently includes document kinds such as:

- article
- report
- essay
- manual
- white paper
- portfolio
- resume
- novel
- web novel

These remain variants or sub-kinds within the `general-document` family unless later canon promotes a narrower profile.

Responsiveness is a PRD-wide architectural rule. It is not owned by the `general-document` profile.

---

## 5. Current Executable Entry Model

For the current reference foundation, a `general-document` package uses:

- manifest `profile: "general-document"`
- a structured JSON entry under `content/`
- the current reference path `content/root.json`

The validator currently treats HTML-first `general-document` entries as invalid for the canonical path.

HTML-backed opens may still exist as legacy or migration fallback behavior in a viewer, but they are not the canonical fully-supported profile path.

---

## 6. Structured Root Shape

The current `general-document` content root uses this baseline shape:

```json
{
  "schemaVersion": "1.0",
  "profile": "general-document",
  "type": "document",
  "id": "example-doc",
  "title": "Example Title",
  "subtitle": "Optional subtitle",
  "summary": "Optional summary",
  "lang": "en-US",
  "children": []
}
```

Current required root fields are:

- `schemaVersion`
- `profile`
- `type`
- `id`
- `title`
- `children`

Current optional root fields are:

- `subtitle`
- `summary`
- `lang`

Rules:

- `profile` must be `general-document`
- `type` must be `document`
- `children` must contain at least one supported content node

---

## 7. Current Node Set

The current executable `general-document` node set is intentionally small:

- `section`
- `heading`
- `paragraph`
- `list`
- `links`
- `table`
- `chart`
- `media`
- `image`
- `quote`

### 7.1 `section`

Used for grouped document structure with:

- `id`
- `title`
- nested `children`, or
- top-level `src` for packaged section files under `content/sections/`

Rules:

- inline sections keep `children`
- segmented sections use `src`
- `src` and `children` are mutually exclusive
- segmented sections are top-level only in v0.1

### 7.2 `heading`

Used for standalone headings with:

- optional stable `id`
- `level`
- `text`

### 7.3 `paragraph`

Used for prose blocks with:

- optional stable `id`
- `text`

### 7.4 `list`

Used for ordered or unordered string lists with:

- optional stable `id`
- `style`
- `items`

### 7.5 `links`

Used for external URLs and same-document fragment links with:

- optional stable `id`
- `style`
- `items`

### 7.6 `table`

Used for simple semantic reading tables with:

- optional stable `id`
- optional `caption`
- `columns`
- `rows`

### 7.7 `chart`

Used for simple structured bar charts with:

- optional stable `id`
- `chartType`
- optional `title`
- optional `caption`
- `categories`
- `series`

### 7.8 `media`

Used for packaged audio or video blocks with:

- optional stable `id`
- `mediaType`
- `asset`
- optional `poster` for video
- optional `caption`

### 7.9 `image`

Used for declared asset references with:

- optional stable `id`
- `asset`
- `alt`
- optional `caption`

### 7.10 `quote`

Used for quoted text with:

- optional stable `id`
- `text`
- optional `attribution`

This node set is the current executable baseline, not the final limit of the profile.

---

## 8. Rendering Expectations

A conforming viewer for the current `general-document` baseline should prioritize:

- clear section flow
- readable long-form text
- predictable heading hierarchy
- truthful link rendering for allowed external and same-document fragment links
- semantic table rendering with responsive overflow handling
- simple structured chart rendering without flattening the data model into screenshots
- packaged audio/video rendering that degrades gracefully when richer behavior is unavailable
- truthful asset rendering when declared assets are available
- responsive reading across screen sizes
- resolution of packaged top-level section files before normal structured rendering

General-document variants may differ in editorial intent:

- resumes emphasize scanning and structured sections
- novels and web novels emphasize continuous reading
- reports and white papers emphasize section hierarchy and reference clarity

Those differences do not currently justify separate top-level profile identities.
The current reference web viewer may also use optional profile-local hints such
as `profiles/resume.json` with `presentation: "scan"` for a scan-oriented
resume presentation without changing the manifest profile contract.
When localization is present, the preferred current path is a shared
`content/root.json` plus locale-specific override resources keyed by those
stable node ids, rather than one duplicated full root per locale. Those
localized resources may also layer small reader-facing metadata such as
summary and cover selection for locale-aware viewer surfaces, and may switch
declared image-node assets when a locale needs different packaged artwork. When a locale
does need a distinct structured root, the current reference implementation also
allows that locale descriptor to pair an alternate `entry` with a small
localized `resource`. When segmentation is used, the current reference path is
to resolve packaged section files first and then apply localized overrides.

---

## 9. Variant Guidance

The following should normally remain inside `general-document`:

- resume
- article
- report
- portfolio
- manual
- novel
- web novel
- serialized prose publication

Variant-specific authored data may live in normal content, attachments, or profile-local files such as `profiles/resume.json`, but the manifest profile remains `general-document`.
In the current reference implementation, `profiles/resume.json` may act as an
optional viewer hint for resume-flavored presentation. Current example usage is
`presentation: "scan"`, but it is not part of manifest canon and does not
redefine package validity.

---

## 10. Fallback Behavior

When a viewer fully supports the structured root path, it should report `fully-supported`.

When a viewer opens a legacy HTML fallback for a `general-document` package, it should report `safe-mode` rather than pretend that the canonical structured path is being used.

The private reference web host's [HTML fallback policy](../runtime/PRD_HTML_FALLBACK_POLICY.md) restricts HTML to local reading content and selected declared media, removing navigation, authored CSS and active content inside an opaque frame. This presentation policy does not change canonical general-document validation or convert HTML into structured content. Live browser enforcement/accessibility acceptance remains separate from the implementation's unit/build evidence.

If the package is structurally valid but the runtime cannot honor required behavior truthfully, the viewer should report `unsupported-required-capability`.

The viewer should preserve the public readable path when safe fallback is possible.

---

## 11. Validator Implications

For the current executable foundation, a validator should enforce at least:

1. manifest `profile` is `general-document` for this profile
2. `entry` resolves to a structured JSON path under `content/`
3. the content root uses `profile: "general-document"` and `type: "document"`
4. the content root only uses supported node types
5. segmented top-level sections only use `src` paths under `content/sections/`
6. referenced section files exist and use `type: "document-section"`
7. referenced section file `id` and `title` match the parent section node
8. `links` use only the current allowed href forms
9. `table` columns and rows stay structurally coherent
10. `chart` categories and numeric series stay structurally coherent
11. `media` references declared packaged assets and only uses optional video posters where valid
12. referenced image assets are declared in the manifest asset list

Validators may also warn when:

- legacy HTML capability declarations are used for `general-document`
- legacy alias forms are used during migration
- a package blurs variant naming into top-level profile identity

### 11.1 Content schema and semantic validation

The repository's `schemas/content.schema.json` is the JSON Schema 2020-12 structural contract for this profile. Its `$id` remains `https://prd.eonhive.dev/schemas/content.schema.json`. The default target validates a `document` root. Packaged section files use the same schema's `#/$defs/documentSectionRoot` fragment, which validates `type: "document-section"`.

The schema covers the ten supported node types, optional IDs on non-section nodes, inline section recursion and top-level `section.src` references under `content/sections/*.json`. Sections require an ID/title and exactly one representation: non-empty inline children or a packaged source reference. A referenced section root cannot contain another segmented reference. Supplying `children` alongside `src` is invalid even if `children` is null or another non-array value; the executable validator now enforces the same presence rule using the existing `section-segmentation-mutually-exclusive` issue.

Known text/ID fields require a non-whitespace character. Tables may have an empty rows array, sparse rows and empty cell strings; the schema does not invent mandatory cells. Bar-chart values are nonnegative numbers. Link forms remain `http`, `https`, `mailto`, `tel` and same-document fragments. Media posters are allowed only on video. Unknown properties are retained for compatibility with the semantic validator's existing behavior; an unknown node `type` is still invalid. Extra metadata does not execute code or declare a new extension contract.

Schema validation does not establish package validity. Call `validatePackageFiles` (or the Node/CLI validator) to check declared assets and file existence, duplicate IDs, table column relationships, chart category/series lengths, section ID/title matching and localization relationships. The schema intentionally uses standard JSON Schema rather than custom keywords or a second resource resolver. Tests cover both agreement on canonical shapes and cases where a schema-valid shape must fail these semantic checks.

The executable validator remains the structural package authority and does not load AJV or the repository schema during opening. The schema's general-document scope does not replace comic/storyboard validation. `schemaVersion` continues to be a non-empty declared string structurally. The reference viewer now separately accepts the `1.0` / `1.0.0` contract under PRD-046, checks minimum-viewer requirements and verifies versions in referenced sections/localized alternates before exposing a render payload. Unknown versions are unsupported opening; no migration is implied. See [versioning policy](../core/PRD_VERSIONING_POLICY.md).

---

## 12. Invalid Cases

Examples of invalid current `general-document` packages include:

- `profile: "general-document"` with `entry: "content/index.html"` as the intended canonical path
- a content root whose `profile` is not `general-document`
- a content root whose `type` is not `document`
- a segmented section whose `src` points outside `content/sections/`
- a nested segmented section reference
- unsupported content node types in `children`
- image nodes that reference undeclared assets

---

## 13. Example

Minimal illustrative example:

```json
{
  "prdVersion": "1.0",
  "manifestVersion": "1.0",
  "id": "urn:prd:example:document-basic",
  "profile": "general-document",
  "title": "PRD Document Example",
  "entry": "content/root.json"
}
```

Paired with a structured root such as:

```json
{
  "schemaVersion": "1.0",
  "profile": "general-document",
  "type": "document",
  "id": "document-basic",
  "title": "PRD Document Example",
  "children": [
    {
      "type": "paragraph",
      "text": "Portable Responsive Documents start with a manifest-first contract."
    }
  ]
}
```

---

## 14. Open Questions

- Which additional structural nodes should enter the next `general-document` milestone first?
- Should later drafts standardize a variant field for things like resume or web novel presentation?
- Which accessibility-oriented structures belong in the base profile rather than an extension lane?
