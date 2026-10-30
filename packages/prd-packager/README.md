# @eonhive/prd-packager

Build `.prd` packages from validated source directories. These examples describe the repository build; the container/signing APIs and directory limit options are queued for the normal Changesets release.

```ts
import { packDirectoryToBuffer, packDirectoryToFile } from "@eonhive/prd-packager";

// Existing calls keep ordinary ZIP output for compatibility with older readers.
const zip = await packDirectoryToBuffer("./my-document");
await packDirectoryToFile("./my-document", "./my-document.prd");

// Opt in to the 16-byte PRD 1.0 header followed by ZIP payload.
await packDirectoryToFile("./my-document", "./identified.prd", { container: "prd" });

// Apply one explicit policy to directory loading and emitted archive checks.
const bounded = await packDirectoryToBuffer("./my-document", {
  limits: { maxFileBytes: 8 * 1024 * 1024, maxExpandedBytes: 32 * 1024 * 1024, maxEntries: 1000 }
});
```

`PrdPackOptions` contains optional `container: "zip" | "prd"` (default `zip`) and `limits: Partial<PrdArchiveLimits>`. Source directories use the validator's shared bounded Node reader: 32 MiB per file, 128 MiB total file bytes and 10,000 visited entries by default. The same byte/count overrides apply to emitted archive checks; `maxArchiveBytes` (64 MiB default) applies only to the output archive. Directory entry counts include visited folders and skipped entries, while archive counts include actual ZIP members. These are configurable reference policies, not format-wide maxima. CLI commands inherit defaults without adding budget flags.

Functions validate and package one collected file snapshot and apply the shared archive safety policy before emitting bytes. Metadata rejects oversized source files before data reads, and bounded actual-byte checks also catch growth after stat. Dotfiles and non-file/non-directory entries remain excluded from package contents. Source must contain a valid root `manifest.json` and its referenced content/resources. Source budget/I/O failures throw the Node reader's `PrdDirectoryError` before output creation or replacement. Stable source trees are required; this is not an atomic filesystem snapshot or process-memory ceiling.

The PRD header provides identification, version, zero reserved flags and exact payload length. It is not a digital signature or integrity proof. Legacy ZIP remains supported. Container and manifest versions are independent.

See [container format](../../docs/core/PRD_CONTAINER_FORMAT.md) for byte layout, reader budgets, error codes and compatibility, and [package layout](../../docs/core/PRD_PACKAGE_LAYOUT_DRAFT.md) for the logical file tree.

## Optional archive signing (Node)

```ts
import { signPrdArchive } from "@eonhive/prd-packager/signing";

const { archive, keyId } = await signPrdArchive(unsignedArchiveBytes, privateKeyPem);
```

Uses a caller-provided unencrypted Ed25519 private key, adds the optional signature declaration, covers every logical file except signature metadata and self-verifies the result. Input bytes stay unchanged; ZIP/envelope transport is preserved. Invalid input, existing signatures and placeholder object-form extensions are refused. Output keys are fingerprints of public material, never private-key bytes. Keep private keys outside package source directories.

See [signature-v1 contract](../../docs/extensions/PRD_SIGNATURE_V1.md) for exact message encoding, coverage exclusions and public-key trust. This API does not manage keys or bind a key to a publisher identity.

MIT licensed.

## Browser and in-memory packaging

`import { packPackageFiles } from "@eonhive/prd-packager/browser"` accepts a `PrdFileMap` and optional `{ container: "zip" | "prd" }`, returning archive bytes synchronously. This entry imports no Node filesystem module. It shares canonical validation, ZIP/envelope writing and final bounded archive checks with `packDirectoryToBuffer`; existing directory/file APIs remain unchanged. Execute larger browser jobs in a worker. See [Convert Web architecture](../../docs/architecture/PRD_CONVERT_WEB.md). This additive export is repository functionality pending release.
