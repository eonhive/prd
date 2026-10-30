/**
 * Company: EonHive Inc. | Title: Shared Image Sequence Helpers
 * Purpose: Reuse the established image import ordering and filename labels for archive sources.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { basename, parse } from "node:path";
import { titleFromImageStem } from "./imageSequenceShared.js";
export { compareImageSequenceNames } from "./imageSequenceShared.js";

export function titleFromImagePath(path: string): string {
  return titleFromImageStem(parse(basename(path)).name);
}
