/**
 * Company: EonHive Inc. | Title: Asset Blob Snapshots
 * Purpose: Preserve exact asset ranges without an extra byte clone before native Blob construction.
 * Author: Stan Nesi | Created: 2026-10-30 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

export function createAssetBlob(bytes: Uint8Array, mimeType: string): Blob {
  // Blob snapshots an ordinary buffer view; shared/foreign backing stores keep the copy fallback.
  const buffer = bytes.buffer;
  const part = buffer instanceof ArrayBuffer
    ? new Uint8Array(buffer, bytes.byteOffset, bytes.byteLength)
    : new Uint8Array(bytes);
  return new Blob([part], { type: mimeType });
}
