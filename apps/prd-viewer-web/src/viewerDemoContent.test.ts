/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Demo Content Tests
 * Purpose: Lock public site, docs, and viewer demo flow copy.
 * Author: Stan Nesi
 * Created: June 2, 2026
 * Updated: June 7, 2026
 * Notes: Vibe coded with Codex.
 */

import { describe, expect, it } from "vitest";
import {
  viewerDemoExampleArchives,
  viewerDemoFlowSteps,
  viewerDemoPreparationCommands,
  viewerFutureLanes,
  viewerLandingCapabilities,
  viewerLandingHero,
  viewerLandingProfiles,
  viewerPublicDocsIntro,
  viewerPublicDocsSections,
  viewerPublicHostingNotes
} from "./viewerDemoContent.js";

describe("viewer demo content", () => {
  it("describes the Home page without inventing unavailable product behavior", () => {
    expect(viewerLandingHero.title).toContain("Create");
    expect(viewerLandingHero.description).toContain("Portable Responsive Document");
    expect(viewerLandingHero.primaryAction).toBe("Open Viewer");
    expect(viewerLandingHero.secondaryAction).toBe("Load Sample PRD");
    expect(viewerLandingHero.tertiaryAction).toBe("View CLI Flow");

    expect(viewerLandingCapabilities.map((capability) => capability.title)).toEqual([
      "Manifest-first core",
      "Executable CLI path",
      "Reference viewer truth",
      "First-class profiles"
    ]);
    expect(viewerFutureLanes).toEqual(
      expect.arrayContaining(["Studio authoring", "Cloud publishing"])
    );
  });

  it("locks first-class profile landing cards to real commands", () => {
    expect(viewerLandingProfiles.map((profile) => profile.id)).toEqual([
      "general-document",
      "comic",
      "storyboard"
    ]);
    expect(viewerLandingProfiles[0]?.command).toContain("prd import markdown");
    expect(viewerLandingProfiles[1]?.command).toContain("--profile comic");
    expect(viewerLandingProfiles[2]?.command).toContain("--profile storyboard");
  });

  it("publishes a public docs navigation layer without linking Codex workflow docs", () => {
    expect(viewerPublicDocsIntro.title).toContain("Start");
    expect(viewerPublicDocsSections.map((section) => section.title)).toEqual([
      "Home",
      "Getting Started",
      "CLI",
      "Format",
      "Profiles",
      "Examples",
      "Viewer",
      "Conformance",
      "Release/Operator Notes"
    ]);
    const allPublicDocsHrefs = viewerPublicDocsSections.flatMap((section) => [
      section.primaryLink.href,
      ...section.links.map((link) => link.href)
    ]);
    expect(allPublicDocsHrefs).toEqual(
      expect.arrayContaining([
        "/",
        "/viewer/",
        "docs/product/PRD_AUTHORING_WORKFLOW.md",
        "docs/core/PRD_MINIMAL_VALID_SPEC.md",
        "docs/governance/PRD_HOSTING_RUNBOOK.md"
      ])
    );
    expect(allPublicDocsHrefs.every((href) => !href.startsWith("codex/"))).toBe(true);
  });

  it("locks Cloudflare production and GitHub Pages staging hosting copy", () => {
    expect(viewerPublicHostingNotes.map((note) => note.value)).toEqual(
      expect.arrayContaining(["Cloudflare Pages", "GitHub Pages", "/, /viewer/, /docs/"])
    );
    expect(viewerPublicHostingNotes[0]?.description).toContain("prd.eonhive.com");
    expect(viewerPublicHostingNotes[1]?.description).toContain("/prd/");
  });

  it("describes the create/import to open public product flow", () => {
    expect(viewerDemoFlowSteps.map((step) => step.title)).toEqual([
      "Create or import",
      "Verify",
      "Package",
      "Open"
    ]);
    expect(viewerDemoFlowSteps[0]?.commands).toEqual(
      expect.arrayContaining([
        "prd init ./my-document --profile general-document",
        "prd import markdown ./source.md --out ./my-document",
        "prd import images ./pages --profile comic --out ./my-comic"
      ])
    );
    expect(viewerDemoFlowSteps[1]?.commands).toEqual(
      expect.arrayContaining(["prd validate ./my-document", "prd inspect ./my-document"])
    );
    expect(viewerDemoFlowSteps[2]?.commands).toContain(
      "prd pack ./my-document --out ./my-document.prd"
    );
    expect(viewerDemoFlowSteps[3]?.description).toContain(".prd");
  });

  it("references generated example archives without bundling them", () => {
    expect(viewerDemoPreparationCommands).toEqual(
      expect.arrayContaining([
        "pnpm codex:run:web",
        "pnpm examples:pack",
        "pnpm viewer:demo:assets"
      ])
    );
    expect(viewerDemoExampleArchives).toHaveLength(4);
    expect(viewerDemoExampleArchives.map((example) => example.path)).toEqual([
      "examples/dist/document-basic.prd",
      "examples/dist/document-segmented-basic.prd",
      "examples/dist/comic-basic.prd",
      "examples/dist/storyboard-basic.prd"
    ]);
    expect(viewerDemoExampleArchives.map((example) => example.hostedPath)).toEqual([
      "examples/document-basic.prd",
      "examples/document-segmented-basic.prd",
      "examples/comic-basic.prd",
      "examples/storyboard-basic.prd"
    ]);
    expect(viewerDemoExampleArchives.every((example) => example.path.endsWith(".prd"))).toBe(
      true
    );
  });
});
