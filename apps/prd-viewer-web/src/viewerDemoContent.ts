/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Demo Content
 * Purpose: Keep public site, docs, and viewer demo copy stable and testable.
 * Author: Stan Nesi
 * Created: June 2, 2026
 * Updated: June 7, 2026
 * Notes: Vibe coded with Codex.
 */

export interface ViewerLandingCapability {
  title: string;
  description: string;
  proof: string;
}

export interface ViewerLandingProfile {
  id: "general-document" | "comic" | "storyboard";
  title: string;
  description: string;
  command: string;
}

export interface ViewerPublicDocsLink {
  label: string;
  href: string;
}

export interface ViewerPublicDocsSection {
  id: string;
  title: string;
  summary: string;
  primaryLink: ViewerPublicDocsLink;
  links: ViewerPublicDocsLink[];
}

export interface ViewerPublicHostingNote {
  label: string;
  value: string;
  description: string;
}

export interface ViewerDemoFlowStep {
  label: string;
  title: string;
  description: string;
  commands: string[];
}

export interface ViewerDemoExampleArchive {
  id: string;
  label: string;
  path: string;
  hostedPath: string;
  profile: string;
  description: string;
}

export const viewerLandingHero = {
  eyebrow: "Portable Responsive Document",
  title: "Create, package, and open responsive documents.",
  description:
    "Portable Responsive Document is a structured, profile-based format for portable reading experiences beyond static PDFs. This hosted reference demo shows the real public loop: initialize or import content, validate the package, pack it, then open the .prd archive in the browser.",
  primaryAction: "Open Viewer",
  secondaryAction: "Load Sample PRD",
  tertiaryAction: "View CLI Flow"
};

export const viewerPublicDocsIntro = {
  eyebrow: "Public docs",
  title: "Start with the product path, then go deeper into canon.",
  description:
    "This docs page is a public navigation layer over the canonical repository docs. It keeps users oriented around Home, authoring, CLI tooling, format basics, profiles, examples, the viewer, conformance, and release/operator notes without exposing internal Codex workflow docs as product documentation."
};

export const viewerPublicDocsSections: ViewerPublicDocsSection[] = [
  {
    id: "home",
    title: "Home",
    summary:
      "The public product overview for PRD: what ships now, what is deferred, and how the create/import to open loop works.",
    primaryLink: { label: "Open Home", href: "/" },
    links: [
      { label: "Product boundaries", href: "docs/product/PRD_PRODUCT_BOUNDARIES.md" },
      { label: "Roadmap", href: "docs/foundation/04_PRD/PRD_ROADMAP.md" }
    ]
  },
  {
    id: "getting-started",
    title: "Getting Started",
    summary:
      "Install the public CLI, create or import a package, validate it, inspect package facts, pack it, and open it in the reference viewer.",
    primaryLink: { label: "Authoring workflow", href: "docs/product/PRD_AUTHORING_WORKFLOW.md" },
    links: [
      { label: "Root quickstart", href: "README.md" },
      { label: "Import/export matrix", href: "docs/product/PRD_IMPORT_EXPORT_MATRIX.md" }
    ]
  },
  {
    id: "cli",
    title: "CLI",
    summary:
      "Command contracts for `prd init`, imports, validation, inspection, packing, text output, JSON output, and exit codes.",
    primaryLink: { label: "CLI README", href: "packages/prd-cli/README.md" },
    links: [
      { label: "CLI JSON contract", href: "docs/runtime/PRD_CLI_JSON_CONTRACT.md" },
      { label: "npm release policy", href: "docs/governance/PRD_RELEASE_POLICY.md" }
    ]
  },
  {
    id: "format",
    title: "Format",
    summary:
      "Manifest-first package rules, minimal valid PRD requirements, package layout, versioning, localization, assets, attachments, and loading truth.",
    primaryLink: { label: "Minimal valid spec", href: "docs/core/PRD_MINIMAL_VALID_SPEC.md" },
    links: [
      { label: "Manifest draft", href: "docs/core/PRD_MANIFEST_DRAFT.md" },
      { label: "Package layout", href: "docs/core/PRD_PACKAGE_LAYOUT_DRAFT.md" },
      { label: "Performance and loading", href: "docs/core/PRD_PERFORMANCE_AND_LOADING.md" }
    ]
  },
  {
    id: "profiles",
    title: "Profiles",
    summary:
      "Current first-class profiles are `general-document`, `comic`, and `storyboard`. Other document kinds stay inside those families unless canon promotes them later.",
    primaryLink: { label: "Profile registry", href: "docs/governance/PRD_PROFILE_REGISTRY.md" },
    links: [
      { label: "General document", href: "docs/profiles/PRD_PROFILE_GENERAL_DOCUMENT.md" },
      { label: "Comic", href: "docs/profiles/PRD_PROFILE_COMIC.md" },
      { label: "Storyboard", href: "docs/profiles/PRD_PROFILE_STORYBOARD.md" }
    ]
  },
  {
    id: "examples",
    title: "Examples",
    summary:
      "Canonical example packages prove validation, packaging, import lanes, hosted samples, and viewer behavior without committing generated `.prd` binaries.",
    primaryLink: { label: "Example packages", href: "examples/" },
    links: [
      { label: "Runtime conformance corpus", href: "examples/runtime-conformance/runtime-conformance-manifest.json" },
      { label: "Pack examples", href: "README.md#example-flow" }
    ]
  },
  {
    id: "viewer",
    title: "Viewer",
    summary:
      "The reference Web Viewer validates first, reports real package facts, and opens supported packages through eager whole-package in-memory loading.",
    primaryLink: { label: "Open Viewer", href: "/viewer/" },
    links: [
      { label: "Runtime capabilities", href: "docs/runtime/PRD_CAPABILITY_MODEL.md" },
      { label: "Runtime conformance", href: "docs/runtime/PRD_CONFORMANCE.md" }
    ]
  },
  {
    id: "conformance",
    title: "Conformance",
    summary:
      "Executable foundation and runtime checks define the current reference baseline for package validity, support states, and fixture expectations.",
    primaryLink: { label: "Runtime conformance", href: "docs/runtime/PRD_CONFORMANCE.md" },
    links: [
      { label: "Minimal valid spec", href: "docs/core/PRD_MINIMAL_VALID_SPEC.md" },
      { label: "Foundation gate", href: "README.md#foundation-gate" }
    ]
  },
  {
    id: "release-operator-notes",
    title: "Release/Operator Notes",
    summary:
      "Maintainer-facing release, npm verification, and hosting runbooks for operating the public preview without mixing those notes into user-facing product docs.",
    primaryLink: { label: "Release policy", href: "docs/governance/PRD_RELEASE_POLICY.md" },
    links: [
      { label: "npm runbook", href: "docs/governance/PRD_NPM_RELEASE_RUNBOOK.md" },
      { label: "Hosting runbook", href: "docs/governance/PRD_HOSTING_RUNBOOK.md" }
    ]
  }
];

export const viewerPublicHostingNotes: ViewerPublicHostingNote[] = [
  {
    label: "Production",
    value: "Cloudflare Pages",
    description:
      "`prd.eonhive.com` is the intended production host after custom-domain setup and launch QA."
  },
  {
    label: "Staging/fallback",
    value: "GitHub Pages",
    description:
      "GitHub Pages remains the temporary staging and fallback deployment using the `/prd/` base path."
  },
  {
    label: "Routes",
    value: "/, /viewer/, /docs/",
    description:
      "`/` is Home, `/viewer/` is the Web Viewer workspace, and `/docs/` is the public docs index."
  }
];

export const viewerLandingCapabilities: ViewerLandingCapability[] = [
  {
    title: "Manifest-first core",
    description:
      "Packages declare identity, profile, entry, assets, localization, and compatibility through a canonical manifest.",
    proof: "docs/core + schemas"
  },
  {
    title: "Executable CLI path",
    description:
      "Authors can scaffold, import Markdown, import ordered image folders, validate, inspect, and pack without a hosted service.",
    proof: "@eonhive/prd-cli"
  },
  {
    title: "Reference viewer truth",
    description:
      "The web viewer validates first, opens supported packages, and reports facts instead of hiding unsupported behavior.",
    proof: "eager whole-package loading"
  },
  {
    title: "First-class profiles",
    description:
      "General documents, comics, and storyboards are treated as real profile surfaces with structured roots.",
    proof: "general-document, comic, storyboard"
  }
];

export const viewerLandingProfiles: ViewerLandingProfile[] = [
  {
    id: "general-document",
    title: "General Document",
    description:
      "Articles, reports, resumes, manuals, portfolios, magazines, and web-novel style prose packages.",
    command: "prd import markdown ./source.md --out ./my-document"
  },
  {
    id: "comic",
    title: "Comic",
    description:
      "Panel-led visual reading packages generated from ordered pages or authored structured roots.",
    command: "prd import images ./pages --profile comic --out ./my-comic"
  },
  {
    id: "storyboard",
    title: "Storyboard",
    description:
      "Frame-led review packages for boards, sequences, pitch decks, animatics, and visual planning.",
    command: "prd import images ./frames --profile storyboard --out ./my-board"
  }
];

export const viewerDemoFlowSteps: ViewerDemoFlowStep[] = [
  {
    label: "01",
    title: "Create or import",
    description:
      "Start from a clean PRD scaffold, import structured Markdown, or turn ordered image folders into visual-profile packages.",
    commands: [
      "prd init ./my-document --profile general-document",
      "prd import markdown ./source.md --out ./my-document",
      "prd import images ./pages --profile comic --out ./my-comic"
    ]
  },
  {
    label: "02",
    title: "Verify",
    description:
      "Use validation for format truth and inspection for package shape, loading facts, entry mode, and profile details.",
    commands: [
      "prd validate ./my-document",
      "prd inspect ./my-document"
    ]
  },
  {
    label: "03",
    title: "Package",
    description:
      "Create the portable .prd archive only after the unpacked package validates cleanly.",
    commands: ["prd pack ./my-document --out ./my-document.prd"]
  },
  {
    label: "04",
    title: "Open",
    description:
      "Choose or drag the generated .prd archive into this reference viewer for the current eager whole-package in-memory render path.",
    commands: ["Open ./my-document.prd in the reference viewer"]
  }
];

export const viewerDemoPreparationCommands = [
  "pnpm codex:run:web",
  "pnpm examples:pack",
  "pnpm viewer:demo:assets"
];

export const viewerDemoExampleArchives: ViewerDemoExampleArchive[] = [
  {
    id: "document-basic",
    label: "Document Basic",
    path: "examples/dist/document-basic.prd",
    hostedPath: "examples/document-basic.prd",
    profile: "general-document",
    description:
      "Structured prose, localization resources, package facts, media, and attachments."
  },
  {
    id: "document-segmented-basic",
    label: "Segmented Document",
    path: "examples/dist/document-segmented-basic.prd",
    hostedPath: "examples/document-segmented-basic.prd",
    profile: "general-document",
    description:
      "A larger document path with top-level sections split into packaged files."
  },
  {
    id: "comic-basic",
    label: "Comic Basic",
    path: "examples/dist/comic-basic.prd",
    hostedPath: "examples/comic-basic.prd",
    profile: "comic",
    description:
      "Image-backed panel cards and lean series metadata in a structured comic package."
  },
  {
    id: "storyboard-basic",
    label: "Storyboard Basic",
    path: "examples/dist/storyboard-basic.prd",
    hostedPath: "examples/storyboard-basic.prd",
    profile: "storyboard",
    description:
      "Image-backed frames with storyboard review-grid behavior."
  }
];

export const viewerFutureLanes = [
  "Studio authoring",
  "Cloud publishing",
  "PRDc archive workflows",
  "broad DOCX/EPUB/PDF conversion"
];
