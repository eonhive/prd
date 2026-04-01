# PRD_PACKAGE_LAYOUT_DRAFT.md
_Last updated: March 22, 2026_  
_Status: Package layout draft v0.1_

## 1. Package Philosophy

The PRD package layout should be:

- canonical enough for humans and tools to understand quickly
- portable across platforms and runtimes
- shallow by default
- neutral about implementation language or product stack
- flexible enough for both small and large works

The layout must support:

- content
- assets
- attachments
- metadata
- snapshots
- optional protected/private material

The layout must not force large-work structure onto tiny packages, and it must not make protected or premium features mandatory in the base path.

---

## 2. Canonical Layout

The canonical PRD package layout is:

```text
<package>.prd
├── manifest.json
├── content/
├── assets/
├── attachments/
├── metadata/
├── snapshots/
└── protected/
```

Interpretation:

- `manifest.json` is the package control file and remains at the archive root
- `content/` is the canonical default home for public entry content
- `assets/` holds declared media and reusable packaged resources
- `attachments/` holds declared bundled attachments
- `metadata/` holds supplemental public metadata files that do not belong inline in the base manifest
- `snapshots/` holds static fallbacks such as print-safe or safe-mode outputs
- `protected/` holds optional protected/private payloads or protected sub-manifests

This is the canonical default layout, not a license for deep required nesting.

---

## 3. Required Files/Folders

The canonical layout requires only:

1. `manifest.json`
   - MUST exist at the archive root
   - MUST remain the manifest entry point for the package

Required root folders:

- none

Rationale:

- the minimal valid PRD remains intentionally small
- a package may legally contain only `manifest.json` plus the one declared entry file
- this draft defines the canonical default layout for authored packages, not a larger mandatory baseline for all valid PRDs

---

## 4. Optional Files/Folders

The canonical optional folders are:

| Path | Purpose |
| --- | --- |
| `content/` | public primary content and additional public content units |
| `assets/` | images, audio, video, fonts, thumbnails, and other declared resources |
| `attachments/` | bundled attachment files that travel with the package |
| `metadata/` | supplemental public metadata files, indexes, or light structured sidecars |
| `snapshots/` | static fallback files such as HTML or PDF snapshots |
| `protected/` | optional protected/private content or metadata declared by the manifest |

Optional file/folder rules:

- `content/` SHOULD be the default location for the manifest `entry` target in canonical packages
- `assets/`, `attachments/`, `metadata/`, `snapshots/`, and `protected/` MAY be absent
- `protected/` MUST never be required for the base open path
- `snapshots/` SHOULD be optional and used only when a profile, workflow, or fallback need exists
- package authors MAY add subdirectories inside these folders for organization, especially in large works

---

## 5. Naming Rules

Package naming and path rules:

- use forward-slash relative paths in manifest references
- do not use absolute paths
- do not use `..` path traversal
- keep folder names stable and semantic
- prefer lowercase ASCII names with hyphen-separated words
- avoid platform-specific filename assumptions
- avoid using filenames that differ only by case

Canonical naming guidance:

- root control file: `manifest.json`
- primary content default: `content/root.json` or another clearly named structured entry file
- snapshots: descriptive names such as `snapshots/default.html` or `snapshots/default.pdf`
- protected area: `protected/` as the reserved top-level directory

These rules are for portability, not branding.

---

## 6. Portability Notes

Portability rules for the canonical layout:

- the package should remain understandable when unpacked as normal files and folders
- no folder should depend on platform-specific filesystem features
- the base open path should work without `attachments/`, `snapshots/`, or `protected/`
- external assets or linked attachments should not replace the packaged base content path
- `snapshots/` should provide optional fallback value, not a second hidden primary content model
- `protected/` should remain layered so the public/header path still identifies and opens the package safely
- large works may segment content under `content/` and assets under `assets/`, but tiny packages should not be forced to mirror that depth

Implementation-neutral rule:

This layout says where package materials live. It does not prescribe authoring tools, viewer internals, rendering engines, or Cloud behavior.

---

## 7. Example Trees

### 7.1 Small package

```text
hello-prd/
├── manifest.json
└── content/
    └── root.json
```

### 7.2 Large package

```text
field-manual/
├── manifest.json
├── content/
│   ├── root.json
│   ├── chapters/
│   │   ├── chapter-01.json
│   │   └── chapter-02.json
│   └── appendices/
│       └── appendix-a.json
├── assets/
│   ├── cover.webp
│   ├── figures/
│   │   ├── fig-01.png
│   │   └── fig-02.png
│   └── fonts/
│       └── reading-sans.woff2
├── attachments/
│   └── checklist.pdf
├── metadata/
│   └── toc.json
├── snapshots/
│   ├── default.html
│   └── print.pdf
└── protected/
    └── manifest.json
```

The large-package example shows scale, not additional mandatory structure.
