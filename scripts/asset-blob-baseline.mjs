/**
 * Company: EonHive Inc. | Title: Asset Blob Allocation Baseline
 * Purpose: Compare the former Viewer byte clone with direct Blob snapshot preparation under Node.
 * Author: Stan Nesi | Created: 2026-10-30 | Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { arch, cpus, platform } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAssetBlob } from "../apps/prd-viewer-web/src/assetBlob.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const round = (value) => Math.round(value * 1000) / 1000;
const strategies = ["copy-before-blob", "direct-buffer-view"];

function sources() {
  return Array.from({ length: 8 }, (_, asset) => {
    const backing = new Uint8Array(4 * 1024 * 1024 + 44).fill(255);
    const bytes = backing.subarray(31, backing.length - 13);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = (index * 31 + asset * 17) & 255;
    return bytes;
  });
}

function formerViewerBlob(bytes) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "application/octet-stream" });
}

async function measure(strategy) {
  if (!strategies.includes(strategy)) throw new Error("Unknown Blob benchmark strategy.");
  const files = sources();
  const expected = files.map(hash);
  const bytes = files.reduce((total, file) => total + file.byteLength, 0);
  const samples = [];
  for (let iteration = 0; iteration < 6; iteration += 1) {
    global.gc?.();
    const before = process.memoryUsage();
    const started = performance.now();
    const blobs = files.map((file) => strategy === "copy-before-blob" ? formerViewerBlob(file) : createAssetBlob(file, "application/octet-stream"));
    const elapsed = performance.now() - started;
    const after = process.memoryUsage();
    if (iteration > 0) samples.push({
      constructMs: round(elapsed), before, after,
      addedArrayBufferBytes: after.arrayBuffers - before.arrayBuffers
    });
    // Reading for byte parity is outside timing, but still included in lifetime process peak RSS.
    for (let index = 0; index < blobs.length; index += 1) {
      if (blobs[index].size !== files[index].byteLength || hash(new Uint8Array(await blobs[index].arrayBuffer())) !== expected[index]) {
        throw new Error("Blob bytes differ from the exact source view.");
      }
    }
  }
  const times = samples.map((sample) => sample.constructMs).sort((left, right) => left - right);
  return {
    strategy, sourceBytes: bytes, sourceCount: files.length, sourceSha256: expected,
    explicitPreBlobCloneBytes: strategy === "copy-before-blob" ? bytes : 0,
    samples, medianConstructMs: times[2], processPeakRssKiB: process.resourceUsage().maxRSS,
    gcExposed: typeof global.gc === "function"
  };
}

async function implementationHashes() {
  const paths = ["apps/prd-viewer-web/src/assetBlob.ts", "scripts/asset-blob-baseline.mjs"];
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path, hash(await readFile(resolve(repoRoot, path)))])));
}

async function main() {
  const args = process.argv.slice(2);
  const measureIndex = args.indexOf("--measure");
  if (measureIndex >= 0) {
    process.stdout.write(JSON.stringify(await measure(args[measureIndex + 1])));
    return;
  }
  const outputIndex = args.indexOf("--out");
  if (outputIndex >= 0 && (!args[outputIndex + 1] || args[outputIndex + 1].startsWith("--"))) throw new Error("Missing --out path.");
  const output = resolve(repoRoot, outputIndex >= 0 ? args[outputIndex + 1] : "examples/dist/asset-blob-baseline.json");
  const implementation = await implementationHashes();
  const cases = strategies.map((strategy) => JSON.parse(execFileSync(process.execPath, [
    "--expose-gc", "--import", "tsx", fileURLToPath(import.meta.url), "--measure", strategy
  ], { cwd: repoRoot, encoding: "utf8", timeout: 60_000, maxBuffer: 1024 * 1024 })));
  if (JSON.stringify(cases[0].sourceSha256) !== JSON.stringify(cases[1].sourceSha256)) throw new Error("Blob fixture sets differ.");
  if (JSON.stringify(implementation) !== JSON.stringify(await implementationHashes())) throw new Error("Blob implementation changed during measurement.");
  const report = {
    contractVersion: "prd-asset-blob-baseline-v1", generatedAt: new Date().toISOString(),
    environment: { node: process.version, platform: platform(), arch: arch(), cpu: cpus()[0]?.model },
    implementation,
    method: "Node native Blob, not browser memory/rendering. Fresh GC-enabled child per strategy; eight offset views totaling 32 MiB. One warmup and five measured construction samples. GC before each; memory snapshots immediately before/after construction. Explicit clone count follows the measured source paths; byte parity is checked afterward. Lifetime RSS includes tsx imports, source creation, warmup and Blob read-back verification. Interactive host; no universal latency/heap/GC guarantee.",
    cases
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(cases.map((item) => `${item.strategy}: ${item.medianConstructMs} ms; ${item.explicitPreBlobCloneBytes} explicit clone bytes; peak RSS ${(item.processPeakRssKiB / 1024).toFixed(1)} MiB`).join("\n"));
  console.log(`Asset Blob baseline: ${output}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
