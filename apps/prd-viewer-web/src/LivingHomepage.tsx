/*
 * Company: EonHive Inc. | Title: PRD Living Homepage
 * Purpose: Tell one six-chapter document story around real PRD examples and the reference viewer.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  livingChapters,
  getCanonicalDemoProfile,
  type DemoDevice,
  type DemoProfile,
  type MotionIntensity,
  type RenderingQuality,
} from "./livingExperienceModel.js";
import type { LivingExperienceRuntime } from "./livingExperienceRuntime.js";
import type { ViewerTheme } from "./viewerChrome.js";
import { getViewerAppRoutePath, type ViewerAppRoute } from "./viewerRoutes.js";
import "./livingHomepage.css";
import { LivingViewer, type LivingViewerHandle } from "./LivingViewer.js";
import { viewerDemoExampleArchives, viewerLandingHero } from "./viewerDemoContent.js";
import type { DocumentLayer } from "./livingPackageInspection.js";
import { LivingPackageInspector } from "./LivingPackageInspector.js";

const layerDescriptions = {
  content: {
    title: "Meaning comes first.",
    path: "content/root.json",
    description:
      "Headings, paragraphs, images, and sections retain their semantic reading order as the layout changes.",
  },
  resources: {
    title: "Everything travels together.",
    path: "assets/",
    description:
      "Images, audio, and other resources are declared in the manifest and can travel inside the portable package.",
  },
  profile: {
    title: "A form that fits the story.",
    path: "profile: general-document",
    description:
      "General document, comic, and storyboard are first-class profile families. Reports and resumes belong to the general-document family.",
  },
  manifest: {
    title: "One clear starting point.",
    path: "manifest.json",
    description:
      "The canonical manifest identifies the package, its version, profile, content entry, and declared resources. A viewer starts here.",
  },
} as const;

const profileDescriptions: Record<DemoProfile, string> = {
  document:
    "A clear reading flow. Meaningful headings, readable text, and room to explore.",
  report:
    "An editorial hierarchy for ideas, evidence, and a clear path through the details.",
  resume:
    "A scan-friendly composition for experience, skills, and the next opportunity.",
  comic:
    "Panel-led storytelling, with its own reading rhythm and real panel navigation.",
  storyboard:
    "Frame-by-frame thinking. Images, notes, and a sequence ready for review.",
  magazine:
    "A generous editorial canvas for long-form stories and visual publishing.",
};

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={down ? { transform: "rotate(90deg)" } : undefined}
    >
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function DeviceIcon({ device }: { device: DemoDevice }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {device === "desktop" ? (
        <>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8m-4-4v4" />
        </>
      ) : (
        <>
          <rect
            x={device === "tablet" ? "4" : "7"}
            y="2"
            width={device === "tablet" ? "16" : "10"}
            height="20"
            rx="2"
          />
          <path d="M11 19h2" />
        </>
      )}
    </svg>
  );
}

function Chapter({
  index,
  title,
  children,
}: {
  index: number;
  title: ReactNode;
  children: ReactNode;
}) {
  const chapter = livingChapters[index]!;
  return (
    <section
      id={chapter.id}
      className={`living-chapter living-chapter-${index}`}
      data-living-chapter
      tabIndex={-1}
      aria-labelledby={`${chapter.id}-title`}
    >
      <div className="living-chapter-copy">
        <p className="living-eyebrow">
          <span>{String(index + 1).padStart(2, "0")}</span> /{" "}
          {index === 0
            ? "THE BEGINNING"
            : index === 1
              ? "BREAK THE PAGE"
              : index === 2
                ? "BEYOND THE SURFACE"
                : index === 3
                  ? "EVERY STORY HAS A FORM"
                  : index === 4
                    ? "EXPERIENCE THE VIEWER"
                    : "THE NEXT CHAPTER"}
        </p>
        {index === 0 ? (
          <h1 id={`${chapter.id}-title`} aria-label={viewerLandingHero.title}>
            {title}
          </h1>
        ) : (
          <h2 id={`${chapter.id}-title`}>{title}</h2>
        )}
        {children}
      </div>
    </section>
  );
}

export function LivingHomepage({
  basePath,
  theme,
  onToggleTheme,
  children,
}: {
  basePath: string;
  theme: ViewerTheme;
  onToggleTheme: () => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<LivingViewerHandle>(null);
  const runtimeRef = useRef<LivingExperienceRuntime | undefined>(undefined);
  const [chapter, setChapter] = useState(0);
  const [device, setDevice] = useState<DemoDevice>("desktop");
  const [profile, setProfile] = useState<DemoProfile>("document");
  const [layer, setLayer] = useState<DocumentLayer>("manifest");
  const [motion, setMotion] = useState<MotionIntensity>("full");
  const [quality, setQuality] = useState<RenderingQuality>("auto");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMessage, setAudioMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [inspectorReady, setInspectorReady] = useState(false);
  const [sample, setSample] = useState("document-basic");
  const [runtimeMessage, setRuntimeMessage] = useState("");
  const currentOptions = useRef({ motion, quality, focused, device });
  currentOptions.current = { motion, quality, focused, device };
  const routeHref = (route: ViewerAppRoute) =>
    getViewerAppRoutePath(route, basePath);
  const selectedExample =
    viewerDemoExampleArchives.find((example) => example.id === sample) ??
    viewerDemoExampleArchives[0]!;
  const selectedViewerHref = `${routeHref("viewer")}?sample=${selectedExample.id}`;
  const selectedDownloadHref = `${basePath.endsWith("/") ? basePath : `${basePath}/`}${selectedExample.hostedPath}`;

  function selectSample(nextSample: string) {
    const example = viewerDemoExampleArchives.find((item) => item.id === nextSample);
    if (!example) return;
    setSample(example.id);
    setProfile(
      example.profile === "comic" || example.profile === "storyboard"
        ? example.profile
        : "document",
    );
  }

  useEffect(() => {
    let cancelled = false;
    let runtime: LivingExperienceRuntime | undefined;
    void import("./livingExperienceRuntime.js")
      .then(async ({ createLivingExperienceRuntime }) => {
        if (
          cancelled ||
          !rootRef.current ||
          !stageRef.current ||
          !documentRef.current
        )
          return;
        runtime = await createLivingExperienceRuntime(
          rootRef.current,
          stageRef.current,
          documentRef.current,
          setChapter,
          setAudioPlaying,
        );
        if (cancelled) runtime.dispose();
        else {
          runtimeRef.current = runtime;
          runtime.update(currentOptions.current);
          runtime.setDevice(currentOptions.current.device);
        }
      })
      .catch(() =>
        setRuntimeMessage(
          "Motion is unavailable. All chapters and the Viewer are still ready to explore.",
        ),
      );
    return () => {
      cancelled = true;
      runtime?.dispose();
      runtimeRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    runtimeRef.current?.update({ motion, quality, focused });
  }, [motion, quality, focused]);
  useEffect(() => {
    runtimeRef.current?.setDevice(device);
  }, [device]);

  useEffect(() => {
    if (!focused) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [focused]);

  // Load each package surface near its chapter, independently of motion availability.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setViewerReady(true);
      setInspectorReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.target.id === "viewer") setViewerReady(true);
          if (entry.target.id === "structure") setInspectorReady(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "500px" },
    );
    for (const id of ["structure", "viewer"]) {
      const target = document.getElementById(id);
      if (target) observer.observe(target);
    }
    return () => observer.disconnect();
  }, []);

  function enterViewer() {
    setViewerReady(true);
    viewerRef.current?.openFocus();
  }

  async function toggleAudio() {
    setAudioMessage("");
    try {
      if (!runtimeRef.current) {
        setAudioMessage(
          "The experience is still loading. Try sound again in a moment.",
        );
        return;
      }
      await runtimeRef.current.toggleAudio();
    } catch {
      setAudioPlaying(false);
      setAudioMessage(
        "Sound could not start in this browser. You can continue exploring quietly.",
      );
    }
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="living-experience"
      ref={rootRef}
      data-chapter={chapter}
      data-motion={motion}
      data-profile={profile}
      data-focused={focused}
      aria-label="PRD Home"
    >
      <header className="living-nav">
        <a
          className="living-brand"
          href={routeHref("home")}
          aria-label="PRD Home"
        >
          <span className="living-brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          PRD
          <span className="living-brand-caption">
            PORTABLE RESPONSIVE DOCUMENT
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#responsive">Explore</a>
          <a href={routeHref("viewer")}>Viewer</a>
          <a href={routeHref("docs")}>Docs</a>
        </nav>
        <div className="living-nav-end">
          <span className="living-chapter-count">
            CHAPTER <b>{String(chapter + 1).padStart(2, "0")}</b> / 06
          </span>
          <button className="living-nav-cta" onClick={enterViewer}>
            Open Viewer <Arrow />
          </button>
        </div>
      </header>

      <div className="living-atmosphere" aria-hidden="true">
        <div className="living-orbit orbit-one" />
        <div className="living-orbit orbit-two" />
        <div className="living-grid" />
        {Array.from({ length: 18 }, (_, index) => (
          <i
            className="living-particle"
            key={index}
            style={{
              left: `${40 + ((index * 17) % 58)}%`,
              top: `${12 + ((index * 29) % 75)}%`,
              opacity: 0.16 + (index % 3) * 0.1,
            }}
          />
        ))}
      </div>

      <div
        className="living-stage"
        ref={stageRef}
        aria-label="One document, six transformations"
      >
        <div className="living-object-heading" aria-hidden="true">
          <span className="living-live-dot">
            {livingChapters[chapter]!.word}
          </span>
          <span>{selectedExample.id.toUpperCase()}.PRD</span>
        </div>
        <div
          className="living-document-object"
          ref={documentRef}
          data-device={device}
        >
          <div className="living-document-shadow" />
          {(["manifest", "profile", "resources"] as const).map(
            (item, index) => (
              <button
                type="button"
                className={`living-document-layer layer-${index}`}
                key={item}
                tabIndex={chapter === 2 ? 0 : -1}
                aria-hidden={chapter !== 2}
                aria-label={`Inspect ${item} layer`}
                aria-pressed={layer === item}
                onClick={() => setLayer(item)}
              >
                <span>{item === "profile" ? `profile: ${selectedExample.profile}` : layerDescriptions[item].path}</span>
              </button>
            ),
          )}
          <article
            className="living-paper"
            aria-hidden={chapter !== 4 && !focused}
            aria-label="Illustrative layout of the PRD document example"
          >
            <div className="living-paper-content" hidden={chapter === 4}>
              <div className="living-paper-top">
                <span>
                  <i /> PRD / EXAMPLE 001
                </span>
                <span>EDITION 01</span>
              </div>
              <div className="living-paper-title">
                <span className="living-paper-kicker">A NEW WAY TO READ</span>
                <h3>
                  PRD Document
                  <br />
                  <em>Example.</em>
                </h3>
                <p>
                  Portable Responsive Documents start with a manifest-first
                  contract.
                </p>
              </div>
              <div className="living-paper-art" aria-hidden="true">
                <div className="paper-sculpture sculpture-one" />
                <div className="paper-sculpture sculpture-two" />
                <div className="paper-sculpture sculpture-three" />
                <span>MEANING, IN EVERY DIMENSION.</span>
              </div>
              <div className="living-paper-columns">
                <div>
                  <h4>01 / The foundation</h4>
                  <p>
                    This example proves the first executable PRD foundation with
                    a canonical manifest and a structured content root.
                  </p>
                </div>
                <div>
                  <h4>02 / Beyond the page</h4>
                  <p>
                    Structure stays intact. Content adapts to the space in which
                    you read it.
                  </p>
                </div>
              </div>
              {(profile === "comic" || profile === "storyboard") && (
                <div
                  className="living-panel-study"
                  aria-label={`${profile} illustrative layout`}
                >
                  <span>01 / Establish</span>
                  <span>02 / Explore</span>
                  <span>03 / Continue</span>
                </div>
              )}
              <footer>
                <span>{getCanonicalDemoProfile(profile)}</span>
                <span>
                  PORTABLE BY DESIGN <b>↗</b>
                </span>
              </footer>
            </div>
            <LivingViewer
              ref={viewerRef}
              active={chapter === 4}
              ready={viewerReady}
              sample={sample}
              viewerPath={routeHref("viewer")}
              onSampleChange={selectSample}
              onFocusChange={setFocused}
            />
          </article>
          <span className="living-file-tag" aria-hidden="true">
            .prd <span>↗</span>
          </span>
        </div>
        <div className="living-stage-caption" aria-hidden="true">
          <span>ONE DOCUMENT.</span>
          <div />
          <span>
            {chapter === 0
              ? "ENDLESS POSSIBILITIES."
              : chapter === 1
                ? `${device.toUpperCase()} / SAME CONTENT.`
                : chapter === 2
                  ? "STRUCTURED FROM WITHIN."
                  : chapter === 3
                    ? `${profile.toUpperCase()} / LAYOUT STUDY.`
                    : chapter === 4
                      ? "OPEN. READ. EXPLORE."
                      : "READY TO GO ANYWHERE."}
          </span>
        </div>
      </div>

      <div className="living-chapters">
        <Chapter
          index={0}
          title={
            <>
              Documents were
              <br />
              never meant to
              <br />
              <em>stand still.</em>
            </>
          }
        >
          <p className="living-intro">
            Meet PRD. A Portable Responsive Document.
            <br />
            Structured by nature. Alive with possibility.
          </p>
          <div className="living-actions">
            <a className="living-primary" href="#responsive">
              Experience PRD <Arrow />
            </a>
            <a className="living-text-link" href={routeHref("docs")}>
              Explore the format ↗
            </a>
          </div>
          <a className="living-scroll-cue" href="#responsive">
            <span>
              <Arrow down />
            </span>{" "}
            SCROLL TO AWAKEN
          </a>
        </Chapter>
        <Chapter
          index={1}
          title={
            <>
              One document.
              <br />
              <em>Every screen.</em>
            </>
          }
        >
          <p>
            The page changes. The story stays.
            <br />
            Content finds its shape on desktop, tablet, and phone, with its
            meaning and reading order intact.
          </p>
          <div
            className="living-device-controls"
            role="group"
            aria-label="Document viewport"
          >
            {(["desktop", "tablet", "mobile"] as const).map((item) => (
              <button
                key={item}
                aria-pressed={device === item}
                onClick={() => setDevice(item)}
              >
                <DeviceIcon device={item} />
                <span>{item}</span>
              </button>
            ))}
          </div>
          <p className="living-technical-note">
            <i /> SAME CONTENT. DIFFERENT POSSIBILITIES.
          </p>
        </Chapter>
        <Chapter
          index={2}
          title={
            <>
              There’s more
              <br />
              <em>beneath the page.</em>
            </>
          }
        >
          <p>
            A document that knows its own structure.
            <br />
            Explore the layers that keep content meaningful, resources
            connected, and the whole thing portable.
          </p>
          <div
            className="living-layer-controls"
            role="group"
            aria-label="Document structure layers"
          >
            {(Object.keys(layerDescriptions) as DocumentLayer[]).map(
              (item, index) => (
                <button
                  aria-pressed={layer === item}
                  key={item}
                  onClick={() => setLayer(item)}
                >
                  <span>0{index + 1}</span>
                  {item}
                  <span>↗</span>
                </button>
              ),
            )}
          </div>
          <div
            className="living-layer-inspector"
            role="status"
            aria-live="polite"
          >
            <code>{layer === "profile" ? `profile: ${selectedExample.profile}` : layerDescriptions[layer].path}</code>
            <h3>{layerDescriptions[layer].title}</h3>
            <p>{layerDescriptions[layer].description}</p>
          </div>
          <LivingPackageInspector
            active={inspectorReady}
            sample={sample}
            layer={layer}
            basePath={basePath}
            onSampleChange={selectSample}
            onOpenViewer={enterViewer}
          />
        </Chapter>
        <Chapter
          index={3}
          title={
            <>
              Every story
              <br />
              <em>has a form.</em>
            </>
          }
        >
          <p>
            Ideas don’t all read the same way.
            <br />
            Explore how a structured content system makes room for different
            kinds of expression.
          </p>
          <div
            className="living-profile-controls"
            role="group"
            aria-label="Document layout studies"
          >
            {(
              [
                "document",
                "report",
                "resume",
                "comic",
                "storyboard",
                "magazine",
              ] as const
            ).map((item) => (
              <button
                key={item}
                aria-pressed={profile === item}
                onClick={() => {
                  setProfile(item);
                  if (item === "comic" || item === "storyboard")
                    setSample(`${item}-basic`);
                  else setSample("document-basic");
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="living-profile-description" aria-live="polite">
            {profileDescriptions[profile]}
          </p>
          <p className="living-small-note">
            Illustrative layouts.{" "}
            <code>{getCanonicalDemoProfile(profile)}</code> profile family.
            <br />
            Comic and storyboard open their own example packages in the Viewer.
          </p>
        </Chapter>
        <Chapter
          index={4}
          title={
            <>
              Don’t just read.
              <br />
              <em>Explore.</em>
            </>
          }
        >
          <p>
            This is the real thing.
            <br />
            Open a valid PRD example, follow its sections, inspect its manifest,
            or switch to a visual story.
          </p>
          <div className="living-actions">
            <button className="living-primary" onClick={enterViewer}>
              Enter the Viewer <Arrow />
            </button>
            <a className="living-text-link" href={selectedViewerHref}>
              Open full workspace ↗
            </a>
          </div>
          <div className="living-proof-list">
            <span>
              <i /> Real example package
            </span>
            <span>
              <i /> Validated in your browser
            </span>
            <span>
              <i /> Responsive semantic content
            </span>
          </div>
          <p className="living-small-note">
            Responsive reading, comic panel navigation, and storyboard review
            are available in the reference renderer.
          </p>
        </Chapter>
        <Chapter
          index={5}
          title={
            <>
              Create once.
              <br />
              <em>Go anywhere.</em>
            </>
          }
        >
          <p>
            The content. The structure. The resources.
            <br />
            Together in one portable package, ready for its next screen and its
            next reader.
          </p>
          <div className="living-actions">
            <a className="living-primary" href={selectedDownloadHref} download>
              Download this PRD <Arrow down />
            </a>
            <a className="living-text-link" href={selectedViewerHref}>
              Open this example ↗
            </a>
          </div>
          <p className="living-small-note">
            {selectedExample.label} · {selectedExample.profile}
            <br />One package. Ready for your next reader.
          </p>
          <a
            className="living-example-link"
            href={routeHref("docs")}
          >
            Explore the format <Arrow />
          </a>
          <div className="living-boundary">
            <span>THE EXPERIENCE</span>
            <b>uRK</b>
            <i>↓</i>
            <span>THE DOCUMENT</span>
            <b>PRD</b>
            <p>
              Independent by design. uRK brings this homepage to life. Your PRD
              stays portable.
            </p>
          </div>
        </Chapter>
      </div>

      <footer className="living-bottom-bar">
        <nav className="living-chapter-progress" aria-label="Story chapters">
          {livingChapters.map((item, index) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={chapter === index ? "step" : undefined}
              aria-label={`Chapter ${index + 1}: ${item.label}`}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <i />
              <strong>{item.label}</strong>
            </a>
          ))}
        </nav>
        <div className="living-experience-controls">
          <button
            className="living-sound"
            aria-label={
              audioPlaying ? "Mute ambient sound" : "Enable ambient sound"
            }
            aria-pressed={audioPlaying}
            onClick={() => void toggleAudio()}
          >
            <span
              className="living-spectrum"
              aria-hidden="true"
              data-playing={audioPlaying}
            >
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <span>SOUND {audioPlaying ? "ON" : "OFF"}</span>
          </button>
          <details className="living-settings">
            <summary aria-label="Experience settings">
              ⚙<span> EXPERIENCE</span>
            </summary>
            <div className="living-settings-panel">
              <h2>Make it your own.</h2>
              <p>Comfort comes first.</p>
              <fieldset>
                <legend>Motion intensity</legend>
                <div>
                  {(["full", "subtle", "off"] as const).map((value) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="motion"
                        value={value}
                        checked={motion === value}
                        onChange={() => setMotion(value)}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="living-quality-label">
                Rendering quality
                <select
                  value={quality}
                  onChange={(event) =>
                    setQuality(event.target.value as RenderingQuality)
                  }
                >
                  <option value="auto">Auto</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <p className="living-small-note">
                Your system’s reduced-motion preference is always respected.
              </p>
              <button className="living-theme-toggle" onClick={onToggleTheme}>
                {theme === "dark" ? "Switch to light" : "Switch to dark"}
              </button>
            </div>
          </details>
        </div>
      </footer>
      <div className="living-status" role="status" aria-live="polite">
        {audioMessage || runtimeMessage}
      </div>
      <section className="living-build-path" aria-label="Create a PRD package">
        <div>
          <p className="living-eyebrow">YOUR NEXT CHAPTER</p>
          <h2>
            Make something
            <br />
            <em>worth opening.</em>
          </h2>
        </div>
        {children}
        <p className="living-colophon">
          PRD · EONHIVE INC. <span>EXPERIENCE POWERED BY uRK</span>
        </p>
      </section>
    </main>
  );
}
