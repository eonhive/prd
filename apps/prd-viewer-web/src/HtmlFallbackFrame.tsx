/**
 * Company: EonHive Inc. | Title: HTML Fallback Frame
 * Purpose: Keep restricted document previews inside an opaque, unprivileged frame.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */

export function HtmlFallbackFrame({ html }: { html: string }) {
  return (
    <>
      <p className="viewer-panel-empty" role="note">
        Restricted HTML preview. Links, forms, author styles and external content are disabled.
      </p>
      <iframe
        className="viewer-surface"
        title="PRD content frame"
        sandbox=""
        referrerPolicy="no-referrer"
        allow="camera 'none'; microphone 'none'; geolocation 'none'; autoplay 'none'; encrypted-media 'none'; fullscreen 'none'"
        srcDoc={html}
      />
    </>
  );
}
