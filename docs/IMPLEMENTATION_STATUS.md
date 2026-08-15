# Implementation status

Last updated: 2026-08-15
Version: `0.1.0`
Status: open-source preview; deterministic packages and unpacked Chromium mock coverage are available, while cross-browser publication gates remain open.

## Verified behavior

- Unit, security, lifecycle, localization, geometry, packaging, and source-archive tests cover editor state, native target scoping, URL/image policy, bounded streaming, deterministic ZIP output, and browser-manifest policy.
- Mozilla `web-ext 10.6.0` reports zero errors, notices, or warnings for the Firefox build.
- An unpacked `dist/dev` build passed the real Chromium extension boundary using Playwright Chromium: content script and service worker loaded, the editor opened, focus wrapped and returned correctly, a pointer stroke was drawn, Clear/Undo worked, Cancel preserved the existing cover, reopen worked, a generated PNG reached the mock native file input, default auto-confirm saved the mock cover, and settings persisted/reset through extension storage. The canvas was 1584×396, the observed PNG was 440,699 bytes, and there were no console errors or failed HTTP responses.
- On macOS 14.5 with Xcode 16.2, Safari conversion and an Apple Development-signed Debug build succeeded. In Safari 17.5, the existing-cover flow reached LinkedIn's native Edit image preview with the generated file. Final auto-confirm, delete, and clean-install checks remain in the manual matrix.

## Security posture

- No cookies, credentials, authentication tokens, private LinkedIn endpoints, analytics, telemetry, or remote scripts.
- Production content injection is limited to LinkedIn profile paths; host access is limited to LinkedIn and LinkedIn-hosted media.
- Original and redirected image URLs are allowlisted. Only PNG/JPEG/WebP/AVIF responses are accepted, and streamed bodies are cancelled before exceeding the configured byte limit.
- SVG data URLs and SVG responses are rejected.
- Native file inputs and dialogs must belong to the active cover operation; uncertainty becomes `handed-off` or `failed`, never false success.
- Release ZIPs are deterministic and filter Finder metadata, generated files, source maps, local configuration, and signing material.

## Browser boundaries still requiring publication-time checks

1. Current authenticated LinkedIn DOM behavior in the exact Chrome/Firefox/Safari versions being published.
2. Store-signed Chromium and Mozilla-signed Firefox installation behavior.
3. Safari team selection, signing, enabling, website permission, and native upload/delete behavior in the generated Xcode app.
4. English and Ukrainian live LinkedIn labels for upload, Save/Apply, and Delete.

These are integration checks, not inferred from source review. Use `MANUAL_TEST_MATRIX.md` and record exact versions.

## Intentional limitations

- Previously uploaded flattened pixels cannot be reconstructed into editable objects. Objects remain editable only within the current editor session.
- Clear resets the local editor to a neutral background; it does not modify LinkedIn until Save.
- Delete cover is separate, explicitly confirmed, and delegates to LinkedIn's visible native UI.
- If LinkedIn changes its DOM or blocks file assignment, LinkedDraw downloads the generated image instead of losing the work.
- Auto-confirm is on by default; users can disable it when they want to review or cancel in LinkedIn's native editor.
