import type {
  PrdComicRoot,
  PrdGeneralDocumentRoot,
  PrdOpenedDocument,
  PrdStoryboardRoot
} from "@eonhive/prd-types";

export type ViewerRenderMode =
  | "structured-json-rendered"
  | "html-fallback-rendered"
  | "unsupported-entry-mode";

export function inferViewerRenderMode(
  opened: PrdOpenedDocument | undefined,
  entryDocument: PrdGeneralDocumentRoot | undefined,
  comicDocument: PrdComicRoot | undefined,
  storyboardDocument: PrdStoryboardRoot | undefined,
  renderedHtml: string | undefined
): ViewerRenderMode {
  if (!opened || opened.supportState === "unsupported-required-capability") {
    return "unsupported-entry-mode";
  }

  if (entryDocument || comicDocument || storyboardDocument) {
    return "structured-json-rendered";
  }

  if (renderedHtml) {
    return "html-fallback-rendered";
  }

  return "unsupported-entry-mode";
}

export function getViewerRenderModeMessage(renderMode: ViewerRenderMode): string {
  if (renderMode === "structured-json-rendered") {
    return "Structured JSON entry rendered. This package can be valid and the current viewer can render its canonical structured path.";
  }

  if (renderMode === "html-fallback-rendered") {
    return "HTML fallback entry rendered. Package validity comes from the validator above; this rendering mode reflects legacy fallback behavior in the viewer.";
  }

  return "Unsupported entry mode detected for this viewer. The package may still be validator-valid, but this viewer cannot render the declared entry path/capability.";
}
