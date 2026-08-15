# Open-source release design

Date: 2026-08-12
Status: approved
License: MIT

## Goal

Prepare LinkedDraw as a reviewable, reproducible open-source browser extension with upload-ready Chromium and Firefox source packages, Safari WebExtension source, accurate build instructions, and explicit separation between deterministic checks and live-store/browser signing evidence.

## Chosen approach

Use focused release hardening. Preserve the dependency-free classic-script WebExtension architecture while fixing confirmed security, compatibility, accessibility, performance, packaging, and documentation defects. Do not introduce a bundler or a TypeScript migration before the first public release.

## Security boundaries

- Treat page DOM, image URLs, redirects, response metadata, response bodies, and decoded dimensions as untrusted.
- Allow production image fetches only from the exact LinkedIn/licdn HTTPS policy represented by the production manifest.
- Enable localhost only when the generated development manifest explicitly grants it.
- Bound remote and local image bodies while reading, not after buffering.
- Accept only the raster formats required for LinkedIn covers; allow the bundled SVG fixture only in development.
- Keep credentials omitted and revalidate redirects.
- Resolve mock-server paths with component-aware containment and do not expose permissive cross-origin reads.
- Eliminate dynamic `innerHTML` assignments from extension code.

## Functional design

- Keep pure policy, normalization, scene, geometry, result-classification, and archive functions separate from browser/DOM side effects.
- Model upload/delete outcomes as the closed set `success`, `handed-off`, and `failed`; unknown values are failures at the UI boundary.
- Keep immutable drawing/history values at module boundaries. Mutable DOM, canvas, and lifecycle state remains inside the imperative shell where the browser requires it.
- Preserve conservative native LinkedIn behavior: no private APIs, no cookie/token access, no false success, and a local download before generated work can be lost.

## Browser deliverables

- Chromium: deterministic ZIP with `manifest.json` at its root, suitable for Chrome Web Store upload and compatible Chromium stores.
- Firefox: deterministic AMO submission ZIP with a stable Gecko ID and compatible minimum version. A normal installable XPI remains Mozilla-signed output and cannot be produced without AMO authorization.
- Safari: deterministic WebExtension source ZIP plus a locally generated Xcode project for unsigned validation. No App Store publication is part of this release.
- Source: deterministic clean source ZIP licensed under MIT.

## Verification model

1. Node behavioral tests and syntax checks.
2. Generated-manifest and archive policy verification.
3. Mozilla `web-ext lint` with a pinned tool version.
4. Automated unpacked-Chromium E2E against the bundled mock, including extension context, drawing, native file handoff, popup/options, and clean console.
5. Safari conversion, unsigned Xcode build, and byte comparison between embedded extension resources and `dist/safari`.
6. Secret scanning and static security analysis.
7. Manual authenticated LinkedIn rows remain explicit until actually executed.

## Open-source repository

Initialize `main`, publish MIT terms, contribution and conduct guidance, private vulnerability-reporting guidance, least-privilege CI, issue/PR templates, release instructions, store copy, privacy disclosures, and reproducible checksums. Repository/homepage/security-advisory URLs are intentionally deferred until the user supplies the public remote.

## Non-goals

- Calling LinkedIn private or reverse-engineered APIs.
- Storing vector scenes across browser sessions in this release.
- Publishing or signing through Chrome, Mozilla, or Apple accounts.
- Claiming authenticated LinkedIn compatibility from mock tests.
- Rewriting the extension around a build framework solely for stylistic purity.
