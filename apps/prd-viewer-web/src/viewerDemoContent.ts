/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Demo Content
 * Purpose: Keep public viewer demo copy and command examples stable and testable.
 * Author: Stan Nesi
 * Created: June 2, 2026
 * Updated: June 2, 2026
 * Notes: Vibe coded with Codex.
 */

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
  profile: string;
  description: string;
}

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
  "pnpm examples:pack"
];

export const viewerDemoExampleArchives: ViewerDemoExampleArchive[] = [
  {
    id: "document-basic",
    label: "Document Basic",
    path: "examples/dist/document-basic.prd",
    profile: "general-document",
    description:
      "Structured prose, localization resources, package facts, media, and attachments."
  },
  {
    id: "document-segmented-basic",
    label: "Segmented Document",
    path: "examples/dist/document-segmented-basic.prd",
    profile: "general-document",
    description:
      "A larger document path with top-level sections split into packaged files."
  },
  {
    id: "comic-basic",
    label: "Comic Basic",
    path: "examples/dist/comic-basic.prd",
    profile: "comic",
    description:
      "Image-backed panel cards and lean series metadata in a structured comic package."
  },
  {
    id: "storyboard-basic",
    label: "Storyboard Basic",
    path: "examples/dist/storyboard-basic.prd",
    profile: "storyboard",
    description:
      "Image-backed frames with storyboard review-grid behavior."
  }
];
