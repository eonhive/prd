/*
 * Company: EonHive Inc.
 * Title: PRD Hosted Demo Smoke Tests
 * Purpose: Verify deployed-asset checks and failure artifacts without external network access.
 * Author: Stan Nesi
 * Created: October 27, 2026
 * Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { packDirectoryToBuffer } from "../packages/prd-packager/src/index.js";
import { inspectPrdArchive } from "../packages/prd-validator/src/node.js";
import { parseHostedSmokeArgs, runHostedDemoSmoke } from "./viewer-hosted-smoke.mjs";
import { buildLivingProfilePreview } from "../apps/prd-viewer-web/scripts/prepare-profile-previews.mjs";

type Reply = { body: BodyInit; type: string; status?: number };
const roots: string[] = [];
const samples = new Map<string, { archive: ArrayBuffer; inspection: string; preview: ReturnType<typeof buildLivingProfilePreview> }>();

async function tempRoot() {
  const root = await mkdtemp(join(tmpdir(), "prd-hosted-smoke-test-"));
  roots.push(root);
  return root;
}

beforeAll(async () => {
  const root = await tempRoot();
  for (const id of ["document-basic", "document-segmented-basic", "comic-basic", "storyboard-basic"]) {
    const archive = await packDirectoryToBuffer(join(process.cwd(), "examples", id));
    const path = join(root, `${id}.prd`);
    await writeFile(path, archive);
    const inspection = await inspectPrdArchive(path);
    samples.set(id, {
      preview: buildLivingProfilePreview(archive, inspection.manifest!, id),
      archive: new Uint8Array(archive).buffer,
      inspection: JSON.stringify({
        contractVersion: "prd-home-sample-v0.1", sampleId: id,
        archiveBytes: archive.length, fileCount: inspection.fileCount,
        totalBytes: inspection.totalBytes, manifest: inspection.manifest
      })
    });
  }
});

afterAll(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true });
});

function deployment(base: string) {
  const url = (path: string) => new URL(path, base).href;
  const assetBase = new URL(base).pathname;
  const html = `<html><div id="root"></div><script type="module" src="${assetBase}assets/app.js"></script><link rel="stylesheet" href="${assetBase}assets/app.css"></html>`;
  const replies = new Map<string, Reply>();
  for (const path of ["", "viewer/", "docs/"]) replies.set(url(path), { body: html, type: "text/html" });
  replies.set(url("assets/app.js"), { body: "export {};", type: "application/javascript" });
  replies.set(url("assets/app.css"), { body: "body {}", type: "text/css" });
  for (const [id, sample] of samples) {
    replies.set(url(`examples/${id}.prd`), { body: sample.archive, type: "application/octet-stream" });
    replies.set(url(`examples/${id}.prd.inspection.json`), { body: sample.inspection, type: "application/json" });
    if (sample.preview) {
      replies.set(url(`examples/${id}.prd.preview.json`), { body: JSON.stringify(sample.preview.metadata), type: "application/json" });
      for (const asset of sample.preview.assets) replies.set(url(asset.publicPath), { body: new Uint8Array(asset.bytes).buffer, type: asset.type });
    }
  }
  const fetcher = vi.fn(async (input: string, options: RequestInit) => {
    expect(options.redirect).toBe("error");
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const reply = replies.get(input);
    if (!reply) return new Response("not found", { status: 404 });
    return new Response(reply.body, { status: reply.status ?? 200, headers: { "content-type": reply.type } });
  });
  return { replies, fetcher, url };
}

describe("hosted demo smoke", () => {
  it("normalizes a deployment base that is missing its trailing slash", async () => {
    const { fetcher } = deployment("https://demo.test/prd/");
    const result = await runHostedDemoSmoke({ baseUrl: "https://demo.test/prd", repoRoot: await tempRoot(), fetcher });
    expect(result).toMatchObject({ baseUrl: "https://demo.test/prd/", status: "passed" });
  });

  it.each(["https://demo.test/", "https://demo.test/prd/"])("verifies app, assets, archives and matching facts under %s", async (baseUrl) => {
    const { fetcher } = deployment(baseUrl);
    const result = await runHostedDemoSmoke({ baseUrl, repoRoot: await tempRoot(), fetcher });
    expect(result.status).toBe("passed");
    expect(result.browserAcceptance).toBe("not-assessed");
    expect(result.checks).toHaveLength(21);
    expect(result.checks.every((check: { status: string }) => check.status === "passed")).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(21);
    const artifact = JSON.parse(await readFile(result.summaryPath, "utf8"));
    expect(artifact).toMatchObject({
      contractVersion: "prd-hosted-demo-smoke-v0.1", baseUrl,
      scope: "http-assets-and-packages-only", browserAcceptance: "not-assessed", status: "passed"
    });
    expect(artifact.checks.find((check: { id: string }) => check.id === "archive:comic-basic"))
      .toMatchObject({ sha256: expect.stringMatching(/^[a-f0-9]{64}$/), manifest: { profile: "comic" } });
  });

  it.each([
    ["examples/comic-basic.prd", "archive:comic-basic", "text/html", "<html>SPA fallback</html>"],
    ["examples/comic-basic.prd.inspection.json", "inspection:comic-basic", "text/html", "<html>SPA fallback</html>"],
    ["assets/app.js", "asset:javascript:/assets/app.js", "text/html", "<html>SPA fallback</html>"],
    ["examples/document-basic.prd.inspection.json", "inspection:document-basic", "application/json", "{}"],
    ["examples/comic-basic.prd.preview.json", "preview:comic-basic", "text/html", "<html>SPA fallback</html>"],
    ["examples/previews/storyboard-basic/1.svg", "preview-image:storyboard-basic:1", "text/html", "<html>SPA fallback</html>"]
  ])("fails on misleading HTTP 200 bytes at %s and still writes a summary", async (path, id, type, body) => {
    const baseUrl = "https://demo.test/";
    const { fetcher, replies, url } = deployment(baseUrl);
    replies.set(url(path!), { type: type!, body: body! });
    const result = await runHostedDemoSmoke({ baseUrl, repoRoot: await tempRoot(), fetcher });
    expect(result.status).toBe("failed");
    expect(result.checks.find((check: { id: string }) => check.id === id))
      .toMatchObject({ status: "failed", statusCode: 200, message: expect.any(String) });
    expect(JSON.parse(await readFile(result.summaryPath, "utf8")).status).toBe("failed");
    expect(result.checks.length).toBeGreaterThanOrEqual(15);
  });

  it("rejects a valid archive served for the wrong profile", async () => {
    const baseUrl = "https://demo.test/";
    const { fetcher, replies, url } = deployment(baseUrl);
    replies.set(url("examples/comic-basic.prd"), {
      body: samples.get("document-basic")!.archive, type: "application/octet-stream"
    });
    const result = await runHostedDemoSmoke({ baseUrl, repoRoot: await tempRoot(), fetcher });
    expect(result.checks.find((check: { id: string }) => check.id === "archive:comic-basic"))
      .toMatchObject({ status: "failed", message: expect.stringContaining("wrong-profile") });
  });

  it("detects stale inspection facts against the actual downloaded bytes", async () => {
    const baseUrl = "https://demo.test/";
    const { fetcher, replies, url } = deployment(baseUrl);
    const data = JSON.parse(samples.get("comic-basic")!.inspection);
    data.archiveBytes += 1;
    replies.set(url("examples/comic-basic.prd.inspection.json"), { body: JSON.stringify(data), type: "application/json" });
    const result = await runHostedDemoSmoke({ baseUrl, repoRoot: await tempRoot(), fetcher });
    expect(result.checks.find((check: { id: string }) => check.id === "inspection:comic-basic"))
      .toMatchObject({ status: "failed", message: expect.stringContaining("does not match") });
  });

  it("records HTTP and network failures without losing other diagnostic checks", async () => {
    const baseUrl = "https://demo.test/";
    const { fetcher, replies, url } = deployment(baseUrl);
    replies.set(url("viewer/"), { body: "down", type: "text/plain", status: 503 });
    fetcher.mockRejectedValueOnce(new Error("Network unavailable"));
    const result = await runHostedDemoSmoke({ baseUrl, repoRoot: await tempRoot(), fetcher });
    expect(result.checks[0]).toMatchObject({ status: "failed", message: "Network unavailable" });
    expect(result.checks[1]).toMatchObject({ status: "failed", statusCode: 503 });
    expect(result.checks.find((check: { id: string }) => check.id === "archive:storyboard-basic").status).toBe("passed");
  });

  it.each(["https://other.test/app.js", "/outside/app.js"])("does not fetch out-of-base assets discovered in HTML: %s", async (ref) => {
    const baseUrl = "https://demo.test/prd/";
    const { fetcher, replies, url } = deployment(baseUrl);
    replies.set(url(""), { body: `<div id="root"></div><script type="module" src="${ref}"></script>`, type: "text/html" });
    const result = await runHostedDemoSmoke({ baseUrl, repoRoot: await tempRoot(), fetcher });
    expect(result.checks[0]).toMatchObject({ status: "failed", message: expect.stringContaining("outside") });
    expect(fetcher.mock.calls.every(([href]) => href.startsWith(baseUrl))).toBe(true);
  });

  it("times out stalled requests and persists failures", async () => {
    const fetcher = (_url: string, { signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
    const result = await runHostedDemoSmoke({ repoRoot: await tempRoot(), fetcher, timeoutMs: 5 });
    expect(result.status).toBe("failed");
    expect(result.checks.every((check: { message: string }) => check.message.includes("timed out"))).toBe(true);
    expect(JSON.parse(await readFile(result.summaryPath, "utf8")).status).toBe("failed");
  });

  it("bounds actual response bytes and cancels an oversized stream", async () => {
    const cancel = vi.fn();
    const fetcher = async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(65)); }, cancel
    }), { headers: { "content-type": "text/html" } });
    const result = await runHostedDemoSmoke({ repoRoot: await tempRoot(), fetcher, maxResponseBytes: 64 });
    expect(cancel).toHaveBeenCalled();
    expect(result.checks[0]).toMatchObject({ status: "failed", message: expect.stringContaining("not a format validity limit") });
  });

  it("accepts only explicit CLI syntax and credential-free HTTP(S) base URLs", async () => {
    expect(parseHostedSmokeArgs([])).toEqual({ baseUrl: "https://prd.eonhive.com/" });
    expect(parseHostedSmokeArgs(["--", "--url", "https://demo.test/prd/"])).toEqual({ baseUrl: "https://demo.test/prd/" });
    expect(() => parseHostedSmokeArgs(["--url"])).toThrow("Usage");
    expect(() => parseHostedSmokeArgs(["--unknown"])).toThrow("Usage");
    for (const baseUrl of ["file:///tmp/site", "https://name:secret@demo.test/", "https://demo.test/?token=secret"]) {
      await expect(runHostedDemoSmoke({ baseUrl })).rejects.toThrow("HTTP(S) base URL");
    }
  });

  it("exits nonzero from the real script and retains diagnostics for a broken deployment", async () => {
    const repoRoot = await tempRoot();
    const server = createServer((_request, response) => {
      response.setHeader("content-type", "text/html");
      response.end("<html>broken SPA fallback</html>");
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    try {
      const { port } = server.address() as AddressInfo;
      const script = fileURLToPath(new URL("./viewer-hosted-smoke.mjs", import.meta.url));
      await expect(promisify(execFile)(process.execPath, [script, "--url", `http://127.0.0.1:${port}/`], { cwd: repoRoot }))
        .rejects.toMatchObject({ code: 1 });
      const summary = JSON.parse(await readFile(join(repoRoot, "examples/dist/viewer-hosted-smoke-summary.json"), "utf8"));
      expect(summary).toMatchObject({ status: "failed", browserAcceptance: "not-assessed" });
      expect(summary.checks.some((check: { id: string }) => check.id === "archive:comic-basic")).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
