/*
 * Company: EonHive Inc.
 * Title: PRD CLI Init Scaffolder
 * Purpose: Create validator-valid starter PRD package directories.
 * Author: Stan Nesi
 * Created: May 23, 2026
 * Updated: May 23, 2026
 * Notes: Vibe coded with Codex.
 */

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const SUPPORTED_INIT_PROFILES = ["general-document", "comic", "storyboard"] as const;
const ENTRY_PATH = "content/root.json";

export type PrdInitProfile = (typeof SUPPORTED_INIT_PROFILES)[number];

export type PrdInitOptions = {
  targetDir: string;
  profile?: string;
  title?: string;
  id?: string;
};

export type PrdInitResult = {
  created: true;
  profile: PrdInitProfile;
  title: string;
  id: string;
  targetDir: string;
  entry: typeof ENTRY_PATH;
  files: string[];
};

export function isSupportedInitProfile(profile: string): profile is PrdInitProfile {
  return SUPPORTED_INIT_PROFILES.includes(profile as PrdInitProfile);
}

export async function initPrdPackage(options: PrdInitOptions): Promise<PrdInitResult> {
  const profile = options.profile ?? "general-document";
  if (!isSupportedInitProfile(profile)) {
    throw new Error(
      `Unsupported profile "${profile}". Supported profiles: ${SUPPORTED_INIT_PROFILES.join(", ")}.`
    );
  }

  const title = options.title ?? titleFromTargetDir(options.targetDir);
  const id = options.id ?? `urn:prd:local:${slugFromTitle(title)}`;

  await assertTargetIsWritable(options.targetDir);

  const files = buildPackageFiles({ profile, title, id });
  const directories = new Set(files.map((file) => file.path.split("/").slice(0, -1).join("/")));

  for (const directory of directories) {
    if (directory.length === 0) {
      continue;
    }

    await mkdir(join(options.targetDir, directory), { recursive: true });
  }

  for (const file of files) {
    await writeFile(join(options.targetDir, file.path), file.contents, "utf8");
  }

  return {
    created: true,
    profile,
    title,
    id,
    targetDir: options.targetDir,
    entry: ENTRY_PATH,
    files: files.map((file) => file.path)
  };
}

async function assertTargetIsWritable(targetDir: string): Promise<void> {
  try {
    const targetStat = await stat(targetDir);
    if (!targetStat.isDirectory()) {
      throw new Error(`Target path is not a directory: ${targetDir}`);
    }

    const entries = await readdir(targetDir);
    if (entries.length > 0) {
      throw new Error(`Target directory is not empty: ${targetDir}`);
    }
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      await mkdir(targetDir, { recursive: true });
      return;
    }

    throw error;
  }
}

function buildPackageFiles({
  profile,
  title,
  id
}: {
  profile: PrdInitProfile;
  title: string;
  id: string;
}): Array<{ path: string; contents: string }> {
  switch (profile) {
    case "comic":
      return [
        {
          path: "manifest.json",
          contents: json({
            prdVersion: "1.0",
            manifestVersion: "1.0",
            id,
            profile,
            title,
            entry: ENTRY_PATH,
            assets: [
              {
                id: "panel-1-art",
                href: "assets/panels/panel-1.svg",
                type: "image/svg+xml"
              }
            ]
          })
        },
        {
          path: ENTRY_PATH,
          contents: json({
            schemaVersion: "1.0",
            profile,
            type: "comic",
            id: slugFromTitle(title),
            title,
            panels: [
              {
                id: "panel-1",
                asset: "panel-1-art",
                alt: "Starter comic panel placeholder",
                caption: "Replace this starter panel with authored comic art."
              }
            ]
          })
        },
        {
          path: "assets/panels/panel-1.svg",
          contents: placeholderSvg("Panel 1", "#204261")
        }
      ];

    case "storyboard":
      return [
        {
          path: "manifest.json",
          contents: json({
            prdVersion: "1.0",
            manifestVersion: "1.0",
            id,
            profile,
            title,
            entry: ENTRY_PATH,
            assets: [
              {
                id: "frame-1-art",
                href: "assets/frames/frame-1.svg",
                type: "image/svg+xml"
              }
            ]
          })
        },
        {
          path: ENTRY_PATH,
          contents: json({
            schemaVersion: "1.0",
            profile,
            type: "storyboard",
            id: slugFromTitle(title),
            title,
            frames: [
              {
                id: "frame-1",
                asset: "frame-1-art",
                alt: "Starter storyboard frame placeholder",
                notes: "Replace this starter frame with authored storyboard art and notes."
              }
            ]
          })
        },
        {
          path: "assets/frames/frame-1.svg",
          contents: placeholderSvg("Frame 1", "#335b4a")
        }
      ];

    case "general-document":
      return [
        {
          path: "manifest.json",
          contents: json({
            prdVersion: "1.0",
            manifestVersion: "1.0",
            id,
            profile,
            title,
            entry: ENTRY_PATH
          })
        },
        {
          path: ENTRY_PATH,
          contents: json({
            schemaVersion: "1.0",
            profile,
            type: "document",
            id: slugFromTitle(title),
            title,
            children: [
              {
                type: "heading",
                level: 1,
                text: title
              },
              {
                type: "paragraph",
                text: "Start writing your PRD content here."
              }
            ]
          })
        }
      ];
  }
}

function titleFromTargetDir(targetDir: string): string {
  const baseName = basename(targetDir).trim();
  if (baseName.length === 0 || baseName === "." || baseName === "..") {
    return "Untitled PRD";
  }

  return baseName
    .split(/[-_\s]+/u)
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function slugFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

  return slug.length > 0 ? slug : "untitled-prd";
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function placeholderSvg(label: string, accent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" role="img" aria-label="${label}">
  <rect width="600" height="360" rx="28" fill="#f6f0df"/>
  <rect x="36" y="36" width="528" height="288" rx="22" fill="${accent}"/>
  <text x="300" y="190" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#f6f0df">${label}</text>
</svg>
`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
