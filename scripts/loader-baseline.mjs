/**
 * Company: EonHive Inc. | Title: Bounded Loader Baseline
 * Purpose: Measure validated eager opening through the current archive reader in isolated Node processes.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { arch, cpus, platform, release, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PRD_DEFAULT_ARCHIVE_LIMITS, assertPrdArchiveSize, createPrdContainer, readPrdArchive } from "../packages/prd-validator/dist/container.js";
import { validatePackageFiles } from "../packages/prd-validator/dist/index.js";
import { openPrdDocument } from "../packages/prd-viewer-core/dist/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const decoder = new TextDecoder();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const round = (value) => Math.round(value * 1000) / 1000;
export const LOADER_BASELINE_VERSION = "prd-loader-baseline-v1";

export function logicalFileDigest(files) {
  const entries = Object.keys(files).sort().map((path) => [path, files[path].byteLength, hash(files[path])]);
  return hash(JSON.stringify(entries));
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function checkSampleCount(count) {
  if (!Number.isInteger(count) || count < 1 || count > 25) {
    throw new Error("Sample count must be an integer from 1 to 25.");
  }
}

export async function measureLoaderArchive(path, sampleCount = 5) {
  checkSampleCount(sampleCount);
  const samples = [];
  let facts;
  let logicalSha256;
  for (let iteration = 0; iteration <= sampleCount; iteration += 1) {
    global.gc?.();
    const started = performance.now();
    const archive = await readFile(path);
    const readAt = performance.now();
    const files = readPrdArchive(archive);
    const decodedAt = performance.now();
    const validation = validatePackageFiles(files);
    if (!validation.valid) throw new Error(`Invalid benchmark package: ${JSON.stringify(validation.errors)}`);
    const validatedAt = performance.now();
    const opened = await openPrdDocument({
      has: (entry) => Object.hasOwn(files, entry),
      readText: (entry) => decoder.decode(files[entry]),
      readBinary: (entry) => files[entry]
    });
    const openedAt = performance.now();
    if (opened.supportState === "unsupported-required-capability") throw new Error("Benchmark package cannot be opened by the reference core.");

    const memory = process.memoryUsage();
    if (iteration > 0) samples.push({
      readMs: round(readAt - started), decodeMs: round(decodedAt - readAt),
      validateMs: round(validatedAt - decodedAt), interpretMs: round(openedAt - validatedAt),
      totalMs: round(openedAt - started),
      memoryAfter: { rss: memory.rss, heapUsed: memory.heapUsed, external: memory.external, arrayBuffers: memory.arrayBuffers }
    });
    // Hash outside the timed path. Every repetition must preserve the complete logical file set.
    const digest = logicalFileDigest(files);
    if (logicalSha256 && digest !== logicalSha256) throw new Error("Benchmark repetitions returned different logical files.");
    logicalSha256 = digest;
    facts = {
      archiveBytes: archive.byteLength, archiveSha256: hash(archive), logicalSha256,
      fileCount: Object.keys(files).length,
      materializedBytes: Object.values(files).reduce((total, bytes) => total + bytes.byteLength, 0),
      supportState: opened.supportState
    };
  }
  const timingKeys = ["readMs", "decodeMs", "validateMs", "interpretMs", "totalMs"];
  return {
    ...facts, samples,
    median: Object.fromEntries(timingKeys.map((key) => [key, round(median(samples.map((sample) => sample[key])))])),
    maxTotalMs: Math.max(...samples.map((sample) => sample.totalMs)),
    processPeakRssKiB: process.resourceUsage().maxRSS,
    gcExposed: typeof global.gc === "function"
  };
}

export function compareLoaderReports(before, after) {
  if (before.contractVersion !== LOADER_BASELINE_VERSION || after.contractVersion !== LOADER_BASELINE_VERSION) {
    throw new Error("Loader reports must use the same benchmark contract.");
  }
  if (before.sampleCount !== after.sampleCount || JSON.stringify(before.archiveLimits) !== JSON.stringify(after.archiveLimits)) {
    throw new Error("Loader reports must use the same sample count and archive limits.");
  }
  for (const field of ["node", "platform", "release", "arch", "cpu"]) {
    if (before.environment[field] !== after.environment[field]) throw new Error(`Loader report environment differs: ${field}.`);
  }
  const previous = new Map(before.cases.map((item) => [item.id, item]));
  if (previous.size !== before.cases.length || previous.size !== after.cases.length || new Set(after.cases.map((item) => item.id)).size !== after.cases.length) {
    throw new Error("Loader report case sets differ or contain duplicates.");
  }
  return after.cases.map((item) => {
    const earlier = previous.get(item.id);
    if (!earlier || earlier.archiveSha256 !== item.archiveSha256 || earlier.logicalSha256 !== item.logicalSha256) {
      throw new Error(`Loader report fixture bytes differ: ${item.id}.`);
    }
    return {
      id: item.id,
      decodeBeforeMs: earlier.median.decodeMs, decodeAfterMs: item.median.decodeMs,
      decodeChangePercent: round((item.median.decodeMs / earlier.median.decodeMs - 1) * 100),
      totalBeforeMs: earlier.median.totalMs, totalAfterMs: item.median.totalMs,
      peakBeforeRssKiB: earlier.processPeakRssKiB, peakAfterRssKiB: item.processPeakRssKiB
    };
  });
}

async function implementationHashes() {
  const paths = [
    "packages/prd-validator/dist/container.js", "packages/prd-validator/dist/zipRecords.js",
    "packages/prd-validator/dist/index.js", "packages/prd-viewer-core/dist/index.js"
  ];
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path, hash(await readFile(join(repoRoot, path)))])));
}

function option(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`Missing value for ${name}.`);
  return args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const measure = option(args, "--measure");
  const sampleCount = Number(option(args, "--samples") ?? 5);
  checkSampleCount(sampleCount);
  if (measure) {
    process.stdout.write(JSON.stringify(await measureLoaderArchive(measure, sampleCount)));
    return;
  }
  const output = resolve(repoRoot, option(args, "--out") ?? "examples/dist/loader-baseline.json");
  const selected = option(args, "--fixtures")?.split(",");
  const requireArchive = createRequire(new URL("../packages/prd-validator/package.json", import.meta.url));
  const { zipSync } = requireArchive("fflate");
  // Keep fixture generation and its large temporary buffers out of the measured child processes.
  const { createFixtures } = await import("./architecture-baseline.mjs");
  const fixtures = await createFixtures();
  if (selected?.some((name) => !fixtures.some((fixture) => fixture.name === name))) throw new Error("Unknown benchmark fixture.");
  const initialHashes = await implementationHashes();
  const report = {
    contractVersion: LOADER_BASELINE_VERSION, generatedAt: new Date().toISOString(), sampleCount,
    environment: { node: process.version, platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model },
    implementation: initialHashes, archiveLimits: PRD_DEFAULT_ARCHIVE_LIMITS,
    method: "One warmup then measured warm-cache repetitions; a fresh --expose-gc child per fixture/compression/transport. Decode includes envelope, record/path/budget checks, DEFLATE or stored copying, CRC and complete file materialization. Validate then parse the default root through viewer-core. Hash every logical file outside timing and check fixture parity. Peak RSS is lifetime process high-water including imports, warmup and digest checks; snapshots are after opening, not transient peaks. No app section/locale expansion, signature verification, Blob/image decode, browser layout/paint/GPU, cold-cache or device claims.",
    cases: []
  };
  const temporary = await mkdtemp(join(tmpdir(), "prd-loader-baseline-"));
  try {
    for (const fixture of fixtures.filter((item) => !selected || selected.includes(item.name))) {
      const expected = logicalFileDigest(fixture.files);
      for (const level of [0, 6]) {
        const zip = zipSync(fixture.files, { level, mtime: new Date("2026-01-01T00:00:00Z") });
        for (const transport of ["zip", "prd"]) {
          const archive = transport === "prd" ? createPrdContainer(zip) : zip;
          assertPrdArchiveSize(archive.byteLength);
          const id = `${fixture.name}/level-${level}/${transport}`;
          const path = join(temporary, "fixture.prd");
          await writeFile(path, archive);
          const measured = JSON.parse(execFileSync(process.execPath, [
            "--expose-gc", fileURLToPath(import.meta.url), "--measure", path, "--samples", String(sampleCount)
          ], { encoding: "utf8", timeout: 120_000, maxBuffer: 1024 * 1024 }));
          if (measured.logicalSha256 !== expected) throw new Error(`Decoded fixture differs from source: ${id}.`);
          report.cases.push({ id, fixture: fixture.name, compressionLevel: level, transport, ...measured });
          console.log(`${id}: decode ${measured.median.decodeMs} ms; total ${measured.median.totalMs} ms; peak RSS ${(measured.processPeakRssKiB / 1024).toFixed(1)} MiB`);
        }
      }
    }
    if (JSON.stringify(initialHashes) !== JSON.stringify(await implementationHashes())) throw new Error("Built loader changed during measurement; rebuild and rerun.");
    const compare = option(args, "--compare");
    if (compare) report.comparison = compareLoaderReports(JSON.parse(await readFile(resolve(repoRoot, compare), "utf8")), report);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Loader baseline: ${output}`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
