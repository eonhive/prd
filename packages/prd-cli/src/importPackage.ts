/**
 * Company: EonHive Inc. | Title: Shared Import Package Output
 * Purpose: Serialize canonical PRD files and share directory writes without changing importer semantics.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  PrdAssetDeclaration, PrdComicRoot, PrdGeneralDocumentRoot, PrdManifest, PrdStoryboardRoot
} from "@eonhive/prd-types";

export const IMPORT_ENTRY_PATH = "content/root.json";

export interface ImportPackageFile {
  path: string;
  contents: string | Uint8Array;
}

export function createImportPackageFiles(options: {
  id: string;
  title: string;
  content: PrdGeneralDocumentRoot | PrdComicRoot | PrdStoryboardRoot;
  assets: PrdAssetDeclaration[];
}): ImportPackageFile[] {
  const manifest: PrdManifest = {
    prdVersion: "1.0",
    manifestVersion: "1.0",
    id: options.id,
    profile: options.content.profile,
    title: options.title,
    entry: IMPORT_ENTRY_PATH,
    ...(options.assets.length > 0 ? { assets: options.assets } : {})
  };
  return [
    { path: "manifest.json", contents: `${JSON.stringify(manifest, null, 2)}\n` },
    { path: IMPORT_ENTRY_PATH, contents: `${JSON.stringify(options.content, null, 2)}\n` }
  ];
}

async function assertTargetIsWritable(targetDir: string): Promise<void> {
  try {
    const targetStat = await stat(targetDir);
    if (!targetStat.isDirectory()) throw new Error(`Target path is not a directory: ${targetDir}`);
    if ((await readdir(targetDir)).length > 0) throw new Error(`Target directory is not empty: ${targetDir}`);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      await mkdir(targetDir, { recursive: true });
      return;
    }
    throw error;
  }
}

function assertSafePaths(paths: string[]): void {
  const seen = new Set<string>();
  for (const path of paths) {
    if (!path || /[\\:\u0000-\u001f]/u.test(path) ||
      path.split("/").some((part) => part === "" || part === "." || part === "..")) {
      throw new Error(`Unsafe generated import path: ${JSON.stringify(path)}`);
    }
    if (seen.has(path)) throw new Error(`Duplicate generated import path: ${path}`);
    seen.add(path);
  }
  for (const path of paths) {
    const segments = path.split("/");
    segments.pop();
    while (segments.length > 0) {
      if (seen.has(segments.join("/"))) throw new Error("A generated import file path is also used as a directory.");
      segments.pop();
    }
  }
}

export async function writeImportPackage(
  targetDir: string,
  files: ReadonlyArray<ImportPackageFile>,
  resources: ReadonlyArray<{ href: string; sourcePath: string }> = []
): Promise<void> {
  assertSafePaths([...files.map((file) => file.path), ...resources.map((resource) => resource.href)]);
  await assertTargetIsWritable(targetDir);
  const directories = new Set([
    ...files.map((file) => dirname(file.path)),
    ...resources.map((resource) => dirname(resource.href))
  ]);
  for (const directory of directories) {
    if (directory !== ".") await mkdir(join(targetDir, directory), { recursive: true });
  }
  // Keep legacy copy/write ordering: adapters still own resource selection and canonical content.
  for (const resource of resources) await copyFile(resource.sourcePath, join(targetDir, resource.href));
  for (const file of files) {
    await writeFile(join(targetDir, file.path), file.contents, typeof file.contents === "string" ? "utf8" : undefined);
  }
}
