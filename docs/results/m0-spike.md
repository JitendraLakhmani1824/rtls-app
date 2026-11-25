# M0 spike results

**Setup:** `src/lab/spike`. Scene: 470 still friends (clustered source, updated 1×/s) + 30 movers (moving source, target 30×/s) + 30 trails (1×/s) + the selected friend's trail tip. Clustering and labels on. Each update path builds the moving-pins GeoJSON string itself.

## iOS simulator (iPhone 17 Pro, iOS 26.5, dev build) — indicative only

Dev build on a simulator: JavaScript runs in debug mode and the GPU is the Mac's. Use these to check that things work, not for performance claims.

| Path | How data reaches the map | JS fps | UI fps | Moving updates/s | JS time per update | Distinct map frames/s (screen recording) |
| --- | --- | --- | --- | --- | --- | --- |
| A | React state on a leaf `GeoJSONSource` | 60–61 | 60–61 | 21–24 | encode 0.13–0.28 ms + React render 0.9–1.4 ms | ~25 |
| B | `getAnimatableRef().setNativeProps({ data })` | 60–62 | 60–61 | 20–23 | encode 0.21–0.35 ms + native call 1.3–2.8 ms | ~26 |
| C | Reanimated `useAnimatedProps` from a UI-thread worklet | 60–62 | 59–61 | 21–23 | 0 (all on the UI thread) | ~29 |

**Findings:**
- **All three paths work** with MapLibre RN 11.5.1 on RN 0.88 / New Architecture.
- **Path C works.** Reanimated animated props can drive `GeoJSONSource.data` from a worklet, so pin positions can be computed and handed to the map with **zero JavaScript-thread time**. That turns the "worklet middle step" in design §2.8 from an idea into a tested option.
- **Moving updates reach ~22/s, not 30.** The 33 ms gate on 60 Hz frames skips extra frames; the real implementation should gate at ~30 ms or count frames.
- **`onDidFinishRenderingFrame` is not a frame-rate measure.** On iOS it reported 1–2 events/s while the screen recording showed ~25–29 distinct map frames/s, and 24/s during a camera animation. Dropped from the overlay's meaning; map smoothness comes from screen recordings, Instruments and Perfetto.
- **Clustering and labels work** with the bundled Positron style and `Noto Sans Bold`. Tapping a cluster mid-update expands it via `getClusterExpansionZoom`. Feature state on the clustered source works for the selection ring.
- **Path C known shortcut:** the worklet uses the UI-thread clock, so its pins drift off the JS-sampled trails. The real design sends movement segments, so both sides share one time base.

### Sheet check (iOS)

| Check | Result |
| --- | --- |
| Map undimmed with the sheet open (`sheetLargestUndimmedDetentIndex: 'last'`) | ✅ |
| Map touchable with the sheet open (pan) | ✅ |
| Map keeps updating under the sheet | ✅ 22 updates/s, UI 60 fps |
| App state while the sheet is open | ✅ `active` |
| Home navigation focus while the sheet is open | **`false`**, confirming the session must key on app foreground, never focus |
| Selection round-trip (pin tap → sheet; Close → selection cleared → sheet dismissed → Home focused) | ✅ |

## Android (OnePlus 10T, Snapdragon 8+ Gen 1, Android 15, release build, 60 Hz display)

Map frames are read from Android's compositor (`dumpsys SurfaceFlinger --latency` on the MapLibre `SurfaceView`): the real present time of every map frame. Script: `scripts/map-frames-android.sh`. Screen recording over USB is blocked on this phone (ColorOS).

| Path | JS fps | UI fps | Moving updates/s | JS time per update | Map frames/s | Frame gap p50 / p95 / max |
| --- | --- | --- | --- | --- | --- | --- |
| A | 60 | 60 | 23–24 | encode 0.45–0.68 ms + setState → commit 5.3–6.0 ms (latency incl. React scheduling) | 42 | 16.7 / 33.4 / 33.4 ms |
| B | 58–59 | 59–60 | 23–24 | encode 0.76–0.86 ms + native call 2.9–3.3 ms | 42 | 16.7 / 33.4 / 33.4 ms |
| C | 59 | 60 | **30** | **0** | 42 | 16.7 / 33.4 / 33.4 ms |

**Findings:**
- **The map stays smooth in every path:** no frame gap over 34 ms in any run, including with the sheet open. At 30 movers the bottleneck is not the map.
- **Path C is the only one that reaches the full 30 updates/s with zero JavaScript time.** The UI thread holds 60 fps.
- **Path B costs ~4 ms of JS per update** (~10% of the JS budget at 24 updates/s) and nudges JS to 58–59 fps.
- **Path A is simplest,** and React's commit latency (~5–6 ms) is fine for low-frequency sources.
> **Correction (M3):** "42 frames/s" was a ceiling of the capture, not the frame rate. SurfaceFlinger keeps only the last 127 frames, and 127 ÷ 3 s = 42.3. The true rate was at least that. The gap figures are real but cover only the last ~2 s. Since M3 the script samples in 1-second chunks; corrected numbers are in `m3-map.md`.

- **`onDidFinishRenderingFrame` under-counts on Android too:** 23–31/s against the 42/s SurfaceFlinger saw.

### Sheet check (Android)

| Check | Result |
| --- | --- |
| Opens as a native bottom sheet; map undimmed (`sheetLargestUndimmedDetentIndex: 'last'`) | ✅ |
| Map touchable with the sheet open (swipe pans the map) | ✅ — the dimming trap does not apply with this setting |
| Map keeps drawing under the sheet | ✅ ≥ 42 frames/s (see correction), gaps ≤ 33.4 ms, 30 updates/s |
| App state / Home focus with the sheet open | `active` / **`false`** (same as iOS) |
| Close → selection cleared → sheet dismissed → Home focused | ✅ |
| Android back button → same as Close | ✅ |

## Decision

| Source | Update path | Why |
| --- | --- | --- |
| `pins-moving`, `trail-tip` (every frame) | **C — Reanimated animated props, worklet interpolates movement segments** | Full rate, zero JS per frame; matches the LLD's "renderer slides pins itself" seam |
| `pins-still`, `trails` (≤ 1×/s) | **A — prop on a small leaf component** | Simplest; React's ~5 ms commit is irrelevant at 1 Hz |
| Fallback if C misbehaves on a real iPhone | B — `setNativeProps` | Works everywhere; ~4 ms JS per update |

Open: a real-iPhone run, because iOS parses source data on the main thread, where the worklet also runs.
