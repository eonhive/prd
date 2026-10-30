# PRD Convert — bounded CBZ import

_October 27, 2026. Implemented in the repository; pending release. Decision: PRD-043._

CBZ is the first archive-based adapter in the existing [converter foundation](PRD_CONVERT_PHASE_1.md). It produces canonical `comic` content using the existing PRD types, resource collector, validator, packager and Viewer. It adds no renderer, manifest schema, service or runtime dependency. The later [EPUB increment](PRD_CONVERT_EPUB.md) now defines a bounded XML/spine policy and implementation; the subsequent [DOCX increment](PRD_CONVERT_DOCX.md) now has its own policy.

## Usage and mapping

```sh
prd convert ./sample-comic.cbz --out ./comic.prd --profile comic --json
prd validate ./comic.prd --json
```

Use the repository-built CLI until release onboarding is complete. The output parent must exist and the destination must be new. `--profile auto` selects `comic`; incompatible profiles fail. Only the existing `adaptive` strategy is implemented. ZIP remains the default output transport; `--container prd` selects the existing envelope transport. There is no new `prd import cbz` directory command.

Detection requires both a `.cbz` extension and a plain ZIP signature. Extraction reuses `readPrdArchive` from the validator's container subpath without writing archive members to the filesystem. Recognizable renamed Office, EPUB and PRD packages are rejected; this is a limited marker check, not universal ZIP classification.

PNG, JPEG, GIF and WebP members become whole-page canonical comic panels. Extension and raster signature must match. Full archive paths use the legacy image importer's English numeric collator; a raw string tie-break makes case/equivalent names deterministic regardless of ZIP insertion order. Generated panel/resource IDs follow that order. The filename-title helper is shared with the existing image-folder importer; its behavior and order are preserved.

Hidden path segments and `__MACOSX` members, SVG, metadata and other non-page files are excluded from the reading content and counted in a warning. Invalid raster candidates receive individual resource warnings. Conversion fails if no supported pages remain. Nested directories are supported, but editorial order can differ from natural full-path order.

## Limits and archive safety

The existing conversion limits also bound archive decoding:

| Limit | Default | CBZ meaning |
| --- | --- | --- |
| `maxInputBytes` | 4 MiB | Compressed source archive |
| `maxResourceBytes` | 8 MiB | Each expanded member, including ignored metadata |
| `maxTotalResourceBytes` | 24 MiB | All expanded members; also collected image bytes |
| `maxResources` | 128 | Archive entries, including directories and ignored members; also collected images |
| `maxNodes` | 20,000 | Candidate pages and resource-reference attempts |

The library's positive `limits` overrides can raise or lower these budgets. The CLI currently uses defaults and exposes no limit flags. Large ordinary comic archives may therefore be refused; do not describe this increment as unrestricted batch import.

The shared archive reader rejects unsafe member paths, duplicate entries, conflicting local/central names, unsupported archive features and limit violations before source interpretation. Limits apply even to ignored members. No metadata XML is parsed, no member is extracted to disk, and no network request is made. Tests cover traversal, absolute/backslash paths, malformed/duplicate/conflicting entries, truncated ZIPs and highly compressed/oversized inputs. Raster checks screen file signatures; they do not provide full image decoding or pixel-dimension bounds. Existing archive-reader behavior does not establish cryptographic integrity or publisher identity.

## Diagnostics and retention

The existing `reportVersion: "1.0"` contract is unchanged. Reports identify `sourceFormat: "cbz"`, profile, actual panel/resource counts, generated reference mappings, conversion warnings and validator warnings. Structural validation must pass before packaging. Fidelity remains conservatively partial with presentation layout not preserved; copied raster bytes themselves are unchanged. No reading-quality assessment or confidence score is invented.

Every successful CBZ import warns about inferred reading order and filename-generated alternative text. ComicInfo metadata, manga direction, cover selection, spreads, page dimensions and sub-page panel geometry are not interpreted. There is no OCR, image-description generation or authored accessibility repair. The Viewer uses its existing comic navigation and responsive rendering.

By default, exact source bytes and the quality report are declared attachments. The source is an opaque `application/octet-stream` download, including any original metadata or hidden files. `--no-source` omits it and reports that loss. Reports contain source member paths, not original absolute workstation paths; archive filenames can still contain user-authored information. The HTML directory workflow's separately versioned redacted report remains unchanged.

## Evidence and compatibility

[The real example](../../examples/conversion-cbz/README.md) stores pages in ZIP insertion order 10, 2, 1 and converts them to 1, 2, 10. Unit, built-CLI and Viewer-opening tests cover both output transports, byte-exact source/image retention, saved example/report parity, profile rejection and safety failures. Installed-tarball smoke also converts CBZ after removal of the optional HTML parser. Existing Markdown and image-folder output bytes/CLI JSON match captured pre-refactor cases.

Local browser acceptance opened the actual generated archive through **Open .prd**, displayed Valid / fully-supported, decoded all three images in the expected order, navigated to the third page and retrieved source/report attachments byte-exact through the supported browser file-link API. This does not claim deployed, physical-device or screen-reader acceptance. The prior HTML directory example was also visually checked, including table/image rendering, its internal fragment link and byte-exact report retrieval.

## Browser continuation — October 29, 2026

The same adapter now runs through `convertInBrowser` and the existing `/convert/` worker under [browser CBZ policy](PRD_CONVERT_WEB_CBZ.md). Internal filename helpers are portable; the public Node image-sequence wrapper and default conversion outputs remain compatible. Browser limits can only tighten and separately selected images are refused for CBZ. Additive shared `comicPageOrder` can reverse the cloned canonical panel array without changing page IDs/assets; it adds an adaptation warning and does not introduce reading-direction metadata. Fresh browser conversion/UI acceptance remains pending; the earlier Viewer checks above cover the Node-generated archive only.
