# Convert Web — HTML and the conversion workspace

_October 29, 2026. Repository implementation; not deployed or published. Decision: PRD-052._

This increment adds browser HTML to the existing local conversion path and adapts the owner's visual reference into an executable workspace. It reuses the Node HTML adapter, semantic model, bounded parsing, resource collection, validator, packager and existing Viewer. PSD/PSB parsing, AI layout detection, layer extraction, batch processing, templates and persistent history are not implemented by this increment.

## Browser API and parser loading

`@eonhive/prd-converter/browser` now exports `convertInBrowser(options)` for Markdown and static UTF-8 HTML (`.html` / `.htm`). The existing `convertMarkdownInBrowser` remains Markdown-only with unchanged detection and output behavior. Both call the same bounded byte-selection/resource/assembly path. Source and resource arrays are copied before the first asynchronous adapter load.

The generic dispatcher loads `adapters/html.ts` only for an HTML suffix. That existing adapter then loads optional `parse5` through `htmlTree.ts`. Markdown does not require the HTML parser. Node import behavior and the optional-dependency error remain unchanged. Browser distribution must include the generated HTML/parser chunks; a missing chunk fails the job rather than offering a download. This does not fetch a source URL or its resources.

Vite emits **ES module workers** and separate lazy HTML/parser chunks. The previous Markdown-only worker did not require code splitting. `new Worker(..., { type: "module" })` and the existing hosting-base resolution remain in use. No Node filesystem, child-process, PDF.js, native canvas or XML adapter enters this browser path. Secure-context Web Crypto and modern module-worker support remain requirements.

## Source fidelity and safety

The [existing HTML policy](PRD_CONVERT_HTML.md) remains authoritative: map headings, readable paragraphs, flat lists, quotes, simple tables, safe links/fragments and explicit local raster resources into canonical `general-document` JSON. Inline typography and CSS layout are not recreated. Links/images may follow their containing block. Unsupported and repaired content is reported without invented confidence scores.

The parser never creates a live source document. Script/style/embedded/hidden subtrees and handlers are omitted from reading content with existing diagnostics. No source stylesheet, script, frame or image URL is retrieved. Only selected relative raster names can resolve; missing, unsafe, signature-mismatched or unused assets warn. The original HTML remains an opaque `application/octet-stream` attachment by default, and opt-out warns. Retained source may contain private or active original material; retention is not sanitization or redaction.

Existing browser limits are unchanged: 4 MiB source, 8 MiB per selected resource, 24 MiB combined resources, 128 selections and 20,000 nodes/reference attempts, with browser overrides restricted to tighter values. HTML tree-building work shares `maxNodes`, depth caps at 64, and generated table grids are bounded. The app's 20-second deadline includes file reads and lazy parser loading. Raster signatures and byte caps are not full pixel decoding or a native/browser memory sandbox.

## Reference-driven UI

The reference's useful pattern is a focused tool workspace: upload and selected files at the left, conversion options at the right, and review beneath. The implementation consumes existing violet/light/navy tokens and the folded PRD mark; it adds no competing identity or marketing landing page.

- Native **Browse files** and single-document drag/drop share source selection checks. More than one source is refused. Supporting images are explicitly added, listed and removable; duplicate names/count/byte violations reject the attempted selection before reads.
- The options rail exposes only actual controls: automatic/explicit General Document, optional title, adaptive presentation and original-source retention. It does not display PSD, AI or layer toggles from the illustrative reference.
- A three-step strip describes choose/convert/review. A native indeterminate progress bar appears during actual work; there are no synthetic percentages or simulated analysis stages.
- Successful output exposes real counts, warnings, selected-source format and validation status. **Quality report**, **Assets** and **Original source** are native button-selected views with `aria-pressed`, controlled hidden panels and keyboard activation. Source is escaped text, never a source iframe.
- The existing Viewer opens the exact generated archive. Downloads exist only after successful conversion. The prior in-memory result retention and file-input remount limitations are unchanged.

Source preview remains capped at 64 Ki UTF-16 code units, visible warnings at 50 and resource mappings at 128, with full details in the actual quality report. Layout collapses to one column on narrow screens; controls retain keyboard focus outlines, readable shared-theme colors and 44px button targets. Motion is limited and respects reduced-motion settings.

## Evidence and verification limits

The real [HTML example](../../examples/conversion-web/html/README.md) has 11 nodes, one unchanged image and three existing warnings. Its browser-entry output matches Node logical files/report in both transports and opens as fully supported structured JSON through the existing web Viewer implementation. It was generated by executing the browser export under Node; it is **not** a fresh browser download.

Tests exercise Node parity, both APIs, UTF-8/binary/empty inputs, parser recovery/depth/work limits, source retention, selected resources, inactive actions, no source retrieval, table/list/anchor semantics, worker cleanup and ambiguous file selections. Installed-tarball smoke checks browser HTML with Buffer unavailable and generic Markdown without parse5, then verifies the intended HTML-only dependency failure. Existing Markdown and Node adapter tests remain regression protection.

Live browser automation is disabled in Work settings for this increment. No settings change, alternate browser controller or old screenshot is used as new UI evidence. Production builds, component/security tests and Viewer-opening integration checks do not replace fresh light/dark, drag/drop, source-view, download and mobile interaction acceptance. Those checks remain explicit follow-up before deployment. Local preview is prepared using the existing app workflow; no publication or deployment is part of this task.
