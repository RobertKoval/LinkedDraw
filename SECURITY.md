# Security policy

## Supported versions

Security fixes are provided for the latest published release and the current `main` branch.

## Reporting a vulnerability

After the repository is published on GitHub, use **Security → Report a vulnerability** to open a private security advisory. Do not file a public issue for an unpatched vulnerability. Before a hosting channel exists, contact the repository owner privately through the platform where the source was shared.

Never include live credentials, cookies, access tokens, signed media URLs, full private profile HTML, or unredacted personal screenshots. A useful report contains the affected version, browser/OS, impact, minimal reproduction, observed result, and sanitized console output.

No response-time or disclosure deadline is guaranteed. The maintainer will validate the report, coordinate a fix when appropriate, and publish credit only with the reporter's consent.

## Security invariants

- No LinkedIn cookies, credentials, tokens, analytics, telemetry, or remote code.
- No private or reverse-engineered LinkedIn API calls.
- Production host access is limited to LinkedIn and LinkedIn-hosted image media.
- Original and redirected image URLs are allowlisted.
- Image fetches omit credentials and referrer, accept only supported raster formats, and stop at a fixed byte limit.
- Page DOM, file inputs, image metadata, and native-dialog timing are untrusted.
- Uncertain native upload/delete completion is handed back to the user, never reported as success.
- Release archives exclude local files, Finder metadata, source maps, and signing material.
