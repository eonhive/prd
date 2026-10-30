# Reviewed comic conversion example

`converted.prd` and `quality.json` are actual `convertInBrowser` output using the existing [sample CBZ](../../conversion-cbz/sample-comic.cbz) and `comicPageIds: ["page-2", "page-3", "page-1"]`. The browser export was executed under Node; this is not a fresh browser download or click-through acceptance artifact.

The result contains the same three images and source page identities as the original conversion, ordered 2, 3, 1. Its four warnings include the three existing CBZ source limitations and the explicit reviewed-sequence diagnostic. The exact source archive and current quality report remain declared attachments. Both output transports match Node logical files and open through the existing Comic Viewer.

For manual review, run `pnpm dev:web` and open `/convert/` at the printed URL. Convert the sample CBZ, then use **Review comic pages** to move pages, **Reset changes** to discard draft moves/text, or **Apply review** to run conversion/validation again. Downloads keep the previous package until Apply succeeds. Inspect the actual result with **Preview in Viewer**. Description repair is now supported separately; this saved example retains the original filename-derived descriptions.

The selected CBZ stays in session memory for review, including when its package attachment is disabled. Returning from Viewer retains the context; reload ends it. No files are uploaded or stored as persistent history. The action cannot omit or duplicate pages. See [repair boundary and acceptance](../../../docs/architecture/PRD_CONVERT_PAGE_REVIEW.md); live interaction verification is still pending.
