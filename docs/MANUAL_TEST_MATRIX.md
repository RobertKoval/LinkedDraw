# Manual test matrix

Use only the owner's profile for live Save/Delete tests. Record exact browser, OS, LinkedIn language, commit, and result. Never copy credentials, cookies, signed URLs, full private HTML, or personal screenshots into this file.

Status: `PENDING`, `PASS`, `FAIL`, or `N/A`.

## Automated evidence

| Date | Target | Build | Result | Evidence |
|---|---|---|---:|---|
| 2026-08-12 | Chromium mock | unpacked `dist/dev` | PASS | Real service worker/content-script boundary; open, draw, Clear/Undo, Cancel preservation, reopen, 1584×396 PNG native file handoff; zero console/network errors |
| 2026-08-12 | Firefox static compatibility | `dist/firefox` | PASS | `web-ext 10.6.0 lint`: zero errors, notices, warnings |
| 2026-08-12 | Safari source build | `dist/safari` + Xcode wrapper | PASS | macOS 14.5, Safari 17.5, Xcode 16.2; conversion clean; unsigned Release build succeeded; embedded resources matched source |

## Browser matrix

| Target | Mock profile | Own LinkedIn profile | EN/UK | Signed/installable artifact | Status / notes |
|---|---:|---:|---:|---:|---|
| Chrome / Chromium | PASS automated | PENDING | PENDING | PENDING | Retest store-signed build |
| Edge / Brave | PENDING | PENDING | PENDING | PENDING | Chromium ZIP compatibility check |
| Firefox desktop | PENDING | PENDING | PENDING | PENDING | Temporary add-on first, then signed XPI |
| Safari macOS | PENDING | PENDING | PENDING | PENDING | Source conversion/unsigned compile PASS; runtime requires signing/enabling |

## Mock-profile checks

| ID | Behavior | Expected result | Status |
|---|---|---|---:|
| M01 | Load unpacked extension | One Draw button appears beside native cover control | PASS Chromium |
| M02 | Open editor and draw | 1584×396 editor opens; stroke persists | PASS Chromium |
| M03 | Clear then Undo | Neutral empty canvas appears; previous scene returns | PASS Chromium |
| M04 | Close without changes | Cover source remains unchanged | PASS Chromium |
| M05 | Save with default auto-confirm | Generated file reaches the native dialog and the mock cover is saved | PASS Chromium |
| M06 | Options | Persistence and Reset use real extension storage | PASS Chromium |
| M07 | Keyboard-only editor | Focus wraps; Esc closes; focus returns to Draw | PASS Chromium |
| M08 | Sticky navigation overlap | Draw hides below navigation and returns beside native control | PENDING |
| M09 | Ukrainian mock | Detector and all extension/native labels work | PENDING |
| M10 | Console and network | No uncaught errors, CSP violations, 4xx/5xx, or unexpected hosts | PASS Chromium |
| M11 | Popup | Eligible-page status, open action, and options action | PENDING |

## Live LinkedIn checks

Run Cancel paths before Save, and back up the current cover before Delete.

| ID | Behavior | Expected result | Chrome | Firefox | Safari |
|---|---|---|---:|---:|---:|
| L01 | Another person's profile | No Draw button | PENDING | PENDING | PENDING |
| L02 | Own profile and SPA navigation | One correctly anchored Draw button; no duplicates | PENDING | PENDING | PENDING |
| L03 | Open then Close without changes | No native dialog and no cover change | PENDING | PENDING | PENDING |
| L04 | Existing cover composition | Current raster cover appears or neutral warning is explicit | PENDING | PENDING | PENDING |
| L05 | Manual handoff then native Cancel | Preview receives file; published cover remains unchanged | PENDING | PENDING | PENDING |
| L06 | Manual handoff then native Save | Same cover target changes; no false success | PENDING | PENDING | PENDING |
| L07 | Auto-confirm enabled | Completion is success only with stable post-Save evidence | PENDING | PENDING | PENDING |
| L08 | Clear, Undo, safe guides | Scene semantics correct; guides absent from output | PENDING | PENDING | PENDING |
| L09 | Delete rejected at confirmation | Native dialog does not open; cover unchanged | PENDING | PENDING | PENDING |
| L10 | Confirmed Delete on backed-up cover | Visible LinkedIn flow; uncertain completion is handed off | PENDING | PENDING | PENDING |
| L11 | English and Ukrainian UI | Upload/Save/Delete matching works in both languages | PENDING | PENDING | PENDING |
| L12 | Console/network/permissions | No errors or unexpected requests; permissions match privacy notice | PENDING | PENDING | PENDING |

## Failure record

```text
ID:
Date and commit:
Browser / OS / LinkedIn language:
Steps:
Observed:
Expected:
Sanitized console output:
Stable DOM roles/labels/geometry:
Fix and automated regression test:
Retest result:
```
