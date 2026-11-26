---
name: release
description: Ship a new RTLS build — bump the version, build the Android APK, re-take screenshots and the iOS/Android demo videos, refresh README/diagrams, commit, push, and publish a GitHub release with the APK. Use when asked to "build the APK", "update the release", "record the demo" or "update the README media".
---

# Release

Confirm with the user before pushing or publishing (both are public).

## 1. Version

`app.config.ts`: `version`, `ios.buildNumber`, `android.versionCode`; `package.json` `version`. Then `CI=1 npx expo prebuild --no-install` to sync `ios/` and `android/` (never edit them by hand).

## 2. Android APK

```bash
cd android && JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64
```
→ `android/app/build/outputs/apk/release/app-release.apk` (debug-signed, for sideloading). Install: `adb install -r <apk>`. A fresh start (onboarding, sample book) needs `adb uninstall com.rtls.casestudy` first — ColorOS blocks `pm clear`. Ask before wiping the user's phone data.

## 3. iOS Release build (for recording only)

```bash
CI=1 LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --configuration Release --no-bundler
```
The dev build shows Expo's tools button; Release doesn't. Afterwards, the next Debug build may fail to link or crash at launch (prebuilt Release frameworks left in `ios/Pods`). Fix: from `ios/Pods`, run React Native's and Expo's swap scripts release → debug (`replace-rncore-version.js`, `sdks/hermes-engine/utils/replace_hermes_version.js`, `expo-modules-autolinking/scripts/ios/replace-xcframework.js` for each Expo module).

## 4. Record

- **iOS:** `xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100`; fresh install; `xcrun simctl io booted recordVideo --codec=h264 out.mp4`; stop with SIGINT. The file has frames only when the screen changes: **convert to a constant frame rate before trimming** (`fps=30` first in the filter graph), or trims land on the next change.
- **Android:** `scrcpy --no-playback --no-audio --no-window --max-size=1600 --time-limit=N --record=clip.mkv` (MKV survives an early stop; stop with SIGINT and wait for the process to exit). Record short clips; check each for notification banners (sample the top strip once a second).
- Story: onboarding (photo + name) → Sessions → the 150-person club (groups, tap a group to zoom, tap a runner: fly-to, follow, trail) → family road trip (list, follow a car, View details) → Friends → Profile.
- Join and trim with ffmpeg (`trim` + `concat`, 720 px wide, `libx264 -crf 27 -movflags +faststart`). Keep each under ~100 s.

## 5. README media

- Screenshot strip: six phone screens, `scale=360:-2,crop=360:800`, `hstack`, padded `#FBFBFB` → `docs/media/rtls-screens.png`.
- Videos → `docs/media/rtls-demo.mp4` (iOS), `rtls-demo-android.mp4`; update their lengths in the README.
- Diagrams: `scripts/diagrams/render.sh` after editing `lld.py` / `hld.py`; read the PNG to check nothing is clipped.

## 6. Ship

`pnpm verify` → commit → push → `gh release create vX.Y.Z RTLS-X.Y.Z.apk RTLS.apk --title "RTLS X.Y.Z" --notes-file notes.md` (`RTLS.apk`, the same file, keeps a stable download link). Point the README's download link at `releases/latest`.
