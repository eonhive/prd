/**
 * Company: EonHive Inc. | Title: Bounded Archive Mutation Check
 * Purpose: Exercise reproducible ZIP/envelope mutations against reader safety and compatibility invariants.
 * Author: Stan Nesi | Created: 2026-10-30 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPrdContainer, PrdContainerError, readPrdArchive } from "../packages/prd-validator/dist/container.js";

const requireArchive = createRequire(new URL("../packages/prd-validator/package.json", import.meta.url));
const { strToU8, zipSync, Zip, ZipDeflate, ZipPassThrough } = requireArchive("fflate");
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXED_TIME = new Date(2026, 0, 1);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const MUTATION_LIMITS = Object.freeze({ maxArchiveBytes: 16_384, maxFileBytes: 16_384, maxExpandedBytes: 32_768, maxEntries: 16 });

function view(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function concat(parts) {
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let cursor = 0;
  for (const part of parts) { bytes.set(part, cursor); cursor += part.length; }
  return bytes;
}

function fingerprint(files) {
  return hash(JSON.stringify(Object.keys(files).sort().map((name) => [name, files[name].length, hash(files[name])])));
}

function storedZip64() {
  // Independent CRC-32 check vector with small, fully populated ZIP64 records.
  const name = strToU8("vector.txt");
  const contents = strToU8("123456789");
  const local = new Uint8Array(30 + name.length + 20 + contents.length);
  const central = new Uint8Array(46 + name.length + 28);
  const footer = new Uint8Array(98);
  const lh = view(local), cd = view(central), end = view(footer);
  lh.setUint32(0, 0x04034b50, true);
  lh.setUint16(4, 45, true);
  lh.setUint16(12, 0x5c21, true);
  lh.setUint32(14, 0xcbf43926, true);
  lh.setUint32(18, 0xffffffff, true);
  lh.setUint32(22, 0xffffffff, true);
  lh.setUint16(26, name.length, true);
  lh.setUint16(28, 20, true);
  local.set(name, 30);
  const extra = 30 + name.length;
  lh.setUint16(extra, 1, true);
  lh.setUint16(extra + 2, 16, true);
  lh.setBigUint64(extra + 4, 9n, true);
  lh.setBigUint64(extra + 12, 9n, true);
  local.set(contents, extra + 20);
  cd.setUint32(0, 0x02014b50, true);
  cd.setUint16(6, 45, true);
  cd.setUint16(14, 0x5c21, true);
  cd.setUint32(16, 0xcbf43926, true);
  cd.setUint32(20, 0xffffffff, true);
  cd.setUint32(24, 0xffffffff, true);
  cd.setUint16(28, name.length, true);
  cd.setUint16(30, 28, true);
  cd.setUint32(42, 0xffffffff, true);
  central.set(name, 46);
  const wide = 46 + name.length;
  cd.setUint16(wide, 1, true);
  cd.setUint16(wide + 2, 24, true);
  cd.setBigUint64(wide + 4, 9n, true);
  cd.setBigUint64(wide + 12, 9n, true);
  cd.setBigUint64(wide + 20, 0n, true);
  end.setUint32(0, 0x06064b50, true);
  end.setBigUint64(4, 44n, true);
  end.setUint16(12, 45, true);
  end.setUint16(14, 45, true);
  end.setBigUint64(24, 1n, true);
  end.setBigUint64(32, 1n, true);
  end.setBigUint64(40, BigInt(central.length), true);
  end.setBigUint64(48, BigInt(local.length), true);
  end.setUint32(56, 0x07064b50, true);
  end.setBigUint64(64, BigInt(local.length + central.length), true);
  end.setUint32(72, 1, true);
  end.setUint32(76, 0x06054b50, true);
  end.setUint16(84, 0xffff, true);
  end.setUint16(86, 0xffff, true);
  end.setUint32(88, 0xffffffff, true);
  end.setUint32(92, 0xffffffff, true);
  return { bytes: concat([local, central, footer]), files: { "vector.txt": contents } };
}

function stream(files, deflate) {
  const chunks = [];
  const zip = new Zip((error, chunk) => {
    if (error) throw error;
    chunks.push(chunk);
  });
  for (const [name, bytes] of Object.entries(files)) {
    const member = deflate ? new ZipDeflate(name) : new ZipPassThrough(name);
    member.mtime = FIXED_TIME;
    zip.add(member);
    member.push(bytes, true);
  }
  zip.end();
  return concat(chunks);
}

function rawName(prefix, utf8) {
  const bytes = zipSync({ [`${"x".repeat(prefix.length)}.txt`]: strToU8("data") }, { level: 0, mtime: FIXED_TIME });
  const data = view(bytes);
  const central = data.getUint32(bytes.length - 6, true);
  data.setUint16(6, utf8 ? 0x800 : 0, true);
  data.setUint16(central + 8, utf8 ? 0x800 : 0, true);
  bytes.set(prefix, 30);
  bytes.set(prefix, central + 46);
  return bytes;
}

function reorderedDirectory(bytes) {
  const data = view(bytes);
  const start = data.getUint32(bytes.length - 6, true);
  const records = [];
  for (let cursor = start; cursor < bytes.length - 22;) {
    const size = 46 + data.getUint16(cursor + 28, true) + data.getUint16(cursor + 30, true) + data.getUint16(cursor + 32, true);
    records.push(bytes.slice(cursor, cursor + size));
    cursor += size;
  }
  const result = bytes.slice();
  let cursor = start;
  for (const record of records.reverse()) { result.set(record, cursor); cursor += record.length; }
  return result;
}

function corpus() {
  const files = {
    "manifest.json": strToU8(JSON.stringify({ prdVersion: "1.0", manifestVersion: "1.0", id: "urn:prd:mutation", profile: "general-document", title: "Mutation", entry: "content/root.json" })),
    "content/root.json": strToU8(JSON.stringify({ schemaVersion: "1.0", profile: "general-document", type: "document", id: "mutation", title: "Mutation", children: [{ type: "paragraph", text: "Bounded corpus." }] })),
    "assets/café-東京-😀.txt": strToU8("PK\x07\x08 marker-like data"), "empty.txt": new Uint8Array()
  };
  const unicode = { ...files, "\uFEFFmanifest.json": strToU8("literal name"), "é.txt": strToU8("composed"), "e\u0301.txt": strToU8("decomposed"), "\uFFFD.txt": strToU8("literal replacement character") };
  const stored = zipSync(files, { level: 0, mtime: FIXED_TIME });
  return [
    { id: "stored", bytes: stored, files },
    { id: "deflate", bytes: zipSync(files, { level: 6, mtime: FIXED_TIME }), files },
    { id: "descriptor-stored", bytes: stream(files, false), files },
    { id: "descriptor-deflate", bytes: stream(files, true), files },
    { id: "zip64", ...storedZip64() },
    { id: "unicode", bytes: zipSync(unicode, { mtime: FIXED_TIME }), files: unicode },
    { id: "legacy-byte", bytes: rawName([0xe9], false), files: { "é.txt": strToU8("data") } },
    { id: "central-reordered", bytes: reorderedDirectory(stored), files }
  ];
}

function rejectedControls() {
  const invalidNames = [[0x80], [0xff], [0xc0, 0x80], [0xc0, 0xaf], [0xc2], [0xe2, 0x82], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xf5, 0x80, 0x80, 0x80], [0xf0, 0x80, 0x80, 0xaf]];
  const zip = (files) => zipSync(files, { level: 0, mtime: FIXED_TIME });
  const crc = zip({ "crc.txt": strToU8("123456789") });
  crc[30 + "crc.txt".length] ^= 1;
  const expansion = zipSync({ "zeros.bin": new Uint8Array(32_768) }, { mtime: FIXED_TIME });
  const data = view(expansion);
  data.setUint32(22, 1, true);
  data.setUint32(data.getUint32(expansion.length - 6, true) + 24, 1, true);
  const oversized = new Uint8Array(MUTATION_LIMITS.maxArchiveBytes + 1);
  oversized.set([80, 75, 3, 4]);
  return [
    ...invalidNames.map((name, index) => ({ id: `malformed-utf8-${index}`, bytes: rawName(name, true), code: "archive-read-invalid" })),
    { id: "unsafe-path", bytes: zip({ "../outside.txt": strToU8("x") }), code: "archive-member-path-invalid" },
    { id: "entry-limit", bytes: zip(Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`${index}.txt`, new Uint8Array()]))), code: "archive-entry-limit" },
    { id: "file-limit", bytes: zipSync({ "large.bin": new Uint8Array(16_385) }, { mtime: FIXED_TIME }), code: "archive-file-size-limit" },
    { id: "total-limit", bytes: zipSync({ "a.bin": new Uint8Array(12_000), "b.bin": new Uint8Array(12_000), "c.bin": new Uint8Array(12_000) }, { mtime: FIXED_TIME }), code: "archive-expanded-size-limit" },
    { id: "actual-expansion", bytes: expansion, code: "archive-file-size-limit" },
    { id: "crc", bytes: crc, code: "archive-checksum-mismatch" },
    { id: "archive-limit", bytes: oversized, code: "archive-size-limit" }
  ];
}

function randomSequence(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state ^ (state >>> 16)) >>> 0;
  };
}

function mutate(source, random) {
  const bytes = source.slice();
  const offset = random() % bytes.length;
  switch (random() % 7) {
    case 0: bytes[offset] ^= 1 << (random() % 8); return { bytes, operation: `bit:${offset}` };
    case 1: return { bytes: bytes.slice(0, offset), operation: `truncate:${offset}` };
    case 2: return { bytes: concat([bytes.subarray(0, offset), bytes.subarray(Math.min(offset + 1 + random() % 8, bytes.length))]), operation: `delete:${offset}` };
    case 3: return { bytes: concat([bytes.subarray(0, offset), Uint8Array.from({ length: 1 + random() % 8 }, () => random() & 255), bytes.subarray(offset)]), operation: `insert:${offset}` };
    case 4: {
      const width = [2, 4, 8][random() % 3];
      const start = Math.min(offset, bytes.length - width);
      const data = view(bytes);
      if (width === 2) data.setUint16(start, [0, 1, 0xffff][random() % 3], true);
      else if (width === 4) data.setUint32(start, [0, 1, 0x7fffffff, 0xffffffff][random() % 4], true);
      else data.setBigUint64(start, [0n, 1n, 1n << 60n, (1n << 64n) - 1n][random() % 4], true);
      return { bytes, operation: `field-${width}:${start}` };
    }
    case 5: return { bytes: concat([bytes, Uint8Array.from({ length: 1 + random() % 16 }, () => random() & 255)]), operation: "append" };
    default: return { bytes: Uint8Array.from({ length: random() % 257 }, () => random() & 255), operation: "noise" };
  }
}

function outcome(input, readArchive) {
  let files;
  try { files = readArchive(input, MUTATION_LIMITS); }
  catch (error) {
    if (!(error instanceof PrdContainerError) || typeof error.code !== "string") throw new Error(`Unexpected reader error: ${error?.message ?? error}`);
    return { kind: "rejected", code: error.code };
  }
  if (Object.getPrototypeOf(files) !== null) throw new Error("File map must have a null prototype.");
  const names = Object.keys(files);
  if (names.length > MUTATION_LIMITS.maxEntries) throw new Error("Returned file count exceeds the budget.");
  let total = 0;
  for (const name of names) {
    if (!name || name.startsWith("/") || /[\\\u0000-\u001f:]/u.test(name) || name.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Returned path is unsafe.");
    const bytes = files[name];
    if (!(bytes instanceof Uint8Array) || bytes.buffer === input.buffer) throw new Error("Returned bytes must be independently owned.");
    total += bytes.length;
    if (bytes.length > MUTATION_LIMITS.maxFileBytes || total > MUTATION_LIMITS.maxExpandedBytes) throw new Error("Returned bytes exceed the budget.");
  }
  return { kind: "accepted", fingerprint: fingerprint(files) };
}

export function runArchiveMutationCheck({ seed = 0xc0ffee, iterations = 2000, readArchive = readPrdArchive } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError("Seed must be an unsigned 32-bit integer.");
  if (!Number.isInteger(iterations) || iterations < 0 || iterations > 10_000) throw new RangeError("Iterations must be an integer from 0 to 10000.");
  const fixtures = corpus();
  const report = { contractVersion: "prd-archive-mutations-v1", seed, iterations, limits: MUTATION_LIMITS, status: "passed", processed: 0, accepted: 0, rejected: 0, rejectionCodes: {}, failures: [] };
  const digest = createHash("sha256");
  function check(id, bytes, expected) {
    if (report.failures.length >= 8) return;
    const originalBytes = bytes.slice();
    const original = hash(originalBytes);
    digest.update(JSON.stringify([id, original]));
    report.processed += 1;
    try {
      const first = outcome(bytes, readArchive);
      if (hash(bytes) !== original) throw new Error("Reader mutated its input.");
      const second = outcome(bytes, readArchive);
      if (hash(bytes) !== original) throw new Error("Reader mutated its input.");
      if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("Reader outcome is not deterministic.");
      if (expected?.files && (first.kind !== "accepted" || first.fingerprint !== fingerprint(expected.files))) throw new Error("Valid control differs from its complete logical source.");
      if (expected?.code && (first.kind !== "rejected" || first.code !== expected.code)) throw new Error(`Expected ${expected.code}, received ${JSON.stringify(first)}.`);
      if (first.kind === "accepted") report.accepted += 1;
      else { report.rejected += 1; report.rejectionCodes[first.code] = (report.rejectionCodes[first.code] ?? 0) + 1; }
    } catch (error) {
      report.status = "failed";
      report.failures.push({ id, message: error.message, inputBase64: Buffer.from(originalBytes).toString("base64") });
    }
  }
  for (const fixture of [...fixtures, ...rejectedControls()]) {
    check(`${fixture.id}/zip`, fixture.bytes.slice(), fixture);
    check(`${fixture.id}/prd`, createPrdContainer(fixture.bytes, { maxArchiveBytes: MUTATION_LIMITS.maxArchiveBytes + 32 }), fixture);
  }
  const random = randomSequence(seed);
  for (let index = 0; index < iterations && report.failures.length < 8; index += 1) {
    const fixture = fixtures[index % fixtures.length];
    const transport = Math.floor(index / fixtures.length) % 2 ? "prd" : "zip";
    const source = transport === "prd" ? createPrdContainer(fixture.bytes) : fixture.bytes;
    const changed = mutate(source, random);
    check(`${index}/${fixture.id}/${transport}/${changed.operation}`, changed.bytes);
  }
  return { ...report, inputDigest: digest.digest("hex"), method: "Fixed synthetic archive controls and seeded mutations only; some controls contain no PRD manifest, and semantic validation/rendering is outside this check. Each input is read twice with tight byte/count budgets; accepted controls require exact source parity. Mutants may remain valid. Check error type, deterministic outcomes, input preservation, safe null-prototype paths, owned outputs and returned byte/count limits. No exhaustive fuzz, native-memory, cross-engine or security-audit assurance." };
}

async function implementationHashes() {
  const paths = ["packages/prd-validator/dist/container.js", "packages/prd-validator/dist/zipRecords.js", "scripts/archive-mutation-check.mjs"];
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path, hash(await readFile(resolve(repoRoot, path)))])));
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`Missing ${name} value.`);
  return args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const seed = Number(option(args, "--seed", 0xc0ffee));
  const iterations = Number(option(args, "--iterations", 2000));
  if (args.includes("--child")) {
    process.stdout.write(JSON.stringify(runArchiveMutationCheck({ seed, iterations })));
    return;
  }
  const output = resolve(repoRoot, option(args, "--out", "examples/dist/archive-mutation-check.json"));
  const implementation = await implementationHashes();
  // The deadline/JS-heap guard complements reader budgets; it is not a native-memory sandbox.
  let report;
  try {
    report = JSON.parse(execFileSync(process.execPath, ["--max-old-space-size=96", fileURLToPath(import.meta.url), "--child", "--seed", String(seed), "--iterations", String(iterations)], { encoding: "utf8", timeout: 20_000, maxBuffer: 1024 * 1024 }));
    if (JSON.stringify(implementation) !== JSON.stringify(await implementationHashes())) {
      report.status = "failed";
      report.failure = "Built reader or harness changed during the mutation campaign.";
    }
  } catch (error) {
    report = { status: "failed", seed, iterations, failure: "Mutation child did not complete successfully.", detail: String(error.message).slice(0, 2000) };
  }
  report.environment = { node: process.version, platform: process.platform, arch: process.arch };
  report.implementation = implementation;
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(`Archive mutations: ${report.status}; ${report.processed ?? 0} inputs; summary ${output}`);
  if (report.status !== "passed") process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
