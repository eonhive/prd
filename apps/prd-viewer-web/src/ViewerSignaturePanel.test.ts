/**
 * Company: EonHive Inc. | Title: Signature Status Presentation Tests
 * Purpose: Keep trust, structural validity, and unsigned readability distinct in the viewer.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ViewerSignaturePanel } from "./ViewerSignaturePanel.js";

describe("signature status presentation", () => {
  it("never treats a supplied verified result as a reader-selected trusted key", () => {
    const html = renderToStaticMarkup(createElement(ViewerSignaturePanel, {
      result: { status: "verified", message: "verified elsewhere", keyId: "sha256:example", checkedFiles: 2 }
    }));
    expect(html).toContain('data-signature-status="untrusted"');
    expect(html).toContain("Signer not trusted");
    expect(html).toContain("Verify with public key");
    expect(html).not.toContain("Verified with selected key");
  });

  it.each(["unsigned", "invalid", "unsupported"] as const)("preserves the %s state without offering a trust override", (status) => {
    const html = renderToStaticMarkup(createElement(ViewerSignaturePanel, {
      result: { status, message: "Signature result details." }
    }));
    expect(html).toContain(`data-signature-status="${status}"`);
    expect(html).toContain("Signature result details.");
    expect(html).not.toContain("Verify with public key");
  });
});
