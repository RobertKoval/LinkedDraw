# Release guide

## 1. Preconditions

- Use a clean checkout with Node.js 20 or newer.
- Do not release from a tree containing credentials, signed media URLs, private DOM dumps, personal screenshots, or Apple signing material.
- Update `package.json`, `CHANGELOG.md`, and store copy together when the version changes. Browser manifests inherit the package version during build.
- Complete the relevant live-browser rows in `MANUAL_TEST_MATRIX.md`; deterministic checks do not prove compatibility with the current LinkedIn DOM.

## 2. Build the candidate

```bash
npm ci --ignore-scripts
npm audit --audit-level=high
npm run release
```

`npm run release` cleans generated output, parses every JavaScript and shell file, runs unit/security/package tests, builds and verifies all browser manifests, and writes deterministic archives without downloading third-party build code.

Expected files:

```text
artifacts/linked-draw-chromium-<version>.zip
artifacts/linked-draw-firefox-<version>.zip
artifacts/linked-draw-safari-source-<version>.zip
artifacts/linked-draw-source-<version>.zip
artifacts/linked-draw-source-<version>.zip.sha256
artifacts/SHA256SUMS.txt
```

Verify on macOS:

```bash
unzip -t artifacts/linked-draw-chromium-*.zip
unzip -t artifacts/linked-draw-firefox-*.zip
unzip -t artifacts/linked-draw-safari-source-*.zip
(cd artifacts && shasum -a 256 -c SHA256SUMS.txt)
(cd artifacts && shasum -a 256 -c linked-draw-source-*.zip.sha256)
```

Extension ZIPs must contain `manifest.json` at the archive root. None of the ZIPs may contain `.git`, `node_modules`, local environment files, signing files, logs, Finder metadata, or source maps.

## 3. Chromium stores

The Chromium ZIP is the unsigned upload package for Chrome Web Store and compatible Chromium stores.

1. Load the exact `dist/chrome` candidate unpacked and test popup, options, editor, Cancel, manual handoff, and Save on the owner's LinkedIn profile.
2. Confirm the permission prompt contains only settings storage and the documented LinkedIn hosts.
3. Use personal-data-free screenshots generated from the mock page.
4. Upload `linked-draw-chromium-<version>.zip` to the store dashboard.
5. Complete store privacy disclosures from `PRIVACY.md`; do not claim data collection that does not exist or omit declared host access.
6. After store processing, install the store-signed version and repeat a smoke test. The uploaded ZIP is not the final store-signed artifact.

The ZIP is also the starting package for Edge Add-ons. Each store has its own review and signing step.

## 4. Firefox signing and publication

```bash
npm run build:firefox
npm run compat:firefox
```

The compatibility command is optional and networked. It downloads the exact top-level `web-ext` version shown in `package.json`, while npm resolves its transitive tooling at execution time. Run it only against this project's trusted generated package; Mozilla performs the authoritative validation and signing after upload.

1. Load `dist/firefox/manifest.json` through `about:debugging` and test the exact candidate.
2. Upload `linked-draw-firefox-<version>.zip` to Mozilla Add-ons for signing, either as a listed extension or an unlisted self-distributed build.
3. If Mozilla requests source, provide `linked-draw-source-<version>.zip` plus its checksum and the build commands above.
4. Install and retest the signed XPI. Firefox does not permanently install an unsigned release ZIP in normal desktop Firefox.

Do not change the Gecko extension ID after publication; it anchors future updates.

## 5. Safari source build

Safari distribution requires macOS, Xcode, Apple signing, and a containing app:

```bash
npm run safari:convert
open build/safari/LinkedDraw/LinkedDraw.xcodeproj
```

In Xcode:

1. Select the intended Apple developer team for both the app and extension targets.
2. Confirm unique bundle identifiers and the deployment target.
3. Build and run the containing app.
4. Enable LinkedDraw under **Safari → Settings → Extensions** and grant LinkedIn access.
5. Run the Safari mock and live checks.
6. For distribution, use Xcode Archive and the chosen Apple channel. The repository and Safari source ZIP intentionally contain no certificates, provisioning profiles, notarization credentials, or signed app.

For local ad-hoc development without an Apple team, set both targets to `Sign to Run Locally` with Team `None`. In Safari 17, enable **Settings → Advanced → Show features for web developers**, then **Settings → Developer → Allow unsigned extensions** before running the app. Safari resets this option whenever it quits; while it is off, the registered extension is intentionally absent from Safari's Extensions list.

For a local unsigned compile check:

```bash
xcodebuild \
  -project build/safari/LinkedDraw/LinkedDraw.xcodeproj \
  -scheme LinkedDraw \
  -configuration Release \
  -derivedDataPath /tmp/linked-draw-derived-data \
  CODE_SIGNING_ALLOWED=NO \
  build
```

## 6. Release record

Record the version, Git commit, Node/browser/macOS/Xcode versions, LinkedIn languages tested, artifact SHA-256 values, and known limitations in the GitHub release notes. Keep the previous signed/store version available until the new signed build has passed an installation smoke test.

If LinkedIn changes its DOM, prefer a narrow adapter fix or conservative handoff. Never replace the visible flow with a private API or broaden permissions to hide a selector failure.
