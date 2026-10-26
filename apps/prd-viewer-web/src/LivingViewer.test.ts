/*
 * Company: EonHive Inc. | Title: Living Viewer Markup Tests
 * Purpose: Protect lazy loading, one-frame ownership, and hosted route behavior.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LivingViewer } from "./LivingViewer.js";

function renderViewer(ready: boolean, active = false, viewerPath = "/viewer/") {
  return renderToStaticMarkup(
    createElement(LivingViewer, {
      ready,
      active,
      viewerPath,
      sample: "document-basic",
      onFocusChange: () => {},
      onSampleChange: () => {},
    }),
  );
}

describe("persistent living Viewer", () => {
  it("does not fetch a package before the visitor approaches or opens the Viewer", () => {
    expect(renderViewer(false)).not.toContain("<iframe");
  });

  it.each([true, false])(
    "retains one mounted frame when its chapter is active=%s",
    (active) => {
      const html = renderViewer(true, active);
      expect(html.match(/<iframe/g)).toHaveLength(1);
      expect(html).toContain(
        'src="/viewer/?embed=1&amp;sample=document-basic"',
      );
      expect(html).toContain('title="Embedded PRD reference viewer"');
      expect(html).toContain('loading="lazy"');
      expect(html).toContain('aria-labelledby="living-viewer-dialog-title"');
      expect(html).toContain("Exit viewer");
    },
  );

  it("keeps embedded and full-workspace links beneath the configured hosting base", () => {
    const html = renderViewer(true, true, "/prd/viewer/");
    expect(html).toContain(
      'src="/prd/viewer/?embed=1&amp;sample=document-basic"',
    );
    expect(html).toContain('href="/prd/viewer/?sample=document-basic"');
    expect(html).toContain('value="comic-basic"');
    expect(html).toContain('value="storyboard-basic"');
  });
});
