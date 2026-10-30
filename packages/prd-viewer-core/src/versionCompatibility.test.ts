/**
 * Company: EonHive Inc. | Title: Viewer Version Compatibility Tests
 * Purpose: Verify early compatibility checks and prevent version bypass through sections, locales or legacy paths.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */

import { describe, expect, it, vi } from "vitest";
import type { PrdManifest, PrdPackageReader } from "@eonhive/prd-types";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { inferViewerRenderMode, openPrdDocument } from "./index.js";

type Files = Record<string, string>;
const manifest: PrdManifest = {
  prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:version",
  profile: "general-document", title: "Version", entry: "content/root.json"
};
const root = {
  schemaVersion: "1.0", profile: "general-document", type: "document", id: "root", title: "Version",
  children: [{ type: "paragraph", text: "Readable content." }]
};
const section = {
  schemaVersion: "1.0", profile: "general-document", type: "document-section", id: "part", title: "Part",
  children: [{ type: "paragraph", text: "Section content." }]
};

function filesWith(overrides: Partial<PrdManifest> = {}, content: unknown = root): Files {
  return { "manifest.json": JSON.stringify({ ...manifest, ...overrides }), "content/root.json": JSON.stringify(content) };
}

function readerFor(files: Files): PrdPackageReader {
  return {
    has: (path) => Object.hasOwn(files, path),
    readText(path) {
      if (!Object.hasOwn(files, path)) throw new Error(`Missing fixture file: ${path}`);
      return files[path]!;
    },
    readBinary: (path) => new TextEncoder().encode(files[path]!)
  };
}

function expectValid(files: Files) {
  const bytes = Object.fromEntries(Object.entries(files).map(([path, content]) => [path, new TextEncoder().encode(content)]));
  const result = validatePackageFiles(bytes);
  expect(result.valid, JSON.stringify(result.errors)).toBe(true);
}

function expectBlocked(opened: Awaited<ReturnType<typeof openPrdDocument>>) {
  expect(opened.supportState).toBe("unsupported-required-capability");
  expect(opened.entryDocument).toBeUndefined();
  expect(opened.comicDocument).toBeUndefined();
  expect(opened.storyboardDocument).toBeUndefined();
  expect(opened.entryHtml).toBeUndefined();
  expect(inferViewerRenderMode({ opened })).toBe("unsupported-entry-mode");
}

function segmented(files: Files, version = "1.0"): Files {
  return {
    ...files,
    "content/root.json": JSON.stringify({ ...root, children: [{ type: "section", id: "part", title: "Part", src: "content/sections/part.json" }] }),
    "content/sections/part.json": JSON.stringify({ ...section, schemaVersion: version })
  };
}

function localized(files: Files, content: unknown = root): Files {
  const documentManifest = JSON.parse(files["manifest.json"]!);
  documentManifest.localization = { defaultLocale: "en-US", availableLocales: ["en-US", "fr-FR"] };
  return {
    ...files,
    "manifest.json": JSON.stringify(documentManifest),
    "content/locales/index.json": JSON.stringify({ type: "localized-content-index", locales: {
      "fr-FR": { entry: "content/fr.json", label: "French" }
    } }),
    "content/fr.json": JSON.stringify(content)
  };
}

describe("reference viewer version compatibility", () => {
  it.each(["prdVersion", "manifestVersion", "profileVersion"] as const)("rejects an unsupported %s before any entry or locale read", async (field) => {
    const files = localized(filesWith({ [field]: "999.0", profile: "responsive-document" }));
    expectValid(files);
    const reader = readerFor(files);
    const readText = vi.spyOn(reader, "readText");
    const has = vi.spyOn(reader, "has");
    const readBinary = vi.spyOn(reader, "readBinary");
    const opened = await openPrdDocument(reader);
    expectBlocked(opened);
    expect(opened.manifest.profile).toBe("general-document");
    expect(opened.manifest[field]).toBe("999.0");
    expect(opened.profileInfo.aliasUsed).toBe(true);
    expect(opened.entryPath).toBe("content/root.json");
    expect(opened.localization?.defaultLocale).toBe("en-US");
    expect(opened.message).toContain(`${field} "999.0"`);
    expect(readText.mock.calls).toEqual([["manifest.json"]]);
    expect(has).not.toHaveBeenCalled();
    expect(readBinary).not.toHaveBeenCalled();
  });

  it.each(["1.0", "1.0.0"])("opens the declared contract %s without rewriting its values", async (version) => {
    const files = filesWith({ prdVersion: version, manifestVersion: version, profileVersion: version }, { ...root, schemaVersion: version });
    expectValid(files);
    const opened = await openPrdDocument(readerFor(files));
    expect(opened.supportState).toBe("fully-supported");
    expect(opened.entryDocument?.schemaVersion).toBe(version);
    expect(opened.manifest.prdVersion).toBe(version);
  });

  it.each(["0.9", "1.0.1", "1.1", "2.0", "999.0", "1", "v1.0", "01.0", "1.00", "1.0.0.0", "1.0-beta", "1.0+build", " 1.0 ", "1.0\n", "^1.0", "9007199254740992.0"])("does not infer support for the format declaration %s", async (version) => {
    const files = filesWith({ prdVersion: version });
    expectValid(files);
    const opened = await openPrdDocument(readerFor(files));
    expectBlocked(opened);
    expect(opened.message).toContain("prdVersion");
  });

  it.each([undefined, "0.0", "0.0.999", "0.1", "0.1.0"])("honors an absent, older or equal minViewer %s", async (minViewer) => {
    const files = filesWith(minViewer === undefined ? {} : { compatibility: { minViewer } });
    expectValid(files);
    expect((await openPrdDocument(readerFor(files))).supportState).toBe("fully-supported");
  });

  it.each(["0.1.1", "0.2", "0.10", "1.0", "999.0", "", "0", "01.0", "0.01", "0.1-beta", ">=0.1", " 0.1", "0.1\n", "0.1.0+build", "0.1.0.0", "99999999999999999999999999999999999999999999999999999999.0"])("blocks newer or unrecognized minViewer %s before opening content", async (minViewer) => {
    const files = filesWith({ compatibility: { minViewer } });
    expectValid(files);
    const reader = readerFor(files);
    const read = vi.spyOn(reader, "readText");
    const opened = await openPrdDocument(reader);
    expectBlocked(opened);
    expect(opened.message).toContain("minViewer");
    expect(read.mock.calls).toEqual([["manifest.json"]]);
  });

  it.each(["general-document", "comic", "storyboard"])("checks the %s root schemaVersion before exposing its render payload", async (profile) => {
    const content = profile === "general-document" ? { ...root, schemaVersion: "2.0" }
      : profile === "comic" ? { schemaVersion: "2.0", profile, type: "comic", id: "comic", title: "Version", panels: [{ id: "one", asset: "image", alt: "Panel" }] }
        : { schemaVersion: "2.0", profile, type: "storyboard", id: "storyboard", title: "Version", frames: [{ id: "one", asset: "image", alt: "Frame" }] };
    const files = filesWith({ profile, assets: [{ id: "image", href: "assets/image.svg", type: "image/svg+xml" }] }, content);
    files["assets/image.svg"] = '<svg xmlns="http://www.w3.org/2000/svg"/>';
    expectValid(files);
    const reader = readerFor(files);
    const read = vi.spyOn(reader, "readText");
    const opened = await openPrdDocument(reader);
    expectBlocked(opened);
    expect(opened.message).toContain('"content/root.json" schemaVersion "2.0"');
    expect(read.mock.calls).toEqual([["manifest.json"], ["content/root.json"]]);
  });

  it.each(["0.9", "1.0.1", "2.0", "draft", "01.0"])("blocks unsupported section schemaVersion %s", async (version) => {
    const files = segmented(filesWith(), version);
    expectValid(files);
    const opened = await openPrdDocument(readerFor(files));
    expectBlocked(opened);
    expect(opened.message).toContain('"content/sections/part.json" schemaVersion');
  });

  it("opens current sections while ignoring unrelated JSON version fields", async () => {
    const files = segmented(filesWith());
    files["attachments/unrelated.json"] = '{"schemaVersion":"999.0"}';
    files["profiles/hint.json"] = '{"schemaVersion":"999.0"}';
    files["content/unreferenced.json"] = '{"schemaVersion":"999.0"}';
    expectValid(files);
    const reader = readerFor(files);
    const read = vi.spyOn(reader, "readText");
    expect((await openPrdDocument(reader)).supportState).toBe("fully-supported");
    expect(read.mock.calls).toEqual([["manifest.json"], ["content/root.json"], ["content/sections/part.json"]]);
  });

  it("blocks a localized root even when the default locale is compatible", async () => {
    const files = localized(filesWith(), { ...root, schemaVersion: "999.0" });
    expectValid(files);
    const opened = await openPrdDocument(readerFor(files));
    expectBlocked(opened);
    expect(opened.message).toContain('"content/fr.json" schemaVersion "999.0"');
  });

  it("checks sections referenced only by a localized alternate", async () => {
    const localizedRoot = { ...root, children: [{ type: "section", id: "part", title: "Part", src: "content/sections/part.json" }] };
    const files = localized(filesWith(), localizedRoot);
    files["content/sections/part.json"] = JSON.stringify({ ...section, schemaVersion: "2.0" });
    expectValid(files);
    const opened = await openPrdDocument(readerFor(files));
    expectBlocked(opened);
    expect(opened.message).toContain('"content/sections/part.json" schemaVersion "2.0"');
  });

  it("does not invent a schemaVersion field for localization controls or overlays", async () => {
    const files = filesWith({ localization: { defaultLocale: "en-US", availableLocales: ["en-US", "fr-FR"] } });
    files["content/locales/index.json"] = JSON.stringify({ type: "localized-content-index", locales: { "fr-FR": { resource: "content/overrides.json" } } });
    files["content/overrides.json"] = JSON.stringify({ type: "localized-document-overrides", locale: "fr-FR", document: { title: "French" } });
    expectValid(files);
    expect((await openPrdDocument(readerFor(files))).supportState).toBe("fully-supported");
  });

  it.each(["general-document", "comic", "storyboard", "resume", "custom.zine"])("preserves the legacy HTML safe path for %s with supported base versions", async (profile) => {
    const files = filesWith({ profile, entry: "content/index.html", compatibility: { minViewer: "0.1" } });
    files["content/index.html"] = "<p>Legacy readable fallback.</p>";
    const opened = await openPrdDocument(readerFor(files));
    expect(opened.supportState).toBe("safe-mode");
    expect(opened.entryHtml).toContain("Legacy readable fallback");
  });

  it("still checks localized structured roots behind a legacy HTML default", async () => {
    const files = localized(filesWith({ profile: "comic", entry: "content/index.html", assets: [{ id: "image", href: "assets/image.svg", type: "image/svg+xml" }] }), {
      schemaVersion: "2.0", profile: "comic", type: "comic", id: "comic", title: "Version", panels: [{ id: "one", asset: "image", alt: "Panel" }]
    });
    files["content/index.html"] = "<p>Legacy fallback.</p>";
    files["assets/image.svg"] = '<svg xmlns="http://www.w3.org/2000/svg"/>';
    expectValid(files);
    const opened = await openPrdDocument(readerFor(files));
    expectBlocked(opened);
    expect(opened.message).toContain('"content/fr.json" schemaVersion "2.0"');
  });

  it("does not reinterpret a custom profile's own version as a canonical profile contract", async () => {
    const files = filesWith({ profile: "custom.zine", profileVersion: "0.9", entry: "content/index.html" });
    files["content/index.html"] = "<p>Custom legacy fallback.</p>";
    expect((await openPrdDocument(readerFor(files))).supportState).toBe("safe-mode");
  });

  it("preserves combined manifest requirement diagnostics", async () => {
    const files = filesWith({ prdVersion: "2.0", compatibility: { capabilities: { required: ["custom.capability"] } }, extensions: [{ id: "custom.renderer", required: true }] });
    const opened = await openPrdDocument(readerFor(files));
    expectBlocked(opened);
    expect(opened.message).toContain('prdVersion "2.0"');
    expect(opened.message).toContain("required capabilities: custom.capability");
    expect(opened.message).toContain("required extensions: custom.renderer");
  });

  it("bounds diagnostics for oversized version declarations", async () => {
    const files = filesWith({ prdVersion: "9".repeat(10_000) });
    expectValid(files);
    const opened = await openPrdDocument(readerFor(files));
    expectBlocked(opened);
    expect(opened.message!.length).toBeLessThan(300);
    expect(opened.message).toContain("…");
  });
});
