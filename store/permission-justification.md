# Permission justification

## `storage`

Stores only local user preferences: default tool/color/sizes, output format and quality, guide visibility, current-cover composition, and optional native Save/Apply confirmation. No drawing or account data is synchronized to a developer service.

## `https://www.linkedin.com/*`

Required to detect the editable cover on the user's own LinkedIn profile, insert the Shadow DOM editor, and pass the generated file through LinkedIn's visible native cover dialog. Content scripts are restricted further to `https://www.linkedin.com/in/*`.

## `https://*.licdn.com/*`

Required to read the currently displayed LinkedIn-hosted cover image for local composition. Requests omit credentials and referrer, validate redirects, accept only supported raster image formats, and stop at a fixed size limit.

## Data-use declaration

LinkedDraw does not collect or transmit user data to the developer. It has no backend, analytics, advertising, telemetry, remote logging, remote code, or private LinkedIn API access. See `PRIVACY.md` for the complete disclosure.
