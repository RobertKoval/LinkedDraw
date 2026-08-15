# Contributing

Thank you for improving LinkedDraw.

## Before opening a change

- Search existing issues first.
- Keep changes focused on one problem.
- Do not include LinkedIn cookies, tokens, signed image URLs, private profile HTML, or screenshots containing personal data.
- For a LinkedIn DOM regression, describe stable roles, labels, and geometry rather than copying a full authenticated page.

## Development

Requirements: Node.js 20 or newer. The production extension has no third-party runtime dependencies.

```bash
npm run check
npm run compat:firefox
```

For UI work, also test the unpacked development build against the mock page:

```bash
npm run build:dev
npm run mock
```

Load `dist/dev` as an unpacked extension and open `http://127.0.0.1:4173/`.

## Pull requests

- Add or update tests for observable behavior.
- Keep browser permissions minimal.
- Update `PRIVACY.md` if data handling changes.
- Update `CHANGELOG.md` for user-visible changes.
- Run `npm run check` and report any browser tests performed.
- Do not commit `dist/`, `build/`, `artifacts/`, signing files, or local environment files.

LinkedIn is a changing third-party interface. A safe failure or explicit handoff is preferable to reporting a false successful upload.
