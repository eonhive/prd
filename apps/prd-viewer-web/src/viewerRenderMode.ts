import {
  type ViewerRenderMode,
  getViewerRenderModeMessage,
  inferViewerRenderMode as inferViewerRenderModeCore
} from "@eonhive/prd-viewer-core";
import type {
  PrdComicRoot,
  PrdGeneralDocumentRoot,
  PrdOpenedDocument,
  PrdStoryboardRoot
} from "@eonhive/prd-types";

export type { ViewerRenderMode };
export { getViewerRenderModeMessage };

export interface ViewerPresentation {
  renderedHtml?: string;
  entryDocument?: PrdGeneralDocumentRoot;
  comicDocument?: PrdComicRoot;
  storyboardDocument?: PrdStoryboardRoot;
}

export function selectViewerPresentation(base: ViewerPresentation, alternate?: ViewerPresentation): ViewerPresentation {
  // A localized entry replaces the complete presentation; mixing fields can render HTML and JSON together.
  return alternate ?? base;
}

export function inferViewerRenderMode(
  opened: PrdOpenedDocument | undefined,
  entryDocument: PrdGeneralDocumentRoot | undefined,
  comicDocument: PrdComicRoot | undefined,
  storyboardDocument: PrdStoryboardRoot | undefined,
  renderedHtml: string | undefined
): ViewerRenderMode {
  return inferViewerRenderModeCore({
    opened,
    entryDocument,
    comicDocument,
    storyboardDocument,
    renderedHtml
  });
}
