# Browser-entry CBZ example

`converted.prd` and `quality.json` are actual output from `convertInBrowser` using the existing [sample CBZ](../../conversion-cbz/sample-comic.cbz). The browser export was executed under Node to produce these files; they are not fresh browser downloads.

The source inserts pages as 10, 2, 1. Natural conversion produces 1, 2, 10 as three canonical Comic panels with unchanged PNG assets. The actual report has three warnings: inferred reading order, filename-generated alternative text and omitted metadata. Exact source/report attachments are declared by default. Logical output matches Node conversion and opens through the existing Viewer in both transports; ZIP timestamp equality is not promised.

From the repository root, run `pnpm dev:web` and open the printed URL at `/convert/`. Choose the sample CBZ without supporting images, use automatic/Comic profile and select natural or reversed filename sequence. Convert, inspect the real report/assets, download, then choose **Preview in Viewer**. Reversal keeps page/asset identities and adds one adaptation warning; it does not specify manga direction.

The browser accepts at most 4 MiB compressed input, 8 MiB per expanded member, 24 MiB expanded total and 128 entries including ignored members. Ordinary larger comics may require the Node library with explicit limits. See [browser CBZ policy](../../../docs/architecture/PRD_CONVERT_WEB_CBZ.md).

Live picker/drop, control, download, rendering/navigation, theme and mobile acceptance remains pending because browser automation is disabled. The saved artifacts, automated Viewer opening and production builds do not substitute for that evidence.
