# LinkedDraw

LinkedDraw is a local-first browser extension for drawing directly on your LinkedIn profile cover. It exports a 1584×396 PNG or JPEG and passes the generated file to LinkedIn's visible upload dialog.

It supports Chromium browsers, Firefox desktop, and Safari on macOS from one plain-JavaScript codebase. The extension has no backend, telemetry, remote code, or LinkedIn private API integration.

## Features

- Pen, line, arrow, rectangle, text, and eraser tools.
- Color, stroke width, text size, undo, redo, and clear.
- Optional profile-photo and cover-control guides that are never exported.
- Current-cover composition with a safe neutral fallback.
- Explicit English and Ukrainian UI.
- Conservative LinkedIn upload/delete handoff with a local-download fallback.
- Keyboard focus trapping and shortcuts inside the editor.
- Minimal permissions: local settings plus LinkedIn/LinkedIn-media hosts.

LinkedDraw keeps logical drawing objects while the editor is open, so Clear and Undo operate on the complete local scene. A flattened cover that was previously uploaded cannot be converted back into editable objects.

## Build and verify

Requirements: Node.js 20 or newer.

```bash
npm ci --ignore-scripts
npm run check
```

Production code and deterministic build/test scripts have no third-party dependencies. `npm run compat:firefox` is an optional networked compatibility check: its script command pins the top-level Mozilla `web-ext` version, but transitive tools are resolved at execution time and are not part of the release build.

## Install for development

### Chrome, Edge, Brave, and other Chromium browsers

```bash
npm run build:chrome
```

Open the browser's extensions page, enable Developer mode, choose **Load unpacked**, and select `dist/chrome`.

### Firefox

```bash
npm run build:firefox
```

Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/firefox/manifest.json`. Temporary add-ons disappear when Firefox closes; permanent installation requires Mozilla signing.

### Safari

Safari requires macOS and Xcode:

```bash
npm run safari:convert
open build/safari/LinkedDraw/LinkedDraw.xcodeproj
```

For an Apple-signed development build, select your development team for both targets in Xcode, then build and run the containing app. For a local ad-hoc build (`Sign to Run Locally`, Team `None`), Safari 17 requires **Safari → Settings → Advanced → Show features for web developers**, then **Developer → Allow unsigned extensions**. Safari resets that option whenever it quits, so enable it again before running the app. LinkedDraw will then appear under **Safari → Settings → Extensions**, where you can enable it and allow access to LinkedIn. The generated Xcode wrapper is local build output and is not committed.

## Unpacked Chromium E2E

The E2E test loads the real `dist/dev` extension, opens the bundled mock profile, draws, clears/undoes, cancels without changing the cover, reopens, and verifies a generated `File` reaches the native mock dialog.

```bash
python3 -m pip install -r requirements-e2e.txt
python3 -m playwright install chromium
npm run e2e:chromium
```

Use `npm run screenshots` to write a personal-data-free editor screenshot to `artifacts/store/`.

## Release archives

```bash
npm run release
```

This runs all deterministic checks and reproducibility tests, then creates:

```text
artifacts/linked-draw-chromium-<version>.zip
artifacts/linked-draw-firefox-<version>.zip
artifacts/linked-draw-safari-source-<version>.zip
artifacts/linked-draw-source-<version>.zip
artifacts/SHA256SUMS.txt
```

The Chromium and Firefox ZIPs have `manifest.json` at their root and are intended for store submission. The Safari ZIP is WebExtension source for Xcode conversion, not a signed app.

See [the release guide](docs/RELEASE.md) for exact Chrome Web Store, Firefox signing, and Safari/Xcode steps.

## Security and privacy

LinkedDraw uses LinkedIn's visible DOM and file input only. It does not read cookies, tokens, messages, contacts, or unrelated pages. Current-cover image requests are credential-free, redirect-validated, restricted to LinkedIn media hosts, limited to supported raster formats, and streamed under a fixed byte ceiling.

Read [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) before publishing a modified build.

## Project structure

```text
src/extension/   shared browser-extension source
manifests/       base manifest and browser patches
scripts/         build, verification, packaging, mock, Safari conversion
tests/           unit, security, packaging, and optional Chromium E2E tests
dev/mock-site/   deterministic LinkedIn-like profile fixture
docs/            architecture, release, status, and manual checks
```

## Contributing and license

Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). LinkedDraw is licensed under the [MIT License](LICENSE).

LinkedIn is a trademark of LinkedIn Corporation. LinkedDraw is an independent project and is not affiliated with or endorsed by LinkedIn.
