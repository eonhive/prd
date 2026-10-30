# Restricted HTML fallback fixture

This validator-valid legacy `comic` package intentionally contains active HTML, remote URLs, nested CSS, forms, links and SVG. Its French alternate is a canonical structured JSON comic, as required by the current localization contract. It exercises private Viewer presentation policy under PRD-051; it does not make HTML a canonical structured profile or localized entry. Use the packaged archive in the Viewer rather than opening its source HTML/SVG directly.

The PNG is copied byte-for-byte from `examples/conversion-markdown/flow.png`. The WAV is copied byte-for-byte from `examples/document-basic/assets/audio/intro-tone.wav`. Every packaged resource is declared. No probe server is part of the package; `127.0.0.1:5195/probe/*` is only a controlled acceptance target.

Build from the repository root after the CLI build:

```sh
node packages/prd-cli/dist/cli.js validate examples/security/html-fallback-isolation
node packages/prd-cli/dist/cli.js pack examples/security/html-fallback-isolation --out examples/dist/html-fallback-isolation.zip.prd
node packages/prd-cli/dist/cli.js pack examples/security/html-fallback-isolation --out examples/dist/html-fallback-isolation.envelope.prd --container prd
```

Automated tests check package opening, parser/serialization output, controlled media URLs and frame restrictions. Live browser acceptance remains separate:

1. Start the existing local Viewer and a controlled request observer on port 5195. Open each archive through the native picker.
2. Confirm `safe-mode` / HTML fallback, retained headings/table/PNG, manual audio with no autoplay, and visible image alternatives. Confirm there is one opaque sandboxed content frame.
3. Confirm no `/probe/*` requests during HTML preparation, display, interaction or Info/Files inspection. Links and form labels must be inert; frame/top-level locations must stay unchanged. The public cover and asset thumbnails must not load outside the frame while HTML is active.
4. Switch to French: only its structured comic should be active, with no retained base HTML frame. Switch back: only the restricted HTML should remain. Canonical structured resource behavior is unchanged; broader structured SVG handling is outside this policy. Per-renderer HTML resource reuse across relative entry locations is covered by direct compiler tests, not a new valid HTML-locale contract.
5. Open a normal structured example, then return to this package. Check resource disposal, keyboard/locale recovery and normal structured behavior. Also exercise a rapid replacement/unmount during the first HTML parser load.

Browser use was disabled in Work settings during the October 29 implementation. Node markup/build checks do not establish browser request or media-decoder behavior, screenshot acceptance, physical-device behavior or a security audit.
