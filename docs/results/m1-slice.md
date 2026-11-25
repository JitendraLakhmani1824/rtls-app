# M1 results — vertical slice

**Built:** synthetic concert feed → `LiveSession` (store + glide planner) → `MapLibreManager` (still pins ≤ 1×/s via a leaf prop; gliding pins on the UI thread via a Reanimated worklet) → Home screen. Deep links choose the scenario and ladder rung; `PerfRecorder` prints one `PERF` line a second.

## Android (OnePlus 10T, release build) — 200 friends, seed 42, concert

| Rung | What it is | JS fps | What draws the pins | Frames | Frame time |
| --- | --- | --- | --- | --- | --- |
| **A** | One MapLibre `Marker` (native view) per friend, positions in React state | 49 | App UI (`gfxinfo`) | **~4 fps** (12 in 3 s), **92% janky** | p50 65 ms · p95 73 ms |
| **D** | Real engine: still pins ≤ 1×/s, gliding pins on the UI thread | 59–60 | MapLibre surface (SurfaceFlinger) | **42/s** | gap p50 16.7 ms · p95 33.4 ms · max 33.4 ms |

Engine cost per batch on the phone (rung D, from PERF lines): ingest 0.17–0.30 ms · glide planning 0.95–1.6 ms · motion frame 0.2–0.45 ms · still frame 0.8–1.3 ms (once a second).

One run each, not yet the ABAB protocol: the full ladder (A–D) and the matrix are M3/M6. Already clear at 200 friends: the marker-per-friend approach can't keep up, and ours has headroom.

## iOS simulator (dev build) — indicative only

No errors over a 25 s run. Engine per batch: ingest ~0.03–0.05 ms, planning ~0.1–0.6 ms, still frame ~0.1–0.3 ms, JS 60 fps.

## Found and fixed during M1

| Problem | Cause | Fix |
| --- | --- | --- |
| "undefined is not a function" on the UI thread after a pin's second glide | Reanimated's Babel plugin turns worklet function declarations into unhoisted variables; `retarget` captured `progress` before it was defined | Helpers moved above the worklets that use them; rule added to `src/managers/map/CLAUDE.md` |
| Deep-link parameters ignored on Android (no PERF lines) | `adb shell am start -d '…&…'` — the phone's shell cut the link at the first `&` | Quote twice: `adb shell "am start … -d '…'"`; fixed in both skills |
| MapLibre frame counts | `onDidFinishRenderingFrame` under-counts; rung A draws markers as app views, not on the map surface | Map surface → SurfaceFlinger; app UI → `dumpsys gfxinfo` |
