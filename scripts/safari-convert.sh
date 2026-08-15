#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/dist/safari"
DESTINATION="$ROOT/build/safari"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Safari conversion requires macOS and Xcode." >&2
  exit 1
fi

cd "$ROOT"
npm run build:safari
rm -rf "$DESTINATION"
mkdir -p "$DESTINATION"

if xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
  TOOL="safari-web-extension-packager"
elif xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  TOOL="safari-web-extension-converter"
else
  echo "Neither Safari Web Extension packager nor converter was found. Install a current Xcode." >&2
  exit 1
fi

echo "Using xcrun $TOOL"
set +e
xcrun "$TOOL" "$SOURCE" \
  --project-location "$DESTINATION" \
  --app-name "LinkedDraw" \
  --bundle-identifier "dev.robertkoval.linkeddraw" \
  --macos-only \
  --no-open \
  --force
STATUS=$?
set -e

if [[ $STATUS -ne 0 ]]; then
  echo "Safari tool invocation failed. Current tool help follows:" >&2
  xcrun "$TOOL" --help || true
  echo "Do not guess success. Adjust only the changed command-line flags for the installed Xcode version." >&2
  exit $STATUS
fi

echo "Safari Xcode project generated under: $DESTINATION"
echo "Safari 17 ad-hoc builds: enable Settings > Advanced > Show features for web developers,"
echo "then Settings > Developer > Allow unsigned extensions before each Safari launch."
echo "Alternatively, select an Apple development team for both Xcode targets."
