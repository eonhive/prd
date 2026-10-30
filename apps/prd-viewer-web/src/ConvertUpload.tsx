/**
 * Company: EonHive Inc. | Title: Convert Source Selection
 * Purpose: Offer native file browsing and bounded single-source drag and drop.
 * Author: Stan Nesi | Created: 2026-10-29 | Updated: 2026-10-29
 * Notes: Vibe coded with Codex.
 */
import { useRef, useState, type DragEvent } from "react";
import {
  getImageSelectionError,
  getSourceSelectionError,
  isCbzFilename,
} from "./convertJob.js";
import { ViewerIcon } from "./viewerChrome.js";

function fileSize(size: number): string {
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MiB`
    : `${Math.ceil(size / 1024)} KiB`;
}

export function ConvertUpload({
  source,
  images,
  busy,
  onSource,
  onImages,
  onError,
}: {
  source: File | undefined;
  images: File[];
  busy: boolean;
  onSource(file: File | undefined): void;
  onImages(files: File[]): void;
  onError(message: string): void;
}) {
  const sourceInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const browseButton = useRef<HTMLButtonElement>(null);
  const imageBrowseButton = useRef<HTMLButtonElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const comicArchive = source !== undefined && isCbzFilename(source.name);
  function chooseSource(files: File[]): void {
    if (busy || files.length === 0) return;
    const error = getSourceSelectionError(files);
    if (error) {
      onSource(undefined);
      onError(error);
      return;
    }
    onSource(files[0]);
  }
  function chooseImages(files: File[]): void {
    if (busy || files.length === 0) return;
    const next = [...images, ...files];
    const error = getImageSelectionError(next);
    if (error) {
      onError(error);
      return;
    }
    onImages(next);
  }
  function drop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragActive(false);
    chooseSource(Array.from(event.dataTransfer.files));
  }
  return (
    <section
      className="convert-card convert-upload"
      aria-labelledby="convert-upload-title"
    >
      <div className="convert-card-heading">
        <span className="convert-step-number">01</span>
        <div>
          <h2 id="convert-upload-title">Choose your document</h2>
          <p>Start with the source. We’ll take care of the structure.</p>
        </div>
      </div>
      <div
        className={`convert-dropzone${dragActive ? " is-dragging" : ""}${
          busy ? " is-busy" : ""
        }`}
        role="region"
        aria-label="Document upload"
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragActive(true);
        }}
        onDragLeave={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          )
            setDragActive(false);
        }}
        onDrop={drop}
      >
        <span className="convert-upload-symbol" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h3>Drop your document here</h3>
        <p>HTML, Markdown or CBZ · Up to 4 MiB</p>
        <button
          className="primary-button"
          ref={browseButton}
          type="button"
          disabled={busy}
          onClick={() => sourceInput.current?.click()}
        >
          Browse files
        </button>
        <span className="convert-drop-note">
          Your files stay on this device
        </span>
        <input
          ref={sourceInput}
          type="file"
          hidden
          accept=".md,.markdown,.html,.htm,.cbz"
          aria-label="Source document"
          disabled={busy}
          onChange={(event) => {
            chooseSource(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>
      {source && (
        <div className="convert-selected-file">
          <span className="convert-file-symbol">
            <ViewerIcon name="file" />
          </span>
          <div>
            <strong>{source.name}</strong>
            <small>
              {comicArchive
                ? "CBZ comic archive"
                : /\.html?$/iu.test(source.name)
                ? "HTML document"
                : "Markdown document"}{" "}
              · {fileSize(source.size)}
            </small>
          </div>
          <button
            type="button"
            className="convert-icon-button"
            aria-label="Remove source document"
            disabled={busy}
            onClick={() => {
              onSource(undefined);
              browseButton.current?.focus();
            }}
          >
            <ViewerIcon name="close" />
          </button>
        </div>
      )}
      {comicArchive ? (
        <p className="convert-hint">
          Pages come from this archive. Up to 128 entries including metadata, 8
          MiB per expanded member and 24 MiB total. Page order and generated
          descriptions need review.
        </p>
      ) : (
        <>
          <div className="convert-assets-heading">
            <div>
              <h3>
                Supporting images <span>Optional</span>
              </h3>
              <p>
                Choose files used by your source, such as <code>flow.png</code>.
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => imageInput.current?.click()}
              ref={imageBrowseButton}
            >
              Add images
            </button>
          </div>
          <input
            ref={imageInput}
            type="file"
            hidden
            accept=".png,.jpg,.jpeg,.gif,.webp"
            aria-label="Supporting images"
            multiple
            disabled={busy}
            onChange={(event) => {
              chooseImages(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          {images.length > 0 && (
            <ul className="convert-selected-images">
              {images.map((image, index) => (
                <li key={image.name}>
                  <ViewerIcon name="image" />
                  <span>
                    {image.name}
                    <small>{fileSize(image.size)}</small>
                  </span>
                  <button
                    type="button"
                    className="convert-icon-button"
                    aria-label={`Remove image ${image.name}`}
                    disabled={busy}
                    onClick={() => {
                      onImages(images.filter((_, at) => at !== index));
                      imageBrowseButton.current?.focus();
                    }}
                  >
                    <ViewerIcon name="close" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="convert-hint">
            PNG, JPEG, GIF or WebP · 8 MiB each, 24 MiB total. Missing and
            unused images are reported.
          </p>
        </>
      )}
    </section>
  );
}
