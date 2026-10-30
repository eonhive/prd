# CBZ conversion example

`sample-comic.cbz` is a real ZIP source containing three PNG pages and an intentionally uninterpreted `ComicInfo.xml`. The images are reused unchanged from the repository's canonical `examples/comic-basic/assets/panels/panel-{1,2,3}.png`; this fixture introduces no external artwork. ZIP entries were inserted as page 10, page 2, page 1 with a fixed timestamp. Conversion orders them naturally as page 1, page 2, page 10.

`converted.prd` is the actual ZIP-compatible output and `quality.json` is its extracted report. It contains canonical comic panels, three unchanged raster assets and declared source/report attachments. The report has three warnings: inferred reading order, filename-generated alternative text and omitted metadata. Original ComicInfo remains in the opaque retained source, not the reading model.

From the repository root:

```sh
pnpm --filter @eonhive/prd-cli build
node packages/prd-cli/dist/cli.js convert examples/conversion-cbz/sample-comic.cbz --out examples/dist/converted-comic.prd --json
node packages/prd-cli/dist/cli.js validate examples/dist/converted-comic.prd --json
```

The output parent must exist and the destination must be new. Open the archive with the existing Viewer's **Open .prd** action; inspect its page order, Info and Files panels. `--profile comic` is a compatible override, `--container prd` selects envelope output and `--no-source` explicitly omits the original archive. No HTML parser is required.

Default limits are intentionally bounded: 4 MiB compressed source, 8 MiB per expanded member, 24 MiB total expanded bytes and 128 entries including ignored files/directories. Library callers can set positive `limits` overrides; the CLI currently has no limit flags. See [the CBZ mapping and safety policy](../../docs/architecture/PRD_CONVERT_CBZ.md). Reading direction, metadata, spreads, panel detection and OCR remain unsupported and reported. This is local repository functionality pending release.
