#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/images/splash-icon.png"
IOS_SET="$ROOT/ios/Briefcase/Images.xcassets/SplashScreenLogo.imageset"

if [[ ! -f "$SRC" ]]; then
  echo "Missing splash source: $SRC" >&2
  exit 1
fi

if [[ ! -d "$IOS_SET" ]]; then
  echo "Missing iOS splash imageset. Run: npx expo prebuild --platform ios" >&2
  exit 1
fi

echo "Syncing splash from assets/images/splash-icon.png -> iOS native imageset"
sips -z 200 200 "$SRC" --out "$IOS_SET/image.png" >/dev/null
sips -z 400 400 "$SRC" --out "$IOS_SET/image@2x.png" >/dev/null
sips -z 600 600 "$SRC" --out "$IOS_SET/image@3x.png" >/dev/null

if [[ -d "$ROOT/.expo/web/cache/production/images/splash-ios" ]]; then
  echo "Clearing stale Expo splash cache"
  rm -rf "$ROOT/.expo/web/cache/production/images/splash-ios"
fi

echo "Done. Rebuild the iOS app (delete from device first)."
echo "If launch screen still flashes the old image, bump ios.buildNumber in app.json and rebuild."
