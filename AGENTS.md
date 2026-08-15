# LinkedDraw — agent instructions

## Mission

Finish and release a small, local-first browser extension that lets the owner of a LinkedIn profile draw on the profile cover, then sends the generated image through LinkedIn's normal upload UI.

The repository is intentionally simple: plain JavaScript, plain HTML/CSS, Node standard-library scripts, and no runtime dependencies. Do not introduce a framework, bundler, package manager migration, or private LinkedIn API unless the user explicitly requests it.

## Read first

1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `docs/IMPLEMENTATION_STATUS.md`
4. `docs/MANUAL_TEST_MATRIX.md`

## Hard constraints

- Preserve all existing features unless a test proves they are broken.
- Do not replace working code with placeholders, TODO-only code, pseudocode, or a rewrite.
- Never use LinkedIn private endpoints, cookies, tokens, request replay, or reverse-engineered upload APIs.
- Use only LinkedIn's visible DOM and native file-upload flow.
- Keep permissions minimal. Never add `<all_urls>`, cookies, webRequest, debugger, history, or broad host permissions.
- No telemetry, analytics, remote scripts, CDN assets, external fonts, or data transmission outside LinkedIn.
- Validate every remote URL in the background fetch proxy before and after redirects.
- Do not add `eval`, `new Function`, inline executable script, or dynamically downloaded code.
- Do not commit generated `dist/`, `build/`, or release ZIP files.
- Do not change the extension ID, bundle identifier, author, license, or store metadata without asking.
- Do not create commits, tags, releases, or push anything unless the user explicitly asks after reviewing the diff.

## Required workflow for every code change

1. State the concrete defect or missing behavior in one sentence.
2. Inspect the smallest relevant files before editing.
3. Make the smallest coherent patch. Do not edit unrelated files.
4. Add or update a deterministic test when the changed logic can be tested without a real LinkedIn account.
5. Run:

   ```bash
   npm run syntax
   npm test
   npm run build
   npm run verify
   ```

6. If any command fails, fix it before continuing. Never claim success from an unrun command.
7. Report exactly:
   - files changed;
   - commands run and results;
   - manual browser checks still required;
   - any uncertainty caused by LinkedIn DOM behavior.

## Architecture invariants

- `src/extension/shared/*`: browser-neutral helpers and settings.
- `src/extension/content/*`: detection, editor UI, rendering, and native upload handoff.
- `src/extension/background/index.js`: restricted image fetch only.
- `src/extension/popup/*` and `options/*`: extension pages.
- `manifests/base.json` plus target patches generate browser-specific manifests.
- `scripts/build.mjs`: copies source and creates `dist/<target>`.
- `scripts/verify-dist.mjs`: release-policy gate; do not weaken it to make a build pass.
- `dev/mock-site/*`: deterministic fake LinkedIn page for smoke testing.

The content scripts are classic scripts loaded in manifest order and share `globalThis.LinkedDraw`. Preserve that model. Do not convert one file to ESM unless the whole loading path is deliberately migrated and verified in every browser.

## Browser targets

- Chromium family: Chrome, Edge, Brave; Manifest V3 service worker.
- Firefox desktop: Manifest V3 event-page background scripts.
- Safari macOS: Safari Web Extension source converted with Xcode tooling.

The Chromium package is also the Edge/Brave package. Safari conversion must happen on macOS with Xcode; do not fake a successful Xcode build on another OS.

## LinkedIn adapter rules

LinkedIn is a SPA and its DOM changes. Prefer layered detection:

1. known semantic selectors;
2. image/container geometry near the profile header;
3. an editable camera/edit control near the cover's upper-right corner;
4. localized accessible labels only as a score boost, never as the sole requirement.

Never hardcode one minified CSS class as the only selector. Any new selector must be additive and have a heuristic fallback.

A save operation must follow this sequence:

1. render 1584×396 output;
2. keep it under LinkedIn's 8 MB limit;
3. click the native cover edit control;
4. locate an image file input inside the newest visible dialog when possible;
5. assign a generated `File` and dispatch input/change events;
6. optionally click native Apply/Save buttons;
7. fall back to downloading the generated file if automation fails.

Do not silently report success. Use `success`, `handed-off`, or `failed` accurately.

## Completion definition

A release candidate exists only when:

- `npm run check` passes;
- `npm run package` produces three ZIP archives;
- Chromium passes the mock page and a real LinkedIn profile smoke test;
- Firefox passes the same tests;
- Safari is converted, built, enabled, and tested on macOS;
- the permissions and privacy text match actual behavior;
- unresolved LinkedIn DOM assumptions are written in `docs/IMPLEMENTATION_STATUS.md`.
