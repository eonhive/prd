/**
 * Company: EonHive Inc. | Title: Verified Viewer Package Opening
 * Purpose: Keep known-invalid signed files out of content interpretation and subsequent resource preparation.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */

import { strFromU8 } from "fflate";
import type { PrdOpenedDocument, PrdPackageReader } from "@eonhive/prd-types";
import type { PrdFileMap } from "@eonhive/prd-validator";
import { verifyPrdSignature, type PrdSignatureResult } from "@eonhive/prd-validator/signature";
import { openPrdDocument } from "@eonhive/prd-viewer-core";

function createPackageReader(files: PrdFileMap): PrdPackageReader {
  return {
    has(path) { return Object.hasOwn(files, path); },
    readText(path) {
      const file = files[path];
      if (!file) throw new Error(`Missing package file: ${path}`);
      return strFromU8(file);
    },
    readBinary(path) {
      const file = files[path];
      if (!file) throw new Error(`Missing package file: ${path}`);
      return file;
    }
  };
}

// The caller first validates this same immutable archive snapshot structurally.
export async function openViewerPackage(files: PrdFileMap): Promise<{
  signature: PrdSignatureResult;
  opened?: PrdOpenedDocument;
}> {
  const signature = await verifyPrdSignature(files);
  if (signature.status === "invalid") return { signature };
  return { signature, opened: await openPrdDocument(createPackageReader(files)) };
}
