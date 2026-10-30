/**
 * Company: EonHive Inc. | Title: Bounded ZIP Record Inspection
 * Purpose: Resolve member boundaries and require consistent ZIP metadata before decompression.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { strFromU8 } from "fflate";

const UINT32_MAX = 0xffffffff;
// Names are exact identifiers, including any literal leading U+FEFF.
const UTF8_NAME_DECODER = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export class ZipRecordError extends Error {
  constructor(message: string, public readonly code = "archive-read-invalid") {
    super(message);
  }
}

export interface ZipMemberRecord {
  name: string;
  nameBytes: Uint8Array;
  compression: number;
  flags: number;
  crc32: number;
  size: number;
  originalSize: number;
  localOffset: number;
  zip64Sizes: boolean;
  dataOffset: number;
  endOffset: number;
}

interface ZipDirectory {
  offset: number;
  size: number;
  count: number;
  footerOffset: number;
}

function invalid(message: string): never {
  throw new ZipRecordError(message);
}

function range(offset: number, length: number, end: number): void {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || length > end - offset) {
    invalid("A ZIP record exceeds its containing record or payload.");
  }
}

function uint64(data: DataView, offset: number): number {
  const value = data.getBigUint64(offset, true);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) invalid("A ZIP64 value exceeds the supported safe integer range.");
  return Number(value);
}

function digitalSignature(data: DataView, start: number, end: number): void {
  if (start === end) return;
  range(start, 6, end);
  if (data.getUint32(start, true) !== 0x05054b50 || start + 6 + data.getUint16(start + 4, true) !== end) {
    invalid("The ZIP central-directory extent does not match its records.");
  }
  // This optional ZIP record is opaque metadata, not PRD signature verification.
}

function directoryAt(data: DataView, endOffset: number): ZipDirectory {
  const disk = data.getUint16(endOffset + 4, true);
  const centralDisk = data.getUint16(endOffset + 6, true);
  const diskCount = data.getUint16(endOffset + 8, true);
  const count = data.getUint16(endOffset + 10, true);
  const size = data.getUint32(endOffset + 12, true);
  const offset = data.getUint32(endOffset + 16, true);
  const locator = endOffset - 20;
  const hasZip64 = locator >= 0 && data.getUint32(locator, true) === 0x07064b50;
  const needsZip64 = disk === 0xffff || centralDisk === 0xffff || count === 0xffff || diskCount === 0xffff || size === UINT32_MAX || offset === UINT32_MAX;
  if (needsZip64 && !hasZip64) invalid("The ZIP64 end locator is missing.");
  if (!hasZip64) {
    if (disk !== 0 || centralDisk !== 0 || diskCount !== count) invalid("Split ZIP archives or inconsistent entry counts are not supported.");
    return { offset, size, count, footerOffset: endOffset };
  }

  if (data.getUint32(locator + 4, true) !== 0 || data.getUint32(locator + 16, true) !== 1) {
    invalid("Split ZIP64 archives are not supported.");
  }
  const record = uint64(data, locator + 8);
  range(record, 56, locator);
  if (data.getUint32(record, true) !== 0x06064b50) invalid("The ZIP64 end record is missing.");
  const recordSize = uint64(data, record + 4);
  if (recordSize < 44 || recordSize !== locator - record - 12) invalid("The ZIP64 end record has an inconsistent length.");
  if (data.getUint32(record + 16, true) !== 0 || data.getUint32(record + 20, true) !== 0) {
    invalid("Split ZIP64 archives are not supported.");
  }
  const fullCount = uint64(data, record + 32);
  const fullSize = uint64(data, record + 40);
  const fullOffset = uint64(data, record + 48);
  if (uint64(data, record + 24) !== fullCount ||
      (disk !== 0 && disk !== 0xffff) || (centralDisk !== 0 && centralDisk !== 0xffff) ||
      (diskCount !== 0xffff && diskCount !== fullCount) || (count !== 0xffff && count !== fullCount) ||
      (size !== UINT32_MAX && size !== fullSize) || (offset !== UINT32_MAX && offset !== fullOffset)) {
    invalid("ZIP64 and legacy end records disagree.");
  }
  return { offset: fullOffset, size: fullSize, count: fullCount, footerOffset: record };
}

function readDirectory(data: DataView): ZipDirectory {
  for (let offset = data.byteLength - 22; offset >= Math.max(0, data.byteLength - 65557); offset -= 1) {
    if (data.getUint32(offset, true) !== 0x06054b50) continue;
    if (offset + 22 + data.getUint16(offset + 20, true) !== data.byteLength) continue;
    const directory = directoryAt(data, offset);
    range(directory.offset, directory.size, directory.footerOffset);
    digitalSignature(data, directory.offset + directory.size, directory.footerOffset);
    return directory;
  }
  return invalid("The ZIP package has no complete end record.");
}

function zip64Extra(payload: Uint8Array, start: number, length: number): DataView | undefined {
  const data = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const end = start + length;
  let result: DataView | undefined;
  for (let offset = start; offset < end;) {
    range(offset, 4, end);
    const id = data.getUint16(offset, true);
    const size = data.getUint16(offset + 2, true);
    range(offset + 4, size, end);
    if (id === 1) {
      if (result) invalid("Duplicate ZIP64 extra fields are ambiguous.");
      result = new DataView(payload.buffer, payload.byteOffset + offset + 4, size);
    }
    offset += 4 + size;
  }
  return result;
}

function expandedFields(originalSize: number, size: number, localOffset: number, disk: number, extra?: DataView) {
  let cursor = 0;
  const take = (width = 8): number => {
    if (!extra) return invalid("A required ZIP64 extra field is missing.");
    range(cursor, width, extra.byteLength);
    const value = width === 8 ? uint64(extra, cursor) : extra.getUint32(cursor, true);
    cursor += width;
    return value;
  };
  return {
    originalSize: originalSize === UINT32_MAX ? take() : originalSize,
    size: size === UINT32_MAX ? take() : size,
    localOffset: localOffset === UINT32_MAX ? take() : localOffset,
    disk: disk === 0xffff ? take(4) : disk
  };
}

function memberName(bytes: Uint8Array, flags: number): string {
  if (!(flags & 0x0800)) return strFromU8(bytes, true);
  try {
    return UTF8_NAME_DECODER.decode(bytes);
  } catch {
    return invalid("A ZIP member declares UTF-8 but its name has invalid encoded bytes.");
  }
}

function readMember(payload: Uint8Array, data: DataView, offset: number, end: number): { member: ZipMemberRecord; next: number } {
  range(offset, 46, end);
  if (data.getUint32(offset, true) !== 0x02014b50) invalid("A ZIP central-directory header is missing.");
  const flags = data.getUint16(offset + 8, true);
  if ((flags & ~0x080e) !== 0) invalid("Encrypted, patched or reserved ZIP flags are not supported.");
  const nameLength = data.getUint16(offset + 28, true);
  const extraLength = data.getUint16(offset + 30, true);
  const next = offset + 46 + nameLength + extraLength + data.getUint16(offset + 32, true);
  range(offset, next - offset, end);
  const extra = zip64Extra(payload, offset + 46 + nameLength, extraLength);
  const originalSize = data.getUint32(offset + 24, true);
  const size = data.getUint32(offset + 20, true);
  const fields = expandedFields(originalSize, size, data.getUint32(offset + 42, true), data.getUint16(offset + 34, true), extra);
  if (fields.disk !== 0) invalid("A ZIP member refers to another disk.");
  const nameBytes = payload.subarray(offset + 46, offset + 46 + nameLength);
  return {
    member: {
      name: memberName(nameBytes, flags), nameBytes, flags,
      compression: data.getUint16(offset + 10, true), crc32: data.getUint32(offset + 16, true),
      ...fields, zip64Sizes: originalSize === UINT32_MAX || size === UINT32_MAX,
      dataOffset: 0, endOffset: 0
    },
    next
  };
}

function descriptorEnd(data: DataView, offset: number, end: number, member: ZipMemberRecord, wide: boolean): number {
  const length = wide ? 20 : 12;
  // A signatureless descriptor's CRC may itself equal the optional signature value.
  for (const signatureBytes of [0, 4]) {
    if (length + signatureBytes > end - offset) continue;
    if (signatureBytes && data.getUint32(offset, true) !== 0x08074b50) continue;
    const start = offset + signatureBytes;
    const size = wide ? data.getBigUint64(start + 4, true) : BigInt(data.getUint32(start + 4, true));
    const originalSize = wide ? data.getBigUint64(start + 12, true) : BigInt(data.getUint32(start + 8, true));
    if (data.getUint32(start, true) === member.crc32 && size === BigInt(member.size) && originalSize === BigInt(member.originalSize)) {
      return start + length;
    }
  }
  return invalid("A ZIP data descriptor is missing or disagrees with the central directory.");
}

function inspectLocal(payload: Uint8Array, data: DataView, member: ZipMemberRecord, end: number): void {
  const offset = member.localOffset;
  range(offset, 30, end);
  if (data.getUint32(offset, true) !== 0x04034b50 ||
      data.getUint16(offset + 6, true) !== member.flags || data.getUint16(offset + 8, true) !== member.compression) {
    invalid("ZIP local and central member headers disagree.");
  }
  const nameLength = data.getUint16(offset + 26, true);
  const extraLength = data.getUint16(offset + 28, true);
  const start = offset + 30 + nameLength + extraLength;
  range(offset, start - offset, end);
  if (nameLength !== member.nameBytes.length || !member.nameBytes.every((byte, index) => byte === payload[offset + 30 + index])) {
    invalid("ZIP local and central member names disagree.");
  }
  const extra = zip64Extra(payload, offset + 30 + nameLength, extraLength);
  const fields = expandedFields(data.getUint32(offset + 22, true), data.getUint32(offset + 18, true), 0, 0, extra);
  const crc32 = data.getUint32(offset + 14, true);
  const deferred = (member.flags & 8) !== 0;
  if ((crc32 !== member.crc32 && (!deferred || crc32 !== 0)) ||
      (fields.size !== member.size && (!deferred || fields.size !== 0)) ||
      (fields.originalSize !== member.originalSize && (!deferred || fields.originalSize !== 0))) {
    invalid("ZIP local sizes or CRC disagree with the central directory.");
  }
  range(start, member.size, end);
  member.dataOffset = start;
  member.endOffset = deferred ? descriptorEnd(data, start + member.size, end, member, !!extra || member.zip64Sizes) : start + member.size;
}

function rejectUnlistedLocals(data: DataView, start: number, end: number): void {
  for (let offset = start; offset + 4 <= end; offset += 1) {
    if (data.getUint32(offset, true) === 0x04034b50) invalid("ZIP local member data is absent from the central directory.");
  }
}

export function inspectZipRecords(payload: Uint8Array, maxEntries: number): ZipMemberRecord[] {
  const data = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const directory = readDirectory(data);
  if (directory.count > maxEntries) throw new ZipRecordError("The ZIP package contains too many members.", "archive-entry-limit");
  const members: ZipMemberRecord[] = [];
  let cursor = directory.offset;
  for (let index = 0; index < directory.count; index += 1) {
    const result = readMember(payload, data, cursor, directory.offset + directory.size);
    members.push(result.member);
    cursor = result.next;
  }
  digitalSignature(data, cursor, directory.offset + directory.size);

  const ordered = [...members].sort((left, right) => left.localOffset - right.localOffset);
  cursor = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    const member = ordered[index]!;
    range(member.localOffset, 30, directory.offset);
    if (member.localOffset < cursor) invalid("ZIP local member ranges overlap.");
    rejectUnlistedLocals(data, cursor, member.localOffset);
    const nextOffset = ordered[index + 1]?.localOffset ?? directory.offset;
    inspectLocal(payload, data, member, Math.min(nextOffset, directory.offset));
    cursor = member.endOffset;
  }
  rejectUnlistedLocals(data, cursor, directory.offset);
  return ordered;
}
