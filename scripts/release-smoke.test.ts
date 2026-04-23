/**
 * Company: EonHive Inc.
 * Title: Release Smoke Script Tests
 * Purpose: Verify packed manifest dependency checks for publishable PRD tarballs.
 * Author: Stan Nesi
 * Created: 2026-04-23
 * Updated: 2026-04-23
 * Notes: Vibe coded with Codex.
 */

import { describe, expect, it } from "vitest";
import { assertPackedManifestDependencyMetadata } from "./release-smoke.mjs";

describe("assertPackedManifestDependencyMetadata", () => {
  it("accepts packed manifests with concrete internal semver ranges", () => {
    expect(() =>
      assertPackedManifestDependencyMetadata("@eonhive/prd-cli", {
        dependencies: {
          "@eonhive/prd-packager": "^0.1.1",
          "@eonhive/prd-types": "^0.1.1",
          "@eonhive/prd-validator": "^0.1.1"
        }
      })
    ).not.toThrow();
  });

  it("fails when a packed manifest still contains workspace protocol dependencies", () => {
    expect(() =>
      assertPackedManifestDependencyMetadata("@eonhive/prd-validator", {
        dependencies: {
          "@eonhive/prd-types": "workspace:*"
        }
      })
    ).toThrow(/workspace protocol dependencies/);
  });

  it("fails when an internal dependency range is not concrete semver", () => {
    expect(() =>
      assertPackedManifestDependencyMetadata("@eonhive/prd-packager", {
        dependencies: {
          "@eonhive/prd-types": "latest",
          "@eonhive/prd-validator": "^0.1.1"
        }
      })
    ).toThrow(/non-semver internal dependency ranges/);
  });
});
