# Runtime Conformance Fixtures

This tree holds validator-valid runtime conformance fixtures for the current reference viewer baseline.

- The expected results live in `runtime-conformance-manifest.json`.
- These fixtures are separate from `examples/conformance/`, which remains the invalid-package fixture tree.
- The canonical fully-supported fixtures still reuse `examples/document-basic/`, `examples/comic-basic/`, and `examples/storyboard-basic/`.
- `general-document-required-capability` and `general-document-required-capability-array` are validator-valid packages requiring an unsupported capability through the object and legacy-array forms. The reference viewer must report `unsupported-required-capability` without reading or rendering their content entry.
- The object-form fixture includes a French alternate entry so web viewer checks can verify that localized presentation also respects the unsupported state.
- `general-document-required-extension` requires an unsupported renderer extension and includes a French alternate entry. It remains structurally valid but must not return/read content or allow locale/resource preparation.
- `general-document-optional-extension` declares the same unknown renderer as optional with an unknown version. Its structured base content remains fully supported. None of these fixtures claims a required extension handler exists.
- Seven version fixtures exercise supported `1.0.0` spellings/equal minimum viewer, unsupported future format/content/section/locale versions, a newer minimum viewer and an unrecognized minimum string. Every negative fixture remains structurally valid and expects the existing unsupported state with no render payload. The future-format fixture also declares an alternate locale to check the early opening boundary.
- The corpus now contains 16 fixtures. See `docs/core/PRD_VERSIONING_POLICY.md` for exact supported contracts, numeric comparison, legacy behavior and the distinction between structural validity and runtime support.
