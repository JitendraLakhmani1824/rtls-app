# managers/map — MapLibre

The only folder that imports MapLibre. `MapLibreManager` implements `MapManager`; `createMapView` gives screens a `MapView` bound to it.

**How data reaches the map** (decided in M0, `docs/results/m0-spike.md`)
- **Still pins** (`pins-still`, ≤ 1×/s): encoded in JS (`encode.ts`) and passed as a prop to a small leaf component.
- **Gliding pins** (`pins-moving`, every frame): targets go to a UI-thread worklet (Reanimated `useFrameCallback` + `useAnimatedProps`), which interpolates and encodes. Zero JavaScript per frame. When nothing is gliding, the worklet returns immediately.

**Gotchas**
- Fonts must be `Noto Sans *`: the only glyphs OpenFreeMap serves. Any other font → labels silently vanish.
- Clustered sources accept points only — trails need their own source.
- Symbol layers keep `text-allow-overlap` / `text-ignore-placement` on, or every update re-runs label placement.
- Never emit `NaN` into GeoJSON: one bad number blanks the whole layer (`encode.ts` skips the pin).
- `onDidFinishRenderingFrame` under-counts frames on both platforms; measure with `scripts/map-frames-android.sh`.
- iOS parses source data on the main thread (where the worklet also runs): keep per-frame payloads small.
- Never call `enableFreeze()` — the map must keep drawing under the Detail sheet.
- **Worklet helpers go above the worklets that call them.** Reanimated's Babel plugin turns worklet function declarations into unhoisted variables, so a helper defined later is captured as `undefined` ("undefined is not a function" on the UI thread).

**Tests:** `encode.test.ts` (golden). The view itself is checked on device with the `run-scenario` skill.
