/*
 * Company: EonHive Inc. | Title: Living Homepage Coordinator
 * Purpose: Coordinate native scroll and presentation through one on-demand uRK kernel.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

import { Kernel } from "@urk/core";
import { createMotionAdapter, MotionCapability } from "@urk/adapters/motion";
import type { AudioAdapterApi } from "@urk/adapters/audio";
import {
  getChapterPosition,
  sampleDocumentPose,
  resolveRenderingQuality,
  type MotionIntensity,
  type RenderingQuality,
  type DemoDevice,
  type DemoProfile,
} from "./livingExperienceModel.js";

export interface LivingRuntimeOptions {
  motion: MotionIntensity;
  quality: RenderingQuality;
  focused: boolean;
}

export interface LivingExperienceRuntime {
  update(options: LivingRuntimeOptions): void;
  setDevice(device: DemoDevice): void;
  setProfile(profile: DemoProfile): void;
  toggleAudio(): Promise<boolean>;
  dispose(): void;
}

export async function createLivingExperienceRuntime(
  root: HTMLElement,
  stage: HTMLElement,
  sheet: HTMLElement,
  onChapter: (chapter: number) => void,
  onAudio: (playing: boolean) => void,
): Promise<LivingExperienceRuntime> {
  const kernel = new Kernel({
    frameMode: "auto",
    adapters: [createMotionAdapter()],
  });
  await kernel.boot();
  const context = kernel.getContext();
  const motion = context.require(MotionCapability).scoped(context.scope);
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  const chapters = [
    ...root.querySelectorAll<HTMLElement>("[data-living-chapter]"),
  ];
  const chapterCopies = chapters.map((chapter) =>
    chapter.querySelector<HTMLElement>(".living-chapter-copy"),
  );
  const scroll = {
    y: window.scrollY,
    starts: [] as number[],
    position: 0,
    end: 0,
  };
  let options: LivingRuntimeOptions = {
    motion: "full",
    quality: "auto",
    focused: false,
  };
  let lastChapter = -1;
  let pointerX = 0;
  let pointerY = 0;
  let disposed = false;
  let visible = true;
  let releaseFrame: (() => void) | undefined;
  let ambientTimer: ReturnType<typeof setTimeout> | undefined;
  let audio: AudioAdapterApi | undefined;
  let audioUrl: string | undefined;
  let audioLoading = false;
  let audioGeneration = 0;
  let audioReady = false;
  let audioInitialization: Promise<void> | undefined;
  const deviceSize = { width: 420 };
  let selectedDevice: DemoDevice = "desktop";
  let selectedProfile: DemoProfile = "document";
  const profileReveal = { progress: 1 };
  let renderedFrames = 0;
  let slowFrames = 0;
  let previousFrameTime = 0;
  let adaptiveLow = false;
  const reduced = () => preference.matches || options.motion === "off";
  const isStoryComplete = () => scroll.y > scroll.end - 160;
  const canAnimate = () =>
    !reduced() &&
    visible &&
    !document.hidden &&
    !options.focused &&
    !isStoryComplete();
  const effectiveQuality = () => {
    const browser = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    return adaptiveLow && options.quality === "auto"
      ? "low"
      : resolveRenderingQuality(options.quality, {
          width: window.innerWidth,
          cores: navigator.hardwareConcurrency || 4,
          memory: browser.deviceMemory,
          saveData: browser.connection?.saveData,
        });
  };

  function cancelAmbient() {
    clearTimeout(ambientTimer);
    ambientTimer = undefined;
  }

  function cancelAudio() {
    audioGeneration++;
    audioLoading = false;
    audio?.pause();
    audio?.analysis.disable();
    root.style.setProperty("--audio-level", "0");
  }

  function isAudioRequestCurrent(generation: number) {
    return !disposed && !document.hidden && generation === audioGeneration;
  }

  function initializeAudio() {
    if (!audioInitialization) {
      audioInitialization = (async () => {
        const [{ createAudioAdapter }, { createAmbientAudioUrl }] = await Promise.all([
          import("@urk/adapters/audio"),
          import("./livingExperienceAudio.js"),
        ]);
        if (disposed || !audioLoading) return;
        if (!audio) audio = await kernel.registerAdapter(createAudioAdapter());
        if (disposed) return;
        // Complete one reusable setup if visibility changes during adapter registration.
        if (!audioUrl) audioUrl = createAmbientAudioUrl();
        audio.registerTrack({
          id: "ambient",
          label: "PRD ambient",
          src: audioUrl,
          loop: true,
          volume: 0.22,
        });
        audioReady = true;
      })().finally(() => { audioInitialization = undefined; });
    }
    return audioInitialization;
  }

  function releasePendingPaint() {
    const release = releaseFrame;
    releaseFrame = undefined;
    release?.();
  }

  function finishProfileReveal() {
    motion.cancel(profileReveal);
    profileReveal.progress = 1;
    sheet.style.setProperty("--profile-reveal", "1");
  }

  function settleMotion() {
    motion.cancel();
    deviceSize.width = { desktop: 420, tablet: 340, mobile: 236 }[selectedDevice];
    sheet.style.setProperty("--document-width", `${deviceSize.width}px`);
    finishProfileReveal();
  }

  function handleMotionPreference() {
    cancelAmbient();
    if (!canAnimate()) settleMotion();
    requestUpdate();
  }

  function suspendPresentation() {
    cancelAmbient();
    // Resume at the selected layout without replaying motion that happened out of view.
    settleMotion();
    releasePendingPaint();
  }

  function measure() {
    if (disposed) return;
    scroll.starts = chapters.map(
      (chapter) => chapter.getBoundingClientRect().top + window.scrollY,
    );
    // Mobile places the shared sheet after the actual text, including open disclosures.
    const stageStarts = chapterCopies.map((copy) =>
      copy ? copy.getBoundingClientRect().bottom + window.scrollY + 70 : undefined,
    );
    scroll.end = (scroll.starts[5] ?? 0) + (chapters[5]?.offsetHeight ?? 0);
    scroll.starts.forEach((start, index) =>
      root.style.setProperty(`--chapter-start-${index}`, `${start}px`),
    );
    stageStarts.forEach((start, index) => {
      if (start !== undefined)
        root.style.setProperty(`--chapter-stage-${index}`, `${start}px`);
    });
    requestUpdate();
  }

  function paint(timeMs: number) {
    if (disposed) return;
    const startedAt = performance.now();
    scroll.position = getChapterPosition(
      scroll.y + window.innerHeight * 0.18,
      scroll.starts,
    );
    const chapter = Math.min(
      5,
      Math.max(0, Math.floor(scroll.position + 0.08)),
    );
    const storyComplete = isStoryComplete();
    if (storyComplete) settleMotion();
    if (chapter !== lastChapter) {
      lastChapter = chapter;
      root.dataset.chapter = String(chapter);
      onChapter(chapter);
    }
    if (chapter !== 3 && profileReveal.progress < 1) finishProfileReveal();
    const pose = sampleDocumentPose(scroll.position);
    const strength =
      (options.motion === "subtle" ? 0.24 : 1) *
      (window.innerWidth < 760 ? 0.4 : 1);
    const ambient =
      reduced() || options.focused ? 0 : Math.sin(timeMs / 2400) * 5 * strength;
    const depth = reduced() || options.focused ? 0 : strength;
    sheet.style.transform = options.focused
      ? "none"
      : `translateY(${ambient}px) rotateX(${(pose.rotateX + pointerY * 3) * depth}deg) rotateY(${(pose.rotateY + pointerX * 5) * depth}deg) rotateZ(${pose.rotateZ * depth}deg) scale(${reduced() ? 1 : pose.scale})`;
    stage.style.setProperty(
      "--layer-spread",
      String(reduced() ? 0 : pose.spread * strength),
    );
    stage.style.setProperty("--ambient-offset", `${ambient}px`);
    root.style.setProperty(
      "--audio-level",
      String(audio?.analysis.enabled ? audio.analysis.read().level : 0),
    );
    root.style.setProperty(
      "--story-progress",
      String(Math.min(1, scroll.position / 5)),
    );
    root.dataset.quality = effectiveQuality();
    root.dataset.reduced = String(reduced());
    root.dataset.frames = String(++renderedFrames);
    root.dataset.scheduler = "urk-auto";
    root.dataset.storyComplete = String(storyComplete);

    // Adapt only during active, closely spaced work; tab throttling is not device load.
    if (
      previousFrameTime &&
      timeMs - previousFrameTime < 150 &&
      performance.now() - startedAt > 8
    ) {
      if (++slowFrames >= 6) adaptiveLow = true;
    } else {
      slowFrames = Math.max(0, slowFrames - 1);
    }
    previousFrameTime = timeMs;
    cancelAmbient();
    if (canAnimate()) {
      ambientTimer = setTimeout(
        requestUpdate,
        effectiveQuality() === "low" ? 140 : 80,
      );
    }
  }

  function requestUpdate() {
    if (disposed || !visible || document.hidden || releaseFrame) return;
    releaseFrame = context.registerFrameWork(({ timeMs }) => {
      releasePendingPaint();
      paint(timeMs);
    });
  }

  function handleScroll() {
    scroll.y = window.scrollY;
    requestUpdate();
  }

  function handlePointer(event: PointerEvent) {
    if (
      !visible ||
      isStoryComplete() ||
      !finePointer.matches ||
      reduced() ||
      options.focused
    )
      return;
    pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (event.clientY / window.innerHeight - 0.5) * -2;
    requestUpdate();
  }

  function handleVisibility() {
    if (document.hidden) {
      suspendPresentation();
      cancelAudio();
      onAudio(false);
      kernel.pause();
    } else {
      kernel.resume();
      requestUpdate();
    }
  }

  const observer =
    typeof IntersectionObserver === "undefined"
      ? undefined
      : new IntersectionObserver(([entry]) => {
          if (disposed) return;
          visible = entry?.isIntersecting ?? false;
          if (visible) requestUpdate();
          else suspendPresentation();
        });
  observer?.observe(root);
  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(measure);
  chapters.forEach((chapter) => resizeObserver?.observe(chapter));
  chapterCopies.forEach((copy) => {
    if (copy) resizeObserver?.observe(copy);
  });
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", handlePointer, { passive: true });
  preference.addEventListener("change", handleMotionPreference);
  document.addEventListener("visibilitychange", handleVisibility);
  measure();

  return {
    update(next) {
      if (disposed) return;
      options = next;
      cancelAmbient();
      if (!canAnimate()) settleMotion();
      requestUpdate();
    },
    setDevice(device) {
      if (disposed) return;
      selectedDevice = device;
      const width = { desktop: 420, tablet: 340, mobile: 236 }[device];
      motion.cancel(deviceSize);
      if (deviceSize.width === width) {
        sheet.style.setProperty("--document-width", `${width}px`);
        return;
      }
      if (!canAnimate()) {
        deviceSize.width = width;
        sheet.style.setProperty("--document-width", `${width}px`);
        return;
      }
      motion.tween(
        deviceSize,
        { width },
        {
          durationMs: options.motion === "subtle" ? 180 : 560,
          easing: "ease-in-out",
          onUpdate: () =>
            sheet.style.setProperty(
              "--document-width",
              `${deviceSize.width}px`,
            ),
        },
      );
    },
    setProfile(profile) {
      if (disposed || selectedProfile === profile) return;
      selectedProfile = profile;
      finishProfileReveal();
      if (!canAnimate() || lastChapter !== 3) return;
      profileReveal.progress = 0;
      sheet.style.setProperty("--profile-reveal", "0");
      motion.tween(profileReveal, { progress: 1 }, {
        durationMs: options.motion === "subtle" ? 160 : 420,
        easing: "ease-out",
        onUpdate: () => sheet.style.setProperty("--profile-reveal", String(profileReveal.progress)),
      });
    },
    async toggleAudio() {
      if (disposed || document.hidden) return false;
      if (audioLoading || audio?.getSnapshot().status === "playing") {
        cancelAudio();
        onAudio(false);
        return false;
      }
      audioLoading = true;
      const generation = ++audioGeneration;
      try {
        if (!audioReady) await initializeAudio();
        if (!isAudioRequestCurrent(generation) || !audio) return false;
        await audio.play("ambient");
        if (!isAudioRequestCurrent(generation)) return false;
        // Analysis is optional; transport stays usable if Web Audio is unavailable.
        try {
          await audio.analysis.enable({ fftSize: 128 });
        } catch {
          /* Keep plain playback. */
        }
        if (!isAudioRequestCurrent(generation)) return false;
        onAudio(true);
        requestUpdate();
        return true;
      } catch (error) {
        // Hiding or disposing cancels opt-in; it must not become a playback-error message.
        if (!isAudioRequestCurrent(generation)) return false;
        throw error;
      } finally {
        if (generation === audioGeneration) audioLoading = false;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAudio();
      cancelAmbient();
      motion.cancel();
      releasePendingPaint();
      observer?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", handlePointer);
      preference.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
      void kernel.shutdown().finally(() => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
      });
    },
  };
}
