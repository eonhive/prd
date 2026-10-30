# DOCX conversion example

`source.docx` is a real Word source created by `create-source.py` using python-docx. It includes a Title, inherited heading/list styles, ordinary/bold text, bullet and numbered lists, a declared table header, an image with alternative text, a bookmark link, an external hyperlink, and header/footer content. The image is reused unchanged from `examples/conversion-markdown/flow.png`. ZIP timestamps and core dates are fixed for reproducibility with the same authoring template.

`converted.prd` is the actual ZIP-compatible output; `quality.json` is its extracted report. Output contains 12 canonical nodes, two grouped lists with two items each, a table, one unchanged image and declared source/report attachments. The opening Word title becomes the PRD title. Word layout, header/footer, inline formatting and unused parts are reported as unmapped.

From the repository root:

```sh
pnpm --filter @eonhive/prd-cli build
node packages/prd-cli/dist/cli.js convert examples/conversion-docx/source.docx --out examples/dist/converted-word.prd --json
node packages/prd-cli/dist/cli.js validate examples/dist/converted-word.prd --json
```

Choose an existing parent and a new output path. The normal install includes optional `saxes`, required for DOCX XML; the HTML parser is not needed. `--container prd`, `--profile general-document` and `--no-source` work through the existing converter. Regeneration of the Word fixture separately requires Python with python-docx; that is an authoring/test dependency, not a converter runtime dependency.

The source was rendered and visually checked as a clean one-page Word document. Internal QA PNGs are ignored under `examples/dist/docx-source-qa/`. Automated tests open the resulting archive through the existing Viewer path in both transports. Local browser acceptance completed on October 28: both list types, table and 480×144 image render; the bookmark link navigates correctly; source/report downloads are byte-exact and warning/error logs are empty. Screenshot is ignored at `examples/dist/docx-conversion-viewer.jpg`.

See [DOCX mapping, XML budgets and limitations](../../docs/architecture/PRD_CONVERT_DOCX.md). This supports a bounded transitional Word body subset, with partial fidelity; it does not emulate Word's page layout, fields, revisions or visibility cascade. Retained source may contain metadata, hidden/deleted content and unused parts. This is repository functionality pending release.
