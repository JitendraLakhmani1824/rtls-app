---
name: run-scenario
description: Build and run the RTLS app on the iOS simulator or the USB-connected Android phone, open a scenario deep link, take a screenshot and read the PERF lines. Use whenever you need to see a change working in a real build, not just in tests.
---

# Run a scenario

## Scenario deep links

`rtls://scenario?friends=500&interval=1000&seed=42&rung=D&perf=1`

| Param | Meaning | Default |
| --- | --- | --- |
| `friends` | People in the session (1–5000) | 200 |
| `interval` | Ms between fixes for a moving friend | 1000 |
| `seed` | Same seed → same crowd | 42 |
| `rung` | `A` = one Marker per friend (comparison only), `D` = real engine | D |
| `perf` | `1` prints a `PERF {json}` line every second | 1 in dev builds, 0 in release |

Opening a new link rebuilds the app's pieces from scratch.

## iOS simulator (development)

1. Open the simulator panel first (`attach`), then build: `pnpm ios`. The script sets the UTF-8 locale CocoaPods needs.
2. Metro: run `CI=1 npx expo start --dev-client` in the background with output to a log file. `pnpm ios` builds and launches; the dev client loads JS from Metro.
3. If iOS asks "Open in RTLS?", tap Open.
4. Open a scenario: `xcrun simctl openurl booted 'rtls://scenario?friends=500&perf=1'`.
5. Screenshot with the simulator tool; read PERF lines from the Metro log (`grep PERF`).
6. Map smoothness on iOS: record with `xcrun simctl io booted recordVideo`, then count changed frames with `ffmpeg … mpdecimate` (MapLibre's own frame event under-counts). Simulator numbers are indicative only.

## Android phone (release — the only numbers that count)

1. Build and install: `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" pnpm android:release` (arm64 only; ~1 min with a warm cache). If only JS changed and the APK exists, rebuild with `cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`, then `adb install -r android/app/build/outputs/apk/release/app-release.apk`.
2. Open a scenario: `adb shell "am start -a android.intent.action.VIEW -d 'rtls://scenario?friends=500&perf=1'"`. Keep both layers of quotes: the phone's shell would otherwise cut the link at the first `&`.
3. Screenshot: `adb exec-out screencap -p > shot.png` (resize with `sips -Z 900` before viewing).
4. Taps: `adb shell input tap X Y` in physical pixels (1080×2412 on the OnePlus 10T).
5. PERF lines: `adb logcat -d -s ReactNativeJS:V | grep PERF`.
6. Real map frames: `scripts/map-frames-android.sh <label> 3` (SurfaceFlinger present times). Screen recording over adb is blocked on this phone.

## Report

Say what you ran (platform, build type, link), what you saw (screenshot), and the numbers (PERF line + map frames). Never claim a performance number from a dev build or the simulator.
