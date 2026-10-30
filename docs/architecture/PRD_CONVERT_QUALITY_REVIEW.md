# Convert Web — quality diagnostic review

_October 29, 2026. Repository implementation; live UI acceptance and deployment pending. Decision: PRD-056._

The existing quality report v1 already contains conversion codes, stages and optional source references, plus separate package-validator issues with optional paths. This increment presents those facts in the existing Convert workspace. It adds no converter/schema/report contract, runtime dependency, renderer, format adapter or repair action. Structural validity, conversion fidelity and reading accessibility remain separate assessments.

## Ownership and displayed facts

`apps/prd-viewer-web/src/convertDiagnosticFilters.ts` projects the two existing warning arrays into app-local rows. Conversion warnings retain `code`, `message`, `stage` and optional `reference`. Package-validator issues retain their actual `code`, `message`, `severity` and optional `path`; they are not assigned a conversion stage or source location. Conversion's `validate` stage remains distinct from package-validator origin. Repeated codes remain separate rows in original order, with conversion rows before validator rows, matching the previous display order.

`ConversionDiagnostics.tsx` displays codes, readable stage/origin labels and messages. Supplied locations appear as **Source reference** or **Package path**. Missing locations are omitted; no source line, page, path, confidence or navigable Studio target is invented. All strings are React text, including URLs and markup; none become links, source HTML, executable attributes or network requests. No new original-file path is collected or exported.

Extraction and adaptation labels help distinguish imported-source observations from conversion choices. A supplied description or reviewed order remains a reported action, not a resolved issue or verified accessibility claim. Existing messages and report contents remain authoritative and unchanged. An empty warning list does not establish fidelity or accessibility.

## Filtering and result lifetime

- **Warning category** offers all warnings, all conversion stages, each of extraction/normalization/adaptation/conversion validation, and the package validator. A single category avoids contradictory origin/stage combinations.
- **Search warnings** matches literal, case-insensitive substrings in code, message or the supplied location. Leading/trailing query whitespace is ignored; regular expressions are not evaluated. The native search field accepts up to 256 UTF-16 code units.
- Filtering examines every report row before selecting the first 50 matches for display. Counts state visible, matching and total warnings. Longer results explain the limit and point to narrower filters or the unchanged complete JSON report download. There is no hidden truncation of the report itself.
- **Clear filters** restores all warnings. Empty results explain how to recover; a genuinely empty report disables filtering. Native labeled controls, a polite atomic count status and a keyboard-focusable scrolling list support review. Styles reuse existing theme tokens and wrap at narrow widths.

Filters are view settings only. They never mutate the completed document, archive, report, resources, draft or download bytes. Switching among quality/assets/source while the result view remains mounted keeps filters. Draft-only updates retain the same report and filters. A replacement report starts unfiltered immediately, and the old report reference is released after commit. Returning through a route remount starts with default filters; this does not change PRD-055's separate session-draft retention. No filter state is persisted or packaged.

## Verification and remaining acceptance

The October 30 [mounted interaction suite](PRD_CONVERT_WEB.md#mounted-interaction-regression-tests--october-30-2026) now drives the actual React category/search/clear controls, searches beyond the display cap, checks counts/empty recovery, and distinguishes same-report retention from replacement reset. Result-level tests retain filters/view/URLs on draft-only updates, read the complete report Blob while filtered, reject stale links during a replacement commit and verify URL cleanup. These are simulated-DOM/controlled-Blob checks with a development-only dependency; they do not close browser download, accessibility-delivery or visual acceptance below.

Focused tests cover every category, origin separation (including duplicate codes and conversion validation versus package validation), code/message/reference/path search, literal regex characters, combined filtering, stable order and frozen-report nonmutation. A 65-warning test fixture proves rows beyond the visible cap remain searchable and counts stay factual. Markup checks cover labeled controls, live counts, keyboard list access, inert hostile strings, missing locations and empty reports. Actual Markdown, HTML and CBZ conversions render through `ConvertReview` without changing archive/report bytes; existing converter-to-Viewer integration retains both transports. These are automated checks, not browser execution evidence.

The initial full-suite run exposed an existing test-harness race: a CBZ test disabled global `Buffer` while Vitest's asynchronous RPC deserializer needed `Buffer.from`. That test now retains its byte-snapshot/no-network assertions without changing the test runner's global. Buffer-free browser conversion remains covered by the existing isolated installed-tarball smoke (Markdown, HTML, CBZ, order and description review), outside Vitest's RPC process. No converter behavior or runner settings were changed to address this failure.

Final validation passes on Node 24.5.0 / pnpm 10.32.1: 129 focused tests across five files, root typecheck, foundation gate with 1,082 tests across 55 files, workspace/Viewer build, root-inclusive docs, canonical validation/aggregate smoke, clean five-package installed-tarball smoke and root/`/prd/` production builds. Nine JS chunks in each build contain none of the screened Node filesystem/process, PDF.js or native-canvas dependencies. Counts include preserved independent shared-checkout work. These build/static checks do not establish live worker or interaction acceptance.

Fresh browser inventory still reports **Local browser use is disabled in Work settings**. Live filter/search/clear, new-result reset, draft-only retention, keyboard/screen-reader announcements, scrolling, current full-report download, both themes, 320/390px widths and root/`/prd/` worker/Viewer behavior remain pending, alongside earlier conversion/repair acceptance. No settings changes or alternate controllers are used to bypass that limit. Existing example archives remain conversion evidence; no regenerated sample or historical screenshot is presented as new UI proof.

The next acceptance step is that live workspace review before more adapters or editing controls. Release onboarding/version policy remains under backlog item 46; deployment and public launch acceptance remain separate. This private-app presentation increment needs no public-package Changeset.
