import {
  type PrdGeneralDocumentRoot,
  type PrdOpenedDocument,
  type PrdPackageReader,
  type PrdManifest,
  getProfileDisplayLabel,
  isHtmlEntryPath,
  isJsonEntryPath,
  normalizeProfileId
} from "@prd/types";

function parseGeneralDocumentEntry(entryText: string): PrdGeneralDocumentRoot {
  return JSON.parse(entryText) as PrdGeneralDocumentRoot;
}

export async function openPrdDocument(
  packageReader: PrdPackageReader
): Promise<PrdOpenedDocument> {
  const manifestText = await packageReader.readText("manifest.json");
  const manifest = JSON.parse(manifestText) as PrdManifest;
  const profileInfo = normalizeProfileId(manifest.profile);
  const normalizedManifest = {
    ...manifest,
    profile: profileInfo.normalized
  };

  if (profileInfo.normalized === "comic" || profileInfo.normalized === "storyboard") {
    return {
      manifest: normalizedManifest,
      profileInfo,
      supportState: "reserved-profile",
      entryPath: normalizedManifest.entry,
      localization: normalizedManifest.localization,
      message: `${getProfileDisplayLabel(
        profileInfo.normalized
      )} is recognized by the architecture, but specialized rendering is not implemented in the reference viewer yet.`
    };
  }

  if (
    profileInfo.normalized === "general-document" &&
    isJsonEntryPath(normalizedManifest.entry)
  ) {
    const entryDocument = parseGeneralDocumentEntry(
      await packageReader.readText(normalizedManifest.entry)
    );

    return {
      manifest: normalizedManifest,
      profileInfo,
      supportState: "fully-supported",
      entryPath: normalizedManifest.entry,
      entryDocument,
      localization: normalizedManifest.localization
    };
  }

  if (!isHtmlEntryPath(normalizedManifest.entry)) {
    return {
      manifest: normalizedManifest,
      profileInfo,
      supportState: "unsupported-required-capability",
      entryPath: normalizedManifest.entry,
      localization: normalizedManifest.localization,
      message: "The current reference viewer only renders HTML entry paths."
    };
  }

  const entryHtml = await packageReader.readText(normalizedManifest.entry);

  return {
    manifest: normalizedManifest,
    profileInfo,
    supportState:
      profileInfo.normalized === "general-document" ||
      profileInfo.normalized === "resume"
        ? "fully-supported"
        : "safe-mode",
    entryPath: normalizedManifest.entry,
    entryHtml,
    localization: normalizedManifest.localization
  };
}
