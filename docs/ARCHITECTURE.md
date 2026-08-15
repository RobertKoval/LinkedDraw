# Architecture

## 1. Design goals

LinkedDraw is intentionally a small WebExtension rather than a web service or a LinkedIn API client. The architecture prioritizes:

1. one browser-neutral editor implementation;
2. minimum privileges;
3. no private LinkedIn protocol dependency;
4. safe degradation when LinkedIn changes its DOM;
5. deterministic local builds with a small, auditable toolchain;
6. explicit safe-failure states at browser and LinkedIn boundaries.

## 2. Runtime topology

```text
LinkedIn profile page
  │
  ├─ content scripts (shared global namespace)
  │    ├─ banner detector
  │    ├─ Shadow DOM UI
  │    ├─ editor + drawing history
  │    ├─ renderer/exporter
  │    └─ native upload adapter
  │
  ├─ extension background context
  │    └─ restricted LinkedIn image fetch proxy
  │
  ├─ popup
  │    └─ page status / open editor / options
  │
  └─ options page
       └─ persisted local settings
```

All classic content scripts share `globalThis.LinkedDraw`. Manifest order is therefore part of the runtime contract. Files are not dynamically downloaded and no runtime bundler is required.

## 3. Source modules

### `shared/constants.js`

Defines version, output dimensions, upload limits, timing constants, root identifiers, and message names. Cross-module magic values belong here.

### `shared/browser-api.js`

Normalizes the Promise-based Firefox `browser` API and callback-oriented Chromium `chrome` API. Content, popup, options, and background code call one wrapper instead of branching everywhere.

### `shared/settings.js`

Owns defaults, validation, and extension-storage persistence. Every loaded value is sanitized before use; options UI does not become the trust boundary.

### `shared/url-policy.js`

Central allowlist for background image retrieval. Production accepts only HTTPS LinkedIn/licdn hosts. Localhost is accepted only by the development build/runtime context. Every URL is validated again after redirects.

### `content/banner-detector.js`

Finds a plausible profile cover and nearby native edit control through additive evidence:

- known semantic selectors;
- position and aspect ratio in the profile header;
- actual image/background presence;
- nearby edit/camera control;
- localized accessible text as a score boost.

It returns the winning element, image URL, edit button, geometry, score, evidence, and `editable` state. No single minified LinkedIn CSS class is the only dependency.

### `content/app.js`

Coordinates lifecycle:

- creates the open Shadow DOM host;
- watches structural LinkedIn SPA changes with `MutationObserver`, and revalidates URL, attributes, resize, and nested-scroll state on bounded schedules;
- positions the floating Draw button;
- reads settings and current cover;
- opens/destroys the editor;
- reports status to the popup;
- displays accurate upload outcome toasts.

### `content/editor.js`

Owns interactive editor state and pointer/keyboard events. Drawing operations are stored as logical commands rather than immediately flattening every operation into the output bitmap. History snapshots contain both the background mode (`current` or `neutral`) and the logical drawing objects, so Clear can switch to an empty neutral scene and Undo can restore the prior cover plus objects atomically. Clear is local to the editor; LinkedIn changes only after Save.

### `content/history.js`

Clone-based undo/redo stack. History has no DOM dependency and is unit tested.

### `content/geometry.js`

Maps pointer coordinates from responsive CSS pixels to the canonical 1584×396 coordinate space and calculates arrowheads. It is pure and unit tested.

### `content/render.js`

Replays logical operations into canvas output. A per-editor `WeakMap` cache reuses the transparent drawing layer across frames without retaining a closed canvas. It renders:

- current image or neutral background, with explicit confirmation before a failed-current-image session can overwrite the cover;
- pen/eraser paths;
- line, arrow, rectangle, and text operations;
- optional non-exported safe-area guides in the live editor.

The guides outline the entire visible cover and separately mark only the areas likely to be obscured by the profile photo and LinkedIn's upper-right cover controls. They are editor overlays and are never included in the exported image.

Export uses the canonical dimensions and starts with the requested format. When the output exceeds the maximum upload size it progressively lowers JPEG quality and can fall back from PNG to JPEG.

### `content/native-upload.js`

Bridges a generated `File` into LinkedIn's native UI:

1. opens the native cover editor through the detected edit control;
2. snapshots existing dialogs, menus, and file inputs into a cover operation session;
3. waits for a new file input inside the session's cover surface;
4. assigns the generated file with `DataTransfer`;
5. dispatches `input` and `change` events;
6. optionally waits for and clicks Apply/Save;
7. confirms completion from either a stable published-image URL on the same target or LinkedIn's transition from the trusted image editor back to a strong native cover surface;
8. closes only the remaining dialogs recorded in the active cover flow, newest first, after confirmed success;
9. classifies the result as `success`, `handed-off`, or `failed`;
10. downloads the generated image on failure.

The default completes the native Save flow (`autoConfirmUpload: true`) because pressing Save in LinkedDraw represents the user's confirmation. Users can disable it for manual crop/review. A dialog is closed only after stable URL evidence or the native `Edit image` → `Cover photo` completion transition; dialog closure alone is never reported as success.

### Background and operation lifecycle

The editor tracks current-cover loading as `loading`, `ready`, `unavailable`, or `disabled`. Save is disabled while the current image is loading; an unavailable current image requires explicit overwrite confirmation; disabled composition starts from the neutral canvas. Late image decodes and late upload/delete callbacks are ignored after Cancel, navigation, or editor destruction.

Cover deletion is a separate, explicitly confirmed path. It opens LinkedIn's native cover editor, activates its visible Delete action, and reports success only after repeatedly observing that the detected cover image was removed or changed. Dialog closure alone is never success. If completion cannot be proven, control is handed back to the user instead of claiming success. The adapter never invokes a private upload or deletion endpoint.

### `content/styles.js`

Contains Shadow DOM CSS as a string. Shadow DOM prevents LinkedIn styles from changing editor layout and prevents editor CSS from leaking into LinkedIn.

### `background/index.js`

A deliberately narrow proxy used only when the current cover image cannot be fetched from page origin. It:

- accepts only the extension's `fetchImage` message;
- validates the original URL;
- fetches without credentials and without referrer;
- validates the final URL after redirects;
- accepts only supported raster responses (PNG, JPEG, WebP, or AVIF);
- streams response chunks and cancels before buffering beyond the configured limit;
- returns an in-memory data URL.

It is not a generic network proxy.

## 4. Editing and save data flow

```text
user clicks Draw
  ↓
app freezes current detector target for this editor session
  ↓
settings loaded and sanitized
  ↓
current cover loaded locally or through restricted background fetch
  ↓
editor stores vector-like logical operations
  ↓
user clicks Save
  ↓
renderer produces 1584×396 Blob below size ceiling
  ↓
Blob becomes File
  ↓
native upload adapter opens LinkedIn UI and injects File
  ├─ native completion observed → success
  ├─ file accepted but user action remains → handed-off
  └─ automation fails → local download + failed
```

Cancel destroys editor state and performs no upload action.

## 5. Build architecture

`manifests/base.json` contains common permissions, content scripts, popup, options, localization, icons, and CSP. Target patches alter only the platform-specific pieces:

- Chromium: Manifest V3 `background.service_worker`;
- Firefox: Manifest V3 `background.scripts`, Gecko ID, minimum version, and explicit no-data-collection declaration;
- Safari: background script/service-worker compatibility fields for Apple's converter;
- development: Chromium background plus localhost hosts/content-script matches.

`scripts/build.mjs` deep-merges the base and patch, copies static source, and emits `dist/<target>`.

`scripts/verify-dist.mjs` is a policy gate. It checks referenced files, target-specific background shapes, host permissions, localhost isolation, CSP-sensitive constructs, and unexpected hard-coded remote origins. It must not be weakened to hide a defect.

`scripts/package.mjs` creates ZIP files using Node's standard library, then writes SHA-256 checksums. DOS timestamps use UTC and `SOURCE_DATE_EPOCH` (with a stable 1980 default), so unchanged inputs produce byte-identical archives. `LINKED_DRAW_PACKAGE_OUTPUT` can redirect generated archives for isolated tests; the normal default remains `artifacts/`. This avoids relying on a globally installed archive package.

## 6. Browser differences

### Chromium

Uses a Manifest V3 service worker. The same unpacked/release package targets Chrome, Edge, Brave, and compatible Chromium browsers.

### Firefox

Uses non-persistent background scripts because Firefox's Manifest V3 background declaration differs from Chromium's. The rest of the source is shared.

### Safari

The repository emits Safari-compatible WebExtension source. Apple's converter generates a containing macOS app/Xcode project. Signing, team selection, bundle identifiers, and enabling the extension are native Xcode/Safari steps and cannot be represented by a portable ZIP alone.

## 7. Security boundaries

Trusted:

- packaged extension source;
- sanitized local settings;
- generated drawing operations.

Untrusted:

- LinkedIn DOM structure and labels;
- remote image URL and redirect destination;
- image MIME type/size;
- native modal timing;
- any file input found on the page.

Controls:

- exact host allowlist;
- no credentials in background fetch;
- redirect revalidation;
- image-only MIME and size checks;
- preference for visible/newest dialog and image file inputs;
- no inline executable extension scripts;
- no remote assets or remote code;
- accurate fallback instead of false success.

## 8. Extension points

A future second site should be implemented behind a site adapter rather than by adding site conditions throughout the editor. The useful conceptual interface is:

```ts
interface SiteAdapter {
  detectEditableImage(): Target | null;
  loadCurrentImage(target: Target): Promise<string | null>;
  commit(file: File, target: Target): Promise<UploadResult>;
}
```

This abstraction is not introduced yet because LinkedIn is the only target and a premature framework would add complexity without a second implementation to validate it.
