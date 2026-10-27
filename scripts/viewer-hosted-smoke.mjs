/*
 * Company: EonHive Inc.
 * Title: PRD Hosted Demo Smoke Check
 * Purpose: Verify deployed HTTP assets and sample packages without claiming browser acceptance.
 * Author: Stan Nesi
 * Created: October 27, 2026
 * Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
import { inspectPrdArchive } from "../packages/prd-validator/dist/node.js";
import { createViewerDemoAssetPlan } from "./prepare-viewer-demo-assets.mjs";

export const hostedSmokeSummaryPath = "examples/dist/viewer-hosted-smoke-summary.json";
const profiles = {
  "document-basic": "general-document",
  "document-segmented-basic": "general-document",
  "comic-basic": "comic",
  "storyboard-basic": "storyboard"
};

export function parseHostedSmokeArgs(args) {
  const values = args.filter((arg) => arg !== "--");
  if (values.length === 0) return { baseUrl: "https://prd.eonhive.com/" };
  if (values.length === 2 && values[0] === "--url" && values[1]) {
    return { baseUrl: values[1] };
  }
  throw new Error("Usage: pnpm viewer:demo:check:hosted [-- --url https://host/base/]");
}

function normalizeBaseUrl(value) {
  const base = new URL(value);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error("Use an HTTP(S) base URL without credentials, query, or fragment.");
  }
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  return base;
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"))?.[2];
}

function appAssets(html, pageUrl, base) {
  if (!/<div\b[^>]*\bid=["']root["']/i.test(html)) {
    throw new Error("Response is not the PRD app shell (missing root element).");
  }
  const assets = new Map();
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const kind = /^<script/i.test(tag) && attribute(tag, "type") === "module"
      ? "javascript"
      : attribute(tag, "rel")?.split(/\s+/).includes("stylesheet") ? "css" : null;
    if (!kind) continue;
    const ref = attribute(tag, kind === "javascript" ? "src" : "href");
    if (!ref) continue;
    const url = new URL(ref, pageUrl);
    if (url.username || url.password || url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
      throw new Error("App asset is outside the selected origin/base path; refusing to fetch it.");
    }
    assets.set(url.href, kind);
  }
  if (![...assets.values()].includes("javascript") || ![...assets.values()].includes("css")) {
    throw new Error("App shell must reference a module script and stylesheet.");
  }
  return assets;
}

export async function runHostedDemoSmoke({
  baseUrl = "https://prd.eonhive.com/",
  repoRoot = process.cwd(),
  fetcher = fetch,
  timeoutMs = 15000,
  // This is a smoke-download safety budget, not a PRD validity or format limit.
  maxResponseBytes = 16 * 1024 * 1024
} = {}) {
  const base = normalizeBaseUrl(baseUrl);
  const summaryPath = resolve(repoRoot, hostedSmokeSummaryPath);
  const checks = [];
  const summary = {
    contractVersion: "prd-hosted-demo-smoke-v0.1",
    generatedAt: new Date().toISOString(),
    baseUrl: base.href,
    status: "passed",
    scope: "http-assets-and-packages-only",
    browserAcceptance: "not-assessed",
    checks
  };
  const temp = await mkdtemp(join(tmpdir(), "prd-hosted-smoke-"));

  async function check(id, url, verify) {
    const result = { id, url: url.href, status: "failed" };
    checks.push(result);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(url.href, { redirect: "error", signal: controller.signal });
      result.statusCode = response.status;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("Empty HTTP response.");
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxResponseBytes) {
          await reader.cancel().catch(() => {});
          throw new Error(`Smoke download exceeded ${maxResponseBytes} bytes; this is not a format validity limit.`);
        }
        chunks.push(value);
      }
      const bytes = Buffer.concat(chunks, size);
      result.bytes = size;
      const facts = await verify(bytes, response.headers.get("content-type") ?? "");
      Object.assign(result, facts, { status: "passed" });
      return facts;
    } catch (error) {
      summary.status = "failed";
      result.message = controller.signal.aborted
        ? `HTTP check timed out after ${timeoutMs}ms.`
        : error instanceof Error ? error.message : String(error);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    const assets = new Map();
    for (const [id, path] of [["home", ""], ["viewer", "viewer/"], ["docs", "docs/"]]) {
      const url = new URL(path, base);
      await check(`route:${id}`, url, (bytes, type) => {
        if (!/text\/html/i.test(type)) throw new Error("Expected an HTML app shell.");
        for (const [asset, kind] of appAssets(bytes.toString("utf8"), url, base)) assets.set(asset, kind);
        return {};
      });
    }
    for (const [href, kind] of assets) {
      await check(`asset:${kind}:${new URL(href).pathname}`, new URL(href), (bytes, type) => {
        const expected = kind === "css" ? /text\/css/i : /(?:javascript|ecmascript)/i;
        if (!expected.test(type) || !bytes.length || /^\s*<(?:!doctype|html)/i.test(bytes.toString("utf8"))) {
          throw new Error(`Expected ${kind} bytes, not an HTML fallback or empty asset.`);
        }
        return {};
      });
    }
    for (const sample of createViewerDemoAssetPlan({ repoRoot })) {
      const archive = await check(`archive:${sample.id}`, new URL(sample.publicPath, base), async (bytes) => {
        const path = join(temp, `${sample.id}.prd`);
        await writeFile(path, bytes);
        const inspection = await inspectPrdArchive(path);
        if (!inspection.valid || inspection.manifest?.profile !== profiles[sample.id]) {
          throw new Error(`Invalid or wrong-profile demo archive: ${inspection.errors.map((issue) => issue.code).join(", ") || "profile mismatch"}. Check for an HTML fallback or stale sample.`);
        }
        return {
          sha256: createHash("sha256").update(bytes).digest("hex"),
          archiveBytes: bytes.length,
          fileCount: inspection.fileCount,
          totalBytes: inspection.totalBytes,
          manifest: inspection.manifest
        };
      });
      await check(`inspection:${sample.id}`, new URL(`${sample.publicPath}.inspection.json`, base), (bytes) => {
        if (!archive) throw new Error("Cannot verify inspection metadata without a valid downloaded archive.");
        let data;
        try { data = JSON.parse(bytes.toString("utf8")); } catch { throw new Error("Expected inspection JSON, not an HTML fallback."); }
        if (!data || data.contractVersion !== "prd-home-sample-v0.1" || data.sampleId !== sample.id ||
            data.archiveBytes !== archive.archiveBytes || data.fileCount !== archive.fileCount ||
            data.totalBytes !== archive.totalBytes || !isDeepStrictEqual(data.manifest, archive.manifest)) {
          throw new Error("Inspection metadata does not match the downloaded archive; rebuild and deploy demo assets together.");
        }
        return {};
      });
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
    await mkdir(dirname(summaryPath), { recursive: true });
    await writeFile(summaryPath, JSON.stringify(summary, null, 2) + "\n");
  }
  return { ...summary, summaryPath };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await runHostedDemoSmoke(parseHostedSmokeArgs(process.argv.slice(2)));
    console.log(`HOSTED_DEMO_SMOKE_SUMMARY_FILE: ${result.summaryPath}`);
    for (const check of result.checks) console.log(`${check.status}: ${check.id}${check.message ? `: ${check.message}` : ""}`);
    console.log("HTTP/package checks only; browser, pointer, drag/drop, accessibility, and deployment ownership are not assessed.");
    if (result.status !== "passed") process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
