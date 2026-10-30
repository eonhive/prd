/**
 * Company: EonHive Inc. | Title: PRD Container Reader
 * Purpose: Identify PRD envelopes and legacy ZIP packages, and decode archives within explicit limits.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */

import { Inflate } from "fflate";
import type { PrdFileMap } from "./index.js";
import { inspectZipRecords, ZipRecordError, type ZipMemberRecord } from "./zipRecords.js";

export const PRD_CONTAINER_MAGIC = Object.freeze([0x50, 0x52, 0x44, 0x00] as const);
export const PRD_CONTAINER_HEADER_SIZE = 16;
export type PrdContainerKind = "zip" | "prd";

export interface PrdArchiveLimits {
  maxArchiveBytes: number;
  maxExpandedBytes: number;
  maxFileBytes: number;
  maxEntries: number;
}

export const PRD_DEFAULT_ARCHIVE_LIMITS: Readonly<PrdArchiveLimits> = Object.freeze({
  maxArchiveBytes: 64 * 1024 * 1024,
  maxExpandedBytes: 128 * 1024 * 1024,
  maxFileBytes: 32 * 1024 * 1024,
  maxEntries: 10_000
});

export class PrdContainerError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "PrdContainerError";
  }
}

function fail(code: string, message: string): never {
  throw new PrdContainerError(code, message);
}

function resolveLimits(overrides: Partial<PrdArchiveLimits>): PrdArchiveLimits {
  const limits = { ...PRD_DEFAULT_ARCHIVE_LIMITS, ...overrides };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive safe integer.`);
    }
  }
  return limits;
}

export function assertPrdArchiveSize(size: number, overrides: Partial<PrdArchiveLimits> = {}): void {
  const limits = resolveLimits(overrides);
  if (!Number.isSafeInteger(size) || size < 0 || size > limits.maxArchiveBytes) {
    fail("archive-size-limit", `PRD archive exceeds the ${limits.maxArchiveBytes}-byte reader limit.`);
  }
}

function hasZipMagic(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && (
    (bytes[2] === 0x03 && bytes[3] === 0x04) ||
    (bytes[2] === 0x05 && bytes[3] === 0x06)
  );
}

export function readPrdContainer(
  bytes: Uint8Array,
  overrides: Partial<PrdArchiveLimits> = {}
): { kind: PrdContainerKind; payload: Uint8Array } {
  assertPrdArchiveSize(bytes.byteLength, overrides);
  const hasPrdPrefix = bytes.length > 0 && PRD_CONTAINER_MAGIC
    .slice(0, Math.min(bytes.length, PRD_CONTAINER_MAGIC.length))
    .every((value, index) => bytes[index] === value);

  if (!hasPrdPrefix) {
    if (!hasZipMagic(bytes)) fail("archive-magic-invalid", "Expected a PRD v1 envelope or a legacy ZIP package.");
    return { kind: "zip", payload: bytes };
  }

  if (bytes.byteLength < PRD_CONTAINER_HEADER_SIZE) {
    fail("container-header-truncated", "The PRD container header must contain 16 bytes.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, PRD_CONTAINER_HEADER_SIZE);
  if (view.getUint8(4) !== 1 || view.getUint8(5) !== 0) {
    fail("container-version-unsupported", "Only PRD container version 1.0 is supported.");
  }
  if (view.getUint16(6, true) !== 0) {
    fail("container-flags-unsupported", "PRD container 1.0 requires zero reserved flags.");
  }
  // Compare as bigint before any conversion or allocation based on an untrusted length.
  if (view.getBigUint64(8, true) !== BigInt(bytes.byteLength - PRD_CONTAINER_HEADER_SIZE)) {
    fail("container-length-mismatch", "The PRD payload length does not match the available bytes.");
  }
  const payload = bytes.subarray(PRD_CONTAINER_HEADER_SIZE);
  if (!hasZipMagic(payload)) fail("archive-magic-invalid", "The PRD container payload must be a ZIP archive.");
  return { kind: "prd", payload };
}

export function createPrdContainer(
  payload: Uint8Array,
  overrides: Partial<PrdArchiveLimits> = {}
): Uint8Array {
  assertPrdArchiveSize(payload.byteLength + PRD_CONTAINER_HEADER_SIZE, overrides);
  if (!hasZipMagic(payload)) fail("archive-magic-invalid", "The PRD container payload must be a ZIP archive.");
  const bytes = new Uint8Array(PRD_CONTAINER_HEADER_SIZE + payload.byteLength);
  bytes.set(PRD_CONTAINER_MAGIC);
  const view = new DataView(bytes.buffer);
  view.setUint8(4, 1);
  view.setUint8(5, 0);
  view.setUint16(6, 0, true);
  view.setBigUint64(8, BigInt(payload.byteLength), true);
  bytes.set(payload, PRD_CONTAINER_HEADER_SIZE);
  return bytes;
}

function validateMemberName(name: string): string {
  const path = name.endsWith("/") ? name.slice(0, -1) : name;
  if (
    path.length === 0 || path.startsWith("/") || /[\\\u0000-\u001f:]/u.test(path) ||
    path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    fail("archive-member-path-invalid", `Unsafe package member path: ${JSON.stringify(name)}.`);
  }
  return path;
}

function inspectMembers(payload: Uint8Array, limits: PrdArchiveLimits): Map<string, ZipMemberRecord> {
  const members = new Map<string, ZipMemberRecord>();
  const paths = new Map<string, boolean>();
  let expandedBytes = 0;
  for (const member of inspectZipRecords(payload, limits.maxEntries)) {
    const path = validateMemberName(member.name);
    if (paths.has(path)) fail("archive-member-duplicate", `Duplicate package member: ${JSON.stringify(member.name)}.`);
    if (members.size >= limits.maxEntries) fail("archive-entry-limit", "The ZIP package contains too many members.");
    if (!Number.isSafeInteger(member.originalSize) || member.originalSize < 0 || member.originalSize > limits.maxFileBytes) {
      fail("archive-file-size-limit", "A ZIP member exceeds the expanded file-size limit.");
    }
    expandedBytes += member.originalSize;
    if (expandedBytes > limits.maxExpandedBytes) fail("archive-expanded-size-limit", "The ZIP package exceeds the expanded-size limit.");
    if (member.compression !== 0 && member.compression !== 8) fail("archive-read-invalid", "Only stored and DEFLATE ZIP members are supported.");
    if (member.compression === 0 && member.size !== member.originalSize) fail("archive-read-invalid", "A stored ZIP member has inconsistent sizes.");
    paths.set(path, member.name.endsWith("/"));
    members.set(member.name, member);
  }
  for (const path of paths.keys()) {
    const segments = path.split("/");
    segments.pop();
    while (segments.length > 0) {
      if (paths.get(segments.join("/")) === false) fail("archive-member-duplicate", "A ZIP file path is also used as a directory.");
      segments.pop();
    }
  }
  return members;
}

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});

function updateCrc32(crc: number, bytes: Uint8Array): number {
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return crc;
}

function decodeMembers(payload: Uint8Array, members: Map<string, ZipMemberRecord>, limits: PrdArchiveLimits): PrdFileMap {
  const files: PrdFileMap = Object.create(null);
  let totalBytes = 0;
  for (const member of members.values()) {
    let fileBytes = 0;
    let crc32 = -1;
    let completed = false;
    const chunks: Uint8Array[] = [];
    const receive = (chunk: Uint8Array, final: boolean) => {
      if (completed) fail("archive-read-invalid", "A ZIP member emitted data after completion.");
      fileBytes += chunk.byteLength;
      totalBytes += chunk.byteLength;
      // Enforce actual output too: forged size metadata must not bypass the budget.
      if (fileBytes > limits.maxFileBytes) fail("archive-file-size-limit", "A decoded member exceeds the expanded file-size limit.");
      if (totalBytes > limits.maxExpandedBytes) fail("archive-expanded-size-limit", "Decoded package data exceeds the expanded-size limit.");
      if (fileBytes > member.originalSize) fail("archive-read-invalid", "A decoded ZIP member exceeds its declared size.");
      crc32 = updateCrc32(crc32, chunk);
      if (chunk.byteLength > 0) chunks.push(chunk);
      if (!final) return;
      if (fileBytes !== member.originalSize) fail("archive-read-invalid", "A decoded ZIP member does not match its declared size.");
      if (((crc32 ^ -1) >>> 0) !== member.crc32) fail("archive-checksum-mismatch", "A ZIP member's decoded bytes do not match its CRC-32 checksum.");
      completed = true;
    };

    const inflater = member.compression === 8 ? new Inflate(receive) : undefined;
    const push = (chunk: Uint8Array, final: boolean) => inflater ? inflater.push(chunk, final) : receive(chunk, final);
    const dataEnd = member.dataOffset + member.size;
    if (member.size === 0) push(new Uint8Array(), true);
    // Stored bytes cannot expand. Larger windows reduce view/callback churn while DEFLATE stays bounded at 1 KiB.
    const chunkSize = member.compression === 0 ? 64 * 1024 : 1024;
    for (let offset = member.dataOffset; offset < dataEnd; offset += chunkSize) {
      push(payload.subarray(offset, Math.min(offset + chunkSize, dataEnd)), offset + chunkSize >= dataEnd);
    }
    if (!completed) fail("archive-read-invalid", "The ZIP package is missing member data.");
    if (member.name.endsWith("/")) {
      if (fileBytes !== 0) fail("archive-read-invalid", "ZIP directory entries must be empty.");
      continue;
    }
    const bytes = new Uint8Array(fileBytes);
    let offset = 0;
    for (const part of chunks) {
      bytes.set(part, offset);
      offset += part.byteLength;
    }
    files[member.name] = bytes;
  }
  return files;
}

export function readPrdArchive(bytes: Uint8Array, overrides: Partial<PrdArchiveLimits> = {}): PrdFileMap {
  const limits = resolveLimits(overrides);
  const { payload } = readPrdContainer(bytes, limits);
  try {
    return decodeMembers(payload, inspectMembers(payload, limits), limits);
  } catch (error) {
    if (error instanceof PrdContainerError) throw error;
    if (error instanceof ZipRecordError) fail(error.code, error.message);
    fail("archive-read-invalid", "The PRD payload could not be decoded as a valid ZIP package.");
  }
}
