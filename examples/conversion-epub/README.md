# EPUB conversion example

`source/` contains an authored reflowable EPUB fixture. `portable-chapters.epub` is the actual input ZIP: `mimetype` is first/stored, other members are compressed and timestamps are fixed. The first spine chapter is `z-opening.xhtml`; the second is `a-next.xhtml`, deliberately reversing filename order. The PNG is reused unchanged from `examples/conversion-markdown/flow.png`.

`converted.prd` is the actual ZIP-compatible output; `quality.json` is its extracted report. It contains two canonical chapter sections, 13 content nodes, one raster asset, and source/quality attachments. Matching opening headings become section titles without duplicate rendering; forward/back source links map to those sections. CSS, original navigation hierarchy, metadata beyond title and a harmless script marker are omitted from reading content and reported. Original source bytes remain in the declared opaque attachment.

From the repository root:

```sh
pnpm --filter @eonhive/prd-cli build
node packages/prd-cli/dist/cli.js convert examples/conversion-epub/portable-chapters.epub --out examples/dist/converted-book.prd --json
node packages/prd-cli/dist/cli.js validate examples/dist/converted-book.prd --json
```

Choose an existing output parent and a fresh destination. EPUB requires the optional `saxes` dependency, installed by the normal workspace setup; it does not require the HTML parser. `--profile general-document`, `--container prd` and `--no-source` are available.

Open the result through the existing Viewer's **Open .prd** action. Check chapter order, the list/image/table, forward/back links, Info and Files. Fresh local browser acceptance passed and the retrieved source/report matched byte for byte. Screenshot: ignored `examples/dist/epub-conversion-viewer.jpg`.

Read [the accepted EPUB subset and safety policy](../../docs/architecture/PRD_CONVERT_EPUB.md) before using other books. Defaults are 4 MiB input, 8 MiB per expanded member, 24 MiB total, 128 archive entries and a cumulative 20,000-operation XML budget. DTD-based legacy XHTML, fixed layouts, encryption/obfuscation and foreign spine fallback chains are unsupported. Library budget overrides exist; CLI limit flags and public release remain separate work.
