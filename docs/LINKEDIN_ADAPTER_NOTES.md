# LinkedIn adapter notes

This document records non-sensitive facts needed to keep the page adapter working. Never paste cookies, authorization headers, CSRF values, signed media URLs, full personal profile HTML, or private account identifiers.

## Current implementation strategy

### Eligibility

The content script runs on LinkedIn pages, but the Draw control is eligible only when the path resembles a profile page (`/in/<slug>`) and the detector finds both:

- a plausible cover element;
- a nearby native edit/camera control that makes the target editable.

This prevents the tool from appearing on another person's non-editable cover or unrelated LinkedIn pages.

### Cover scoring

`src/extension/content/banner-detector.js` accumulates evidence rather than trusting one selector. Relevant evidence includes:

- known profile-background semantic selectors;
- wide, shallow geometry near the upper profile area;
- image/background content;
- expected aspect ratio;
- relationship to the profile header/main content;
- nearby visible edit/camera button;
- English/Ukrainian accessible-label keywords.

A selector learned from a live page should normally be added as another candidate, not used to delete the fallback heuristic.

### Edit-control scoring

Candidate controls are filtered for visibility and button-like behavior. Geometry relative to the cover's upper-right region carries significant weight. Accessible labels/titles contribute but are not the only criterion, because localization and icon-only controls change.

### Current image

The detector tries to extract an image from:

- `img.currentSrc` or `img.src`;
- CSS `background-image` URLs;
- useful image descendants.

Cross-origin LinkedIn/licdn URLs are sent to the restricted background fetcher. Failure is non-fatal; the editor can use a neutral background.

### Native upload

`src/extension/content/native-upload.js` prefers a file input inside the newest visible dialog after clicking the native edit control. It requires an image-compatible input and uses `DataTransfer` to assign the generated `File`, followed by bubbling `input` and `change` events.

When auto-confirm is enabled, localized Apply/Save-style controls are searched and clicked only after the input has accepted the file. Completion is observed conservatively. Ambiguity is classified as `handed-off`, not `success`.

## Live DOM observation — 2026-08-09

Environment: Safari `17.5` on macOS `14.5`, owner's own profile, English LinkedIn UI. No cookies, tokens, signed URLs, or personal HTML were recorded.

Observed native flow:

1. The cover control is a visible `button` with `aria-label="Add background image"` and an expanded-state attribute.
2. Clicking it opens a visible `[role="menu"]`; the first upload action is an `<a>` whose visible text is `Add cover image`.
3. Clicking that link opens `<dialog open data-testid="dialog">` headed `Add a cover image`.
4. The dialog initially contains a `button` labeled `Upload single photo` but no `input[type="file"]`.
5. The image file input is created only after activating `Upload single photo`.

The pre-fix extension stopped after the first menu and downloaded the generated file with `LinkedIn image file input was not found`. The narrow fix in `content/native-upload.js` now searches the newest visible dialog or menu, accepts upload-trigger anchors as well as buttons, and advances through both native UI steps. A deterministic regression test covers the menu-link step. Live retest after rebuilding/running the Safari containing app remains pending.

## Live scroll observation — 2026-08-09

The same Safari profile uses `main` as the page scroll container (`overflow-y: scroll`), not `window`.
Before the anchor fix, the extension listened only to `window` scroll and its periodic detector could
replace the cover target with a wide unrelated section. At an internal scroll offset, Draw was observed
beside a `Dismiss the suggestion` control instead of the native `Add background image` control.

The adapter now preserves a connected, semantically valid cover target across scans, registers position
updates on the anchor's actual scroll ancestors plus `window`, rejects generic action labels, and hides
Draw when the native anchor is absent or outside the viewport. It never falls back to a banner-section
coordinate when the native anchor cannot be verified. Deterministic tests cover nested scroll, false
anchor rejection, off-screen hiding, target continuity, and scroll-back recovery. Live post-fix browser
retest remains pending.

## Live native-delete observation — 2026-08-10

Environment: Safari `17.5` on macOS `14.5`, owner's own profile, English LinkedIn UI. No cookies, tokens, signed URLs, or personal HTML were recorded.

Observed visible flow:

1. The native cover control is a `button` with `aria-label="Edit background image"`.
2. Activating it opens a `[role="menu"]` containing `Edit cover image`.
3. That action opens a cover dialog whose visible content includes `Cover photo`, `Edit`, `Change photo`, and `Delete`.
4. Delete is exposed as a `div` with `role="button"` and `tabindex="0"`, not a native `button` element.

The extension therefore searches enabled visible role-based actions as well as native buttons, and only inside a surface with cover-edit context. The live Delete action was deliberately **not** activated during inspection, so actual deletion and completion detection still require a manual Safari retest.

## Live cover-overlay geometry — 2026-08-10

The visible cover measured `792×197` CSS pixels. Its bottom and right edges remained visible. The profile photo's center was approximately `13.1%` of cover width and `92.4%` of cover height, with radius approximately `38.6%` of cover height. The editor guide now outlines the full cover and marks the profile-photo overlay plus the upper-right native cover-control area; it no longer labels the visible bottom or right cover edge as unsafe.

## Live inspection template

Fill this on the owner's own profile for each interface language.

```text
Date:
Browser/version:
LinkedIn UI language:
Profile URL pattern (omit slug): /in/<slug>

Cover element
- tag:
- stable id/data/test/aria attributes:
- useful ancestor role/section:
- rendered width × height:
- image represented by: img / background-image / other
- image host only (no signed path/query):

Native edit control
- tag/role:
- aria-label/title:
- stable attributes:
- relation to cover:

First native dialog
- role/aria-modal:
- distinctive heading:
- file input accept:
- file input inside dialog: yes/no
- number of visible file inputs:

After file assignment
- preview appears: yes/no
- Apply/Save text:
- initially disabled: yes/no
- loading state:
- second confirmation dialog: yes/no

Observed adapter result
- success / handed-off / failed:
- exact failure symptom:
- console error:
```

## Additive patch rules

When LinkedIn changes:

1. reproduce with auto-confirm disabled first;
2. inspect roles, labels, `data-*` semantics, and geometry before minified classes;
3. add the smallest stable selector/keyword/timing guard;
4. preserve heuristic fallback;
5. add a representative fixture to the mock site if it can be represented without private HTML;
6. add a pure test for score/normalization behavior;
7. run `npm run check`;
8. repeat Cancel and handoff tests before auto-confirm.

## Common failure modes

### Draw button absent on own profile

Likely causes:

- cover selector no longer matches and heuristic score is below threshold;
- native edit control moved outside the detector search radius;
- edit control visibility test fails because of a portal/overlay;
- profile path format changed;
- banner is lazy-loaded after the current observation window.

Preferred repair: record detector evidence in a debug build, then adjust one score/selector/timing constant.

### Draw button appears on another person's profile

This is a safety regression. Increase the requirement for a true native edit control; do not infer ownership from profile name or URL.

### Current background missing

Check only the image host, MIME type, redirects, and CORS/fetch result. Do not add cookies or broad hosts. Neutral-background editing plus warning is the intended safe fallback.

### File input not found

Inspect the newest visible modal and whether the file chooser is created only after an additional native menu action. Add a visible-UI step to the adapter; do not call the upload API directly.

### File assigned but preview does not update

Confirm:

- input accepts the generated MIME type;
- `input.files` actually contains the file;
- both `input` and `change` bubble;
- React now listens on a different underlying input;
- a native click is required before assignment.

### Preview appears but Save is not clicked

Treat it as a successful handoff. Update localized labels or loading-state timing only after confirming that the control is unambiguously the native cover Save/Apply action.

### Success toast but cover unchanged

Critical classification bug. Tighten completion detection immediately and downgrade uncertain states to `handed-off`.

## Last live verification

No authenticated current LinkedIn DOM was available in the build environment used to prepare version `0.1.0`. All entries remain pending until the live-browser phase is executed.
