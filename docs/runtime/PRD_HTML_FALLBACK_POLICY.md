# Reference Viewer HTML fallback policy

_Updated: October 29, 2026_

_Status: Reference presentation policy under PRD-051; live browser acceptance pending_

## Scope

This policy governs HTML entry preparation in the private Web Viewer, including its defensive alternate-entry code path. Current validation requires localized alternate entries to be structured JSON; this policy does not enable HTML alternates. It preserves readable legacy content without treating a package as an arbitrary website. It changes no manifest/profile/container version, structural validity rule, public npm API or signature coverage. Canonical structured profiles remain authoritative. Viewer-core still reports legacy HTML as `safe-mode`; canonical `general-document` HTML validity is unchanged.

The source package remains byte-for-byte intact. Sanitized preview markup is transient presentation data, not a replacement entry or migration artifact. Cryptographically valid content receives the same restrictions as unsigned content.

## Preparation and containment

The Viewer uses the already-present `parse5` 8.0.1 parser as an explicit app dependency, loaded dynamically only for HTML preparation. It builds a data tree and emits a new document from a limited set of HTML reading elements. It never inserts the authored document into a browser DOM. This avoids preparation-time resource loading: detached `DOMParser` HTML can still fetch image/frame resources. See [MDN DOMParser security behavior](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString#description).

Every output text/attribute value is escaped. Foreign namespaces, scripts, authored styles, templates/shadow content, nested frames, objects, embeds and other active subtrees are omitted. Unknown HTML wrappers can retain readable children without retaining their attributes. Source metadata, event handlers, `is`, `srcdoc`, CSS, responsive URL lists and unapproved attributes never enter the output. Head metadata is rebuilt by the Viewer.

The reading subset retains headings, paragraphs, emphasis, lists, figures, code/quotes, tables, details, basic accessibility labels and language/direction. User-facing preview text states the restrictions. Author-specific layout, fonts, SVG/MathML/canvas and exact website fidelity are not claimed.

The actual iframe keeps `sandbox=""`, with no scripts/same-origin/forms/popups/navigation/download grants. Referrer policy is `no-referrer`, and its Permissions Policy denies camera, microphone, geolocation, autoplay, encrypted media and fullscreen. The [HTML sandbox model](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox) is a separate layer from resource policy.

## Navigation and CSS

All authored links, including fragments, become inert labels. Forms and controls lose their active elements/attributes. Refresh/base/link metadata is discarded. No authored navigation, form submission, downloads, ping, external helper protocols or nested documents are available inside the preview. This does not rely on an unsupported `navigate-to` policy directive or on sandboxing the frame's own navigations.

Authored inline CSS and packaged stylesheets are omitted rather than partially rewritten. A fixed Viewer stylesheet provides readable typography and tables. Its exact SHA-256 hash is the only allowed style source; a test checks the stylesheet/hash pair. No runtime cryptographic feature is needed for ordinary HTML preparation.

The generated head places an enforcing CSP before all style/body content:

```text
default-src 'none'; base-uri 'none'; script-src 'none';
style-src 'sha256-<fixed Viewer stylesheet hash>'; style-src-attr 'none';
img-src blob:; media-src blob:; font-src 'none'; connect-src 'none';
frame-src 'none'; object-src 'none'; form-action 'none'
```

Only the renderer's own selected media URLs are emitted. Authored blob/data/network URLs are never retained. No report endpoint is added. Meta CSP cannot supply `sandbox` or `frame-ancestors`, so sandbox restrictions stay on the actual iframe; CSP must precede the content it controls. See [CSP meta delivery rules](https://www.w3.org/TR/CSP3/#meta-element). Live enforcement across engines still needs browser acceptance.

## Package-local media

Every media reference must:

1. Resolve relative to the entry inside the package root, decoding path segments once. Reject absolute/scheme paths, backslashes, control characters, encoded separators, malformed escapes, queries/fragments and traversal above the root.
2. Match an exact manifest `assets[].href` and an own file-map entry. Unreferenced files and attachments do not become automatic preview media.
3. Pass the limited MIME/header policy below and the resource budgets.
4. Receive a Viewer-created Blob URL with the controlled MIME. Original source URLs never enter output markup.

| Kind | Limited reference policy |
| --- | --- |
| Images/posters | PNG, JPEG, GIF and WebP headers; declared MIME must match when supplied, otherwise infer the raster MIME |
| Audio | Declared MPEG/MP3, WAV, Ogg, MP4 or WebM MIME with the corresponding preliminary container/header check |
| Video | Declared Ogg, MP4 or WebM MIME with the corresponding preliminary container/header check |
| SVG, fonts, CSS, playlists, external tracks and other formats | Omit from preview media; retain readable alternatives where available |

Audio/video use manual native controls and `preload="none"`; autoplay, loop, event handlers and remote sources are removed. Source lists select the first approved local source. Posters use the image policy. These preliminary checks are not full raster/media decoding, pixel-size bounds, codec validation, malware scanning or a browser-memory sandbox.

While an HTML preview is active, the host's public-cover image and Files asset thumbnails are suppressed so they cannot provide a second automatic image-loading path outside the restricted frame. Asset facts and existing deliberate attachment retrieval remain separate host features. Structured document presentation keeps its existing resource behavior.

## Resource ownership and reference budgets

One renderer per package shares approved URLs across any HTML preparation calls, including the defensive alternate path. Direct tests cover alternate relative locations without changing the JSON-only localized-entry contract. There is no cross-package URL cache. Parsing and output checks finish before allocation; partial allocation failures revoke their new URLs without damaging a previous cache. The host stages all package URLs and disposes them on failure, stale replacement or unmount. Async parser loading cannot commit an obsolete package.

| Policy | Reference default |
| --- | ---: |
| HTML input, per entry | 4 MiB UTF-8 |
| Parser construction/text-insertion operations, per entry | 20,000 |
| Parser/output nesting | 64 |
| Distinct selected HTML media paths, per package | 128 |
| One selected media file | 8 MiB |
| Total distinct selected HTML media bytes | 24 MiB |

Parser counters include discarded content. Excess input/work/depth fails that preview; localized preparation failures follow the existing unavailable-alternate behavior. Media outside selection budgets becomes a readable omission. These are private reference policies rather than portable format maxima or public CLI options. The eager archive file map and other host asset maps still have their own resource costs. This is not an exact heap limit, CPU deadline or exhaustive security assurance.

A locale replaces the complete presentation. The host must not fall back independently for each HTML/structured field, which could mount base content beside an alternate of another kind. Reader metadata can still use its documented metadata fallbacks.

## Evidence and remaining acceptance

- Unit tests inspect the generated tree, CSP/hash pair, forbidden attributes/constructs, navigation labels, asset path/type/ownership rules, budgets, resource reuse and allocation rollback. They check that preparation invokes neither browser `DOMParser` nor `fetch`.
- Host integration checks preserve valid `comic`, `storyboard` and custom HTML `safe-mode` behavior, frame restrictions and complete locale-presentation replacement. Source guards protect both HTML entry call sites and the outer automatic-image restrictions.
- The real [isolation fixture](../../examples/security/html-fallback-isolation/README.md) has legacy English HTML, a valid French structured comic, existing real PNG/WAV assets and deliberate script/CSS/navigation/SVG probes. Both transports validate/open, and its HTML prepares through the same renderer without mutating source bytes. JSON-only localized-entry validity is preserved.
- Browser use was disabled in Work settings during implementation. No zero-request, navigation, playback, screenshot, keyboard/screen-reader, physical-device or cross-engine acceptance is claimed by Node tests. Follow the fixture's live acceptance steps, including source/locale changes and rapid replacement during the first parser load.

PRD-P010/item 54 remain open for live request/navigation/disposal evidence and broader hostile-input testing. Any future authored CSS, SVG, functional links or interactive content needs its own containment policy and acceptance evidence.
