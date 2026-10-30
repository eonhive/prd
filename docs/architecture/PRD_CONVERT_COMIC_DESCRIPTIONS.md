# Convert Web — supplied comic descriptions and session drafts

_October 29, 2026. Repository implementation; release/deployment and full live UI acceptance pending. Decision: PRD-055._

This extends [page-order review](PRD_CONVERT_PAGE_REVIEW.md) with one focused repair: replace filename-derived comic descriptions with explicitly supplied plain text. It uses the existing canonical `PrdComicPanel.alt` field and source-backed conversion pipeline. No format/schema, renderer, runtime dependency, AI/OCR service, caption editor or general Studio authoring surface is added.

## Shared contract and limits

Node/browser conversion settings accept `comicPageDescriptions: readonly { pageId: string; text: string }[]`. This is the complete override configuration for that conversion call, not a persistent patch/history contract. Omitted IDs keep their extracted descriptions; an empty array preserves default output. Nonempty overrides apply only to comic content and can accompany natural/reversed or explicit page ordering.

Each source page ID can appear once and must resolve to an imported panel. Duplicate/foreign IDs fail. IDs are nonempty and at most 255 UTF-16 code units; record count is bounded by `maxNodes`. Text must be nonblank, at most 2,048 code units, and free of unsafe control characters; ordinary line breaks/tabs remain plain whitespace. Shared `MAX_COMIC_PAGE_DESCRIPTION_LENGTH` drives the web field limit. These are converter tooling limits, not new core format maxima.

Records are copied before Node/browser asynchronous extraction and before web File reads. Only page ID/text fields are retained from each record. Assembly applies text to cloned panels by stable source ID, independently of the final array order. Page IDs/assets, source bytes, image bytes, resource mappings, profile versions and canonical validation/packaging remain authoritative and unchanged. Markup/URLs in text stay literal; they are not parsed, executed or retrieved. Default/CLI/report contracts remain compatible; no new CLI flags are introduced.

## Factual diagnostics

Successful overrides add `comic-page-descriptions-reviewed` to existing quality report v1, with the actual supplied count and unassessed accuracy/completeness. The existing `cbz-generated-alt` code is retained; when overrides exist, its message describes initial filename extraction and the actual counts of supplied versus remaining filename-derived descriptions. Without overrides, the old warning message/output stays exact. Order-review wording distinguishes supplied text from retained source descriptions when both options are used.

No accessibility pass, content accuracy, OCR or confidence percentage is inferred from nonempty strings. Reports describe the current configuration rather than accumulating user interaction history. Other source/metadata/order limitations remain explicit.

## Review flow and draft retention

The current **Review comic pages** list adds labeled plain-text fields with a visible length policy, required/invalid states and filename-derived/provided/draft labels. Apply is disabled for invalid changes. **Apply review** submits every imported page ID plus current provided/changed descriptions through the same worker/pipeline. Existing supplied descriptions carry forward through subsequent order-only review. **Reset changes** restores the current package order/text; it does not remove already applied descriptions.

The draft is controlled by the existing in-memory `WebConversion` session, rather than kept only in the mounted row component. It survives the existing Viewer handoff/return so readers can inspect artwork without losing unapplied text/order. Source File/settings and draft are not persisted or exported. Reload, choosing another source or changing conversion settings ends that review; those inputs do not provide an undo history. Package source opt-out does not erase session data. Applying successfully returns a fresh result without a draft; failure/cancel retains the current package and draft for retry.

While drafting, downloads and Viewer use the current completed package. Draft changes do not mutate its archive/report/document. Metadata-only draft updates preserve review-view selection and existing download URLs; successful replacement retains the prior byte/type binding guard and URL disposal. The existing order-only job helper delegates to the extended helper and retains applied description settings.

## Evidence and limits

The October 30 [mounted interaction suite](PRD_CONVERT_WEB.md#mounted-interaction-regression-tests--october-30-2026) exercises move/reset with description retention and focus, blank/length/control-character/literal-text handling, provided text in order-only review, busy controls and applied-result announcements. Mounted Convert tests cover failed/cancelled apply preserving the draft/current download, retry replacement, ignoring completion after unmount, and session restoration through a simulated remount. Saved valid examples supply completed artifacts; deferred jobs test UI lifecycle rather than execute workers. All 18 tests in the suite pass without a product-code change. This is development-only DOM simulation, not live Viewer navigation, keyboard/screen-reader or browser acceptance.

The [actual example](../../examples/conversion-web/comic-descriptions/README.md) has three supplied descriptions, source order 2, 3, 1, three unchanged images and five warnings. Example text was written after inspecting the repository's demo images and describes pictured labels rather than asserting implemented live/collaboration capabilities. The browser export executed under Node generated the archive/report; this is not a browser download.

Tests cover both-transport Node/browser parity, default/empty/partial overrides, source-ID mapping across reordering, copied records, duplicate/foreign/non-comic/oversized/malformed/sparse inputs, inclusive text limits, unsafe controls and literal markup with no fetch. Web tests cover source opt-out, repeated/order-only repairs, pre-read snapshots, failed/cancelled draft retention, escaped labeled fields and restoring an unapplied session draft without mutating the package. Existing Viewer opening receives the supplied `alt` values; its native image rendering already consumes that canonical field.

Browser inventory briefly became available on October 29. A production preview loaded and native file chooser selection of the real CBZ succeeded, showing its name/size and compatible profile controls. Browser use was disabled again before conversion ran. Live text editing/reset/apply/focus, Viewer-return draft retention, latest downloads, mobile/theme and both-base worker acceptance remain open. No permission change, alternate controller, old screenshot or source-image preview is used as fresh UI acceptance. The owned preview server was stopped. Production builds and automated checks are separate evidence.
