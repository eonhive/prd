import { unzipSync, strFromU8 } from "fflate";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PrdFileMap, PrdPackageValidationResult } from "@prd/validator";
import { validatePackageFiles } from "@prd/validator";
import { openPrdDocument } from "@prd/viewer-core";
import {
  type PrdOpenedDocument,
  type PrdPackageReader,
  getProfileDisplayLabel
} from "@prd/types";

function createPackageReader(files: PrdFileMap): PrdPackageReader {
  return {
    has(path) {
      return path in files;
    },
    readText(path) {
      const file = files[path];
      if (!file) {
        throw new Error(`Missing package file: ${path}`);
      }
      return strFromU8(file);
    },
    readBinary(path) {
      const file = files[path];
      if (!file) {
        throw new Error(`Missing package file: ${path}`);
      }
      return file;
    }
  };
}

function resolvePath(basePath: string, target: string): string {
  if (target.startsWith("/") || target.startsWith("#") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) {
    return target;
  }

  const segments = basePath.split("/");
  segments.pop();
  const stack = [...segments];

  for (const part of target.split("/")) {
    if (part === "." || part.length === 0) {
      continue;
    }
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }

  return stack.join("/");
}

function guessMimeType(path: string): string {
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".html") || path.endsWith(".htm")) return "text/html";
  return "application/octet-stream";
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function rewriteHtmlDocument(
  html: string,
  entryPath: string,
  files: PrdFileMap,
  objectUrls: string[]
): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const selectors: Array<[string, "href" | "src" | "poster"]> = [
    ["link[href]", "href"],
    ["img[src]", "src"],
    ["source[src]", "src"],
    ["script[src]", "src"],
    ["video[poster]", "poster"]
  ];

  for (const [selector, attribute] of selectors) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const original = element.getAttribute(attribute);
      if (!original) {
        continue;
      }

      const resolved = resolvePath(entryPath, original);
      const file = files[resolved];
      if (!file) {
        continue;
      }

      const url = URL.createObjectURL(
        new Blob([toArrayBuffer(file)], { type: guessMimeType(resolved) })
      );
      objectUrls.push(url);
      element.setAttribute(attribute, url);
    }
  }

  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}

interface ViewerState {
  validation: PrdPackageValidationResult;
  opened?: PrdOpenedDocument;
  renderedHtml?: string;
}

export function App() {
  const objectUrlsRef = useRef<string[]>([]);
  const [viewerState, setViewerState] = useState<ViewerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const profileLabel = useMemo(() => {
    if (!viewerState?.opened) {
      return null;
    }
    return getProfileDisplayLabel(viewerState.opened.profileInfo.normalized);
  }, [viewerState]);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current = [];

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const files = unzipSync(bytes) as PrdFileMap;
      const validation = validatePackageFiles(files);

      if (!validation.valid || !validation.manifest) {
        setViewerState({ validation });
        setLoading(false);
        return;
      }

      const opened = await openPrdDocument(createPackageReader(files));
      const renderedHtml =
        opened.entryHtml !== undefined
          ? rewriteHtmlDocument(
              opened.entryHtml,
              opened.entryPath,
              files,
              objectUrlsRef.current
            )
          : undefined;

      setViewerState({
        validation,
        opened,
        renderedHtml
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to open PRD file.");
      setViewerState(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">PRD Reference Viewer</p>
          <h1>Open packaged Portable Responsive Documents in the browser.</h1>
          <p className="subhead">
            This app validates the uploaded package first, then hands it to the
            viewer core. `general-document` and `resume` render today. `comic`
            and `storyboard` stay first-class in the architecture, but remain
            reserved in the viewer until dedicated rendering lands.
          </p>
        </div>
        <label className="upload-card">
          <span>Choose a `.prd` archive</span>
          <input
            type="file"
            accept=".prd"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
        </label>
      </header>

      {loading && <p className="status">Loading package…</p>}
      {error && <p className="status error">{error}</p>}

      {viewerState && (
        <main className="workspace">
          <section className="panel">
            <h2>Package Status</h2>
            <dl className="meta-grid">
              <div>
                <dt>Valid</dt>
                <dd>{viewerState.validation.valid ? "yes" : "no"}</dd>
              </div>
              <div>
                <dt>Profile</dt>
                <dd>{profileLabel ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Profile ID</dt>
                <dd>{viewerState.opened?.manifest.profile ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Support state</dt>
                <dd>{viewerState.opened?.supportState ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Localization</dt>
                <dd>
                  {viewerState.opened?.localization
                    ? viewerState.opened.localization.defaultLocale
                    : "none"}
                </dd>
              </div>
              <div>
                <dt>Entry</dt>
                <dd>{viewerState.opened?.entryPath ?? "n/a"}</dd>
              </div>
            </dl>

            {viewerState.validation.errors.length > 0 && (
              <>
                <h3>Errors</h3>
                <ul className="issues">
                  {viewerState.validation.errors.map((issue) => (
                    <li key={`${issue.code}-${issue.path ?? issue.message}`}>
                      <code>{issue.code}</code> {issue.message}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {viewerState.validation.warnings.length > 0 && (
              <>
                <h3>Warnings</h3>
                <ul className="issues warning">
                  {viewerState.validation.warnings.map((issue) => (
                    <li key={`${issue.code}-${issue.path ?? issue.message}`}>
                      <code>{issue.code}</code> {issue.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="panel viewer-panel">
            <h2>Viewer</h2>
            {viewerState.opened?.supportState === "reserved-profile" && (
              <div className="reserved">
                <strong>{profileLabel}</strong>
                <p>{viewerState.opened.message}</p>
              </div>
            )}

            {viewerState.opened?.supportState !== "reserved-profile" &&
              viewerState.renderedHtml && (
                <iframe
                  title="PRD content frame"
                  sandbox=""
                  srcDoc={viewerState.renderedHtml}
                />
              )}
          </section>
        </main>
      )}
    </div>
  );
}
