# HTML conversion example

`source.html` and `flow.png` are input fixtures. `converted.prd` is the generated ZIP-compatible archive; `quality.json` is the report extracted from it. The source deliberately contains CSS and a harmless script marker, both omitted from the canonical reading content and reported.

From the repository root, after installing dependencies:

```sh
pnpm --filter @eonhive/prd-cli build
node packages/prd-cli/dist/cli.js convert examples/conversion-html/source.html --out examples/dist/converted-html.prd --json
node packages/prd-cli/dist/cli.js validate examples/dist/converted-html.prd --json
```

The destination parent must exist and the destination must be new. HTML requires the optional `parse5` dependency, installed by the normal workspace setup. Open the generated archive with the existing Viewer's **Open .prd** action. It uses structured content, not HTML fallback. Check the heading fragment link, table, image and Files attachments. The original HTML is a declared binary download; its scripts are not part of the reading view.

See [HTML mapping and safety policy](../../docs/architecture/PRD_CONVERT_HTML.md). This is a Phase 2 increment; DOCX and the converter web interface are not implemented by this example.


## Directory import demonstration

`imported/` is the actual output of the new directory command; `imported.prd` packages those files through the existing packager. Its declared report is `imported/attachments/import-report.json`. This path includes no raw HTML source attachment.

```sh
node packages/prd-cli/dist/cli.js import html examples/conversion-html/source.html --out examples/dist/html-import-directory --json
node packages/prd-cli/dist/cli.js validate examples/dist/html-import-directory
node packages/prd-cli/dist/cli.js pack examples/dist/html-import-directory --out examples/dist/html-import-directory.prd
```

Choose a fresh output directory/archive when repeating the commands. Open `imported.prd` in the existing Viewer. Its structured content and image are fully supported by the runtime. Fresh local browser acceptance now covers headings, lists, quote, table, decoded image, the internal fragment link and byte-exact report retrieval through the browser file-link API. The shared fixture wording describes source retention as workflow-dependent: direct conversion retains it by default, while directory import omits it. CBZ is also implemented; EPUB is the next planned format. See BUILD_STATUS for validation evidence.
