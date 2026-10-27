/*
 * Company: EonHive Inc. | Title: Living Homepage Model
 * Purpose: Sample reversible document transformations independently of document content.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

export const livingChapters = [
  { id: "awakening", label: "Awakening", word: "Paper" },
  { id: "responsive", label: "Responsive", word: "Responsive" },
  { id: "structure", label: "Structure", word: "Structured" },
  { id: "profiles", label: "Profiles", word: "Expressive" },
  { id: "viewer", label: "Viewer", word: "Interactive" },
  { id: "portable", label: "Portable", word: "Portable" },
] as const;

export type MotionIntensity = "full" | "subtle" | "off";
export type RenderingQuality = "auto" | "high" | "low";
export type DemoDevice = "desktop" | "tablet" | "mobile";
export const livingProfileOrder = ["document", "report", "resume", "comic", "storyboard", "magazine"] as const;
export type DemoProfile = typeof livingProfileOrder[number];

export function getProfileForKey(profile: DemoProfile, key: string): DemoProfile | undefined {
  if (key === "Home") return livingProfileOrder[0];
  if (key === "End") return livingProfileOrder[livingProfileOrder.length - 1];
  if (key !== "ArrowLeft" && key !== "ArrowRight") return undefined;
  const direction = key === "ArrowRight" ? 1 : -1;
  const index = livingProfileOrder.indexOf(profile);
  return livingProfileOrder[(index + direction + livingProfileOrder.length) % livingProfileOrder.length];
}

export interface DocumentPose {
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  spread: number;
  scale: number;
}

const poses: readonly DocumentPose[] = [
  { rotateX: 8, rotateY: -19, rotateZ: -8, spread: 0, scale: 0.91 },
  { rotateX: 0, rotateY: 0, rotateZ: 0, spread: 0, scale: 1 },
  { rotateX: 24, rotateY: -26, rotateZ: -8, spread: 1, scale: 0.84 },
  { rotateX: 0, rotateY: -8, rotateZ: 3, spread: 0, scale: 0.95 },
  { rotateX: 0, rotateY: 0, rotateZ: 0, spread: 0, scale: 1 },
  { rotateX: 8, rotateY: -17, rotateZ: -7, spread: 0.08, scale: 0.84 },
];

export function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function getChapterPosition(
  scrollY: number,
  starts: readonly number[],
): number {
  if (starts.length < 2 || scrollY <= (starts[0] ?? 0)) return 0;
  for (let index = 0; index < starts.length - 1; index++) {
    const start = starts[index]!;
    const end = starts[index + 1]!;
    if (scrollY < end)
      return (
        index + clampProgress((scrollY - start) / Math.max(1, end - start))
      );
  }
  return starts.length - 1;
}

export function sampleDocumentPose(position: number): DocumentPose {
  const bounded = Math.max(0, Math.min(poses.length - 1, position));
  const index = Math.floor(bounded);
  const from = poses[index]!;
  const to = poses[Math.min(index + 1, poses.length - 1)]!;
  const progress = bounded - index;
  const eased = progress * progress * (3 - 2 * progress);
  const mix = (key: keyof DocumentPose) =>
    from[key] + (to[key] - from[key]) * eased;
  return {
    rotateX: mix("rotateX"),
    rotateY: mix("rotateY"),
    rotateZ: mix("rotateZ"),
    spread: mix("spread"),
    scale: mix("scale"),
  };
}

export function resolveRenderingQuality(
  requested: RenderingQuality,
  capabilities: {
    width: number;
    cores: number;
    memory?: number;
    saveData?: boolean;
  },
): "high" | "low" {
  if (requested !== "auto") return requested;
  return capabilities.width < 760 ||
    capabilities.cores <= 4 ||
    (capabilities.memory !== undefined && capabilities.memory <= 4) ||
    capabilities.saveData
    ? "low"
    : "high";
}

export function getCanonicalDemoProfile(
  profile: DemoProfile,
): "general-document" | "comic" | "storyboard" {
  return profile === "comic" || profile === "storyboard"
    ? profile
    : "general-document";
}
