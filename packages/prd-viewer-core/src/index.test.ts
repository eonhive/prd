import { describe, expect, it, vi } from "vitest";
import type { PrdCompatibility, PrdManifest, PrdPackageReader } from "@eonhive/prd-types";
import { validatePackageFiles } from "@eonhive/prd-validator";
import {
  PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR,
  PRD_REFERENCE_VIEWER_SUPPORT_STATES,
  PRD_REFERENCE_VIEWER_SUPPORTED_CAPABILITIES,
  getViewerRenderModeMessage,
  inferViewerRenderMode,
  openPrdDocument
} from "./index.js";

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

function toValidationFiles(files: Record<string, string>): Record<string, Uint8Array> {
  const encoder = new TextEncoder();
  return Object.fromEntries(
    Object.entries(files).map(([path, content]) => [path, encoder.encode(content)])
  );
}

describe("openPrdDocument", () => {
  describe("required extensions", () => {
    it("blocks before content or extension reads and preserves normalized manifest facts", async () => {
      const manifest = {
        prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:required-extension",
        profile: "responsive-document", title: "Required extension", entry: "content/root.json",
        localization: { defaultLocale: "en-US", availableLocales: ["en-US", "fr-FR"] },
        extensions: [
          { id: "optional.renderer", required: false },
          { id: "custom.renderer", version: "1.0", required: true, ref: "extensions/custom.json" },
          { id: "custom.audio", required: true }
        ]
      };
      const reader = createReader({ "manifest.json": JSON.stringify(manifest) });
      const readText = vi.spyOn(reader, "readText");
      const readBinary = vi.spyOn(reader, "readBinary");
      const has = vi.spyOn(reader, "has");

      const opened = await openPrdDocument(reader);

      expect(opened.supportState).toBe("unsupported-required-capability");
      expect(opened.manifest).toEqual({ ...manifest, profile: "general-document" });
      expect(opened.profileInfo.aliasUsed).toBe(true);
      expect(opened.entryPath).toBe(manifest.entry);
      expect(opened.localization).toEqual(manifest.localization);
      expect(opened.message).toBe("The current reference viewer does not support required extensions: custom.renderer, custom.audio.");
      expect(opened.entryDocument).toBeUndefined();
      expect(opened.comicDocument).toBeUndefined();
      expect(opened.storyboardDocument).toBeUndefined();
      expect(opened.entryHtml).toBeUndefined();
      expect(readText.mock.calls).toEqual([["manifest.json"]]);
      expect(readBinary).not.toHaveBeenCalled();
      expect(has).not.toHaveBeenCalled();
    });

    const optionalDeclarations: Array<{ name: string; extensions: PrdManifest["extensions"] }> = [
      { name: "absent", extensions: undefined },
      { name: "empty array", extensions: [] },
      { name: "empty object placeholder", extensions: {} },
      { name: "opaque object placeholder", extensions: { id: "legacy.metadata", required: true, nested: { required: true } } },
      { name: "optional unknown version", extensions: [{ id: "custom.renderer", version: "99.0", required: false }] },
      { name: "unspecified requirement", extensions: [{ id: "custom.renderer" }] },
      { name: "mixed optional declarations", extensions: [{ id: "custom.renderer", required: false }, { id: "custom.audio" }] }
    ];
    it.each(optionalDeclarations)("preserves valid structured opening for $name extensions", async ({ extensions }) => {
      const files = {
        "manifest.json": JSON.stringify({
          prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:optional-extension",
          profile: "general-document", title: "Optional", entry: "content/root.json", extensions
        }),
        "content/root.json": JSON.stringify({
          schemaVersion: "1.0", profile: "general-document", type: "document",
          id: "optional", title: "Optional", children: [{ type: "paragraph", text: "Readable." }]
        })
      };
      expect(validatePackageFiles(toValidationFiles(files)).valid).toBe(true);
      const opened = await openPrdDocument(createReader(files));
      expect(opened.supportState).toBe("fully-supported");
      expect(opened.entryDocument?.title).toBe("Optional");
      expect(opened.manifest.extensions).toEqual(extensions);
    });

    it.each(["general-document", "comic", "storyboard", "resume", "custom.zine"])("checks required extensions before dispatching %s", async (profile) => {
      const reader = createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:extension-profile",
          profile, title: "Required extension", entry: "content/index.html",
          extensions: [{ id: "custom.renderer", required: true }]
        })
      });
      const readText = vi.spyOn(reader, "readText");
      expect((await openPrdDocument(reader)).supportState).toBe("unsupported-required-capability");
      expect(readText.mock.calls).toEqual([["manifest.json"]]);
    });

    it.each(["general-document-structured-root", "eonhive.signature"])("does not infer required extension support from the name %s", async (id) => {
      const reader = createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:extension-namespace",
          profile: "general-document", title: "Required", entry: "content/root.json",
          extensions: [{ id, version: "1.0", required: true }]
        })
      });
      const opened = await openPrdDocument(reader);
      expect(opened.supportState).toBe("unsupported-required-capability");
      expect(opened.message).toContain(`required extensions: ${id}`);
    });

    it("reports both unsupported capabilities and required extensions", async () => {
      const opened = await openPrdDocument(createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:mixed-requirements",
          profile: "general-document", title: "Required", entry: "content/root.json",
          compatibility: { capabilities: { required: ["custom.capability"] } },
          extensions: [{ id: "custom.renderer", required: true }]
        })
      }));
      expect(opened.message).toBe("The current reference viewer does not support required capabilities: custom.capability; required extensions: custom.renderer.");
    });

    it("preserves the legacy HTML safe path with an optional extension", async () => {
      const opened = await openPrdDocument(createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:optional-html-extension",
          profile: "comic", title: "Optional", entry: "content/index.html",
          extensions: [{ id: "custom.renderer", required: false }]
        }),
        "content/index.html": "<p>Legacy readable content.</p>"
      }));
      expect(opened.supportState).toBe("safe-mode");
      expect(opened.entryHtml).toContain("Legacy readable content.");
    });
  });

  describe("required capabilities", () => {
    const unsupportedDeclarations: Array<{
      name: string;
      capabilities: PrdCompatibility["capabilities"];
    }> = [
      { name: "object", capabilities: { required: ["general-document-structured-root", "custom.renderer"] } },
      { name: "legacy array", capabilities: ["general-document-structured-root", "custom.renderer"] }
    ];

    it.each(unsupportedDeclarations)("blocks unsupported requirements in $name form before entry reads", async ({ capabilities }) => {
      const manifest = {
        prdVersion: "1.0",
        manifestVersion: "1.0",
        id: "urn:test:required-capability",
        profile: "responsive-document",
        title: "Required capability",
        entry: "content/root.json",
        localization: { defaultLocale: "en-US", availableLocales: ["en-US"] },
        compatibility: { capabilities }
      };
      const reader = createReader({ "manifest.json": JSON.stringify(manifest) });
      const readText = vi.spyOn(reader, "readText");
      const readBinary = vi.spyOn(reader, "readBinary");

      const opened = await openPrdDocument(reader);

      expect(opened.supportState).toBe("unsupported-required-capability");
      expect(opened.manifest).toEqual({ ...manifest, profile: "general-document" });
      expect(opened.profileInfo.aliasUsed).toBe(true);
      expect(opened.entryPath).toBe(manifest.entry);
      expect(opened.localization).toEqual(manifest.localization);
      expect(opened.message).toBe("The current reference viewer does not support required capabilities: custom.renderer.");
      expect(opened.entryDocument).toBeUndefined();
      expect(opened.comicDocument).toBeUndefined();
      expect(opened.storyboardDocument).toBeUndefined();
      expect(opened.entryHtml).toBeUndefined();
      expect(readText.mock.calls).toEqual([["manifest.json"]]);
      expect(readBinary).not.toHaveBeenCalled();
    });

    const supportedDeclarations: Array<{
      name: string;
      capabilities: PrdCompatibility["capabilities"];
    }> = [
      { name: "absent", capabilities: undefined },
      { name: "empty array", capabilities: [] },
      { name: "empty required", capabilities: { required: [] } },
      { name: "supported object", capabilities: { required: ["general-document-structured-root"] } },
      { name: "supported legacy array", capabilities: ["general-document-structured-root"] },
      { name: "unknown optional", capabilities: { optional: ["custom.renderer"] } },
      { name: "supported required and unknown optional", capabilities: { required: ["general-document-structured-root"], optional: ["custom.renderer"] } }
    ];

    it.each(supportedDeclarations)("preserves structured opening for $name capabilities", async ({ capabilities }) => {
      const files = {
        "manifest.json": JSON.stringify({
          prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:supported-capability",
          profile: "general-document", title: "Supported", entry: "content/root.json",
          compatibility: { capabilities }
        }),
        "content/root.json": JSON.stringify({
          schemaVersion: "1.0", profile: "general-document", type: "document",
          id: "supported", title: "Supported", children: [{ type: "paragraph", text: "Readable." }]
        })
      };

      expect(validatePackageFiles(toValidationFiles(files)).valid).toBe(true);
      const opened = await openPrdDocument(createReader(files));
      expect(opened.supportState).toBe("fully-supported");
      expect(opened.entryDocument?.title).toBe("Supported");
    });

    it.each(["general-document", "comic", "storyboard", "resume", "custom.zine"])("checks requirements before dispatching %s entries", async (profile) => {
      const reader = createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:profile-requirement",
          profile, title: "Required", entry: "content/index.html",
          compatibility: { capabilities: { required: ["custom.renderer"] } }
        })
      });
      expect((await openPrdDocument(reader)).supportState).toBe("unsupported-required-capability");
    });

    it("keeps supported HTML requirements in restricted safe mode", async () => {
      const opened = await openPrdDocument(createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0", manifestVersion: "1.0", id: "urn:test:html-requirement",
          profile: "comic", title: "Legacy", entry: "content/index.html",
          compatibility: { capabilities: ["base-entry-html"] }
        }),
        "content/index.html": "<p>Legacy readable content.</p>"
      }));
      expect(opened.supportState).toBe("safe-mode");
      expect(opened.entryHtml).toContain("Legacy readable content.");
    });
  });

  it("publishes a typed runtime descriptor for the current reference viewer", () => {
    expect(PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR.viewerId).toBe("reference-viewer");
    expect(PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR.supportedProfiles).toEqual([
      "general-document",
      "comic",
      "storyboard"
    ]);
    expect(PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR.supported).toEqual([
      ...PRD_REFERENCE_VIEWER_SUPPORTED_CAPABILITIES
    ]);
    expect(PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR.supportStates).toEqual([
      ...PRD_REFERENCE_VIEWER_SUPPORT_STATES
    ]);
    expect(PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR.safeMode).toBe(true);
    expect(PRD_REFERENCE_VIEWER_RUNTIME_DESCRIPTOR.referenceLoadMode).toBe(
      "eager-whole-package"
    );
  });

  it("opens structured general-document entries", async () => {
    const document = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:viewer-doc",
          profile: "general-document",
          title: "Doc",
          entry: "content/root.json"
        }),
        "content/root.json": JSON.stringify({
          schemaVersion: "1.0",
          profile: "general-document",
          type: "document",
          id: "doc",
          title: "Doc",
          children: [
            {
              type: "paragraph",
              text: "Structured document root"
            }
          ]
        })
      })
    );

    expect(document.supportState).toBe("fully-supported");
    expect(document.entryDocument?.title).toBe("Doc");
    expect(document.entryDocument?.children).toHaveLength(1);
  });

  it("opens resume-shaped structured general-document entries", async () => {
    const document = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:viewer-resume",
          profile: "general-document",
          title: "Resume",
          entry: "content/root.json"
        }),
        "content/root.json": JSON.stringify({
          schemaVersion: "1.0",
          profile: "general-document",
          type: "document",
          id: "resume",
          title: "Resume",
          subtitle: "Avery Example",
          children: [
            {
              type: "section",
              id: "skills",
              title: "Skills",
              children: [
                {
                  type: "list",
                  style: "unordered",
                  items: ["TypeScript", "Validation"]
                }
              ]
            }
          ]
        })
      })
    );

    expect(document.supportState).toBe("fully-supported");
    expect(document.entryDocument?.title).toBe("Resume");
    expect(document.entryHtml).toBeUndefined();
  });

  it("keeps legacy HTML general-document entries readable in safe mode", async () => {
    const document = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:viewer-doc-legacy-html",
          profile: "general-document",
          title: "Doc Legacy",
          entry: "content/index.html"
        }),
        "content/index.html": "<!doctype html><html><body>Doc Legacy</body></html>"
      })
    );

    expect(document.supportState).toBe("safe-mode");
    expect(document.entryHtml).toContain("Doc Legacy");
    expect(document.message).toContain("limited HTML fallback");
  });

  it("keeps legacy resume HTML entries readable in safe mode during migration", async () => {
    const document = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:viewer-resume-legacy",
          profile: "resume",
          title: "Resume Legacy",
          entry: "content/index.html"
        }),
        "content/index.html": "<!doctype html><html><body>Resume Legacy</body></html>"
      })
    );

    expect(document.supportState).toBe("safe-mode");
    expect(document.entryHtml).toContain("Resume Legacy");
    expect(document.message).toContain("limited HTML fallback");
  });

  it("opens structured comic roots as fully-supported", async () => {
    const document = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:viewer-comic",
          profile: "comic",
          title: "Comic",
          entry: "content/root.json"
        }),
        "content/root.json": JSON.stringify({
          schemaVersion: "1.0",
          profile: "comic",
          type: "comic",
          id: "comic",
          title: "Comic",
          panels: [
            {
              id: "panel-1",
              caption: "Opening panel"
            },
            {
              id: "panel-2",
              caption: "Closing panel"
            }
          ]
        })
      })
    );

    expect(document.supportState).toBe("fully-supported");
    expect(document.entryHtml).toBeUndefined();
    expect(document.comicDocument?.panels).toHaveLength(2);
    expect(document.comicDocument?.title).toBe("Comic");
  });

  it("opens legacy HTML comic packages in safe mode", async () => {
    const document = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:viewer-comic-safe",
          profile: "comic",
          title: "Comic",
          entry: "content/index.html"
        }),
        "content/index.html": "<!doctype html><html><body>Comic</body></html>",
        "profiles/comic/panels.json": JSON.stringify({
          profile: "comic",
          panels: [
            {
              id: "panel-1",
              caption: "Opening panel"
            }
          ]
        })
      })
    );

    expect(document.supportState).toBe("safe-mode");
    expect(document.entryHtml).toContain("Comic");
    expect(document.comicDocument).toBeUndefined();
    expect(document.message).toContain("legacy HTML fallback");
  });

  it("opens structured storyboard roots as fully-supported", async () => {
    const document = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:viewer-storyboard",
          profile: "storyboard",
          title: "Storyboard",
          entry: "content/root.json"
        }),
        "content/root.json": JSON.stringify({
          schemaVersion: "1.0",
          profile: "storyboard",
          type: "storyboard",
          id: "storyboard",
          title: "Storyboard",
          frames: [
            {
              id: "frame-1",
              notes: "Opening wide shot"
            },
            {
              id: "frame-2",
              notes: "Push into the reaction"
            }
          ]
        })
      })
    );

    expect(document.supportState).toBe("fully-supported");
    expect(document.entryHtml).toBeUndefined();
    expect(document.storyboardDocument?.frames).toHaveLength(2);
    expect(document.storyboardDocument?.title).toBe("Storyboard");
  });

  it("opens legacy HTML storyboard packages in safe mode", async () => {
    const document = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:viewer-storyboard-safe",
          profile: "storyboard",
          title: "Storyboard",
          entry: "content/index.html"
        }),
        "content/index.html": "<!doctype html><html><body>Storyboard</body></html>",
        "profiles/storyboard/frames.json": JSON.stringify({
          profile: "storyboard",
          frames: [
            {
              id: "frame-1",
              notes: "Opening wide shot"
            }
          ]
        })
      })
    );

    expect(document.supportState).toBe("safe-mode");
    expect(document.entryHtml).toContain("Storyboard");
    expect(document.storyboardDocument).toBeUndefined();
    expect(document.message).toContain("legacy HTML fallback");
  });

  it("reports unsupported viewer capability without implying format-invalid for valid custom packages", async () => {
    const files = {
      "manifest.json": JSON.stringify({
        prdVersion: "1.0",
        manifestVersion: "1.0",
        id: "urn:test:viewer-custom-unsupported-entry",
        profile: "custom-zine",
        title: "Custom Unsupported",
        entry: "content/root.xml"
      }),
      "content/root.xml": "<doc>Custom entry payload</doc>"
    };

    const validation = validatePackageFiles(toValidationFiles(files));
    const opened = await openPrdDocument(createReader(files));

    expect(validation.valid).toBe(true);
    expect(opened.supportState).toBe("unsupported-required-capability");
    expect(opened.message).toContain("limited HTML fallback");
  });

  it("keeps legacy HTML fallback viewer-limited while remaining validator-valid for custom packages", async () => {
    const files = {
      "manifest.json": JSON.stringify({
        prdVersion: "1.0",
        manifestVersion: "1.0",
        id: "urn:test:viewer-custom-html-fallback",
        profile: "custom-zine",
        title: "Custom HTML",
        entry: "content/index.html"
      }),
      "content/index.html": "<!doctype html><html><body>Custom HTML</body></html>"
    };

    const validation = validatePackageFiles(toValidationFiles(files));
    const opened = await openPrdDocument(createReader(files));

    expect(validation.valid).toBe(true);
    expect(opened.supportState).toBe("safe-mode");
    expect(opened.entryHtml).toContain("Custom HTML");
  });
});


describe("inferViewerRenderMode", () => {
  it("returns structured-json-rendered when structured entry content is present", async () => {
    const opened = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:render-mode-structured",
          profile: "general-document",
          title: "Structured",
          entry: "content/root.json"
        }),
        "content/root.json": JSON.stringify({
          schemaVersion: "1.0",
          profile: "general-document",
          type: "document",
          id: "doc",
          title: "Structured",
          children: []
        })
      })
    );

    expect(
      inferViewerRenderMode({
        opened,
        entryDocument: opened.entryDocument,
        comicDocument: opened.comicDocument,
        storyboardDocument: opened.storyboardDocument,
        renderedHtml: opened.entryHtml
      })
    ).toBe("structured-json-rendered");
  });

  it("returns html-fallback-rendered for safe-mode HTML fallback documents", async () => {
    const opened = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:render-mode-html",
          profile: "custom-zine",
          title: "HTML Fallback",
          entry: "content/index.html"
        }),
        "content/index.html": "<!doctype html><html><body>Fallback</body></html>"
      })
    );

    expect(
      inferViewerRenderMode({
        opened,
        entryDocument: opened.entryDocument,
        comicDocument: opened.comicDocument,
        storyboardDocument: opened.storyboardDocument,
        renderedHtml: opened.entryHtml
      })
    ).toBe("html-fallback-rendered");
  });

  it("returns unsupported-entry-mode for unsupported required capability", async () => {
    const opened = await openPrdDocument(
      createReader({
        "manifest.json": JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:render-mode-unsupported",
          profile: "custom-zine",
          title: "Unsupported",
          entry: "content/root.xml"
        }),
        "content/root.xml": "<doc>Unsupported</doc>"
      })
    );

    const mode = inferViewerRenderMode({
      opened,
      entryDocument: opened.entryDocument,
      comicDocument: opened.comicDocument,
      storyboardDocument: opened.storyboardDocument,
      renderedHtml: opened.entryHtml
    });

    expect(mode).toBe("unsupported-entry-mode");
    expect(getViewerRenderModeMessage(mode)).toContain("Unsupported entry mode detected");
  });
});
