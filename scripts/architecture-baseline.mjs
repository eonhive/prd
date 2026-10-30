/**
 * Company: EonHive Inc. | Title: Architecture Audit Baseline
 * Purpose: Measure bounded package fixtures and reproduce architecture gaps without changing runtime behavior.
 * Author: Stan Nesi | Created: 2026-10-26 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { arch, cpus, platform, release, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { validatePackageFiles } from "../packages/prd-validator/dist/index.js";
import { validatePrdArchive } from "../packages/prd-validator/dist/node.js";
import { packDirectoryToBuffer } from "../packages/prd-packager/dist/index.js";
import { openPrdDocument } from "../packages/prd-viewer-core/dist/index.js";

// Use the archive library already owned by the validator, without adding a dependency.
const requireArchive = createRequire(new URL("../packages/prd-validator/package.json", import.meta.url));
const { unzipSync, zipSync } = requireArchive("fflate");
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const encode = (value) => encoder.encode(JSON.stringify(value));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const round = (value) => Math.round(value * 1000) / 1000;

function createReader(files) {
  return {
    has: (path) => Object.hasOwn(files, path),
    readText: (path) => decoder.decode(files[path]),
    readBinary: (path) => files[path],
  };
}

async function collectFiles(directory, prefix = "") {
  const files = {};
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name.startsWith(".")) continue;
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      Object.assign(files, await collectFiles(join(directory, entry.name), `${path}/`));
    } else if (entry.isFile()) {
      files[path] = new Uint8Array(await readFile(join(directory, entry.name)));
    }
  }
  return files;
}

function createDocument(name, children = [{ type: "paragraph", text: "Audit fixture." }]) {
  return {
    "manifest.json": encode({
      prdVersion: "1.0", manifestVersion: "1.0", id: `urn:prd:audit:${name}`,
      profile: "general-document", title: name, entry: "content/root.json",
    }),
    "content/root.json": encode({
      schemaVersion: "1.0", profile: "general-document", type: "document",
      id: name, title: name, children,
    }),
  };
}

function updateManifest(files, values) {
  return { ...files, "manifest.json": encode({ ...JSON.parse(decoder.decode(files["manifest.json"])), ...values }) };
}

function seededBytes(length) {
  const bytes = new Uint8Array(length);
  let seed = 123456789;
  for (let index = 0; index < length; index += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    bytes[index] = seed & 255;
  }
  return bytes;
}

function pngChunk(type, bytes) {
  const name = Buffer.from(type);
  const chunk = Buffer.alloc(bytes.length + 12);
  chunk.writeUInt32BE(bytes.length);
  name.copy(chunk, 4);
  bytes.copy(chunk, 8);
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, chunk.length - 4);
  return chunk;
}

function createLargePng() {
  const size = 4096;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const offset = row * (size * 4 + 1) + 1 + column * 4;
      rows[offset] = column % 256;
      rows[offset + 1] = row % 256;
      rows[offset + 2] = 128;
      rows[offset + 3] = 255;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header), pngChunk("IDAT", deflateSync(rows)), pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export async function createFixtures() {
  const fixtures = [];
  for (const name of ["document-basic", "document-segmented-basic", "resume-basic", "comic-basic", "storyboard-basic"]) {
    fixtures.push({ name, files: await collectFiles(join(repoRoot, "examples", name)) });
  }
  const sections = Array.from({ length: 1000 }, (_, index) => ({
    type: "section", id: `section-${index}`, title: `Section ${index}`,
    children: Array.from({ length: 5 }, (_, paragraph) => ({
      type: "paragraph", id: `paragraph-${index}-${paragraph}`,
      text: `Section ${index}, paragraph ${paragraph}. ${"Portable semantic content. ".repeat(10)}`,
    })),
  }));
  fixtures.push({ name: "long-1000-sections", files: createDocument("long-1000-sections", sections) });
  const assetFiles = createDocument("assets-32-mib");
  const assets = Array.from({ length: 8 }, (_, index) => {
    const href = `assets/blob-${index}.bin`;
    assetFiles[href] = seededBytes(4 * 1024 * 1024);
    return { id: `blob-${index}`, href, type: "application/octet-stream" };
  });
  fixtures.push({ name: "assets-32-mib", files: updateManifest(assetFiles, { assets }) });
  const imageFiles = createDocument("images-4x4096");
  const png = createLargePng();
  const panels = Array.from({ length: 4 }, (_, index) => ({
    id: `panel-${index}`, asset: `image-${index}`, alt: `4096 square gradient ${index}`,
  }));
  const imageAssets = panels.map((panel, index) => {
    const href = `assets/image-${index}.png`;
    imageFiles[href] = png;
    return { id: panel.asset, href, type: "image/png" };
  });
  imageFiles["content/root.json"] = encode({
    schemaVersion: "1.0", profile: "comic", type: "comic", id: "images-4x4096",
    title: "images-4x4096", panels,
  });
  fixtures.push({ name: "images-4x4096", files: updateManifest(imageFiles, {
    profile: "comic", assets: imageAssets,
    compatibility: { capabilities: { optional: ["panel-navigation"] } },
  }) });
  return fixtures;
}

async function measureArchive(path, strategy) {
  const samples = [];
  let materializedBytes = 0;
  for (let iteration = 0; iteration < 6; iteration += 1) {
    global.gc?.();
    const started = performance.now();
    const archive = new Uint8Array(await readFile(path));
    const readAt = performance.now();
    const files = unzipSync(archive, strategy === "content-only-probe" ? {
      filter: ({ name }) => name === "manifest.json" || name.startsWith("content/"),
    } : undefined);
    const unzippedAt = performance.now();
    const validation = strategy === "eager" ? validatePackageFiles(files) : null;
    if (validation && !validation.valid) throw new Error(JSON.stringify(validation.errors));
    const validatedAt = performance.now();
    await openPrdDocument(createReader(files));
    const openedAt = performance.now();
    materializedBytes = Object.values(files).reduce((total, file) => total + file.byteLength, 0);
    if (iteration > 0) samples.push({
      readMs: round(readAt - started), unzipMs: round(unzippedAt - readAt),
      validateMs: validation ? round(validatedAt - unzippedAt) : null,
      interpretMs: round(openedAt - validatedAt), totalMs: round(openedAt - started),
    });
  }
  const median = (key) => samples.map((sample) => sample[key]).sort((a, b) => a - b)[2];
  return {
    strategy, samples, materializedBytes,
    median: Object.fromEntries(Object.keys(samples[0]).map((key) => [key, samples[0][key] === null ? null : median(key)])),
    maxTotalMs: Math.max(...samples.map((sample) => sample.totalMs)),
    processPeakRssKiB: process.resourceUsage().maxRSS,
  };
}

async function runProbes(tempDirectory) {
  const base = createDocument("probe");
  const probes = {};
  for (const [name, values] of Object.entries({
    requiredCapabilityObject: { compatibility: { capabilities: { required: ["audit.unsupported"] } } },
    requiredCapabilityArray: { compatibility: { capabilities: ["audit.unsupported"] } },
    requiredExtension: { extensions: [{ id: "audit.unsupported", version: "1.0", required: true }] },
    futureVersion: { prdVersion: "999.0", manifestVersion: "999.0", compatibility: { minViewer: "999.0" } },
  })) {
    const files = updateManifest(base, values);
    const validation = validatePackageFiles(files);
    const opened = await openPrdDocument(createReader(files));
    probes[name] = { valid: validation.valid, warningCodes: validation.warnings.map((issue) => issue.code), supportState: opened.supportState };
  }
  for (const member of ["../outside.txt", "/absolute.txt", "assets\\backslash.txt"]) {
    const path = join(tempDirectory, "unsafe-member.prd");
    await writeFile(path, zipSync({ ...base, [member]: encoder.encode("bounded inert probe") }));
    const result = await validatePrdArchive(path);
    probes[`archiveMember:${member}`] = { valid: result.valid, errorCodes: result.errors.map((issue) => issue.code) };
  }
  const compressedPath = join(tempDirectory, "bounded-expansion.prd");
  const expanded = { ...base, "assets/zeros.bin": new Uint8Array(8 * 1024 * 1024) };
  const archive = zipSync(expanded);
  await writeFile(compressedPath, archive);
  probes.boundedExpansion = {
    archiveBytes: archive.byteLength, expandedBytes: 8 * 1024 * 1024,
    valid: (await validatePrdArchive(compressedPath)).valid,
  };
  const unsafeLink = createDocument("unsafe-link", [{ type: "links", style: "list", items: [{ label: "Unsafe", href: "javascript:alert(1)" }] }]);
  probes.javascriptLink = { valid: validatePackageFiles(unsafeLink).valid };
  probes.remoteCoreAsset = { valid: validatePackageFiles(updateManifest(base, {
    assets: [{ id: "remote", href: "https://example.invalid/image.png", type: "image/png" }],
  })).valid };
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = ajv.compile(JSON.parse(await readFile(join(repoRoot, "schemas/content.schema.json"), "utf8")));
  probes.contentSchema = [];
  for (const name of ["document-basic", "document-segmented-basic", "resume-basic"]) {
    const files = await collectFiles(join(repoRoot, "examples", name));
    const schemaValid = schema(JSON.parse(decoder.decode(files["content/root.json"])));
    probes.contentSchema.push({ name, packageValid: validatePackageFiles(files).valid, schemaValid, schemaErrorCount: schema.errors?.length ?? 0 });
  }
  const source = join(repoRoot, "examples/document-basic");
  const first = await packDirectoryToBuffer(source);
  // ZIP timestamps have two-second granularity; cross that boundary without changing source files.
  await new Promise((done) => setTimeout(done, 2200));
  const second = await packDirectoryToBuffer(source);
  probes.repeatPack = { byteIdentical: hash(first) === hash(second), firstSha256: hash(first), secondSha256: hash(second) };
  return probes;
}

function browserHarness() {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>PRD audit measurement harness</title></head>
<body><pre id="audit-metrics" style="position:fixed;bottom:0;right:0;z-index:99999;background:white;color:black;max-height:25vh;overflow:auto;font:12px monospace">Choose a local audit fixture in the real Viewer.</pre><div id="root"></div>
<script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
</script>
<script>
// Observe native input and rendered DOM; the harness does not invoke app handlers or read React state.
history.replaceState(null, '', '/viewer/?audit=1');
const output = document.getElementById('audit-metrics');
const results = { environment: { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], build: 'Vite development with React StrictMode; two frames after DOM commit, not first raster or browser peak memory' }, opens: [], navigation: [] };
let pending;
function show() { output.textContent = JSON.stringify(results, null, 2); }
document.addEventListener('change', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.type === 'file' && event.target.files[0]) {
    pending = { name: event.target.files[0].name, started: performance.now() };
  }
}, true);
new MutationObserver(() => {
  if (!pending) return;
  const stage = document.querySelector('.structured-document, .comic-panel-navigation, .comic-panel-strip, .storyboard-review-grid, .storyboard-frame-grid');
  const busy = document.querySelector('.viewer-dashboard[aria-busy="true"]');
  if (!stage || busy) return;
  const sample = pending;
  pending = undefined;
  requestAnimationFrame(() => requestAnimationFrame(async () => {
    const result = { name: sample.name, inputToTwoFramesMs: performance.now() - sample.started, domElements: document.querySelectorAll('#root *').length };
    results.opens.push(result);
    show();
    const images = [...stage.querySelectorAll('img')];
    await Promise.allSettled(images.map((image) => image.decode()));
    result.images = images.map((image) => ({ complete: image.complete, width: image.naturalWidth, height: image.naturalHeight }));
    result.inputToImageDecodeMs = performance.now() - sample.started;
    show();
  }));
}).observe(document.getElementById('root'), { subtree: true, childList: true, attributes: true });
document.addEventListener('click', (event) => {
  const target = event.target.closest('#document-outline a, #document-outline button');
  if (!target) return;
  const started = performance.now();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    results.navigation.push({ label: target.textContent.trim(), clickToTwoFramesMs: performance.now() - started });
    show();
  }));
}, true);
</script><script type="module" src="/src/main.tsx"></script></body></html>`;
}

async function main() {
  const measureIndex = process.argv.indexOf("--measure");
  if (measureIndex >= 0) {
    process.stdout.write(JSON.stringify(await measureArchive(process.argv[measureIndex + 1], process.argv[measureIndex + 2])));
    return;
  }
  const outputIndex = process.argv.indexOf("--out");
  const output = resolve(repoRoot, outputIndex >= 0 ? process.argv[outputIndex + 1] : "examples/dist/architecture-baseline.json");
  const tempDirectory = await mkdtemp(join(tmpdir(), "prd-architecture-audit-"));
  try {
    const report = {
      auditVersion: "prd-architecture-audit-v0.1", generatedAt: new Date().toISOString(),
      environment: { node: process.version, platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model },
      method: "One warmup plus five warm-cache samples; fresh child per fixture/strategy; GC before each. RSS is process high-water including imports and warmup, not browser or incremental asset memory. Content-only probe skips assets AND validation; it is not a conforming replacement loader.",
      fixtures: [], probes: {},
    };
    const browserDirectory = join(repoRoot, "apps/prd-viewer-web/public/examples/architecture-audit");
    if (process.argv.includes("--browser-fixtures")) await mkdir(browserDirectory, { recursive: true });
    for (const fixture of await createFixtures()) {
      const validation = validatePackageFiles(fixture.files);
      if (!validation.valid) throw new Error(`${fixture.name}: ${JSON.stringify(validation.errors)}`);
      const archive = zipSync(fixture.files, { mtime: new Date("2026-01-01T00:00:00Z"), level: 6 });
      const path = join(tempDirectory, `${fixture.name}.prd`);
      await writeFile(path, archive);
      if (process.argv.includes("--browser-fixtures")) await writeFile(join(browserDirectory, `${fixture.name}.prd`), archive);
      const measurements = ["eager", "content-only-probe"].map((strategy) => JSON.parse(execFileSync(
        process.execPath, ["--expose-gc", fileURLToPath(import.meta.url), "--measure", path, strategy], { encoding: "utf8" },
      )));
      report.fixtures.push({
        name: fixture.name, archiveBytes: archive.byteLength, archiveSha256: hash(archive), fileCount: Object.keys(fixture.files).length,
        measurements,
      });
    }
    report.probes = await runProbes(tempDirectory);
    if (process.argv.includes("--browser-fixtures")) await writeFile(join(browserDirectory, "index.html"), browserHarness());
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Architecture baseline: ${output}`);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
