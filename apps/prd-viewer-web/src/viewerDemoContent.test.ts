/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Demo Content Tests
 * Purpose: Lock the public viewer demo flow copy and example archive references.
 * Author: Stan Nesi
 * Created: June 2, 2026
 * Updated: June 2, 2026
 * Notes: Vibe coded with Codex.
 */

import { describe, expect, it } from "vitest";
import {
  viewerDemoExampleArchives,
  viewerDemoFlowSteps,
  viewerDemoPreparationCommands
} from "./viewerDemoContent.js";

describe("viewer demo content", () => {
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
      expect.arrayContaining(["pnpm codex:run:web", "pnpm examples:pack"])
    );
    expect(viewerDemoExampleArchives).toHaveLength(4);
    expect(viewerDemoExampleArchives.map((example) => example.path)).toEqual([
      "examples/dist/document-basic.prd",
      "examples/dist/document-segmented-basic.prd",
      "examples/dist/comic-basic.prd",
      "examples/dist/storyboard-basic.prd"
    ]);
    expect(viewerDemoExampleArchives.every((example) => example.path.endsWith(".prd"))).toBe(
      true
    );
  });
});
