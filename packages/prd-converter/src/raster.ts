/**
 * Company: EonHive Inc. | Title: Conversion Raster Signatures
 * Purpose: Screen existing raster formats consistently in Node and browser imports.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
export function rasterType(bytes: Uint8Array, extension: string): string | undefined {
  const starts = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (extension === ".png" && starts([137, 80, 78, 71, 13, 10, 26, 10])) return "image/png";
  if ([".jpg", ".jpeg"].includes(extension) && starts([255, 216, 255])) return "image/jpeg";
  if (extension === ".gif" && /^GIF8[79]a$/u.test(ascii(0, 6))) return "image/gif";
  if (extension === ".webp" && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return undefined;
}
