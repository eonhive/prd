/*
 * Company: EonHive Inc.
 * Title: PRD Viewer Navigation And Header
 * Purpose: Provide accessible public navigation and truthful package status without renderer coupling.
 * Author: Stan Nesi
 * Created: October 25, 2026
 * Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { getViewerOutlineTargetId, type ViewerDocumentOutlineItem } from "./viewerDocumentOutline.js";
import { getViewerAppRoutePath, type ViewerAppRoute } from "./viewerRoutes.js";

export type ViewerTheme = "dark" | "light";

export function PrdBrandMark() {
  const gradientId = useId();
  return (
    <svg
      className="prd-brand-symbol"
      viewBox="0 0 48 52"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="8"
          y1="3"
          x2="39"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#DCBAFF" />
          <stop offset="0.45" stopColor="#9548FF" />
          <stop offset="1" stopColor="#3D16B5" />
        </linearGradient>
      </defs>
      <path
        d="M8 3h24l11 12v32H8z"
        fill={`url(#${gradientId})`}
        stroke="#B99BFF"
        strokeWidth="0.6"
      />
      <path d="M4 31C13 21 30 24 43 15v14C30 39 13 35 4 46z" fill="#6024DC" />
      <path
        d="M4 31C13 21 30 24 43 15M4 46c9-11 26-7 39-17"
        stroke="#ECDFFF"
        strokeWidth="1"
      />
      <path d="M32 3v12h11" fill="#F9F4FF" />
      <path d="M8 47h35" stroke="#A46BFF" />
    </svg>
  );
}

type ViewerIconName =
  | "outline"
  | "file"
  | "folder"
  | "search"
  | "info"
  | "focus"
  | "close"
  | "wide"
  | "book"
  | "sun"
  | "moon"
  | "image"
  | "check";

export function ViewerIcon({ name }: { name: ViewerIconName }) {
  const paths: Record<ViewerIconName, ReactNode> = {
    outline: (
      <>
        <path d="M9 5h11M9 12h11M9 19h11" />
        <path d="M4 5h.01M4 12h.01M4 19h.01" strokeWidth="3" />
      </>
    ),
    file: (
      <>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6M8 13h8M8 17h5" />
      </>
    ),
    folder: <path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11H3V7h18" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </>
    ),
    focus: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    wide: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 9h10M7 13h10M7 17h7" />
      </>
    ),
    book: (
      <>
        <path d="M12 6C9 4 5 4 2 5v14c3-1 7-1 10 1 3-2 7-2 10-1V5c-3-1-7-1-10 1v14" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    moon: <path d="M20.5 13.5A9 9 0 0 1 10.5 3a9 9 0 1 0 10 10.5Z" />,
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8" cy="8" r="1.5" />
        <path d="m3 17 5-5 4 4 4-6 5 7" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function ViewerSidePanel({
  id,
  side,
  title,
  open,
  mobile,
  onClose,
  children,
}: {
  id: string;
  side: "left" | "right";
  title: string;
  open: boolean;
  mobile: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !mobile) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, mobile]);

  const content = (
    <>
      <div className="viewer-panel-title">
        <strong>{title}</strong>
        <button
          type="button"
          className="viewer-icon-button"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={onClose}
        >
          <ViewerIcon name="close" />
        </button>
      </div>
      {children}
    </>
  );
  const className = `viewer-side-panel viewer-${side}-rail`;
  if (!mobile) {
    return (
      <aside
        id={id}
        tabIndex={-1}
        className={className}
        aria-label={title}
        hidden={!open}
      >
        {content}
      </aside>
    );
  }
  return (
    <dialog
      ref={dialogRef}
      id={id}
      tabIndex={-1}
      className={className}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Backdrop clicks land on the dialog; clicks inside its padding should stay open.
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      {content}
    </dialog>
  );
}

export function ViewerWorkspaceToolbar({
  navigationOpen,
  detailsOpen,
  focusMode,
  wideReading,
  onToggleNavigation,
  onToggleDetails,
  onToggleFocus,
  onToggleWidth,
  onOpenArchive,
}: {
  navigationOpen: boolean;
  detailsOpen: boolean;
  focusMode: boolean;
  wideReading: boolean;
  onToggleNavigation: () => void;
  onToggleDetails: () => void;
  onToggleFocus: () => void;
  onToggleWidth: () => void;
  onOpenArchive: () => void;
}) {
  return (
    <div
      className="viewer-workspace-toolbar"
      role="group"
      aria-label="Reading controls"
    >
      <div className="viewer-toolbar-group">
        <button
          type="button"
          className="viewer-tool-button"
          aria-expanded={navigationOpen}
          aria-controls="viewer-navigation"
          onClick={onToggleNavigation}
        >
          <ViewerIcon name="outline" />
          <span>Navigate</span>
        </button>
        <span className="viewer-toolbar-divider" aria-hidden="true" />
        <button
          type="button"
          className="viewer-tool-button"
          onClick={onOpenArchive}
        >
          <ViewerIcon name="folder" />
          <span>Open document</span>
        </button>
      </div>
      <div className="viewer-toolbar-group">
        <button
          type="button"
          className="viewer-tool-button viewer-width-button"
          aria-pressed={wideReading}
          onClick={onToggleWidth}
          title="Toggle reading width"
        >
          <ViewerIcon name={wideReading ? "wide" : "book"} />
          <span>{wideReading ? "Wide" : "Comfortable"}</span>
        </button>
        <button
          type="button"
          className="viewer-tool-button"
          aria-pressed={focusMode}
          onClick={onToggleFocus}
          title="Focus reading · Escape to exit"
        >
          <ViewerIcon name="focus" />
          <span>Focus</span>
        </button>
        <span className="viewer-toolbar-divider" aria-hidden="true" />
        <button
          type="button"
          className="viewer-tool-button"
          aria-expanded={detailsOpen}
          aria-controls="package-details"
          onClick={onToggleDetails}
        >
          <ViewerIcon name="info" />
          <span>Details</span>
        </button>
      </div>
    </div>
  );
}

export function ViewerSiteNavigation({
  route,
  basePath,
  theme,
  onNavigate,
  onToggleTheme,
  onOpenArchive,
}: {
  route: ViewerAppRoute;
  basePath: string;
  theme: ViewerTheme;
  onNavigate?: (route: ViewerAppRoute, hash?: string) => void;
  onToggleTheme: () => void;
  onOpenArchive?: () => void;
}) {
  function navigate(
    event: MouseEvent<HTMLAnchorElement>,
    next: ViewerAppRoute,
    hash?: string,
  ) {
    // Keep native new-tab and modified-click behavior on real route links.
    if (
      !onNavigate ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    onNavigate(next, hash);
  }

  return (
    <header className="site-nav">
      <a
        className="brand-lockup"
        href={getViewerAppRoutePath("home", basePath)}
        onClick={(event) => navigate(event, "home")}
        aria-label="PRD Home"
      >
        <span className="brand-mark" aria-hidden="true">
          <PrdBrandMark />
        </span>
        <span>
          <strong>{route === "viewer" ? "PRD Viewer" : "PRD"}</strong>
          <small>Portable Responsive Document</small>
        </span>
      </a>
      <nav className="site-nav-links" aria-label="Main navigation">
        {(["home", "viewer", "docs"] as const).map((item) => (
          <a
            key={item}
            href={getViewerAppRoutePath(item, basePath)}
            aria-current={route === item ? "page" : undefined}
            onClick={(event) => navigate(event, item)}
          >
            {item === "home" ? "Home" : item === "viewer" ? "Viewer" : "Docs"}
          </a>
        ))}
        {(["profiles", "examples"] as const).map((section) => (
          <a
            key={section}
            href={`${getViewerAppRoutePath("home", basePath)}#${section}`}
            onClick={(event) => navigate(event, "home", section)}
          >
            {section === "profiles" ? "Profiles" : "Examples"}
          </a>
        ))}
      </nav>
      <div className="site-nav-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
          <ViewerIcon name={theme === "dark" ? "sun" : "moon"} />
          <strong>
            {theme === "dark" ? "Switch to light" : "Switch to dark"}
          </strong>
        </button>
        {route === "viewer" ? (
          <button
            type="button"
            className="nav-open-button"
            onClick={onOpenArchive}
          >
            Open .prd
          </button>
        ) : (
          <a
            className="nav-open-button"
            href={getViewerAppRoutePath("viewer", basePath)}
            onClick={(event) => navigate(event, "viewer")}
          >
            Open Viewer <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </header>
  );
}

export function PrdSiteFooter({ basePath }: { basePath: string }) {
  const home = getViewerAppRoutePath("home", basePath);
  return (
    <footer className="prd-site-footer">
      <div className="prd-footer-brand">
        <a className="brand-lockup" href={home} aria-label="PRD Home">
          <span className="brand-mark" aria-hidden="true">
            <PrdBrandMark />
          </span>
          <span>
            <strong>PRD</strong>
            <small>Portable Responsive Document</small>
          </span>
        </a>
        <p>A new way to experience documents.</p>
        <small>By EonHive Inc.</small>
      </div>
      <nav aria-label="Footer navigation">
        <a href={getViewerAppRoutePath("viewer", basePath)}>Open Viewer</a>
        <a href={getViewerAppRoutePath("docs", basePath)}>Read Docs</a>
        <a href={`${home}#profiles`}>Document profiles</a>
        <a href={`${home}#examples`}>Explore examples</a>
        <a href={`${home}#cli-flow`}>Create with the CLI</a>
      </nav>
      <p className="prd-footer-note">Portable. Responsive. Structured.</p>
    </footer>
  );
}

export function ViewerDocumentOutline({
  items,
  visualSelectionKind,
  activeItemId,
  onSelectVisualItem,
}: {
  items: ViewerDocumentOutlineItem[];
  visualSelectionKind?: "panel" | "frame";
  activeItemId?: string;
  onSelectVisualItem: (item: ViewerDocumentOutlineItem) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredItems = items.filter((item) =>
    item.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <section
      id="document-outline"
      tabIndex={-1}
      className="viewer-outline-card"
      aria-label="Document outline"
    >
      <div className="panel-heading-row">
        <p className="eyebrow">Outline</p>
        <span>{items.length > 0 ? `${items.length} items` : "empty"}</span>
      </div>
      <label className="viewer-outline-search">
        <ViewerIcon name="search" />
        <input
          type="search"
          aria-label="Search document outline"
          placeholder="Find a section…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={items.length === 0}
        />
      </label>
      {filteredItems.length > 0 ? (
        <ol className="viewer-outline-list">
          {filteredItems.map((item) => {
            const style = { "--outline-depth": item.depth } as CSSProperties;
            const label = (
              <>
                <ViewerIcon name={item.kind === "document" ? "book" : "file"} />
                <strong>{item.label}</strong>
                <span className="viewer-outline-kind">{item.kind}</span>
              </>
            );
            return (
              <li key={`${item.kind}-${item.id}`}>
                {item.kind === visualSelectionKind ? (
                  <button
                    type="button"
                    className="viewer-outline-link"
                    style={style}
                    aria-controls="document-stage"
                    aria-current={item.id === activeItemId ? "true" : undefined}
                    onClick={() => onSelectVisualItem(item)}
                  >
                    {label}
                  </button>
                ) : (
                  <a
                    href={`#${getViewerOutlineTargetId(item)}`}
                    className="viewer-outline-link"
                    style={style}
                  >
                    {label}
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="viewer-panel-empty">
          {items.length > 0
            ? "No sections match your search."
            : "Open a document to explore its sections, panels, or frames."}
        </p>
      )}
    </section>
  );
}

export function ViewerWorkspaceHeader({
  validation,
  packageTitle,
  loading,
  loadMode,
  profileLabel,
}: {
  validation: { valid: boolean } | null;
  packageTitle?: string;
  loading: boolean;
  loadMode: string;
  profileLabel?: string | null;
}) {
  let status = "No package loaded";
  let statusClassName = "status-pill";
  if (loading) {
    status = "Opening package...";
  } else if (validation) {
    status = validation.valid ? "Valid package" : "Invalid package";
    statusClassName += validation.valid ? " valid" : " invalid";
  }

  return (
    <div className="viewer-dashboard-topbar">
      <div className="viewer-document-heading">
        <span className="viewer-document-icon">
          <ViewerIcon name="file" />
        </span>
        <div>
          <p className="eyebrow">PRD Web Viewer</p>
          <h1>{packageTitle ?? "Your document workspace"}</h1>
        </div>
        {profileLabel && (
          <span className="viewer-profile-badge">{profileLabel}</span>
        )}
      </div>
      <div className="viewer-dashboard-status">
        <span role="status" aria-live="polite" className={statusClassName}>
          {status}
        </span>
        <span
          className="viewer-local-note"
          title={`Files you choose stay in this browser. Loading: ${loadMode}.`}
        >
          <ViewerIcon name="check" /> Local reading
        </span>
      </div>
    </div>
  );
}

export function ViewerStageStatus({
  valid,
  renderModeMessage,
  readingLabel,
}: {
  valid: boolean;
  renderModeMessage: string;
  readingLabel?: string;
}) {
  return (
    <>
      <div className="panel-heading-row">
        <h2>{valid ? "Reading view" : "Package validation failed"}</h2>
        {valid && (
          <span title={readingLabel ? renderModeMessage : undefined}>
            {readingLabel ?? renderModeMessage}
          </span>
        )}
      </div>
      {!valid && (
        <p className="viewer-message" role="alert">
          This archive failed package validation, so no content was rendered.{" "}
          <a href="#package-details">Review package errors</a> before opening it
          again.
        </p>
      )}
    </>
  );
}
