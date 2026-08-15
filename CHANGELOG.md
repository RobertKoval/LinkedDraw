# Changelog

All notable changes are documented here.

## [Unreleased]

### Fixed

- Completed LinkedIn's native Save flow by closing only active cover dialogs after a stable published-image URL or LinkedIn's native return from `Edit image` to `Cover photo`.
- Rejected `blob:` URLs, rotating preview URLs, and unrelated Save dialogs as upload-completion evidence.

## [0.1.0] - 2026-08-12

### Added

- LinkedIn cover editor with pen, line, arrow, rectangle, text, eraser, color, width, and text-size controls.
- Full-scene undo/redo and local Clear-to-neutral behavior.
- Explicit native LinkedIn cover deletion in English and Ukrainian.
- Optional profile-photo and upper-right cover-control guides that are never exported.
- PNG/JPEG export at 1584×396 with a conservative size fallback.
- Chromium, Firefox, Safari-source, and localhost-only development builds.
- Popup, settings page, deterministic mock profile, release packaging, source archive, checksums, and unpacked Chromium E2E.
- MIT license, contribution/security/support policies, pinned GitHub Actions, and release documentation.

### Fixed

- Anchored Draw to LinkedIn's native cover control and hid it under the sticky navigation bar instead of letting it float across the page.
- Supported LinkedIn's two-step cover-upload menu/dialog flow in Safari.
- Made Clear reset the local canvas without immediately deleting the LinkedIn cover; Undo restores the complete scene.
- Scoped native file inputs, dialogs, preview evidence, and completion evidence to the active cover operation.
- Prevented late image decode/upload callbacks and navigation changes from acting on a closed editor.
- Removed dynamic extension `innerHTML`, trapped modal keyboard focus, reduced whole-document mutation observation, and reused the offscreen render layer.
- Removed unsupported Safari converter manifest fields.

### Security

- Restricted production injection and host permissions to LinkedIn profile/media origins.
- Validated original and redirected cover URLs.
- Rejected SVG and unsupported image types; streamed and cancelled oversized bodies before full buffering.
- Removed credentialed requests, remote code, analytics, telemetry, and private LinkedIn API paths.
- Hardened mock-server path containment and deterministic ZIP permissions/metadata.
- Made uncertain upload/delete outcomes fail safely or hand control back to the user.

### Validation

- Unit, security, lifecycle, localization, geometry, package-reproducibility, and source-archive tests.
- Mozilla `web-ext 10.6.0` lint with zero errors, notices, or warnings.
- Real unpacked Chromium mock test covering service worker/content script loading, editor interaction, Cancel preservation, and native generated-file handoff with a clean console/network result.
