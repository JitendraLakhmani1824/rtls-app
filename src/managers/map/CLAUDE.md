# managers/map — MapLibre

The only folder that imports MapLibre. `MapLibreManager` implements `MapManager`; `createMapView` gives screens a `MapView` bound to it.

**How data reaches the map** (decided in M0, `docs/results/m0-spike.md`)

- **Still pins** (`pins-still`, ≤ 1×/s): encoded in JS (`encode.ts`) and passed as a prop to a small leaf component.
- **Gliding pins** (`pins-moving`, every frame): targets go to a UI-thread worklet (Reanimated `useFrameCallback` + `useAnimatedProps`), which interpolates and encodes. Zero JavaScript per frame. When nothing is gliding, the worklet returns immediately.
- **Trails** (`trails`, when they change, ≤ 1×/s): `encodeTrails` makes one line per age bucket; `line-opacity` fades by bucket. Drawn under the pins.
- **Trail tip** (`trail-tip`, every frame): the same worklet draws the selected friend's last trail point → gliding pin, so the trail stays attached.
- **Selection:** feature state on `pins-still` (paint only — selecting re-sends no data); the `s` flag on `pins-moving`.
- **Accuracy halo:** frames carry `haloM`; `encode.ts` turns it into points at zoom 0 (`h`) and the layer doubles it per zoom, so it stays true to metres.
- **Label fade:** off (`transition` 0 in the style), so updates don't keep the map redrawing; `fade=` link parameter to compare.
- **Frame cap** (`setFrameRateCap`): gliding updates at most `max(30 ms, 1000/fps)` apart (none at 0); `preferredFramesPerSecond` = `max(30, fps)` so pans stay smooth.

**Gotchas**

- Fonts must be `Noto Sans *`: the only glyphs OpenFreeMap serves. Any other font → labels silently vanish.
- Clustered sources accept points only — trails need their own source.
- Symbol layers keep `text-allow-overlap` / `text-ignore-placement` on, or every update re-runs label placement.
- Never emit `NaN` into GeoJSON: one bad number blanks the whole layer (`encode.ts` skips the pin).
- `onDidFinishRenderingFrame` under-counts frames on both platforms; measure with `scripts/map-frames-android.sh`.
- iOS parses source data on the main thread (where the worklet also runs): keep per-frame payloads small.
- Never call `enableFreeze()` — the map must keep drawing under the Detail sheet.
- **Worklet helpers go above the worklets that call them.** Reanimated's Babel plugin turns worklet function declarations into unhoisted variables, so a helper defined later is captured as `undefined` ("undefined is not a function" on the UI thread).

**Tests:** `encode.test.ts` (golden: still pins, trails, trail tip). The view itself is checked on device with the `run-scenario` skill.
