# Privacy notice

Effective for LinkedDraw version `0.1.0`.

## Summary

LinkedDraw does not collect, sell, transmit, or analyze personal data. It has no backend, analytics service, telemetry endpoint, advertising SDK, or remote logging.

## Data handled locally

The extension may process the following inside the browser:

- the currently displayed LinkedIn profile cover image, to let the user draw over it;
- drawing operations created by the user;
- the generated cover image file;
- user preferences such as tool color, width, output format, safe-area visibility, and auto-confirm behavior.

Drawing state is kept in memory while the editor is open. On Save, the generated image is handed to LinkedIn's visible native upload interface. If that handoff fails, the browser downloads the generated image locally so the user does not lose the work.

Preferences are stored in the browser's extension storage and are not sent to the developer.

## Network access

LinkedDraw runs only on LinkedIn pages covered by its manifest. It can request the currently displayed cover image from LinkedIn's image CDN through its background context when normal page-origin access is insufficient. That request:

- is restricted to allowlisted LinkedIn/licdn HTTPS hosts;
- is made without LinkedIn cookies or other credentials;
- is checked again after redirects;
- accepts only image responses below a fixed size ceiling.

The extension does not contact a LinkedDraw server or any third-party service.

## LinkedIn account access

LinkedDraw does not request or read authentication cookies, passwords, access tokens, messages, contacts, or unrelated profile data. It does not use LinkedIn private APIs. The final upload remains within LinkedIn's own visible file-upload flow under the user's control.

## Browser permissions

- `storage`: saves local extension preferences.
- `https://www.linkedin.com/*`: adds the editor to eligible LinkedIn profile pages and interacts with the visible native cover editor.
- `https://*.licdn.com/*`: reads the current LinkedIn-hosted cover image for local composition when possible.

The development build additionally allows `localhost:4173` only for the bundled mock site. That permission is absent from release builds.

## Retention and deletion

Because the developer receives no data, there is no developer-side retention account to delete. The user can remove local settings by clearing extension data or uninstalling the extension. Images uploaded to LinkedIn are governed by the user's LinkedIn account and LinkedIn's own policies.

## Changes

If a future version adds any remote service or data collection, this notice and browser/store disclosures must be updated before release. Such a change must not be hidden behind a routine code patch.
