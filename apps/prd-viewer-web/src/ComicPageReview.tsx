/**
 * Company: EonHive Inc. | Title: Comic Conversion Page Review
 * Purpose: Draft an explicit page sequence and apply it through the existing conversion job.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PrdComicRoot } from "@eonhive/prd-types";
import {
  MAX_COMIC_PAGE_DESCRIPTION_LENGTH,
  type ComicPageDescription,
  type ConversionQualityReport,
} from "@eonhive/prd-converter/browser";
import type { ComicReviewDraft } from "./convertJob.js";

const NO_DESCRIPTIONS: readonly ComicPageDescription[] = [];

function descriptionError(text: string): string | undefined {
  if (!text.trim()) return "Enter a page description before applying.";
  if (
    text.length > MAX_COMIC_PAGE_DESCRIPTION_LENGTH ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)
  )
    return "Use plain text up to 2,048 characters without unsafe control characters.";
  return undefined;
}

export function ComicPageReview({
  document,
  resources,
  busy,
  canApply,
  onApply,
  providedDescriptions = NO_DESCRIPTIONS,
  draft,
  onDraftChange,
}: {
  document: PrdComicRoot;
  resources: ConversionQualityReport["resourceMap"];
  busy: boolean;
  canApply: boolean;
  providedDescriptions?: readonly ComicPageDescription[];
  draft?: ComicReviewDraft;
  onDraftChange(draft: ComicReviewDraft | undefined): void;
  onApply(draft: ComicReviewDraft): void;
}) {
  const originalIds = useMemo(
    () => document.panels.map((page) => page.id),
    [document]
  );
  const pages = useMemo(
    () => new Map(document.panels.map((page) => [page.id, page])),
    [document]
  );
  const names = useMemo(
    () =>
      new Map(resources.map((resource) => [resource.asset, resource.source])),
    [resources]
  );
  const ids = draft?.pageIds ?? originalIds;
  const originalTexts = useMemo(
    () => new Map(document.panels.map((page) => [page.id, page.alt])),
    [document]
  );
  const providedIds = useMemo(
    () => new Set(providedDescriptions.map((value) => value.pageId)),
    [providedDescriptions]
  );
  const texts = new Map(originalTexts);
  for (const value of draft?.descriptions ?? [])
    texts.set(value.pageId, value.text);
  function descriptionOverrides(
    values: ReadonlyMap<string, string>
  ): ComicPageDescription[] {
    return document.panels
      .filter(
        (page) =>
          providedIds.has(page.id) ||
          (values.get(page.id) ?? page.alt) !== page.alt
      )
      .map((page) => ({
        pageId: page.id,
        text: values.get(page.id) ?? page.alt,
      }));
  }
  const descriptions = descriptionOverrides(texts);
  const invalidDescriptions = descriptions.some((value) =>
    descriptionError(value.text)
  );
  const inputId = useId();
  const [announcement, setAnnouncement] = useState("");
  const rows = useRef(new Map<string, HTMLLIElement>());
  const focusPage = useRef<string | undefined>(undefined);
  const previousDocument = useRef(document);
  const dirty =
    ids.some((id, index) => id !== originalIds[index]) ||
    document.panels.some(
      (page) => (texts.get(page.id) ?? page.alt) !== page.alt
    );
  useEffect(() => {
    if (previousDocument.current !== document)
      focusPage.current = originalIds[0];
    setAnnouncement(
      previousDocument.current === document
        ? ""
        : "Comic review applied. Downloads now use the updated package."
    );
    previousDocument.current = document;
  }, [originalIds, originalTexts, document]);
  useEffect(() => {
    if (focusPage.current) rows.current.get(focusPage.current)?.focus();
    focusPage.current = undefined;
  }, [ids, draft]);

  function move(id: string, offset: -1 | 1): void {
    if (busy || !canApply) return;
    const from = ids.indexOf(id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, id);
    focusPage.current = id;
    onDraftChange({ pageIds: next, descriptions });
    setAnnouncement(
      `Page moved to position ${to + 1} of ${
        ids.length
      }. Changes are not applied yet.`
    );
  }

  return (
    <section className="convert-page-review" aria-label="Comic page review">
      <h3>Review comic pages</h3>
      <p className="convert-hint">
        Set page order and write descriptions for readers who cannot see the
        artwork. Apply reruns conversion and validation; downloads keep using
        the current package until it succeeds. Descriptions use plain text, up
        to 2,048 characters each.
      </p>
      {!canApply && (
        <p className="convert-hint">
          Convert the original CBZ again to enable comic review.
        </p>
      )}
      <ol className="convert-page-list">
        {ids.map((id, index) => {
          const page = pages.get(id);
          if (!page) return null;
          const name = names.get(page.asset) ?? page.alt;
          const text = texts.get(id) ?? page.alt;
          const textChanged = text !== page.alt;
          const error =
            textChanged || providedIds.has(id)
              ? descriptionError(text)
              : undefined;
          const fieldId = `${inputId}-${id}-description`;
          return (
            <li
              key={id}
              tabIndex={-1}
              ref={(node) => {
                if (node) rows.current.set(id, node);
                else rows.current.delete(id);
              }}
            >
              <span className="convert-page-position" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <strong>{name}</strong>
                <small>
                  {textChanged
                    ? "Draft description"
                    : providedIds.has(id)
                    ? "Provided description"
                    : "Filename-derived description"}
                </small>
                <label htmlFor={fieldId}>
                  Page description
                  <span className="visually-hidden"> for {name}</span>
                </label>
                <textarea
                  id={fieldId}
                  value={text}
                  rows={3}
                  maxLength={MAX_COMIC_PAGE_DESCRIPTION_LENGTH}
                  required
                  disabled={busy || !canApply}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${fieldId}-error` : undefined}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    onDraftChange({
                      pageIds: ids,
                      descriptions: descriptionOverrides(
                        new Map(texts).set(id, value)
                      ),
                    });
                    setAnnouncement("");
                  }}
                />
                {error && (
                  <small
                    className="convert-description-error"
                    id={`${fieldId}-error`}
                  >
                    {error}
                  </small>
                )}
              </div>
              <div className="convert-page-actions">
                <button
                  type="button"
                  disabled={busy || !canApply || index === 0}
                  aria-label={`Move ${name} earlier`}
                  onClick={() => move(id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || !canApply || index === ids.length - 1}
                  aria-label={`Move ${name} later`}
                  onClick={() => move(id, 1)}
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="convert-page-review-actions">
        <button
          type="button"
          className="primary-button"
          disabled={!dirty || invalidDescriptions || busy || !canApply}
          onClick={() => onApply({ pageIds: [...ids], descriptions })}
        >
          Apply review
        </button>
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={() => {
            focusPage.current = originalIds[0];
            onDraftChange(undefined);
            setAnnouncement(
              "Draft reset to the current package order and descriptions."
            );
          }}
        >
          Reset changes
        </button>
      </div>
      <p className="convert-hint" role="status" aria-live="polite">
        {busy
          ? "Applying comic review locally…"
          : announcement ||
            (dirty
              ? "Draft changes are not applied yet."
              : "This list follows the current package order and descriptions.")}
      </p>
      <p className="convert-hint">
        All imported pages are retained. Use Preview in Viewer to inspect their
        artwork. Descriptions are plain text supplied by you; accuracy is not
        automatically assessed.
      </p>
      <p className="convert-hint">
        Apply uses the selected archive in this session. Reloading ends the
        review session, even when the package omits the original source.
        Unapplied drafts stay available when returning from Viewer; choosing a
        new source or changing conversion settings clears this review.
      </p>
    </section>
  );
}
