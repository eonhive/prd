# HTML through the browser converter entry

`converted.prd` and its extracted `quality.json` were generated on October 29, 2026 by calling `convertInBrowser` with the existing [HTML source](../../conversion-html/source.html) and [flow image](../../conversion-html/flow.png). The export was executed under Node for reproducible verification; these files are not claimed as a fresh browser download while browser automation is disabled.

Output has 11 canonical nodes, one exact raster resource, exact original source/report attachments and three existing warnings: the HTML subset plus omitted style/script content. Source HTML is an opaque attachment, and `content/root.json` is the reading entry. Node/browser-entry logical files and diagnostics match; both ZIP/envelope variants open through the existing Viewer implementation.

For manual UI review, build/run the existing web app, open `/convert/`, choose the linked HTML file with **Browse files**, choose the image with **Add images**, and convert. Inspect Quality report, Assets and Original source, download the PRD/report and use **Preview in Viewer**. Test both themes and narrow layouts before deployment. See [HTML browser and workspace policy](../../../docs/architecture/PRD_CONVERT_WEB_HTML.md).
