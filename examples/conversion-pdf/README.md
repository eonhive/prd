# PDF conversion example

`source.pdf` is a real two-page PDF authored by `create-source.py`. Page 1 contains extractable prose; page 2 is a single raster simulating a scan with no text layer. Source creation uses ReportLab/Pillow; pypdf creates the two encrypted negative fixtures. These Python tools are fixture-authoring dependencies, not converter dependencies.

`converted.prd` is the actual ZIP-compatible output. `quality.json` is its extracted report: 14 canonical nodes, one 918×1188 PNG, and declared source/report attachments. The first page becomes responsive line paragraphs; the second remains an image without OCR. The three warnings identify extraction order, supported subset and the actual page-image fallback.

From the repository root, with Node.js 22.13+ and optional PDF.js/native canvas dependencies installed:

```sh
pnpm --filter @eonhive/prd-cli build
node packages/prd-cli/dist/cli.js convert examples/conversion-pdf/source.pdf --out examples/dist/converted-pdf.prd --json
node packages/prd-cli/dist/cli.js validate examples/dist/converted-pdf.prd --json
```

The parent directory must exist and the output must be new. Existing `--container prd`, `--profile general-document` and `--no-source` options also work. Do not assume native PNG encoder bytes are identical across platforms; canonical content/report semantics, page dimensions and exact retained source are checked separately.

Both source pages and the generated fallback were rendered and visually inspected. Local browser acceptance opens the actual archive in the existing Viewer, verifies text and decoded page image, follows Page 2 navigation and retrieves byte-exact source/report attachments. No warning/error console messages were observed. Internal QA images and screenshot are ignored under `examples/dist/`.

`fixtures/encrypted.pdf` uses the test user password `fixture-password`; `fixtures/encrypted-empty-password.pdf` has an empty user password. Both are rejected without requesting a password or producing output. These files exercise rejection, not decryption support.

See [PDF mapping, limits and limitations](../../docs/architecture/PRD_CONVERT_PDF.md). Reading order and semantics need manual review; text-page illustrations are retained only in the original PDF, while scans receive no OCR or meaningful authored alt text. This is repository functionality pending release.
