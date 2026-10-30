/**
 * Company: EonHive Inc. | Title: Browser CBZ Conversion Tests
 * Purpose: Verify comic parity, ordering and hostile archive boundaries through the browser export.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { zipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPrdContainer,
  readPrdArchive,
} from "@eonhive/prd-validator/container";
import { validatePackageFiles } from "@eonhive/prd-validator";
import { convertInBrowser, convertMarkdownInBrowser } from "./browser.js";
import { convertDocument } from "./index.js";

const text = (value: string) => new TextEncoder().encode(value);
const png = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT3sAAAAASUVORK5CYII=",
    "base64"
  )
);
const sourcePath = resolve("examples/conversion-cbz/sample-comic.cbz");
const archive = (files: Record<string, Uint8Array> = { "page.png": png }) => ({
  source: { name: "comic.cbz", bytes: zipSync(files) },
});
afterEach(() => vi.unstubAllGlobals());

function expectSameFiles(
  left: Record<string, Uint8Array>,
  right: Record<string, Uint8Array>
): void {
  expect(Object.keys(left).sort()).toEqual(Object.keys(right).sort());
  for (const path of Object.keys(left))
    expect(
      Buffer.from(left[path]!).equals(Buffer.from(right[path]!)),
      path
    ).toBe(true);
}

describe("browser CBZ conversion", () => {
  it.each(["zip", "prd"] as const)(
    "matches Node comic files and reports in %s transport",
    async (container) => {
      const bytes = new Uint8Array(await readFile(sourcePath));
      const result = await convertInBrowser({
        source: { name: "sample-comic.cbz", bytes },
        container,
      });
      const node = await convertDocument({ sourcePath, container });
      expect(result.document).toEqual(node.document);
      expect(result.report).toEqual(node.report);
      const files = readPrdArchive(result.archive);
      expectSameFiles(files, readPrdArchive(node.archive));
      expect(
        Buffer.from(files["attachments/source.cbz"]!).equals(Buffer.from(bytes))
      ).toBe(true);
      expect(validatePackageFiles(files).valid).toBe(true);
      expect(result.report).toMatchObject({
        sourceFormat: "cbz",
        profile: "comic",
        nodeCount: 3,
        resourceCount: 3,
      });
      expect(result.report.resourceMap.map((item) => item.source)).toEqual([
        "pages/page-1.png",
        "pages/page-2.png",
        "pages/page-10.png",
      ]);
      expect(result.report.warnings).toHaveLength(3);
    }
  );

  it.each(["zip", "prd"] as const)(
    "reverses sequence without changing page identity in %s transport",
    async (container) => {
      const bytes = new Uint8Array(await readFile(sourcePath));
      const result = await convertInBrowser({
        source: { name: "sample-comic.cbz", bytes },
        comicPageOrder: "reverse",
        profile: "comic",
        container,
      });
      const node = await convertDocument({
        sourcePath,
        comicPageOrder: "reverse",
        container,
      });
      expectSameFiles(
        readPrdArchive(result.archive),
        readPrdArchive(node.archive)
      );
      if (result.document.profile !== "comic")
        throw new Error("Unexpected profile");
      expect(
        result.document.panels.map((page) => [page.id, page.asset])
      ).toEqual([
        ["page-3", "import-image-3"],
        ["page-2", "import-image-2"],
        ["page-1", "import-image-1"],
      ]);
      expect(
        result.report.warnings.some(
          (issue) => issue.code === "comic-page-order-reversed"
        )
      ).toBe(true);
      expect(JSON.stringify(result.document)).not.toContain("readingDirection");
    }
  );

  it("preserves default order and applies source opt-out and title overrides", async () => {
    const input = archive({ "page-10.png": png, "page-2.png": png });
    const normal = await convertInBrowser(input);
    const explicit = await convertInBrowser({
      ...input,
      comicPageOrder: "natural",
    });
    expect(readPrdArchive(explicit.archive)).toEqual(
      readPrdArchive(normal.archive)
    );
    const result = await convertInBrowser({
      ...input,
      preserveSource: false,
      title: "My comic",
    });
    expect(result.document.title).toBe("My comic");
    expect(
      readPrdArchive(result.archive)["attachments/source.cbz"]
    ).toBeUndefined();
    expect(
      result.report.warnings.some(
        (issue) => issue.code === "source-not-preserved"
      )
    ).toBe(true);
  });

  it("keeps the original Markdown export strict and rejects mismatched settings", async () => {
    await expect(convertMarkdownInBrowser(archive())).rejects.toThrow(
      "Unsupported source format"
    );
    await expect(
      convertInBrowser({ ...archive(), profile: "general-document" })
    ).rejects.toThrow("requested general-document");
    await expect(
      convertInBrowser({
        ...archive(),
        resources: [{ name: "extra.png", bytes: png }],
      })
    ).rejects.toThrow("do not select supporting images");
    await expect(
      convertInBrowser({ ...archive(), comicPageOrder: "invalid" as "natural" })
    ).rejects.toThrow("natural or reverse");
    await expect(
      convertInBrowser({
        source: { name: "source.md", bytes: text("# Text") },
        comicPageOrder: "reverse",
      })
    ).rejects.toThrow("only to comic sources");
  });

  it("keeps literal archive names, deterministic sort ties and omission diagnostics", async () => {
    const result = await convertInBrowser(
      archive({
        "pages/page%202.PNG": png,
        "page-1.png": png,
        "Page-1.png": png,
        "bad.png": text("not an image"),
        "hidden/.page.png": png,
        "ComicInfo.xml": text("<ComicInfo/>"),
      })
    );
    expect(result.report.resourceMap.map((item) => item.source)).toEqual([
      "Page-1.png",
      "page-1.png",
      "pages/page%202.PNG",
    ]);
    expect(result.report.resourceCount).toBe(3);
    expect(result.report.warnings.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["resource-omitted", "cbz-members-omitted"])
    );
  });

  it("snapshots caller bytes before async adapter loading without network retrieval", async () => {
    const input = archive();
    const fetch = vi.fn(() => {
      throw new Error("Unexpected source fetch");
    });
    vi.stubGlobal("fetch", fetch);
    // Vitest's RPC needs Buffer during awaits; the isolated tarball smoke tests its absence.
    const pending = convertInBrowser(input);
    input.source.bytes.fill(0);
    const result = await pending;
    expect(result.report.resourceCount).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(
      readPrdArchive(result.archive)["assets/images/import-image-1.png"]
    ).toEqual(png);
  });
});

describe("comic conversion review", () => {
  const pageIds = ["page-2", "page-3", "page-1"];
  it.each(["zip", "prd"] as const)(
    "matches reviewed Node output in %s transport without changing assets",
    async (container) => {
      const source = {
        name: "sample-comic.cbz",
        bytes: new Uint8Array(await readFile(sourcePath)),
      };
      const settings = {
        comicPageIds: pageIds,
        title: "Reviewed comic",
        id: "urn:test:review",
        container,
      };
      const result = await convertInBrowser({ source, ...settings });
      const node = await convertDocument({ sourcePath, ...settings });
      const files = readPrdArchive(result.archive);
      expectSameFiles(files, readPrdArchive(node.archive));
      const original = readPrdArchive(
        new Uint8Array(
          await readFile(resolve("examples/conversion-cbz/converted.prd"))
        )
      );
      for (const path of Object.keys(original).filter((path) =>
        path.startsWith("assets/")
      ))
        expect(
          Buffer.from(files[path]!).equals(Buffer.from(original[path]!)),
          path
        ).toBe(true);
      expect(
        Buffer.from(files["attachments/source.cbz"]!).equals(
          Buffer.from(source.bytes)
        )
      ).toBe(true);
      if (result.document.profile !== "comic")
        throw new Error("Unexpected profile");
      expect(
        result.document.panels.map((page) => [page.id, page.asset])
      ).toEqual([
        ["page-2", "import-image-2"],
        ["page-3", "import-image-3"],
        ["page-1", "import-image-1"],
      ]);
      expect(
        result.report.warnings.filter(
          (issue) => issue.code === "comic-page-order-reviewed"
        )
      ).toHaveLength(1);
      expect(result.report.warnings).toHaveLength(4);
      expect(
        JSON.parse(new TextDecoder().decode(files["manifest.json"])).id
      ).toBe("urn:test:review");
      expect(validatePackageFiles(files).valid).toBe(true);
    }
  );

  it("snapshots browser and Node review IDs before asynchronous extraction", async () => {
    const browserIds = [...pageIds];
    const input = archive({
      "page-1.png": png,
      "page-2.png": png,
      "page-3.png": png,
    });
    const browserPending = convertInBrowser({
      ...input,
      comicPageIds: browserIds,
    });
    browserIds.reverse();
    const browser = await browserPending;
    const nodeIds = [...pageIds];
    const nodePending = convertDocument({ sourcePath, comicPageIds: nodeIds });
    nodeIds.reverse();
    const node = await nodePending;
    for (const result of [browser, node]) {
      if (result.document.profile !== "comic")
        throw new Error("Unexpected profile");
      expect(result.document.panels.map((page) => page.id)).toEqual(pageIds);
    }
  });

  it.each([
    ["page-1", "page-1", "page-3"],
    ["page-1", "page-2"],
    ["page-1", "page-2", "page-3", "page-4"],
    ["page-1", "page-2", "__proto__"],
  ])(
    "rejects incomplete, duplicate or foreign page order %#",
    async (...ids) => {
      await expect(
        convertInBrowser({
          ...archive({ "1.png": png, "2.png": png, "3.png": png }),
          comicPageIds: ids,
        })
      ).rejects.toThrow("every imported page exactly once");
    }
  );

  it("rejects invalid, oversized, non-comic and conflicting review settings", async () => {
    for (const ids of [
      [],
      null,
      "page-1",
      [1],
      ["x".repeat(256)],
      Array(20_001).fill("page-1"),
    ]) {
      await expect(
        convertInBrowser({
          ...archive(),
          comicPageIds: ids as unknown as string[],
        })
      ).rejects.toThrow("bounded array");
    }
    await expect(
      convertInBrowser({
        source: { name: "source.md", bytes: text("# Title") },
        comicPageIds: ["page-1"],
      })
    ).rejects.toThrow("only to comic sources");
    for (const comicPageOrder of ["natural", "reverse"] as const) {
      await expect(
        convertInBrowser({
          ...archive(),
          comicPageIds: ["page-1"],
          comicPageOrder,
        })
      ).rejects.toThrow("not both");
    }
  });
});

describe("comic page descriptions", () => {
  it.each(["zip", "prd"] as const)(
    "matches Node descriptions and reviewed order in %s transport",
    async (container) => {
      const review = JSON.parse(
        await readFile(
          resolve("examples/conversion-web/comic-descriptions/review.json"),
          "utf8"
        )
      );
      const source = {
        name: "sample-comic.cbz",
        bytes: new Uint8Array(await readFile(sourcePath)),
      };
      const result = await convertInBrowser({ source, ...review, container });
      const node = await convertDocument({ sourcePath, ...review, container });
      const files = readPrdArchive(result.archive);
      expectSameFiles(files, readPrdArchive(node.archive));
      const original = readPrdArchive(
        new Uint8Array(
          await readFile(resolve("examples/conversion-cbz/converted.prd"))
        )
      );
      for (const path of Object.keys(original).filter(
        (path) =>
          path !== "content/root.json" &&
          path !== "attachments/conversion-quality.json"
      )) {
        expect(
          Buffer.from(files[path]!).equals(Buffer.from(original[path]!)),
          path
        ).toBe(true);
      }
      if (result.document.profile !== "comic")
        throw new Error("Unexpected profile");
      expect(result.document.panels.map((page) => [page.id, page.alt])).toEqual(
        [
          ["page-2", review.comicPageDescriptions[1].text],
          ["page-3", review.comicPageDescriptions[2].text],
          ["page-1", review.comicPageDescriptions[0].text],
        ]
      );
      expect(result.report.warnings).toHaveLength(5);
      expect(
        result.report.warnings.find(
          (issue) => issue.code === "cbz-generated-alt"
        )?.message
      ).toContain("0 retain filename-derived text");
    }
  );

  it("keeps default output for empty overrides and maps partial descriptions by source ID", async () => {
    const input = archive({ "1.png": png, "2.png": png, "3.png": png });
    const baseline = await convertInBrowser(input);
    const empty = await convertInBrowser({
      ...input,
      comicPageDescriptions: [],
    });
    expectSameFiles(
      readPrdArchive(empty.archive),
      readPrdArchive(baseline.archive)
    );
    const result = await convertInBrowser({
      ...input,
      comicPageOrder: "reverse",
      comicPageDescriptions: [
        { pageId: "page-2", text: "Middle page description." },
      ],
    });
    if (result.document.profile !== "comic")
      throw new Error("Unexpected profile");
    expect(result.document.panels.map((page) => [page.id, page.alt])).toEqual([
      ["page-3", "3 comic page"],
      ["page-2", "Middle page description."],
      ["page-1", "1 comic page"],
    ]);
    expect(
      result.report.warnings.find((issue) => issue.code === "cbz-generated-alt")
        ?.message
    ).toContain("2 retain filename-derived text");
  });

  it("snapshots records before browser and Node awaits", async () => {
    const records = [{ pageId: "page-1", text: "Original description." }];
    const pending = convertInBrowser({
      ...archive(),
      comicPageDescriptions: records,
    });
    records[0]!.text = "Changed later.";
    const browser = await pending;
    const nodePending = convertDocument({
      sourcePath,
      comicPageDescriptions: records,
    });
    records[0]!.text = "Changed again.";
    const node = await nodePending;
    if (
      browser.document.profile !== "comic" ||
      node.document.profile !== "comic"
    )
      throw new Error("Unexpected profile");
    expect(browser.document.panels[0]?.alt).toBe("Original description.");
    expect(node.document.panels[0]?.alt).toBe("Changed later.");
  });

  it("keeps markup literal without executing it or fetching description URLs", async () => {
    const fetch = vi.fn(() => {
      throw new Error("Unexpected fetch");
    });
    vi.stubGlobal("fetch", fetch);
    const value =
      '</textarea><script>bad()</script><img src="https://example.invalid/tracker">';
    const result = await convertInBrowser({
      ...archive(),
      comicPageDescriptions: [{ pageId: "page-1", text: value }],
    });
    if (result.document.profile !== "comic")
      throw new Error("Unexpected profile");
    expect(result.document.panels[0]?.alt).toBe(value);
    expect(validatePackageFiles(readPrdArchive(result.archive)).valid).toBe(
      true
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(
    [
      null,
      "invalid",
      [null],
      [{}],
      [{ pageId: "page-1", text: "  " }],
      [{ pageId: "page-1", text: "x".repeat(2049) }],
      [{ pageId: "page-1", text: "bad\u0000text" }],
      [{ pageId: "x".repeat(256), text: "Description." }],
      new Array(1),
    ].map((records) => ({ records }))
  )(
    "rejects malformed or unsafe description records %#",
    async ({ records }) => {
      await expect(
        convertInBrowser({
          ...archive(),
          comicPageDescriptions: records as never,
        })
      ).rejects.toThrow("Comic descriptions");
    }
  );

  it("enforces duplicate, foreign, count and profile boundaries and accepts the inclusive text limit", async () => {
    const record = { pageId: "page-1", text: "Description." };
    await expect(
      convertInBrowser({
        ...archive(),
        comicPageDescriptions: [record, record],
      })
    ).rejects.toThrow("at most once");
    await expect(
      convertInBrowser({
        ...archive(),
        comicPageDescriptions: [{ ...record, pageId: "__proto__" }],
      })
    ).rejects.toThrow("imported source page");
    await expect(
      convertInBrowser({
        ...archive(),
        comicPageDescriptions: Array(20_001).fill(record),
      })
    ).rejects.toThrow("bounded array");
    await expect(
      convertInBrowser({
        source: { name: "source.md", bytes: text("# Title") },
        comicPageDescriptions: [record],
      })
    ).rejects.toThrow("only to comic sources");
    const result = await convertInBrowser({
      ...archive(),
      comicPageDescriptions: [{ ...record, text: "x".repeat(2048) }],
    });
    if (result.document.profile !== "comic")
      throw new Error("Unexpected profile");
    expect(result.document.panels[0]?.alt).toHaveLength(2048);
  });
});

describe("browser archive safety", () => {
  it.each(["../outside.txt", "/absolute.txt", "nested\\outside.txt"])(
    "rejects unsafe ignored member %s",
    async (path) => {
      await expect(
        convertInBrowser(archive({ "page.png": png, [path]: text("unsafe") }))
      ).rejects.toMatchObject({ code: "archive-member-path-invalid" });
    }
  );

  it.each([
    {
      limits: { maxResourceBytes: png.length },
      code: "archive-file-size-limit",
    },
    {
      limits: { maxTotalResourceBytes: png.length },
      code: "archive-expanded-size-limit",
    },
    { limits: { maxResources: 1 }, code: "archive-entry-limit" },
  ])("applies $code to ignored members too", async ({ limits, code }) => {
    await expect(
      convertInBrowser({
        ...archive({
          "page.png": png,
          "ignored.txt": new Uint8Array(png.length + 1),
        }),
        limits,
      })
    ).rejects.toMatchObject({ code });
  });

  it("rejects high-ratio metadata, excessive pages and relaxed browser budgets", async () => {
    await expect(
      convertInBrowser({
        ...archive({
          "page.png": png,
          "ignored.bin": new Uint8Array(128 * 1024),
        }),
        limits: { maxResourceBytes: 4096 },
      })
    ).rejects.toMatchObject({ code: "archive-file-size-limit" });
    await expect(
      convertInBrowser({
        ...archive({ "page-1.png": png, "page-2.png": png }),
        limits: { maxNodes: 1 },
      })
    ).rejects.toThrow("Comic page count");
    await expect(
      convertInBrowser({ ...archive(), limits: { maxInputBytes: 16 } })
    ).rejects.toThrow("byte limit");
    await expect(
      convertInBrowser({ ...archive(), limits: { maxResources: 129 } })
    ).rejects.toThrow("only be tightened");
  });

  it("rejects unreadable, disguised, truncated and enveloped source archives", async () => {
    const valid = archive().source.bytes;
    for (const bytes of [
      text("%PDF-1.7"),
      png,
      valid.subarray(0, -1),
      createPrdContainer(valid),
      zipSync({}),
      zipSync({ "bad.png": text("invalid") }),
    ]) {
      await expect(
        convertInBrowser({ source: { name: "source.cbz", bytes } })
      ).rejects.toThrow();
    }
    for (const path of ["[Content_Types].xml", "META-INF/container.xml"]) {
      await expect(
        convertInBrowser(archive({ "page.png": png, [path]: text("marker") }))
      ).rejects.toThrow("renamed ZIP");
    }
  });

  it("rejects a corrupted stored page before producing a package", async () => {
    const bytes = zipSync({ "page.png": png }, { level: 0 });
    const header = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength
    );
    const dataOffset =
      30 + header.getUint16(26, true) + header.getUint16(28, true);
    bytes[dataOffset + 16] = bytes[dataOffset + 16]! ^ 1;
    await expect(
      convertInBrowser({ source: { name: "broken.cbz", bytes } })
    ).rejects.toMatchObject({ code: "archive-checksum-mismatch" });
  });
});
