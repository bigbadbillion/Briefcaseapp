#!/usr/bin/env bash
set -euo pipefail

# Sync splash-icon.png into the iOS app bundle (outside xcassets — avoids Apple launch-image cache bug).
# Native launch storyboard: ios/Briefcase/BriefcaseLaunchV8.storyboard
# Image filename includes build suffix; bump SPLASH_ASSET_SUFFIX when you need to bust cache again.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/assets/images/splash-icon.png"
SPLASH_ASSET_SUFFIX="${SPLASH_ASSET_SUFFIX:-b8}"
SPLASH_PNG="$ROOT/ios/Briefcase/briefcase_splash_${SPLASH_ASSET_SUFFIX}.png"
PBXPROJ="$ROOT/ios/Briefcase.xcodeproj/project.pbxproj"
PLIST="$ROOT/ios/Briefcase/Info.plist"
IOS_SET="$ROOT/ios/Briefcase/Images.xcassets/SplashScreenLogo.imageset"
BUILD_NUMBER="${1:-}"

if [[ ! -f "$SOURCE" ]]; then
  echo "Missing $SOURCE"
  exit 1
fi

echo "Copying splash -> $SPLASH_PNG"
cp "$SOURCE" "$SPLASH_PNG"

if [[ -d "$IOS_SET" ]]; then
  echo "Removing stale SplashScreenLogo imageset (using bundle PNG instead)"
  rm -rf "$IOS_SET"
fi

if [[ -d "$ROOT/.expo/web/cache/production/images/splash-ios" ]]; then
  echo "Clearing stale Expo splash cache"
  rm -rf "$ROOT/.expo/web/cache/production/images/splash-ios"
fi

if [[ -n "$BUILD_NUMBER" ]]; then
  if [[ -f "$PBXPROJ" ]]; then
    echo "Setting Xcode CURRENT_PROJECT_VERSION -> $BUILD_NUMBER"
    sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9]*;/CURRENT_PROJECT_VERSION = ${BUILD_NUMBER};/g" "$PBXPROJ"
  fi
  if [[ -f "$PLIST" ]]; then
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$PLIST" 2>/dev/null || true
  fi
fi

echo "Done. Native splash: BriefcaseLaunchV8.storyboard + briefcase_splash_${SPLASH_ASSET_SUFFIX}.png"
echo "After install: delete app from device, run once (DEBUG clears SplashBoard cache), cold-start again."
