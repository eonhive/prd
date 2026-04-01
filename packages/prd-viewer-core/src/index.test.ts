import { describe, expect, it } from "vitest";
import type { PrdPackageReader } from "@prd/types";
import { openPrdDocument } from "./index.js";

function createReader(files: Record<string, string>): PrdPackageReader {
  return {
    has(path) {
      return path in files;
    },
    readText(path) {
      const value = files[path];
      if (value === undefined) {
        throw new Error(`Missing file: ${path}`);
      }
      return value;
    },
    readBinary(path) {
      const value = files[path];
      if (value === undefined) {
        throw new Error(`Missing file: ${path}`);
      }
      return new TextEncoder().encode(value);
    }
  };
}

describe("openPrdDocument", () => {
  it("renders general-document entries", async () => {
    const document = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:viewer-doc",
          profile: "general-document",
          title: "Doc",
          entry: "content/index.html"
        }),
        "content/index.html": "<!doctype html><html><body>Doc</body></html>"
      })
    );

    expect(document.supportState).toBe("fully-supported");
    expect(document.entryHtml).toContain("Doc");
  });

  it("returns reserved-profile for comic and storyboard", async () => {
    const document = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:viewer-comic",
          profile: "comic",
          title: "Comic",
          entry: "content/index.html"
        }),
        "content/index.html": "<!doctype html><html><body>Comic</body></html>"
      })
    );

    expect(document.supportState).toBe("reserved-profile");
    expect(document.message).toContain("not implemented");
  });
});
