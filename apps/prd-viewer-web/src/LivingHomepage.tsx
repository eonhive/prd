/*
 * Company: EonHive Inc. | Title: PRD Living Homepage
 * Purpose: Tell one six-chapter document story around real PRD examples and the reference viewer.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import {
  livingChapters,
  getChapterPosition,
  getCanonicalDemoProfile,
  getProfileForKey,
  livingProfileOrder,
  type DemoDevice,
  type DemoProfile,
  type MotionIntensity,
  type RenderingQuality,
} from "./livingExperienceModel.js";
import type { LivingExperienceRuntime } from "./livingExperienceRuntime.js";
import {
  PrdBrandMark,
  PrdSiteFooter,
  ViewerIcon,
  ViewerSiteNavigation,
  type ViewerTheme,
} from "./viewerChrome.js";
import { getViewerAppRoutePath, type ViewerAppRoute } from "./viewerRoutes.js";
import "./livingHomepage.css";
import { LivingViewer, type LivingViewerHandle } from "./LivingViewer.js";
import {
  viewerDemoExampleArchives,
  viewerLandingHero,
} from "./viewerDemoContent.js";
import type { DocumentLayer } from "./livingPackageInspection.js";
import { LivingPackageInspector } from "./LivingPackageInspector.js";
import { LivingProfileArtwork, LivingProfilePanel, useLivingProfilePreview } from "./LivingProfilePreview.js";

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
    "A compact header and a clear side rail make the same content easy to scan.",
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
        {index === 0 ? (
          <p className="living-hero-badge">
            <span aria-hidden="true" />
            Evolves with your ideas
          </p>
        ) : (
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
        )}
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
  const [profilesReady, setProfilesReady] = useState(false);
  const [sample, setSample] = useState("document-basic");
  const [runtimeMessage, setRuntimeMessage] = useState("");
  const currentOptions = useRef({ motion, quality, focused, device, profile });
  currentOptions.current = { motion, quality, focused, device, profile };
  const profilePreview = useLivingProfilePreview(profile, sample, basePath, profilesReady);
  const routeHref = (route: ViewerAppRoute) =>
    getViewerAppRoutePath(route, basePath);
  const assetBasePath = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const artworkUrl = `${assetBasePath}brand/prd-world.webp`;
  const selectedExample =
    viewerDemoExampleArchives.find((example) => example.id === sample) ??
    viewerDemoExampleArchives[0]!;
  const selectedViewerHref = `${routeHref("viewer")}?sample=${selectedExample.id}`;
  const selectedDownloadHref = `${assetBasePath}${selectedExample.hostedPath}`;

  function selectSample(nextSample: string) {
    const example = viewerDemoExampleArchives.find(
      (item) => item.id === nextSample,
    );
    if (!example) return;
    setSample(example.id);
    setProfile(
      example.profile === "comic" || example.profile === "storyboard"
        ? example.profile
        : "document",
    );
  }

  function selectProfile(nextProfile: DemoProfile) {
    setProfile(nextProfile);
    setSample(nextProfile === "comic" || nextProfile === "storyboard" ? `${nextProfile}-basic` : "document-basic");
  }

  function handleProfileKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const next = getProfileForKey(profile, event.key);
    if (!next) return;
    event.preventDefault();
    selectProfile(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`#living-profile-tab-${next}`)?.focus();
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
          runtime.setProfile(currentOptions.current.profile);
        }
      })
      .catch(() => {
        runtime?.dispose();
        if (cancelled) return;
        runtimeRef.current = undefined;
        setRuntimeMessage(
          "Motion is unavailable. All chapters and the Viewer are still ready to explore.",
        );
      });
    return () => {
      cancelled = true;
      runtime?.dispose();
      runtimeRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!runtimeMessage || !root) return;
    const chapters = [...root.querySelectorAll<HTMLElement>("[data-living-chapter]")];
    const copies = chapters.map((chapter) =>
      chapter.querySelector<HTMLElement>(".living-chapter-copy"),
    );
    let starts: number[] = [];
    let end = 0;
    let disposed = false;

    // Only a failed runtime uses this static path. Native events never animate or request frames.
    const selectChapter = () => {
      if (disposed) return;
      const position = getChapterPosition(
        window.scrollY + window.innerHeight * 0.18,
        starts,
      );
      setChapter(Math.min(chapters.length - 1, Math.max(0, Math.floor(position + 0.08))));
      root.dataset.storyComplete = String(window.scrollY > end - 160);
    };

    const measure = () => {
      if (disposed) return;
      starts = chapters.map((chapter) =>
        chapter.getBoundingClientRect().top + window.scrollY,
      );
      end = (starts.at(-1) ?? 0) + (chapters.at(-1)?.offsetHeight ?? 0);
      starts.forEach((start, index) =>
        root.style.setProperty(`--chapter-start-${index}`, `${start}px`),
      );
      copies.forEach((copy, index) => {
        if (!copy) return;
        const stageTop = copy.getBoundingClientRect().bottom + window.scrollY + 70;
        root.style.setProperty(`--chapter-stage-${index}`, `${stageTop}px`);
      });
      selectChapter();
    };

    const observer = typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(measure);
    chapters.forEach((chapter) => observer?.observe(chapter));
    copies.forEach((copy) => {
      if (copy) observer?.observe(copy);
    });
    window.addEventListener("scroll", selectChapter, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("scroll", selectChapter);
      window.removeEventListener("resize", measure);
    };
  }, [runtimeMessage]);

  useEffect(() => {
    if (!runtimeMessage) return;
    const sheet = documentRef.current;
    const width = { desktop: 420, tablet: 340, mobile: 236 }[device];
    sheet?.style.setProperty("--document-width", `${width}px`);
    sheet?.style.setProperty("--profile-reveal", "1");
    if (sheet) sheet.style.transform = "none";
    stageRef.current?.style.setProperty("--layer-spread", "0");
  }, [device, runtimeMessage]);

  useEffect(() => {
    runtimeRef.current?.update({ motion, quality, focused });
  }, [motion, quality, focused]);
  useEffect(() => {
    runtimeRef.current?.setDevice(device);
  }, [device]);
  useEffect(() => {
    runtimeRef.current?.setProfile(profile);
  }, [profile]);

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
      setProfilesReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.target.id === "viewer") setViewerReady(true);
          if (entry.target.id === "structure") setInspectorReady(true);
          if (entry.target.id === "profiles") setProfilesReady(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "500px" },
    );
    for (const id of ["structure", "profiles", "viewer"]) {
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
      data-runtime={runtimeMessage ? "unavailable" : undefined}
      aria-label="PRD Home"
    >
      <ViewerSiteNavigation
        route="home"
        basePath={basePath}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

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
          <div
            className="living-hero-decoration living-hero-logo"
            aria-hidden="true"
          >
            <PrdBrandMark />
            <strong>PRD</strong>
          </div>
          <div
            className="living-hero-decoration living-hero-preview"
            aria-hidden="true"
          >
            <img src={artworkUrl} alt="" width="1536" height="1024" />
            <span />
            <span />
            <span />
          </div>
          <span
            className="living-hero-decoration living-format-chip format-text"
            aria-hidden="true"
          >
            <ViewerIcon name="file" />
            Text
          </span>
          <span
            className="living-hero-decoration living-format-chip format-comic"
            aria-hidden="true"
          >
            <ViewerIcon name="image" />
            Comic
          </span>
          <span
            className="living-hero-decoration living-format-chip format-responsive"
            aria-hidden="true"
          >
            <ViewerIcon name="wide" />
            Responsive
          </span>
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
                <span>
                  {item === "profile"
                    ? `profile: ${selectedExample.profile}`
                    : layerDescriptions[item].path}
                </span>
              </button>
            ),
          )}
          <article
            className="living-paper"
            aria-hidden={chapter !== 4 && !focused}
            aria-label="PRD document presentation and reference Viewer"
          >
            <div className="living-paper-content" hidden={chapter === 3 || chapter === 4}>
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
                <img src={artworkUrl} width="1536" height="1024" alt="" />
                <span>A WORLD OF POSSIBILITIES.</span>
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
              <footer>
                <span>{getCanonicalDemoProfile(profile)}</span>
                <span>
                  PORTABLE BY DESIGN <b>↗</b>
                </span>
              </footer>
            </div>
            <LivingProfileArtwork profile={profile} preview={profilePreview} basePath={basePath} active={chapter === 3 && !focused} />
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
                    ? `${profile.toUpperCase()} / ${profile === "comic" || profile === "storyboard" ? "PACKAGE EXCERPT" : "LAYOUT STUDY"}.`
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
              Documents were never
              <br />
              <em>meant to stand still.</em>
            </>
          }
        >
          <p className="living-intro">
            PRD is Portable Responsive Document — a structured, portable format
            for ideas that deserve more room. Read across screens, explore rich
            content, and take the whole document with you.
          </p>
          <div className="living-actions">
            <a className="living-primary" href={routeHref("viewer")}>
              Open Viewer <Arrow />
            </a>
            <a className="living-secondary" href="#examples">
              Explore Examples
            </a>
            <a className="living-secondary" href={routeHref("docs")}>
              Read Docs
            </a>
          </div>
          <div className="living-hero-benefits" aria-label="PRD benefits">
            <span>
              <ViewerIcon name="file" />
              Open a .prd file
            </span>
            <span>
              <ViewerIcon name="wide" />
              Adapts to your screen
            </span>
            <span>
              <ViewerIcon name="book" />
              Profile aware
            </span>
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
            <code>
              {layer === "profile"
                ? `profile: ${selectedExample.profile}`
                : layerDescriptions[layer].path}
            </code>
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
            role="tablist"
            aria-label="Document profile presentations"
            onKeyDown={handleProfileKey}
          >
            {livingProfileOrder.map((item) => (
              <button
                key={item}
                id={`living-profile-tab-${item}`}
                role="tab"
                aria-selected={profile === item}
                aria-controls="living-profile-panel"
                tabIndex={profile === item ? 0 : -1}
                onClick={() => selectProfile(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="living-profile-description" aria-live="polite">
            {profileDescriptions[profile]}
          </p>
          <LivingProfilePanel profile={profile} preview={profilePreview} onOpenViewer={enterViewer} />
          <a className="living-text-link" href="#examples">
            Explore the three document profiles <Arrow />
          </a>
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
            <br />
            One package. Ready for your next reader.
          </p>
          <a className="living-example-link" href={routeHref("docs")}>
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
              runtimeMessage
                ? "Ambient sound unavailable"
                : audioPlaying ? "Mute ambient sound" : "Enable ambient sound"
            }
            disabled={Boolean(runtimeMessage)}
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
        <section
          id="examples"
          tabIndex={-1}
          className="prd-examples-section"
          aria-labelledby="prd-examples-title"
        >
          <div className="prd-section-heading">
            <p className="eyebrow">Made to be opened</p>
            <h2 id="prd-examples-title">One format. Different stories.</h2>
            <p>
              Explore the three PRD profile families with real example packages.
            </p>
          </div>
          <div className="prd-profile-grid">
            {(
              [
                {
                  id: "document-basic",
                  title: "Document",
                  icon: "file",
                  description:
                    "Structured ideas, clear reading order, and content that finds its place.",
                },
                {
                  id: "comic-basic",
                  title: "Comic",
                  icon: "image",
                  description:
                    "Visual storytelling with panel navigation and its own reading rhythm.",
                },
                {
                  id: "storyboard-basic",
                  title: "Storyboard",
                  icon: "wide",
                  description:
                    "A sequence of frames, notes, and ideas ready to explore.",
                },
              ] as const
            ).map((item) => (
              <a
                key={item.id}
                className={`prd-profile-card profile-${item.id}`}
                href={`${routeHref("viewer")}?sample=${item.id}`}
              >
                <div className="prd-profile-art" aria-hidden="true">
                  <img
                    src={artworkUrl}
                    alt=""
                    loading="lazy"
                    width="1536"
                    height="1024"
                  />
                  <span />
                  <span />
                </div>
                <div className="prd-profile-card-heading">
                  <ViewerIcon name={item.icon} />
                  <h3>{item.title}</h3>
                  <span aria-hidden="true">↗</span>
                </div>
                <p>{item.description}</p>
                <span className="prd-card-action">
                  Open example <Arrow />
                </span>
              </a>
            ))}
          </div>
          <a
            className="prd-segmented-link"
            href={`${routeHref("viewer")}?sample=document-segmented-basic`}
          >
            Explore a larger document with packaged sections <Arrow />
          </a>
        </section>
        <div className="living-authoring-heading">
          <p className="living-eyebrow">YOUR NEXT CHAPTER</p>
          <h2>
            Make something
            <br />
            <em>worth opening.</em>
          </h2>
        </div>
        {children}
      </section>
      <PrdSiteFooter basePath={basePath} />
    </main>
  );
}
