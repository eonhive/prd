import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { validateManifestObject, validatePackage } from "./index.js";
import {
  inspectPackage as inspectPackageAtPath,
  inspectPackageDirectory,
  inspectPrdArchive,
  validatePackage as validatePackageAtPath,
  validatePackageDirectory,
  validatePrdArchive
} from "./node.js";

const validManifest = {
  prdVersion: "1.0",
  manifestVersion: "1.0",
  id: "urn:test:document-basic",
  profile: "general-document",
  title: "Document Basic",
  entry: "content/root.json",
  assets: [
    {
      id: "cover",
      href: "assets/images/cover.svg",
      type: "image/svg+xml"
    }
  ]
};

const validContentRoot = {
  schemaVersion: "1.0",
  profile: "general-document",
  type: "document",
  id: "document-basic",
  title: "Document Basic",
  children: [
    {
      id: "intro-heading",
      type: "heading",
      level: 1,
      text: "Hello PRD"
    },
    {
      id: "intro-paragraph",
      type: "paragraph",
      text: "Base structured content."
    },
    {
      id: "cover-image",
      type: "image",
      asset: "cover",
      alt: "Cover image"
    },
    {
      type: "section",
      id: "why-this-exists",
      title: "Why this example exists",
      children: [
        {
          id: "why-quote",
          type: "quote",
          text: "Portable and structured."
        }
      ]
    }
  ]
};

const validLocalizedContentIndexRoot = {
  type: "localized-content-index",
  locales: {
    "fr-FR": {
      resource: "content/locales/fr-FR.json",
      label: "Francais"
    }
  }
};

const validFrenchOverridesRoot = {
  type: "localized-document-overrides",
  locale: "fr-FR",
  document: {
    title: "Exemple de document PRD",
    summary:
      "Exemple structure en langue francaise pour la surface de lecture localisee.",
    lang: "fr-FR"
  },
  public: {
    summary: "Resume localise pour les lecteurs francophones.",
    cover: "cover-fr"
  },
  nodes: {
    "intro-heading": {
      type: "heading",
      text: "Les Portable Responsive Documents commencent par un contrat centre sur le manifeste."
    },
    "intro-paragraph": {
      type: "paragraph",
      text: "Cette variante prouve qu'un package PRD peut fournir un contenu localise sans dupliquer toute la structure."
    },
    "cover-image": {
      type: "image",
      asset: "cover-fr",
      alt: "Image de couverture"
    },
    "why-this-exists": {
      type: "section",
      title: "Pourquoi cet exemple existe"
    },
    "why-quote": {
      type: "quote",
      text: "Portable et structure."
    }
  }
};

const validFrenchAlternateRoot = {
  ...validContentRoot,
  id: "document-basic-fr",
  title: "Exemple de document PRD",
  lang: "fr-FR",
  children: [
    {
      id: "intro-heading",
      type: "heading",
      level: 1,
      text: "Les Portable Responsive Documents commencent par un contrat centre sur le manifeste."
    },
    {
      id: "intro-paragraph",
      type: "paragraph",
      text: "Cette variante prouve qu'un package PRD peut fournir un autre point d'entree structure pour une locale declaree."
    },
    {
      id: "cover-image",
      type: "image",
      asset: "cover",
      alt: "Image de couverture"
    },
    {
      type: "section",
      id: "why-this-exists",
      title: "Pourquoi cet exemple existe",
      children: [
        {
          id: "why-quote",
          type: "quote",
          text: "Portable et structure."
        }
      ]
    }
  ]
};

const validSegmentedContentRoot = {
  schemaVersion: "1.0",
  profile: "general-document",
  type: "document",
  id: "document-segmented-basic",
  title: "Segmented Document Basic",
  children: [
    {
      id: "segmented-intro-heading",
      type: "heading",
      level: 1,
      text: "Large documents can stay manifest-first without bloating one root."
    },
    {
      id: "segmented-intro-paragraph",
      type: "paragraph",
      text: "This example keeps one canonical entry root while moving larger sections into packaged JSON files."
    },
    {
      type: "section",
      id: "manifest-discipline",
      title: "Manifest discipline",
      src: "content/sections/manifest-discipline.json"
    },
    {
      type: "section",
      id: "scaling-path",
      title: "Scaling path",
      src: "content/sections/scaling-path.json"
    }
  ]
};

const validManifestDisciplineSectionRoot = {
  schemaVersion: "1.0",
  profile: "general-document",
  type: "document-section",
  id: "manifest-discipline",
  title: "Manifest discipline",
  children: [
    {
      id: "manifest-discipline-paragraph",
      type: "paragraph",
      text: "Segmented sections stay inside one document rather than becoming a collection system."
    },
    {
      id: "manifest-discipline-list",
      type: "list",
      style: "unordered",
      items: [
        "manifest.json still points at content/root.json",
        "top-level sections may reference packaged section files",
        "the base document remains one profile and one reader path"
      ]
    }
  ]
};

const validScalingPathSectionRoot = {
  schemaVersion: "1.0",
  profile: "general-document",
  type: "document-section",
  id: "scaling-path",
  title: "Scaling path",
  children: [
    {
      id: "scaling-path-paragraph",
      type: "paragraph",
      text: "Section files keep larger works smaller and easier to diff without reviving a heavy spine."
    },
    {
      id: "scaling-path-quote",
      type: "quote",
      text: "Root plus section files is a packaging rule, not a new document type.",
      attribution: "Phase 3 direction"
    }
  ]
};

const validSegmentedFrenchOverridesRoot = {
  type: "localized-document-overrides",
  locale: "fr-FR",
  nodes: {
    "manifest-discipline-paragraph": {
      type: "paragraph",
      text: "Les sections segmentees restent dans un seul document au lieu de devenir une collection."
    },
    "scaling-path-quote": {
      type: "quote",
      text: "La racine plus des fichiers de section reste une regle de packaging.",
      attribution: "Orientation phase 3"
    }
  }
};

function createPlaceholderSvg(label: string, accent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="${label}"><rect width="640" height="360" rx="24" fill="${accent}" /><rect x="28" y="28" width="584" height="304" rx="18" fill="rgba(255,255,255,0.14)" /><text x="56" y="196" fill="#f7fbff" font-family="Arial, sans-serif" font-size="38" font-weight="700">${label}</text></svg>`;
}

const validComicAssets = [
  {
    id: "panel-1-art",
    href: "assets/panels/panel-1.svg",
    type: "image/svg+xml"
  },
  {
    id: "panel-2-art",
    href: "assets/panels/panel-2.svg",
    type: "image/svg+xml"
  }
];

const validComicAssetFiles: Record<string, Uint8Array> = {
  "assets/panels/panel-1.svg": strToU8(createPlaceholderSvg("Panel 1", "#204261")),
  "assets/panels/panel-2.svg": strToU8(createPlaceholderSvg("Panel 2", "#8b2e4f"))
};

const validStoryboardAssets = [
  {
    id: "frame-1-art",
    href: "assets/frames/frame-1.svg",
    type: "image/svg+xml"
  },
  {
    id: "frame-2-art",
    href: "assets/frames/frame-2.svg",
    type: "image/svg+xml"
  }
];

const validStoryboardAssetFiles: Record<string, Uint8Array> = {
  "assets/frames/frame-1.svg": strToU8(createPlaceholderSvg("Frame 1", "#335b4a")),
  "assets/frames/frame-2.svg": strToU8(createPlaceholderSvg("Frame 2", "#7a5f27"))
};

const validComicManifest = {
  prdVersion: "1.0",
  manifestVersion: "1.0",
  id: "urn:test:comic-basic",
  profile: "comic",
  title: "Comic Basic",
  entry: "content/root.json",
  compatibility: {
    minViewer: "0.1",
    capabilities: {
      required: [],
      optional: ["panel-navigation"]
    }
  },
  assets: validComicAssets
};

const validComicRoot = {
  schemaVersion: "1.0",
  profile: "comic",
  type: "comic",
  id: "comic-basic",
  title: "Comic Basic",
  panels: [
    {
      id: "panel-1",
      asset: "panel-1-art",
      alt: "Courier crouched above the city canopy",
      caption: "Opening panel"
    },
    {
      id: "panel-2",
      asset: "panel-2-art",
      alt: "Courier landing on the suspended walkway",
      caption: "Closing panel"
    }
  ]
};

const validLegacyComicManifest = {
  ...validComicManifest,
  entry: "content/index.html",
  compatibility: {
    minViewer: "0.1",
    capabilities: {
      required: ["base-entry-html"],
      optional: ["panel-navigation"]
    }
  }
};

const validLegacyComicPanelsRoot = {
  profile: "comic",
  panels: [
    {
      id: "panel-1",
      asset: "panel-1-art",
      alt: "Courier crouched above the city canopy",
      caption: "Opening panel"
    },
    {
      id: "panel-2",
      asset: "panel-2-art",
      alt: "Courier landing on the suspended walkway",
      caption: "Closing panel"
    }
  ]
};

const validStoryboardManifest = {
  prdVersion: "1.0",
  manifestVersion: "1.0",
  id: "urn:test:storyboard-basic",
  profile: "storyboard",
  title: "Storyboard Basic",
  entry: "content/root.json",
  compatibility: {
    minViewer: "0.1",
    capabilities: {
      required: [],
      optional: ["review-grid"]
    }
  },
  assets: validStoryboardAssets
};

const validStoryboardRoot = {
  schemaVersion: "1.0",
  profile: "storyboard",
  type: "storyboard",
  id: "storyboard-basic",
  title: "Storyboard Basic",
  frames: [
    {
      id: "frame-1",
      asset: "frame-1-art",
      alt: "Wide rooftop establishing board",
      notes: "Opening wide shot"
    },
    {
      id: "frame-2",
      asset: "frame-2-art",
      alt: "Reaction insert on the turn toward the doorway",
      notes: "Reaction insert"
    }
  ]
};

const validLegacyStoryboardManifest = {
  ...validStoryboardManifest,
  entry: "content/index.html",
  compatibility: {
    minViewer: "0.1",
    capabilities: {
      required: ["base-entry-html"],
      optional: ["review-grid"]
    }
  }
};

const validLegacyStoryboardFramesRoot = {
  profile: "storyboard",
  frames: [
    {
      id: "frame-1",
      asset: "frame-1-art",
      alt: "Wide rooftop establishing board",
      notes: "Opening wide shot"
    },
    {
      id: "frame-2",
      asset: "frame-2-art",
      alt: "Reaction insert on the turn toward the doorway",
      notes: "Reaction insert"
    }
  ]
};

type ValidatorFixtureValue = Uint8Array | string | number | boolean | null | object;

function createValidatorFixtureFileMap(
  fixtures: Record<string, ValidatorFixtureValue>
): Record<string, Uint8Array> {
  return Object.fromEntries(
    Object.entries(fixtures).map(([path, value]) => {
      if (value instanceof Uint8Array) {
        return [path, value];
      }

      if (typeof value === "string") {
        return [path, strToU8(value)];
      }

      return [path, strToU8(JSON.stringify(value))];
    })
  );
}

function validateStructuredChildren(
  children: unknown[],
  options?: {
    assets?: Array<{
      id?: string;
      href: string;
      type?: string;
    }>;
    files?: Record<string, Uint8Array>;
  }
) {
  const manifest = {
    ...validManifest,
    assets: [...validManifest.assets, ...(options?.assets ?? [])]
  };

  return validatePackage({
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "content/root.json": strToU8(
      JSON.stringify({
        ...validContentRoot,
        children
      })
    ),
    "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />"),
    ...(options?.files ?? {})
  });
}

function validateComicPackage(root?: unknown) {
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(validComicManifest)),
    "content/root.json": strToU8(JSON.stringify(root ?? validComicRoot)),
    ...validComicAssetFiles
  };

  return validatePackage(files);
}

function validateLegacyComicPackage(panels?: unknown) {
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(validLegacyComicManifest)),
    "content/index.html": strToU8(
      "<!doctype html><html><body><main>Comic fixture</main></body></html>"
    ),
    ...validComicAssetFiles
  };

  if (panels !== undefined) {
    files["profiles/comic/panels.json"] = strToU8(JSON.stringify(panels));
  }

  return validatePackage(files);
}

function validateStoryboardPackage(root?: unknown) {
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(validStoryboardManifest)),
    "content/root.json": strToU8(JSON.stringify(root ?? validStoryboardRoot)),
    ...validStoryboardAssetFiles
  };

  return validatePackage(files);
}

function validateLocalizedDocumentPackage(options?: {
  manifest?: Record<string, unknown>;
  localizedIndex?: unknown;
  localizedResource?: unknown;
  localizedEntryRoot?: unknown;
}) {
  const manifest = {
    ...validManifest,
    assets: [
      ...validManifest.assets,
      {
        id: "cover-fr",
        href: "assets/images/cover-fr.svg",
        type: "image/svg+xml"
      }
    ],
    localization: {
      defaultLocale: "en-US",
      availableLocales: ["en-US", "fr-FR"],
      textDirection: "ltr"
    },
    ...(options?.manifest ?? {})
  };

  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "content/root.json": strToU8(JSON.stringify(validContentRoot)),
    "content/locales/index.json": strToU8(
      JSON.stringify(options?.localizedIndex ?? validLocalizedContentIndexRoot)
    ),
    "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />"),
    "assets/images/cover-fr.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
  };

  if (options?.localizedResource !== null) {
    files["content/locales/fr-FR.json"] = strToU8(
      JSON.stringify(options?.localizedResource ?? validFrenchOverridesRoot)
    );
  }

  if (options?.localizedEntryRoot !== undefined) {
    files["content/locales/fr-FR/root.json"] = strToU8(
      JSON.stringify(options.localizedEntryRoot)
    );
  }

  return validatePackage(files);
}

function validateSegmentedDocumentPackage(options?: {
  manifest?: Record<string, unknown>;
  root?: unknown;
  sections?: Record<string, unknown | null>;
  localizedIndex?: unknown;
  localizedResource?: unknown;
}) {
  const manifest = {
    ...validManifest,
    id: "urn:test:document-segmented-basic",
    title: "Segmented Document Basic",
    ...(options?.manifest ?? {})
  };

  const sections = {
    "content/sections/manifest-discipline.json": validManifestDisciplineSectionRoot,
    "content/sections/scaling-path.json": validScalingPathSectionRoot,
    ...(options?.sections ?? {})
  };

  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "content/root.json": strToU8(
      JSON.stringify(options?.root ?? validSegmentedContentRoot)
    ),
    "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
  };

  for (const [path, value] of Object.entries(sections)) {
    if (value !== null) {
      files[path] = strToU8(JSON.stringify(value));
    }
  }

  if (options?.localizedIndex !== undefined) {
    files["content/locales/index.json"] = strToU8(
      JSON.stringify(options.localizedIndex)
    );
  }

  if (options?.localizedResource !== undefined) {
    files["content/locales/fr-FR.json"] = strToU8(
      JSON.stringify(options.localizedResource)
    );
  }

  return validatePackage(files);
}

function validateLegacyStoryboardPackage(frames?: unknown) {
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(validLegacyStoryboardManifest)),
    "content/index.html": strToU8(
      "<!doctype html><html><body><main>Storyboard fixture</main></body></html>"
    ),
    ...validStoryboardAssetFiles
  };

  if (frames !== undefined) {
    files["profiles/storyboard/frames.json"] = strToU8(JSON.stringify(frames));
  }

  return validatePackage(files);
}

describe("validateManifestObject", () => {
  it("returns stable required-field issue codes for canonical top-level fields", () => {
    const requiredFields = [
      "prdVersion",
      "manifestVersion",
      "id",
      "profile",
      "title",
      "entry"
    ] as const;

    for (const field of requiredFields) {
      const manifest = { ...validManifest } as Record<string, unknown>;
      delete manifest[field];

      const result = validateManifestObject(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.map((issue) => issue.code)).toContain(`${field}-required`);
    }
  });

  it("normalizes the legacy responsive-document alias", () => {
    const result = validateManifestObject({
      ...validManifest,
      profile: "responsive-document"
    });

    expect(result.valid).toBe(true);
    expect(result.manifest?.profile).toBe("general-document");
    expect(result.warnings[0]?.code).toBe("profile-alias");
  });

  it("rejects HTML-first entry targets for general-document", () => {
    const result = validateManifestObject({
      ...validManifest,
      entry: "content/index.html"
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "general-document-entry-format"
    );
  });

  it("rejects package-external traversal entry paths with a stable issue code", () => {
    const result = validateManifestObject({
      ...validManifest,
      entry: "../content/root.json"
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("entry-traversal");
  });

  it("rejects profile and entry mode mismatches for comic/storyboard structured paths", () => {
    const comicResult = validateManifestObject({
      ...validComicManifest,
      entry: "profiles/comic/panels.json"
    });
    const storyboardResult = validateManifestObject({
      ...validStoryboardManifest,
      entry: "profiles/storyboard/frames.json"
    });

    expect(comicResult.valid).toBe(false);
    expect(comicResult.errors.map((issue) => issue.code)).toContain("comic-entry-format");
    expect(storyboardResult.valid).toBe(false);
    expect(storyboardResult.errors.map((issue) => issue.code)).toContain(
      "storyboard-entry-format"
    );
  });

  it("warns when general-document still declares the legacy HTML capability", () => {
    const result = validateManifestObject({
      ...validManifest,
      compatibility: {
        capabilities: {
          required: ["base-entry-html"]
        }
      }
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.code)).toContain(
      "general-document-html-capability-legacy"
    );
  });

  it("warns when the legacy bare resume profile is used", () => {
    const result = validateManifestObject({
      prdVersion: "1.0",
      manifestVersion: "1.0",
      id: "urn:test:resume-legacy",
      profile: "resume",
      title: "Resume Legacy",
      entry: "content/index.html"
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.code)).toContain(
      "profile-resume-legacy"
    );
    expect(result.warnings.map((issue) => issue.code)).not.toContain(
      "profile-unknown"
    );
  });

  it("accepts current draft `identity` reference fields", () => {
    const result = validateManifestObject({
      ...validManifest,
      identity: {
        revisionId: "rev-2",
        parentId: "urn:test:document-parent",
        originId: "urn:test:document-origin",
        authorRefs: ["author:avery-example"],
        publisherRef: "publisher:eonhive-press",
        ownerRef: "owner:example"
      }
    });

    expect(result.valid).toBe(true);
  });

  it("accepts lean series and collection references in the manifest metadata lanes", () => {
    const result = validateManifestObject({
      ...validManifest,
      identity: {
        series: {
          ref: "urn:prd-series:test:portable-guides",
          sequence: {
            volume: 1,
            issue: 2
          }
        },
        collections: [
          {
            ref: "urn:prd-collection:test:launch-shelf"
          }
        ]
      },
      public: {
        series: {
          title: "Portable Guides"
        },
        collections: [
          {
            title: "Launch Shelf"
          }
        ]
      }
    });

    expect(result.valid).toBe(true);
  });

  it("rejects non-object `identity` values", () => {
    const result = validateManifestObject({
      ...validManifest,
      identity: "rev-2"
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("identity-shape");
  });

  it("rejects malformed current draft `identity` reference fields", () => {
    const result = validateManifestObject({
      ...validManifest,
      identity: {
        revisionId: "",
        authorRefs: ["author:avery-example", ""],
        publisherRef: 42
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("identity-revision-id");
    expect(result.errors.map((issue) => issue.code)).toContain("identity-author-refs");
    expect(result.errors.map((issue) => issue.code)).toContain("identity-publisher-ref");
  });

  it("rejects malformed series sequence metadata in `identity`", () => {
    const result = validateManifestObject({
      ...validManifest,
      identity: {
        series: {
          ref: "urn:prd-series:test:portable-guides",
          sequence: {
            volume: 0,
            issue: 2.5
          }
        },
        collections: [
          {
            ref: "urn:prd-collection:test:launch-shelf"
          },
          {
            ref: "urn:prd-collection:test:launch-shelf"
          }
        ]
      }
    });

    expect(result.valid).toBe(false);
    const codes = result.errors.map((issue) => issue.code);
    expect(codes).toContain("identity-series-sequence-volume");
    expect(codes).toContain("identity-series-sequence-issue");
    expect(codes).toContain("identity-collection-ref-duplicate");
  });

  it("warns when `identity.id` pointlessly duplicates the top-level `id`", () => {
    const result = validateManifestObject({
      ...validManifest,
      identity: {
        id: validManifest.id
      }
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.code)).toContain(
      "identity-duplicates-id"
    );
  });

  it("accepts valid `public` metadata with contributors and cover", () => {
    const result = validateManifestObject({
      ...validManifest,
      public: {
        byline: "Avery Example",
        contributors: [
          {
            name: "Avery Example",
            role: "author",
            displayName: "Avery E."
          }
        ],
        cover: "assets/images/cover.svg"
      }
    });

    expect(result.valid).toBe(true);
  });

  it("rejects display series metadata when durable series references are missing", () => {
    const result = validateManifestObject({
      ...validManifest,
      public: {
        series: {
          title: "Portable Guides"
        },
        collections: [
          {
            title: "Launch Shelf"
          }
        ]
      }
    });

    expect(result.valid).toBe(false);
    const codes = result.errors.map((issue) => issue.code);
    expect(codes).toContain("public-series-identity-series-required");
    expect(codes).toContain("public-collections-identity-collections-required");
  });

  it("rejects collection labels that do not match the durable collection ref count", () => {
    const result = validateManifestObject({
      ...validManifest,
      identity: {
        collections: [
          {
            ref: "urn:prd-collection:test:launch-shelf"
          }
        ]
      },
      public: {
        collections: [
          {
            title: "Launch Shelf"
          },
          {
            title: "Extra Shelf"
          }
        ]
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "public-collections-length"
    );
  });

  it("rejects malformed `public` contributor entries", () => {
    const result = validateManifestObject({
      ...validManifest,
      public: {
        contributors: [
          {
            name: "",
            role: "author"
          },
          {
            name: "Avery Example",
            role: ""
          },
          "not-an-object"
        ]
      }
    });

    expect(result.valid).toBe(false);
    const codes = result.errors.map((issue) => issue.code);
    expect(codes).toContain("public-contributor-name");
    expect(codes).toContain("public-contributor-role");
    expect(codes).toContain("public-contributor-shape");
  });

  it("rejects non-string `public.cover` values", () => {
    const result = validateManifestObject({
      ...validManifest,
      public: {
        cover: 42
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("public-cover");
  });

  it("rejects object-shaped `assets` declarations", () => {
    const result = validateManifestObject({
      ...validManifest,
      assets: {
        cover: "assets/images/cover.svg"
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("assets-shape");
  });

  it("rejects external asset URL href values", () => {
    const result = validateManifestObject({
      ...validManifest,
      assets: [
        {
          id: "cover",
          href: "https://cdn.example.com/cover.svg",
          type: "image/svg+xml"
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "asset-href-url-format"
    );
  });

  it("accepts bundled and linked attachment declarations", () => {
    const result = validateManifestObject({
      ...validManifest,
      attachments: [
        {
          id: "checklist",
          href: "attachments/checklist.txt",
          type: "text/plain"
        },
        {
          id: "reference-link",
          href: "https://example.com/reference.pdf",
          type: "application/pdf"
        }
      ]
    });

    expect(result.valid).toBe(true);
  });

  it("rejects malformed attachment declarations", () => {
    const result = validateManifestObject({
      ...validManifest,
      attachments: [
        {
          id: "",
          href: "notes/checklist.txt"
        },
        {
          id: "bad-link",
          href: "ftp://example.com/file.zip"
        },
        {
          href: "../checklist.txt"
        }
      ]
    });

    expect(result.valid).toBe(false);
    const codes = result.errors.map((issue) => issue.code);
    expect(codes).toContain("attachment-id-shape");
    expect(codes).toContain("attachment-href-prefix");
    expect(codes).toContain("attachment-href-url-format");
    expect(codes).toContain("attachment-href-path-format");
  });
});

describe("validatePackage", () => {
  it("accepts a valid structured general-document package", () => {
    const result = validatePackage(
      createValidatorFixtureFileMap({
        "manifest.json": validManifest,
        "content/root.json": validContentRoot,
        "assets/images/cover.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" />"
      })
    );

    expect(result.valid).toBe(true);
  });

  it("returns stable issue codes for entry compatibility failures", () => {
    const generalDocumentNonJsonResult = validatePackage(
      createValidatorFixtureFileMap({
        "manifest.json": {
          ...validManifest,
          entry: "content/root.html"
        },
        "content/root.html": "<!doctype html><html><body>legacy entry</body></html>"
      })
    );
    const comicUnsupportedModeResult = validatePackage(
      createValidatorFixtureFileMap({
        "manifest.json": {
          ...validComicManifest,
          entry: "profiles/comic/panels.json"
        },
        "profiles/comic/panels.json": validLegacyComicPanelsRoot
      })
    );

    expect(generalDocumentNonJsonResult.valid).toBe(false);
    expect(generalDocumentNonJsonResult.errors.map((issue) => issue.code)).toContain(
      "general-document-entry-format"
    );

    expect(comicUnsupportedModeResult.valid).toBe(false);
    expect(comicUnsupportedModeResult.errors.map((issue) => issue.code)).toContain(
      "comic-entry-format"
    );
  });

  it("rejects package manifests that use object-shaped asset groups", () => {
    const result = validatePackage({
      "manifest.json": strToU8(
        JSON.stringify({
          ...validManifest,
          assets: {
            cover: "assets/images/cover.svg"
          }
        })
      ),
      "content/root.json": strToU8(JSON.stringify(validContentRoot)),
      "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("assets-shape");
  });

  it("accepts a segmented structured general-document package", () => {
    const result = validateSegmentedDocumentPackage();

    expect(result.valid).toBe(true);
  });

  it("accepts localized overrides for nodes declared inside segmented section files", () => {
    const result = validateSegmentedDocumentPackage({
      manifest: {
        localization: {
          defaultLocale: "en-US",
          availableLocales: ["en-US", "fr-FR"]
        }
      },
      localizedIndex: {
        type: "localized-content-index",
        locales: {
          "fr-FR": {
            resource: "content/locales/fr-FR.json",
            label: "Francais"
          }
        }
      },
      localizedResource: validSegmentedFrenchOverridesRoot
    });

    expect(result.valid).toBe(true);
  });

  it("accepts a localized structured general-document package", () => {
    const result = validateLocalizedDocumentPackage();

    expect(result.valid).toBe(true);
  });

  it("accepts a localized alternate structured entry when a locale maps to `entry`", () => {
    const result = validateLocalizedDocumentPackage({
      localizedIndex: {
        type: "localized-content-index",
        locales: {
          "fr-FR": {
            entry: "content/locales/fr-FR/root.json",
            label: "Francais"
          }
        }
      },
      localizedResource: null,
      localizedEntryRoot: validFrenchAlternateRoot
    });

    expect(result.valid).toBe(true);
  });

  it("accepts a localized alternate structured entry with a companion localized resource", () => {
    const result = validateLocalizedDocumentPackage({
      localizedIndex: {
        type: "localized-content-index",
        locales: {
          "fr-FR": {
            entry: "content/locales/fr-FR/root.json",
            resource: "content/locales/fr-FR.json",
            label: "Francais"
          }
        }
      },
      localizedEntryRoot: validFrenchAlternateRoot
    });

    expect(result.valid).toBe(true);
  });

  it("warns when alternate locales are declared without a localized content index", () => {
    const result = validatePackage({
      "manifest.json": strToU8(
        JSON.stringify({
          ...validManifest,
          localization: {
            defaultLocale: "en-US",
            availableLocales: ["en-US", "fr-FR"]
          }
        })
      ),
      "content/root.json": strToU8(JSON.stringify(validContentRoot)),
      "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.code)).toContain(
      "localized-content-index-missing"
    );
  });

  it("rejects localized resource maps that point to missing package files", () => {
    const result = validateLocalizedDocumentPackage({
      localizedIndex: {
        type: "localized-content-index",
        locales: {
          "fr-FR": {
            resource: "content/locales/fr-FR-missing.json"
          }
        }
      },
      localizedResource: null
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "localized-content-resource-missing"
    );
  });

  it("rejects localized public cover overrides that do not resolve to declared image assets", () => {
    const result = validateLocalizedDocumentPackage({
      localizedResource: {
        ...validFrenchOverridesRoot,
        public: {
          summary: "Resume localise",
          cover: "missing-cover"
        }
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "localized-document-overrides-public-cover-asset-missing"
    );
  });

  it("rejects localized image asset overrides that do not resolve to declared image assets", () => {
    const result = validateLocalizedDocumentPackage({
      localizedResource: {
        ...validFrenchOverridesRoot,
        nodes: {
          ...validFrenchOverridesRoot.nodes,
          "cover-image": {
            type: "image",
            asset: "missing-cover-fr"
          }
        }
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "localized-document-overrides-image-asset-missing"
    );
  });

  it("rejects bundled attachments when the declared file is missing", () => {
    const result = validatePackage({
      "manifest.json": strToU8(
        JSON.stringify({
          ...validManifest,
          attachments: [
            {
              id: "checklist",
              href: "attachments/checklist.txt",
              type: "text/plain"
            }
          ]
        })
      ),
      "content/root.json": strToU8(JSON.stringify(validContentRoot)),
      "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "attachment-file-missing"
    );
  });

  it("accepts linked attachments without requiring a bundled file", () => {
    const result = validatePackage({
      "manifest.json": strToU8(
        JSON.stringify({
          ...validManifest,
          attachments: [
            {
              id: "linked-reference",
              href: "https://example.com/reference.pdf",
              type: "application/pdf"
            }
          ]
        })
      ),
      "content/root.json": strToU8(JSON.stringify(validContentRoot)),
      "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
    });

    expect(result.valid).toBe(true);
  });

  it("rejects base public covers that do not resolve to declared image assets", () => {
    const result = validatePackage({
      "manifest.json": strToU8(
        JSON.stringify({
          ...validManifest,
          public: {
            cover: "missing-cover"
          }
        })
      ),
      "content/root.json": strToU8(JSON.stringify(validContentRoot)),
      "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />"),
      "assets/images/cover-fr.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "public-cover-asset-missing"
    );
  });

  it("accepts structured content with links and tables", () => {
    const result = validateStructuredChildren([
      {
        type: "section",
        id: "references",
        title: "References",
        children: [
          {
            type: "paragraph",
            text: "Review the base links and comparison table."
          }
        ]
      },
      {
        type: "links",
        style: "list",
        items: [
          {
            label: "Project site",
            href: "https://prd.eonhive.dev"
          },
          {
            label: "Email the team",
            href: "mailto:team@example.com"
          },
          {
            label: "Jump to references",
            href: "#references"
          }
        ]
      },
      {
        type: "table",
        caption: "Foundational lanes",
        columns: [
          {
            id: "lane",
            label: "Lane",
            align: "left"
          },
          {
            id: "focus",
            label: "Focus",
            align: "center"
          }
        ],
        rows: [
          {
            lane: "Manifest",
            focus: "Canonical package control surface"
          },
          {
            lane: "Viewer",
            focus: "Truthful rendering"
          }
        ]
      }
    ]);

    expect(result.valid).toBe(true);
  });

  it("rejects invalid links node styles", () => {
    const result = validateStructuredChildren([
      {
        type: "links",
        style: "grid",
        items: [
          {
            label: "Project site",
            href: "https://prd.eonhive.dev"
          }
        ]
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("links-style-invalid");
  });

  it("rejects invalid links node href formats", () => {
    const result = validateStructuredChildren([
      {
        type: "links",
        style: "list",
        items: [
          {
            label: "Relative package link",
            href: "content/other.json"
          },
          {
            label: "Unsupported scheme",
            href: "ftp://example.com/file.txt"
          }
        ]
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "links-item-href-format"
    );
  });

  it("rejects duplicate table column ids", () => {
    const result = validateStructuredChildren([
      {
        type: "table",
        columns: [
          {
            id: "lane",
            label: "Lane"
          },
          {
            id: "lane",
            label: "Duplicate lane"
          }
        ],
        rows: [
          {
            lane: "Manifest"
          }
        ]
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "table-column-id-duplicate"
    );
  });

  it("rejects segmented section paths outside `content/sections/`", () => {
    const result = validateSegmentedDocumentPackage({
      root: {
        ...validSegmentedContentRoot,
        children: [
          ...validSegmentedContentRoot.children.slice(0, 2),
          {
            type: "section",
            id: "manifest-discipline",
            title: "Manifest discipline",
            src: "content/appendices/manifest-discipline.json"
          }
        ]
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "section-src-path-format"
    );
  });

  it("rejects segmented sections when `src` and `children` are both present", () => {
    const result = validateSegmentedDocumentPackage({
      root: {
        ...validSegmentedContentRoot,
        children: [
          {
            type: "section",
            id: "manifest-discipline",
            title: "Manifest discipline",
            src: "content/sections/manifest-discipline.json",
            children: [
              {
                id: "duplicate-inline-child",
                type: "paragraph",
                text: "This should not be allowed."
              }
            ]
          }
        ]
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "section-segmentation-mutually-exclusive"
    );
  });

  it("rejects nested segmented section references", () => {
    const result = validateSegmentedDocumentPackage({
      sections: {
        "content/sections/manifest-discipline.json": {
          ...validManifestDisciplineSectionRoot,
          children: [
            {
              type: "section",
              id: "nested-segment",
              title: "Nested segment",
              src: "content/sections/nested-segment.json"
            }
          ]
        }
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "section-segmentation-nested-unsupported"
    );
  });

  it("rejects missing segmented section files", () => {
    const result = validateSegmentedDocumentPackage({
      sections: {
        "content/sections/manifest-discipline.json": null
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("section-src-missing");
  });

  it("rejects segmented section files with the wrong root type", () => {
    const result = validateSegmentedDocumentPackage({
      sections: {
        "content/sections/manifest-discipline.json": {
          ...validManifestDisciplineSectionRoot,
          type: "document"
        }
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "section-content-type-invalid"
    );
  });

  it("rejects segmented section files whose ids do not match the parent section", () => {
    const result = validateSegmentedDocumentPackage({
      sections: {
        "content/sections/manifest-discipline.json": {
          ...validManifestDisciplineSectionRoot,
          id: "wrong-id"
        }
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "section-content-id-mismatch"
    );
  });

  it("rejects segmented section files whose titles do not match the parent section", () => {
    const result = validateSegmentedDocumentPackage({
      sections: {
        "content/sections/manifest-discipline.json": {
          ...validManifestDisciplineSectionRoot,
          title: "Wrong title"
        }
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "section-content-title-mismatch"
    );
  });

  it("rejects repeated section-file graphs in v0.1", () => {
    const result = validateSegmentedDocumentPackage({
      root: {
        ...validSegmentedContentRoot,
        children: [
          ...validSegmentedContentRoot.children.slice(0, 2),
          {
            type: "section",
            id: "manifest-discipline",
            title: "Manifest discipline",
            src: "content/sections/manifest-discipline.json"
          },
          {
            type: "section",
            id: "manifest-discipline-copy",
            title: "Manifest discipline copy",
            src: "content/sections/manifest-discipline.json"
          }
        ]
      }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "section-src-duplicate"
    );
  });

  it("rejects invalid table column alignment", () => {
    const result = validateStructuredChildren([
      {
        type: "table",
        columns: [
          {
            id: "lane",
            label: "Lane",
            align: "justify"
          }
        ],
        rows: [
          {
            lane: "Manifest"
          }
        ]
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "table-column-align-invalid"
    );
  });

  it("rejects table row values that are not strings", () => {
    const result = validateStructuredChildren([
      {
        type: "table",
        columns: [
          {
            id: "lane",
            label: "Lane"
          }
        ],
        rows: [
          {
            lane: 42
          }
        ]
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "table-row-value-shape"
    );
  });

  it("rejects table row keys that are not declared columns", () => {
    const result = validateStructuredChildren([
      {
        type: "table",
        columns: [
          {
            id: "lane",
            label: "Lane"
          }
        ],
        rows: [
          {
            unknown: "Undeclared"
          }
        ]
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "table-row-column-unknown"
    );
  });

  it("accepts structured content with a bar chart and audio media", () => {
    const result = validateStructuredChildren(
      [
        {
          type: "chart",
          chartType: "bar",
          title: "Support state examples",
          caption: "Structured charts pair categories with explicit numeric series.",
          categories: ["Valid", "Warnings", "Reserved"],
          series: [
            {
              name: "Examples",
              values: [4, 2, 2]
            }
          ]
        },
        {
          type: "media",
          mediaType: "audio",
          asset: "intro-audio",
          caption: "Audio remains optional and should degrade gracefully."
        }
      ],
      {
        assets: [
          {
            id: "intro-audio",
            href: "assets/audio/intro-tone.wav",
            type: "audio/wav"
          }
        ],
        files: {
          "assets/audio/intro-tone.wav": strToU8("RIFF....WAVEfmt ")
        }
      }
    );

    expect(result.valid).toBe(true);
  });

  it("rejects unsupported chart types", () => {
    const result = validateStructuredChildren([
      {
        type: "chart",
        chartType: "line",
        categories: ["One"],
        series: [
          {
            name: "Examples",
            values: [1]
          }
        ]
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("chart-type-invalid");
  });

  it("rejects chart series that do not match the category count", () => {
    const result = validateStructuredChildren([
      {
        type: "chart",
        chartType: "bar",
        categories: ["One", "Two"],
        series: [
          {
            name: "Examples",
            values: [1]
          }
        ]
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "chart-series-length"
    );
  });

  it("rejects media nodes with undeclared assets", () => {
    const result = validateStructuredChildren([
      {
        type: "media",
        mediaType: "audio",
        asset: "missing-audio"
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("media-asset-missing");
  });

  it("rejects video-only posters on audio media nodes", () => {
    const result = validateStructuredChildren(
      [
        {
          type: "media",
          mediaType: "audio",
          asset: "intro-audio",
          poster: "cover"
        }
      ],
      {
        assets: [
          {
            id: "intro-audio",
            href: "assets/audio/intro-tone.wav",
            type: "audio/wav"
          }
        ],
        files: {
          "assets/audio/intro-tone.wav": strToU8("RIFF....WAVEfmt ")
        }
      }
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "media-poster-audio-invalid"
    );
  });

  it("fails when structured content references an undeclared asset", () => {
    const result = validatePackage({
      "manifest.json": strToU8(JSON.stringify(validManifest)),
      "content/root.json": strToU8(
        JSON.stringify({
          ...validContentRoot,
          children: [
            {
              type: "image",
              asset: "missing-asset",
              alt: "Broken"
            }
          ]
        })
      ),
      "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("image-asset-missing");
  });

  it("accepts a comic package with a structured root entry", () => {
    const result = validateComicPackage(validComicRoot);

    expect(result.valid).toBe(true);
  });

  it("rejects comic roots whose profile and type do not match", () => {
    const result = validateComicPackage({
      ...validComicRoot,
      profile: "storyboard",
      type: "storyboard"
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-content-profile-mismatch"
    );
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-content-type-invalid"
    );
  });

  it("rejects malformed comic structured roots", () => {
    const result = validateComicPackage("not-an-object");

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-content-root-shape"
    );
  });

  it("rejects comic roots with an empty panel list", () => {
    const result = validateComicPackage({
      ...validComicRoot,
      panels: []
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-content-panels-required"
    );
  });

  it("rejects comic roots with empty id and title values", () => {
    const result = validateComicPackage({
      ...validComicRoot,
      id: "",
      title: ""
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-content-id-required"
    );
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-content-title-required"
    );
  });

  it("rejects comic panels missing required asset and alt fields", () => {
    const result = validateComicPackage({
      ...validComicRoot,
      panels: [
        {
          id: "panel-1",
          caption: "Opening panel"
        }
      ]
    });

    expect(result.valid).toBe(false);
    const codes = result.errors.map((issue) => issue.code);
    expect(codes).toContain("comic-panel-asset-required");
    expect(codes).toContain("comic-panel-alt-required");
  });

  it("rejects comic panels that reference undeclared asset ids", () => {
    const result = validateComicPackage({
      ...validComicRoot,
      panels: [
        {
          ...validComicRoot.panels[0],
          asset: "missing-art"
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-panel-asset-missing"
    );
  });

  it("rejects comic panels that resolve to non-image assets", () => {
    const invalidManifest = {
      ...validComicManifest,
      assets: [
        {
          ...validComicAssets[0],
          type: "audio/wav"
        },
        validComicAssets[1]
      ]
    };

    const result = validatePackage({
      "manifest.json": strToU8(JSON.stringify(invalidManifest)),
      "content/root.json": strToU8(JSON.stringify(validComicRoot)),
      ...validComicAssetFiles
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-panel-asset-image-required"
    );
  });

  it("warns when a comic package still uses a legacy HTML entry", () => {
    const result = validateLegacyComicPackage(validLegacyComicPanelsRoot);

    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.code)).toContain(
      "comic-html-entry-legacy"
    );
  });

  it("rejects malformed legacy comic panel metadata roots", () => {
    const result = validateLegacyComicPackage("not-an-object");

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-panels-root-shape"
    );
  });

  it("rejects legacy comic panel metadata with the wrong profile id", () => {
    const result = validateLegacyComicPackage({
      ...validLegacyComicPanelsRoot,
      profile: "storyboard"
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-panels-profile-mismatch"
    );
  });

  it("rejects duplicate comic panel ids in structured roots", () => {
    const result = validateComicPackage({
      ...validComicRoot,
      panels: [
        {
          id: "panel-1",
          asset: "panel-1-art",
          alt: "Courier crouched above the city canopy",
          caption: "Opening panel"
        },
        {
          id: "panel-1",
          asset: "panel-2-art",
          alt: "Courier landing on the suspended walkway",
          caption: "Repeated panel"
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-panel-id-duplicate"
    );
  });

  it("rejects empty comic panel captions in structured roots", () => {
    const result = validateComicPackage({
      ...validComicRoot,
      panels: [
        {
          id: "panel-1",
          asset: "panel-1-art",
          alt: "Courier crouched above the city canopy",
          caption: ""
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "comic-panel-caption-shape"
    );
  });

  it("accepts a storyboard package with a structured root entry", () => {
    const result = validateStoryboardPackage(validStoryboardRoot);

    expect(result.valid).toBe(true);
  });

  it("rejects storyboard roots whose profile and type do not match", () => {
    const result = validateStoryboardPackage({
      ...validStoryboardRoot,
      profile: "comic",
      type: "comic"
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "storyboard-content-profile-mismatch"
    );
    expect(result.errors.map((issue) => issue.code)).toContain(
      "storyboard-content-type-invalid"
    );
  });

  it("rejects malformed storyboard structured roots", () => {
    const result = validateStoryboardPackage("not-an-object");

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "storyboard-content-root-shape"
    );
  });

  it("rejects storyboard roots with an empty frame list", () => {
    const result = validateStoryboardPackage({
      ...validStoryboardRoot,
      frames: []
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "storyboard-content-frames-required"
    );
  });

  it("rejects storyboard roots with empty id and title values", () => {
    const result = validateStoryboardPackage({
      ...validStoryboardRoot,
      id: "",
      title: ""
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "storyboard-content-id-required"
    );
    expect(result.errors.map((issue) => issue.code)).toContain(
      "storyboard-content-title-required"
    );
  });

  it("rejects storyboard packages when a declared frame asset file is missing", () => {
    const result = validatePackage({
      "manifest.json": strToU8(JSON.stringify(validStoryboardManifest)),
      "content/root.json": strToU8(JSON.stringify(validStoryboardRoot)),
      "assets/frames/frame-1.svg": validStoryboardAssetFiles["assets/frames/frame-1.svg"]!
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("asset-file-missing");
  });

  it("rejects storyboard frames that resolve to unsupported untyped asset extensions", () => {
    const invalidManifest = {
      ...validStoryboardManifest,
      assets: [
        {
          id: "frame-1-art",
          href: "assets/frames/frame-1.txt"
        },
        validStoryboardAssets[1]
      ]
    };

    const result = validatePackage({
      "manifest.json": strToU8(JSON.stringify(invalidManifest)),
      "content/root.json": strToU8(
        JSON.stringify({
          ...validStoryboardRoot,
          frames: [
            {
              ...validStoryboardRoot.frames[0],
              asset: "frame-1-art"
            },
            validStoryboardRoot.frames[1]
          ]
        })
      ),
      "assets/frames/frame-1.txt": strToU8("frame placeholder"),
      "assets/frames/frame-2.svg": validStoryboardAssetFiles["assets/frames/frame-2.svg"]!
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "storyboard-frame-asset-image-required"
    );
  });

  it("warns when a storyboard package still uses a legacy HTML entry", () => {
    const result = validateLegacyStoryboardPackage(validLegacyStoryboardFramesRoot);

    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.code)).toContain(
      "storyboard-html-entry-legacy"
    );
  });

  it("rejects malformed legacy storyboard frame metadata roots", () => {
    const result = validateLegacyStoryboardPackage("not-an-object");

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "storyboard-frames-root-shape"
    );
  });

  it("rejects legacy storyboard frame metadata with the wrong profile id", () => {
    const result = validateLegacyStoryboardPackage({
      ...validLegacyStoryboardFramesRoot,
      profile: "comic"
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "storyboard-frames-profile-mismatch"
    );
  });

  it("rejects duplicate storyboard frame ids in structured roots", () => {
    const result = validateStoryboardPackage({
      ...validStoryboardRoot,
      frames: [
        {
          id: "frame-1",
          asset: "frame-1-art",
          alt: "Wide rooftop establishing board",
          notes: "Opening shot"
        },
        {
          id: "frame-1",
          asset: "frame-2-art",
          alt: "Reaction insert on the turn toward the doorway",
          notes: "Repeated shot"
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "storyboard-frame-id-duplicate"
    );
  });

  it("rejects empty storyboard frame notes in structured roots", () => {
    const result = validateStoryboardPackage({
      ...validStoryboardRoot,
      frames: [
        {
          id: "frame-1",
          asset: "frame-1-art",
          alt: "Wide rooftop establishing board",
          notes: ""
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain(
      "storyboard-frame-notes-shape"
    );
  });
});

describe("node validators", () => {
  it("validates a source directory, a .prd archive, and a generic path", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-validator-"));
    const contentDir = join(root, "content");
    const assetDir = join(root, "assets/images");

    await mkdir(contentDir, { recursive: true });
    await mkdir(assetDir, { recursive: true });

    await writeFile(join(root, "manifest.json"), JSON.stringify(validManifest), "utf8");
    await writeFile(join(contentDir, "root.json"), JSON.stringify(validContentRoot), "utf8");
    await writeFile(
      join(assetDir, "cover.svg"),
      "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
      "utf8"
    );

    const dirResult = await validatePackageDirectory(root);
    expect(dirResult.valid).toBe(true);

    const genericDirResult = await validatePackageAtPath(root);
    expect(genericDirResult.valid).toBe(true);

    const archivePath = join(root, "example.prd");
    const archiveBytes = zipSync({
      "manifest.json": strToU8(JSON.stringify(validManifest)),
      "content/root.json": strToU8(JSON.stringify(validContentRoot)),
      "assets/images/cover.svg": strToU8("<svg xmlns=\"http://www.w3.org/2000/svg\" />")
    });

    await writeFile(archivePath, Buffer.from(archiveBytes));

    const archiveResult = await validatePrdArchive(archivePath);
    expect(archiveResult.valid).toBe(true);

    const genericArchiveResult = await validatePackageAtPath(archivePath);
    expect(genericArchiveResult.valid).toBe(true);

    await rm(root, { recursive: true, force: true });
  });

  it("inspects a source directory and reports loading-relevant package facts", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-inspect-dir-"));
    const contentDir = join(root, "content");
    const localizedContentDir = join(contentDir, "locales");
    const assetDir = join(root, "assets/images");
    const attachmentDir = join(root, "attachments");

    await mkdir(contentDir, { recursive: true });
    await mkdir(localizedContentDir, { recursive: true });
    await mkdir(assetDir, { recursive: true });
    await mkdir(attachmentDir, { recursive: true });

    await writeFile(
      join(root, "manifest.json"),
      JSON.stringify({
        ...validManifest,
        assets: [
          ...validManifest.assets,
          {
            id: "cover-fr",
            href: "assets/images/cover-fr.svg",
            type: "image/svg+xml"
          }
        ],
        localization: {
          defaultLocale: "en-US",
          availableLocales: ["en-US", "fr-FR"]
        },
        attachments: [
          {
            id: "checklist",
            href: "attachments/checklist.txt",
            type: "text/plain"
          }
        ]
      }),
      "utf8"
    );
    await writeFile(join(contentDir, "root.json"), JSON.stringify(validContentRoot), "utf8");
    await writeFile(
      join(root, "content/locales/index.json"),
      JSON.stringify(validLocalizedContentIndexRoot),
      "utf8"
    );
    await writeFile(
      join(root, "content/locales/fr-FR.json"),
      JSON.stringify(validFrenchOverridesRoot),
      "utf8"
    );
    await writeFile(
      join(assetDir, "cover.svg"),
      "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
      "utf8"
    );
    await writeFile(
      join(assetDir, "cover-fr.svg"),
      "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
      "utf8"
    );
    await writeFile(join(attachmentDir, "checklist.txt"), "Checklist", "utf8");

    const result = await inspectPackageDirectory(root);

    expect(result.valid).toBe(true);
    expect(result.sourceKind).toBe("directory");
    expect(result.fileCount).toBe(7);
    expect(result.totalBytes).toBeGreaterThan(0);
    expect(result.assetCount).toBe(2);
    expect(result.attachmentCount).toBe(1);
    expect(result.localeCount).toBe(2);
    expect(result.entryKind).toBe("structured-json");
    expect(result.segmentation).toBe("none");
    expect(result.localizedResources).toBe(true);
    expect(result.localizedAlternateEntries).toBe(false);
    expect(result.hasSeriesMembership).toBe(false);
    expect(result.collectionCount).toBe(0);
    expect(result.referenceLoadMode).toBe("eager-whole-package");

    await rm(root, { recursive: true, force: true });
  });

  it("inspects a segmented directory and reports section-based segmentation", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-inspect-segmented-"));

    await mkdir(join(root, "content/sections"), { recursive: true });
    await mkdir(join(root, "assets/images"), { recursive: true });

    await writeFile(
      join(root, "manifest.json"),
      JSON.stringify({
        ...validManifest,
        entry: "content/root.json"
      }),
      "utf8"
    );
    await writeFile(
      join(root, "content/root.json"),
      JSON.stringify(validSegmentedContentRoot),
      "utf8"
    );
    await writeFile(
      join(root, "content/sections/manifest-discipline.json"),
      JSON.stringify(validManifestDisciplineSectionRoot),
      "utf8"
    );
    await writeFile(
      join(root, "content/sections/scaling-path.json"),
      JSON.stringify(validScalingPathSectionRoot),
      "utf8"
    );
    await writeFile(
      join(root, "assets/images/cover.svg"),
      "<svg xmlns=\"http://www.w3.org/2000/svg\" />",
      "utf8"
    );

    const result = await inspectPackageDirectory(root);

    expect(result.valid).toBe(true);
    expect(result.segmentation).toBe("general-document-sections");
    expect(result.referenceLoadMode).toBe("eager-whole-package");

    await rm(root, { recursive: true, force: true });
  });

  it("inspects a .prd archive and reports archive facts", async () => {
    const root = await mkdtemp(join(tmpdir(), "prd-inspect-archive-"));
    const archivePath = join(root, "example.prd");
    const archiveBytes = zipSync({
      "manifest.json": strToU8(
        JSON.stringify({
          ...validComicManifest,
          identity: {
            series: {
              ref: "urn:prd-series:test:sequential-dawn",
              sequence: {
                issue: 1
              }
            }
          }
        })
      ),
      "content/root.json": strToU8(JSON.stringify(validComicRoot)),
      ...validComicAssetFiles
    });

    await writeFile(archivePath, Buffer.from(archiveBytes));

    const result = await inspectPrdArchive(archivePath);

    expect(result.valid).toBe(true);
    expect(result.sourceKind).toBe("archive");
    expect(result.entryKind).toBe("structured-json");
    expect(result.hasSeriesMembership).toBe(true);
    expect(result.collectionCount).toBe(0);
    expect(result.localizedResources).toBe(false);
    expect(result.localizedAlternateEntries).toBe(false);

    const genericResult = await inspectPackageAtPath(archivePath);
    expect(genericResult.sourceKind).toBe("archive");

    await rm(root, { recursive: true, force: true });
  });
});
