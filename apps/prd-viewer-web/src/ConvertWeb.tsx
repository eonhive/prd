/**
 * Company: EonHive Inc. | Title: PRD Convert Web
 * Purpose: Offer a real local Markdown-to-PRD workflow with explicit quality and Viewer handoff.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  isCbzFilename,
  startConversionJob,
  startComicReviewJob,
  type ComicReviewDraft,
  type WebConversion,
} from "./convertJob.js";
import { ConvertUpload } from "./ConvertUpload.js";
import { ConvertReview } from "./ConvertReview.js";
import { ViewerIcon } from "./viewerChrome.js";
import "./convertWeb.css";

export function ConvertWeb({
  completed,
  onComplete,
  onPreview,
}: {
  completed: WebConversion | null;
  onComplete(result: WebConversion | null): void;
  onPreview(result: WebConversion): void;
}) {
  const [source, setSource] = useState<File>();
  const [images, setImages] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [profile, setProfile] = useState<"auto" | "general-document" | "comic">(
    "auto"
  );
  const [comicPageOrder, setComicPageOrder] = useState<"natural" | "reverse">(
    "natural"
  );
  const [preserveSource, setPreserveSource] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const job = useRef<ReturnType<typeof startConversionJob> | undefined>(
    undefined
  );
  const generation = useRef(0);
  const comicArchive = source !== undefined && isCbzFilename(source.name);
  useEffect(
    () => () => {
      generation.current++;
      job.current?.cancel();
    },
    []
  );

  function invalidate(): void {
    generation.current++;
    onComplete(null);
    setError(undefined);
  }
  function selectionError(message: string): void {
    invalidate();
    setError(message);
  }
  async function convert(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!source || busy) return;
    invalidate();
    const request = generation.current;
    setBusy(true);
    const current = startConversionJob(source, images, {
      profile,
      preserveSource,
      ...(comicArchive ? { comicPageOrder } : {}),
      ...(title.trim() ? { title: title.trim() } : {}),
    });
    job.current = current;
    try {
      const result = await current.promise;
      if (request === generation.current) onComplete(result);
    } catch (caught) {
      if (request === generation.current)
        setError(
          caught instanceof Error ? caught.message : "Conversion failed."
        );
    } finally {
      if (request === generation.current) {
        setBusy(false);
        job.current = undefined;
      }
    }
  }

  async function applyComicReview(draft: ComicReviewDraft): Promise<void> {
    if (!completed || busy) return;
    const request = ++generation.current;
    setError(undefined);
    setBusy(true);
    try {
      const current = startComicReviewJob(completed, draft);
      job.current = current;
      const result = await current.promise;
      if (request === generation.current) onComplete(result);
    } catch (caught) {
      if (request === generation.current)
        setError(
          caught instanceof Error ? caught.message : "Comic review failed."
        );
    } finally {
      if (request === generation.current) {
        setBusy(false);
        job.current = undefined;
      }
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="convert-page">
      <header className="convert-intro">
        <div>
          <p className="convert-kicker">PRD CONVERT</p>
          <h1>Convert documents to PRD.</h1>
          <p>Bring HTML, Markdown and CBZ comics into portable reading.</p>
        </div>
        <span className="convert-local">
          <ViewerIcon name="check" /> Files stay in this browser{" "}
          <small>No account required</small>
        </span>
      </header>
      <ol className="convert-workflow" aria-label="Conversion workflow">
        <li className={source || completed ? "is-complete" : "is-current"}>
          <span>1</span>Choose source
        </li>
        <li className={busy ? "is-current" : completed ? "is-complete" : ""}>
          <span>2</span>Convert locally
        </li>
        <li className={completed ? "is-current" : ""}>
          <span>3</span>Review &amp; download
        </li>
      </ol>
      <form
        className="convert-layout"
        onSubmit={(event) => void convert(event)}
      >
        <ConvertUpload
          source={source}
          images={images}
          busy={busy}
          onSource={(file) => {
            invalidate();
            setSource(file);
            setProfile("auto");
            setComicPageOrder("natural");
            if (file && isCbzFilename(file.name)) setImages([]);
          }}
          onImages={(files) => {
            invalidate();
            setImages(files);
          }}
          onError={selectionError}
        />
        <aside
          className="convert-card convert-options"
          aria-labelledby="convert-options-title"
        >
          <div className="convert-card-heading">
            <span className="convert-step-number">02</span>
            <div>
              <h2 id="convert-options-title">Conversion options</h2>
              <p>Make it yours. Keep it portable.</p>
            </div>
          </div>
          <fieldset disabled={busy}>
            <legend className="visually-hidden">Conversion settings</legend>
            <label>
              Output profile
              <select
                value={profile}
                onChange={(event) => {
                  invalidate();
                  setProfile(event.target.value as typeof profile);
                }}
              >
                <option value="auto">Auto detect</option>
                <option value="general-document" disabled={comicArchive}>
                  General Document
                </option>
                <option value="comic" disabled={!comicArchive}>
                  Comic
                </option>
              </select>
            </label>
            {comicArchive && (
              <label>
                Page order
                <select
                  value={comicPageOrder}
                  onChange={(event) => {
                    invalidate();
                    setComicPageOrder(
                      event.target.value as typeof comicPageOrder
                    );
                  }}
                >
                  <option value="natural">Natural filename order</option>
                  <option value="reverse">Reverse filename order</option>
                </select>
                <small className="convert-hint">
                  Controls page sequence. Manga direction and panel geometry are
                  not interpreted.
                </small>
              </label>
            )}
            <label>
              Document title <span className="convert-optional">Optional</span>
              <input
                type="text"
                value={title}
                maxLength={512}
                placeholder="Use source title or heading"
                onChange={(event) => {
                  invalidate();
                  setTitle(event.target.value);
                }}
              />
            </label>
            <div className="convert-presentation">
              <ViewerIcon name="book" />
              <div>
                <strong>Adaptive reading</strong>
                <small>
                  Reconstruct supported structure for responsive reading.
                </small>
              </div>
            </div>
            <label className="convert-check">
              <span>
                <strong>Include original source</strong>
                <small>Keep exact source bytes as a package attachment.</small>
              </span>
              <input
                className="convert-switch"
                type="checkbox"
                aria-label="Include the original source in the PRD"
                checked={preserveSource}
                onChange={(event) => {
                  invalidate();
                  setPreserveSource(event.target.checked);
                }}
              />
            </label>
            <p className="convert-hint">
              Original source can contain private text or metadata. Unsupported
              features and missing images appear in the quality report.
            </p>
          </fieldset>
          <button
            type="submit"
            className="primary-button convert-submit"
            disabled={!source || busy}
          >
            {busy ? "Converting…" : "Convert to PRD"}
            <span aria-hidden="true">→</span>
          </button>
          {busy && (
            <>
              <progress aria-label="Converting document" />
              <button
                className="convert-cancel"
                type="button"
                onClick={() => job.current?.cancel()}
              >
                Cancel conversion
              </button>
            </>
          )}
          <p className="convert-job-status" role="status" aria-live="polite">
            {busy
              ? "Reading, converting and validating locally…"
              : completed
              ? `Converted ${completed.sourceName}. Ready to review.`
              : "Choose a document to begin."}
          </p>
          {error && (
            <p className="convert-error" role="alert">
              {error}
            </p>
          )}
        </aside>
      </form>
      <ConvertReview
        completed={completed}
        busy={busy}
        onPreview={onPreview}
        onApplyComicReview={(draft) => void applyComicReview(draft)}
        onDraftChange={(draft) => {
          if (!completed || busy) return;
          setError(undefined);
          onComplete({ ...completed, reviewDraft: draft });
        }}
      />
      <p className="convert-scope-note">
        Browser support: HTML, Markdown and bounded CBZ comics. EPUB, DOCX and
        PDF use the local CLI.
      </p>
    </main>
  );
}
