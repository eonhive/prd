/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Demo Content
 * Purpose: Keep public viewer demo copy and command examples stable and testable.
 * Author: Stan Nesi
 * Created: June 2, 2026
 * Updated: June 5, 2026
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
