# Open-source release implementation plan

> Execute each behavior change red-green-refactor. Configuration and prose changes are verified by the tools that consume them.

## 1. Repository baseline

- Initialize Git on `main`; do not commit or configure a remote.
- Replace the previous closed-source licensing with MIT.
- Remove generated Finder metadata and obsolete release output before the final package run.

## 2. Security hardening

- Add failing tests for production/dev URL separation, raster MIME acceptance, bounded streaming, same-origin/data/blob validation, and traversal-safe mock paths.
- Implement the smallest policy and reader APIs that make those tests pass.
- Add background-message integration tests for original/final URL policy, MIME, timeout, and size behavior.

## 3. Browser compatibility and packaging

- Add behavioral tests for target manifest composition and artifact policy.
- Make target merge support explicit property deletion so Safari omits unsupported keys.
- Raise Firefox's minimum version to the first version compatible with its declared data-collection field across supported desktop builds.
- Make packaging clean/staged and deterministic; fail on metadata instead of ignoring it.
- Add pinned `web-ext lint` to the release gate.

## 4. UI and architecture quality

- Replace extension `innerHTML` with DOM construction and localized `textContent`.
- Normalize remaining legacy runtime identifiers to LinkedDraw.
- Add modal focus entry, focus containment, focus restoration, and background interaction isolation without breaking native handoff.
- Reduce whole-document mutation work while retaining polling and target-specific revalidation.
- Remove duplicate settings writes and report storage failure.
- Reuse the drawing layer rather than allocating it on every frame.

## 5. Open-source surface

- Rewrite README, architecture, status, changelog, privacy, security, and release guides around current evidence.
- Add CONTRIBUTING, CODE_OF_CONDUCT, SUPPORT, EditorConfig, GitHub templates, and least-privilege CI.
- Remove obsolete internal planning documents; retain this approved design and release plan.
- Prepare Chromium/Firefox store copy, permission rationale, privacy answers, and screenshot specifications without fake repository URLs.

## 6. Browser E2E and artifacts

- Add an optional Playwright-backed unpacked-Chromium E2E runner with pinned setup instructions and no production dependency.
- Cover Draw, editor, canvas operation, Cancel, clear/undo, native file handoff, popup, options persistence, localization, and console/network errors.
- Generate public mock-based screenshots without personal LinkedIn data.
- Run final release packaging and checksums.
- Convert Safari, build unsigned with Xcode, and compare embedded extension resources.

## 7. Final gates

- `npm run check`
- pinned `web-ext lint`
- unpacked Chromium E2E
- Safari conversion and unsigned build
- archive integrity, contents, checksums, and reproducibility
- Gitleaks, TruffleHog, Semgrep, suspicious-file/content scans
- two independent rubber-duck reviews, followed by fresh verification after any fix
- reconcile every finding as fixed, explicitly deferred, or rejected with evidence
