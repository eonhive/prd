/**
 * Company: EonHive
 * Title: Manifest Schema Regression Tests
 * Purpose: Keep the published PRD manifest schema aligned with current example manifests and typed metadata lanes.
 * Author: Codex
 * Created: 2026-04-06
 * Updated: 2026-04-06
 * Notes: Vibe coded with Codex.
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ErrorObject, ValidateFunction } from "ajv";
import * as Ajv2020Module from "ajv/dist/2020.js";
import * as addFormatsModule from "ajv-formats";
import { beforeAll, describe, expect, it } from "vitest";
import type { PrdManifest } from "@eonhive/prd-types";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const addFormats = (
  addFormatsModule as unknown as { default: (ajv: unknown) => void }
).default;

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function formatSchemaErrors(errors?: ErrorObject[] | null): string {
  if (!errors || errors.length === 0) {
    return "Schema validation passed.";
  }

  return errors
    .map((error) => {
      const path = error.instancePath || "/";
      return `${path} ${error.message ?? "validation failed"}`;
    })
    .join("; ");
}

describe("manifest.schema.json", () => {
  let validateManifestSchema: ValidateFunction<unknown>;
  let documentManifest: PrdManifest;
  let segmentedDocumentManifest: PrdManifest;
  let resumeManifest: PrdManifest;
  let comicManifest: PrdManifest;
  let storyboardManifest: PrdManifest;

  beforeAll(async () => {
    const schema = await readJson<Record<string, unknown>>(
      join(repoRoot, "schemas/manifest.schema.json")
    );
    documentManifest = await readJson<PrdManifest>(
      join(repoRoot, "examples/document-basic/manifest.json")
    );
    segmentedDocumentManifest = await readJson<PrdManifest>(
      join(repoRoot, "examples/document-segmented-basic/manifest.json")
    );
    resumeManifest = await readJson<PrdManifest>(
      join(repoRoot, "examples/resume-basic/manifest.json")
    );
    comicManifest = await readJson<PrdManifest>(
      join(repoRoot, "examples/comic-basic/manifest.json")
    );
    storyboardManifest = await readJson<PrdManifest>(
      join(repoRoot, "examples/storyboard-basic/manifest.json")
    );

    const ajv = new Ajv2020Module.Ajv2020({
      allErrors: true,
      strict: false
    });
    addFormats(ajv);
    validateManifestSchema = ajv.compile(schema);
  });

  it("accepts representative example manifests", () => {
    for (const manifest of [
      documentManifest,
      segmentedDocumentManifest,
      resumeManifest,
      comicManifest,
      storyboardManifest
    ]) {
      expect(
        validateManifestSchema(manifest),
        formatSchemaErrors(validateManifestSchema.errors)
      ).toBe(true);
    }
  });

  it("requires canonical top-level manifest fields", () => {
    const requiredFields = [
      "prdVersion",
      "manifestVersion",
      "id",
      "profile",
      "title",
      "entry"
    ] as const;

    for (const field of requiredFields) {
      const manifest = structuredClone(documentManifest) as Record<string, unknown>;
      delete manifest[field];

      expect(
        validateManifestSchema(manifest),
        formatSchemaErrors(validateManifestSchema.errors)
      ).toBe(false);
      expect(
        validateManifestSchema.errors?.some(
          (error) =>
            error.instancePath === "" &&
            error.keyword === "required" &&
            error.params.missingProperty === field
        )
      ).toBe(true);
    }
  });

  it("rejects non-string public.cover values", () => {
    const manifest = structuredClone(resumeManifest);
    manifest.public = {
      ...manifest.public,
      cover: 42 as never
    };

    expect(
      validateManifestSchema(manifest),
      formatSchemaErrors(validateManifestSchema.errors)
    ).toBe(false);
    expect(
      validateManifestSchema.errors?.some(
        (error) => error.instancePath === "/public/cover"
      )
    ).toBe(true);
  });

  it("rejects contributors missing a required name", () => {
    const manifest = structuredClone(resumeManifest);
    manifest.public = {
      ...manifest.public,
      contributors: [
        {
          role: "author"
        } as never
      ]
    };

    expect(
      validateManifestSchema(manifest),
      formatSchemaErrors(validateManifestSchema.errors)
    ).toBe(false);
    expect(
      validateManifestSchema.errors?.some(
        (error) =>
          error.instancePath === "/public/contributors/0" &&
          error.keyword === "required" &&
          error.params.missingProperty === "name"
      )
    ).toBe(true);
  });

  it("rejects contributors missing a required role", () => {
    const manifest = structuredClone(resumeManifest);
    manifest.public = {
      ...manifest.public,
      contributors: [
        {
          name: "Avery Example"
        } as never
      ]
    };

    expect(
      validateManifestSchema(manifest),
      formatSchemaErrors(validateManifestSchema.errors)
    ).toBe(false);
    expect(
      validateManifestSchema.errors?.some(
        (error) =>
          error.instancePath === "/public/contributors/0" &&
          error.keyword === "required" &&
          error.params.missingProperty === "role"
      )
    ).toBe(true);
  });

  it("rejects empty identity authorRefs entries", () => {
    const manifest = structuredClone(resumeManifest);
    manifest.identity = {
      ...manifest.identity,
      authorRefs: ["author:avery-example", ""]
    };

    expect(
      validateManifestSchema(manifest),
      formatSchemaErrors(validateManifestSchema.errors)
    ).toBe(false);
    expect(
      validateManifestSchema.errors?.some(
        (error) => error.instancePath === "/identity/authorRefs/1"
      )
    ).toBe(true);
  });

  it("rejects non-positive collection or series sequence numbers", () => {
    const manifest = structuredClone(comicManifest);
    manifest.identity = {
      series: {
        ref: "urn:prd-series:test:sequential-dawn",
        sequence: {
          issue: 0
        }
      }
    };

    expect(
      validateManifestSchema(manifest),
      formatSchemaErrors(validateManifestSchema.errors)
    ).toBe(false);
    expect(
      validateManifestSchema.errors?.some(
        (error) => error.instancePath === "/identity/series/sequence/issue"
      )
    ).toBe(true);
  });

  it("rejects public.series without a required title", () => {
    const manifest = structuredClone(comicManifest);
    manifest.public = {
      ...manifest.public,
      series: {} as never
    };

    expect(
      validateManifestSchema(manifest),
      formatSchemaErrors(validateManifestSchema.errors)
    ).toBe(false);
    expect(
      validateManifestSchema.errors?.some(
        (error) =>
          error.instancePath === "/public/series" &&
          error.keyword === "required" &&
          error.params.missingProperty === "title"
      )
    ).toBe(true);
  });

  it("rejects object-shaped asset groups", () => {
    const manifest = structuredClone(documentManifest);
    manifest.assets = {
      cover: "assets/images/cover.svg"
    } as never;

    expect(
      validateManifestSchema(manifest),
      formatSchemaErrors(validateManifestSchema.errors)
    ).toBe(false);
    expect(
      validateManifestSchema.errors?.some((error) => error.instancePath === "/assets")
    ).toBe(true);
  });

  it("rejects external asset URL href values", () => {
    const manifest = structuredClone(documentManifest);
    manifest.assets = [
      {
        id: "cover",
        href: "https://cdn.example.com/cover.svg",
        type: "image/svg+xml"
      }
    ];

    expect(
      validateManifestSchema(manifest),
      formatSchemaErrors(validateManifestSchema.errors)
    ).toBe(false);
    expect(
      validateManifestSchema.errors?.some(
        (error) => error.instancePath === "/assets/0/href"
      )
    ).toBe(true);
  });
});
