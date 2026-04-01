# PRD_LOCALIZATION_MODEL.md
_Last updated: April 1, 2026_  
_Status: Localization model draft v0.1_

## 1. Purpose

This document defines the current PRD baseline for locale-aware behavior.

Its job is to make localization a standardizable cross-profile capability without turning every PRD into a heavy multilingual package or overloading the base manifest.

This is a format/spec document. It does not define product UX for Viewer, Studio, Cloud, SDK, Renderer, or PRDc.

---

## 2. Scope

This draft defines:

- the localization philosophy for PRD
- a lean manifest declaration surface
- what localization data stays outside the base manifest
- viewer fallback expectations
- validator implications

This draft applies across PRD profiles such as `general-document`, `comic`, and `storyboard`.

---

## 3. Non-goals

This draft does not define:

- a mandatory localization requirement for all PRD packages
- a full translation workflow
- a full i18n resource file format
- locale-specific package layout rules for every profile
- product-specific language-picker UX
- cloud translation services
- profile-specific localization payload schemas

---

## 4. Localization Philosophy

Localization in PRD is:

- cross-profile
- optional per package
- declarative at the manifest boundary
- payload-light at the base manifest layer
- compatible with graceful degradation

Localization is broader than viewport responsiveness.
It may affect language selection, region-sensitive formatting, text direction, localized metadata, or localized asset choice when a package declares that behavior.

Localization must not become a hidden requirement for minimal PRD validity.

**Assumptions**

- This draft uses one `localization` manifest object instead of multiple new top-level locale fields.
- Locale strings are assumed to follow BCP 47 style forms such as `en-US` or `fr-FR`, but exact grammar validation is still future work.
- Some profiles may later need more detailed per-locale or per-fragment rules than this draft defines.

---

## 5. Manifest Declaration Model

If a package declares localization, it should do so through a small `localization` object in the public manifest.

Current draft shape:

```json
{
  "localization": {
    "defaultLocale": "en-US",
    "availableLocales": ["en-US", "fr-FR", "ar-SA"],
    "textDirection": "ltr"
  }
}
```

Rules:

- `localization` is optional.
- `defaultLocale` is required when `localization` is present.
- `availableLocales` is optional, but when present it should include `defaultLocale`.
- `textDirection` is optional.
- `textDirection`, when present, should be one of `ltr`, `rtl`, or `auto`.
- localization declarations must stay small and declarative.
- localization declarations must not carry full translated content bodies or large per-locale resource maps.
- localization does not replace `profile`; it is separate from profile identity.

---

## 6. What Stays Outside The Manifest

The following should stay outside the base manifest:

- translated content bodies
- large locale-specific metadata payloads
- locale-specific binary assets
- translation memory or editorial workflow state
- product UI preferences
- cloud synchronization or machine-translation state

If a package includes localized resources, the manifest may declare the localization surface, but the actual payloads should live in normal package content or asset locations.

---

## 7. Viewer Negotiation And Fallback

When a package declares localization and a viewer supports locale-aware behavior, the viewer should negotiate in this order:

1. requested locale, if the user or environment provides one
2. exact available locale match
3. compatible same-language fallback when the package makes that mapping possible
4. `defaultLocale`
5. base open path with clear reporting if locale-specific selection cannot be honored

Rules:

- a viewer must not invent locale semantics the package does not declare
- missing localization support must not invalidate an otherwise valid package
- if localized behavior is unsupported, the viewer should still open the truthful base path when possible
- if the package declares `textDirection`, the viewer should honor it when supported or report restricted support clearly
- safe mode may ignore advanced locale-specific behavior, but it should preserve the declared public metadata and truthful base open path

---

## 8. Validator Implications

A validator implementing this draft should check at least the following:

1. if `localization` is present, it is an object
2. `defaultLocale` exists and is a non-empty string
3. `availableLocales`, when present, is an array of strings
4. `availableLocales`, when present, includes `defaultLocale`
5. `textDirection`, when present, is one of `ltr`, `rtl`, or `auto`
6. localization declarations remain in the public manifest rather than only in protected/private material
7. localization declarations do not replace required core fields such as `profile` or `entry`

Validators may warn when:

- a package declares localization but only one locale is listed redundantly
- locale strings appear malformed
- `textDirection` appears inconsistent with the package's declared locale set

---

## 9. Example

```json
{
  "prdVersion": "1.0",
  "manifestVersion": "1.0",
  "id": "urn:uuid:44444444-4444-4444-4444-444444444444",
  "profile": "general-document",
  "title": "Field Guide",
  "entry": "content/index.html",
  "localization": {
    "defaultLocale": "en-US",
    "availableLocales": ["en-US", "fr-FR"],
    "textDirection": "ltr"
  }
}
```

This example declares locale-aware behavior without forcing the manifest to carry the localized payloads themselves.

---

## 10. Open Questions

- Should PRD later define a standard in-package mapping format for locale-to-content resolution?
- Should `textDirection` remain package-wide or allow per-locale override in the base model?
- Should locale fallback mappings be explicitly declared rather than inferred?
- Which localized metadata fields, if any, should later receive standard names beyond the small base declaration above?
