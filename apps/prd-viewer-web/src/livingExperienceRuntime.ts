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
} from "./livingExperienceModel.js";

export interface LivingRuntimeOptions {
  motion: MotionIntensity;
  quality: RenderingQuality;
  focused: boolean;
}

export interface LivingExperienceRuntime {
  update(options: LivingRuntimeOptions): void;
  setDevice(device: DemoDevice): void;
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
  const deviceSize = { width: 420 };
  let selectedDevice: DemoDevice = "desktop";
  let renderedFrames = 0;
  let slowFrames = 0;
  let previousFrameTime = 0;
  let adaptiveLow = false;
  const reduced = () => preference.matches || options.motion === "off";
  const isStoryComplete = () => scroll.y > scroll.end - 160;
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

  function measure() {
    scroll.starts = chapters.map(
      (chapter) => chapter.getBoundingClientRect().top + window.scrollY,
    );
    scroll.end = (scroll.starts[5] ?? 0) + (chapters[5]?.offsetHeight ?? 0);
    scroll.starts.forEach((start, index) =>
      root.style.setProperty(`--chapter-start-${index}`, `${start}px`),
    );
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
    if (chapter !== lastChapter) {
      lastChapter = chapter;
      root.dataset.chapter = String(chapter);
      onChapter(chapter);
    }
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
    const storyComplete = isStoryComplete();
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
    if (
      !reduced() &&
      visible &&
      !storyComplete &&
      !options.focused &&
      !document.hidden
    ) {
      cancelAmbient();
      ambientTimer = setTimeout(
        requestUpdate,
        effectiveQuality() === "low" ? 140 : 80,
      );
    }
  }

  function requestUpdate() {
    if (disposed || document.hidden || releaseFrame) return;
    releaseFrame = context.registerFrameWork(({ timeMs }) => {
      const release = releaseFrame;
      releaseFrame = undefined;
      release?.();
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
    cancelAmbient();
    if (document.hidden) {
      audio?.pause();
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
          visible = entry?.isIntersecting ?? false;
          if (visible) requestUpdate();
          else cancelAmbient();
        });
  observer?.observe(root);
  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(measure);
  chapters.forEach((chapter) => resizeObserver?.observe(chapter));
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", handlePointer, { passive: true });
  preference.addEventListener("change", requestUpdate);
  document.addEventListener("visibilitychange", handleVisibility);
  measure();

  return {
    update(next) {
      options = next;
      cancelAmbient();
      if (reduced()) {
        motion.cancel();
        deviceSize.width = { desktop: 420, tablet: 340, mobile: 236 }[
          selectedDevice
        ];
        sheet.style.setProperty("--document-width", `${deviceSize.width}px`);
      }
      requestUpdate();
    },
    setDevice(device) {
      selectedDevice = device;
      const width = { desktop: 420, tablet: 340, mobile: 236 }[device];
      motion.cancel(deviceSize);
      if (deviceSize.width === width) {
        sheet.style.setProperty("--document-width", `${width}px`);
        return;
      }
      if (reduced()) {
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
    async toggleAudio() {
      if (disposed || audioLoading) return false;
      if (audio?.getSnapshot().status === "playing") {
        audio.pause();
        onAudio(false);
        return false;
      }
      audioLoading = true;
      try {
        if (!audio) {
          const [{ createAudioAdapter }, { createAmbientAudioUrl }] =
            await Promise.all([
              import("@urk/adapters/audio"),
              import("./livingExperienceAudio.js"),
            ]);
          if (disposed) return false;
          audio = await kernel.registerAdapter(createAudioAdapter());
          if (disposed) return false;
          audioUrl = createAmbientAudioUrl();
          audio.registerTrack({
            id: "ambient",
            label: "PRD ambient",
            src: audioUrl,
            loop: true,
            volume: 0.22,
          });
        }
        await audio.play("ambient");
        if (disposed) return false;
        // Analysis is optional; transport stays usable if Web Audio is unavailable.
        try {
          await audio.analysis.enable({ fftSize: 128 });
        } catch {
          /* Keep plain playback. */
        }
        if (disposed) return false;
        onAudio(true);
        requestUpdate();
        return true;
      } finally {
        audioLoading = false;
      }
    },
    dispose() {
      disposed = true;
      cancelAmbient();
      releaseFrame?.();
      observer?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", handlePointer);
      preference.removeEventListener("change", requestUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
      void kernel.shutdown().finally(() => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
      });
    },
  };
}
