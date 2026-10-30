/**
 * Company: EonHive Inc. | Title: Convert Result Review
 * Purpose: Show factual output, resource and source details without rendering source HTML.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */
import { useEffect, useId, useMemo, useState } from "react";
import type { ComicReviewDraft, WebConversion } from "./convertJob.js";
import { PrdBrandMark, ViewerIcon } from "./viewerChrome.js";
import { ComicPageReview } from "./ComicPageReview.js";
import { ConversionDiagnostics } from "./ConversionDiagnostics.js";

function useDownload(
  bytes: Uint8Array | undefined,
  type: string
): string | undefined {
  const [download, setDownload] = useState<{
    bytes: Uint8Array;
    type: string;
    url: string;
  }>();
  useEffect(() => {
    if (!bytes) {
      setDownload(undefined);
      return;
    }
    const next = URL.createObjectURL(
      new Blob([bytes as Uint8Array<ArrayBuffer>], { type })
    );
    setDownload({ bytes, type, url: next });
    return () => URL.revokeObjectURL(next);
  }, [bytes, type]);
  // A replacement result must never expose the previous archive before its effect runs.
  return download && download.bytes === bytes && download.type === type
    ? download.url
    : undefined;
}

export function ConvertReview({
  completed,
  busy,
  onPreview,
  onApplyComicReview,
  onDraftChange,
}: {
  completed: WebConversion | null;
  busy: boolean;
  onPreview(result: WebConversion): void;
  onApplyComicReview?(draft: ComicReviewDraft): void;
  onDraftChange?(draft: ComicReviewDraft | undefined): void;
}) {
  const [view, setView] = useState<"quality" | "assets" | "source">("quality");
  const id = useId();
  const report = completed?.result.report;
  const comicArchive = report?.sourceFormat === "cbz";
  const reportBytes = useMemo(
    () =>
      report
        ? new TextEncoder().encode(`${JSON.stringify(report, null, 2)}\n`)
        : undefined,
    [report]
  );
  const archiveUrl = useDownload(
    completed?.result.archive,
    "application/octet-stream"
  );
  const reportUrl = useDownload(reportBytes, "application/json");
  useEffect(() => setView("quality"), [completed?.result]);
  return (
    <section
      className="convert-card convert-result"
      aria-label="Conversion result"
      aria-labelledby="convert-review-title"
    >
      <div className="convert-card-heading">
        <span className="convert-step-number">03</span>
        <div>
          <h2 id="convert-review-title">Review your conversion</h2>
          <p>A valid package is the start. Check what carried through.</p>
        </div>
        {report && (
          <span className="convert-valid">
            <ViewerIcon name="check" />
            Valid PRD package
          </span>
        )}
      </div>
      {!completed || !report ? (
        <div className="convert-empty">
          <span className="convert-empty-mark">
            <PrdBrandMark />
          </span>
          <div>
            <h3>
              {busy ? "Building your PRD…" : "A portable document starts here."}
            </h3>
            <p>
              {busy
                ? "Extracting supported content, collecting images and validating the package locally."
                : "Convert a document to see its quality report, inspect resources and preview the result in the Viewer."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="convert-result-summary">
            <span className="convert-result-mark">
              <PrdBrandMark />
            </span>
            <div>
              <span className="convert-kicker">
                {report.sourceFormat.toUpperCase()} → PRD
              </span>
              <h3>{completed.result.document.title}</h3>
              <p>
                {completed.sourceName} ·{" "}
                {report.profile === "comic" ? "Comic" : "General Document"} ·
                Adaptive reading
              </p>
            </div>
            <dl className="convert-result-counts">
              <div>
                <dt>{comicArchive ? "Pages" : "Content nodes"}</dt>
                <dd>{report.nodeCount}</dd>
              </div>
              <div>
                <dt>Images</dt>
                <dd>{report.resourceCount}</dd>
              </div>
              <div>
                <dt>Warnings</dt>
                <dd>
                  {report.warnings.length + report.validationWarnings.length}
                </dd>
              </div>
            </dl>
          </div>
          {comicArchive && completed.result.document.profile === "comic" && (
            <ComicPageReview
              document={completed.result.document}
              resources={report.resourceMap}
              busy={busy}
              canApply={Boolean(
                completed.sourceFile &&
                  completed.settings &&
                  onApplyComicReview &&
                  onDraftChange
              )}
              providedDescriptions={completed.settings?.comicPageDescriptions}
              draft={completed.reviewDraft}
              onDraftChange={(draft) => onDraftChange?.(draft)}
              onApply={(draft) => onApplyComicReview?.(draft)}
            />
          )}
          <div className="convert-review-layout">
            <div>
              <div
                className="convert-review-views"
                role="group"
                aria-label="Review views"
              >
                {(["quality", "assets", "source"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={view === item}
                    aria-controls={`${id}-${item}`}
                    onClick={() => setView(item)}
                  >
                    {item === "quality"
                      ? "Quality report"
                      : item === "assets"
                      ? "Assets"
                      : "Original source"}
                  </button>
                ))}
              </div>
              <div
                id={`${id}-quality`}
                hidden={view !== "quality"}
                className="convert-review-panel"
              >
                <div className="convert-quality-facts">
                  <span>
                    Semantics <strong>Partial preservation</strong>
                  </span>
                  <span>
                    Layout <strong>Not preserved</strong>
                  </span>
                  <span>
                    Original source{" "}
                    <strong>
                      {report.sourcePreserved ? "Included" : "Omitted"}
                    </strong>
                  </span>
                </div>
                <ConversionDiagnostics report={report} />
              </div>
              <div
                id={`${id}-assets`}
                hidden={view !== "assets"}
                className="convert-review-panel"
              >
                <h3>Packaged resources</h3>
                {report.resourceMap.length ? (
                  <ul className="convert-resource-map">
                    {report.resourceMap.slice(0, 128).map((item, index) => (
                      <li key={index}>
                        <ViewerIcon name="image" />
                        <div>
                          <strong>{item.source}</strong>
                          <small>{item.href}</small>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    No image resources were collected. Check the quality report
                    for missing or omitted images.
                  </p>
                )}
                {report.resourceMap.length > 128 && (
                  <p>
                    Showing the first 128 mappings. The downloaded report
                    contains the full resource map.
                  </p>
                )}
              </div>
              <div
                id={`${id}-source`}
                hidden={view !== "source"}
                className="convert-review-panel"
              >
                <h3>
                  {comicArchive
                    ? "Original CBZ archive"
                    : "Original source preview"}
                </h3>
                {comicArchive ? (
                  <p>
                    CBZ is a binary archive, so no text preview is shown.
                    {report.sourcePreserved
                      ? " The exact source archive is included as a package attachment."
                      : " The source archive was omitted from this package by request."}{" "}
                    Use the Assets view to inspect imported page mappings and
                    Preview in Viewer to read the generated comic.
                  </p>
                ) : (
                  <>
                    <p className="convert-hint">
                      {completed.previewTruncated
                        ? "Showing the first 64 Ki characters. The full source is converted."
                        : "Source is displayed as plain text; markup and scripts are never executed here."}
                    </p>
                    <pre>{completed.sourcePreview}</pre>
                  </>
                )}
              </div>
            </div>
            <aside className="convert-download-panel" aria-label="Use your PRD">
              <ViewerIcon name="book" />
              <h3>Ready for a closer look.</h3>
              <p>
                Open this exact archive in the PRD Viewer, then download it to
                keep or share.
              </p>
              <button type="button" onClick={() => onPreview(completed)}>
                Preview in Viewer
              </button>
              {archiveUrl && (
                <a
                  className="primary-button"
                  href={archiveUrl}
                  download="converted.prd"
                >
                  Download PRD <span aria-hidden="true">↓</span>
                </a>
              )}
              {reportUrl && (
                <a
                  className="convert-report-link"
                  href={reportUrl}
                  download="conversion-quality.json"
                >
                  Download quality report
                </a>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
