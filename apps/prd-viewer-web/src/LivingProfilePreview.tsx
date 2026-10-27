/*
 * Company: EonHive Inc. | Title: Living Document Profile Previews
 * Purpose: Keep visual choreography separate from an accessible chapter panel and real Viewer.
 * Author: Stan Nesi | Created: October 27, 2026 | Updated: October 27, 2026
 * Notes: Vibe coded with Codex.
 */

import { useEffect, useState } from "react";
import { getCanonicalDemoProfile, type DemoProfile } from "./livingExperienceModel.js";
import {
  getProfilePreviewUrl,
  loadLivingVisualPreview,
  type LivingVisualPreview,
} from "./livingProfileMedia.js";
import "./livingProfilePreview.css";

const studySections = [
  { title: "01 / The foundation", text: "A manifest connects content, resources, and profile." },
  { title: "02 / Beyond the page", text: "The space changes. Meaning and reading order stay intact." },
];
const studyFacts = [
  ["Content", "Structured"],
  ["Layout", "Responsive"],
  ["Resources", "Packaged"],
] as const;

export function useLivingProfilePreview(
  profile: DemoProfile,
  sample: string,
  basePath: string,
  ready: boolean,
) {
  const [data, setData] = useState<LivingVisualPreview>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const visual = profile === "comic" || profile === "storyboard";
  const current = visual && data?.sampleId === sample ? data : undefined;

  useEffect(() => {
    if (!ready || !visual) return;
    const controller = new AbortController();
    setError("");
    void loadLivingVisualPreview(sample, basePath, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "The media preview could not load.");
      });
    return () => controller.abort();
  }, [ready, visual, sample, basePath, revision]);

  return {
    data: current,
    error: visual ? error : "",
    loading: ready && visual && !current && !error,
    revision,
    retry: () => setRevision((value) => value + 1),
    imageFailed: () => setError("An example image could not display. Retry the preview or open the Viewer."),
  };
}

type PreviewState = ReturnType<typeof useLivingProfilePreview>;

function getPreviewStatus(profile: DemoProfile, preview: PreviewState): string {
  if (preview.error) return preview.error;
  if (profile !== "comic" && profile !== "storyboard") {
    return `${profile} layout study · general-document family`;
  }
  if (preview.data) return `${preview.data.title} · ${preview.data.profile} package excerpt`;
  return preview.loading ? "Loading source artwork…" : "Source artwork loads near this chapter.";
}

function StudyContent() {
  return (
    <>
      <p className="profile-study-intro">One document. Meaning, in every dimension.</p>
      <div className="profile-study-art" aria-hidden="true">
        <i /><i /><i />
      </div>
      <div className="profile-study-sections">
        {studySections.map((section) => (
          <section key={section.title}>
            <h4>{section.title}</h4>
            <p>{section.text}</p>
          </section>
        ))}
      </div>
      <dl className="profile-study-facts">
        {studyFacts.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </>
  );
}

export function LivingProfileArtwork({ profile, preview, basePath, active }: {
  profile: DemoProfile;
  preview: PreviewState;
  basePath: string;
  active: boolean;
}) {
  const visual = profile === "comic" || profile === "storyboard";
  return (
    <div className="living-profile-viewport" hidden={!active} aria-hidden="true">
      <div className="living-profile-artwork" data-layout={profile}>
        <header>
          <span>{profile}</span>
          <span>{visual ? "PACKAGE EXCERPT" : "LAYOUT STUDY"}</span>
        </header>
        <h3>{visual ? preview.data?.title ?? `${profile} example` : "PRD Document Example."}</h3>
        {visual ? (
          <ol className="profile-media-sequence" key={preview.revision}>
            {preview.data && active ? preview.data.items.map((item, index) => (
              <li key={item.id}>
                <figure>
                  <div className="profile-media-image">
                    <img
                      src={getProfilePreviewUrl(basePath, item.imagePath)}
                      alt={item.alt}
                      loading="lazy"
                      decoding="async"
                      onError={preview.imageFailed}
                    />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <figcaption>{item.caption || item.alt}</figcaption>
                </figure>
              </li>
            )) : (
              <li className="profile-media-placeholder">
                {preview.error ? "Open the Viewer to explore this example." : "Preparing the package artwork…"}
              </li>
            )}
          </ol>
        ) : <StudyContent />}
        <footer>
          <span>{getCanonicalDemoProfile(profile)}</span>
          <span>{visual ? "SOURCE ARTWORK" : "SAME CONTENT · NEW FORM"}</span>
        </footer>
      </div>
    </div>
  );
}

export function LivingProfilePanel({ profile, preview, onOpenViewer }: {
  profile: DemoProfile;
  preview: PreviewState;
  onOpenViewer: () => void;
}) {
  const visual = profile === "comic" || profile === "storyboard";
  return (
    <div
      id="living-profile-panel"
      className="living-profile-panel"
      role="tabpanel"
      aria-labelledby={`living-profile-tab-${profile}`}
      tabIndex={0}
    >
      <p className="living-profile-source" role="status">
        {getPreviewStatus(profile, preview)}
      </p>
      {preview.error && <button type="button" onClick={preview.retry}>Retry media preview</button>}
      <details>
        <summary>{visual ? "Read the image descriptions" : "Read the shared study content"}</summary>
        {visual ? (
          <ol>
            {preview.data?.items.map((item) => (
              <li key={item.id}>
                <p>{item.alt}</p>
                {item.caption && <p>{item.caption}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <div className="living-profile-reading-copy">
            <h3>PRD Document Example.</h3>
            <StudyContent />
          </div>
        )}
      </details>
      <button type="button" className="living-text-link" onClick={onOpenViewer}>
        {visual ? "Open this package in the Viewer" : "Open the general-document example"} ↗
      </button>
      <p className="living-profile-disclosure">
        {visual ? "Original artwork from the selected package. Continue in the Viewer to read and navigate the full example." : "Four compositions of one study. Open the example to read its authored content."}
      </p>
    </div>
  );
}
