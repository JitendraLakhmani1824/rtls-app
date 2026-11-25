# M3 results — full map

**Built:** selection ring via feature state (selecting re-sends no data), accuracy halo for poor fixes (> 50 m), ladder rungs B and C, and better measurement: map frames sampled in 1 s chunks, event-loop lag, long tasks, Hermes GC counts. Engine made cheaper at scale: visibility checked only for friends who moved, presence and halo read in one call, and still pins re-encoded only when they change.

## Ladder at 200 friends — OnePlus 10T, release, concert, seed 42

3 runs of A–C, 2 of D (run stopped early, see below). Overview zoom: nothing glides, so this compares how each rung redraws.

| Rung | What it is | Map frames/s | Map gap p95 · stutter | App UI | JS lag (ms/s) | GCs/s |
| --- | --- | --- | --- | --- | --- | --- |
| A | One `Marker` (native view) per friend, React state | — (pins are app views) | — | **~5 fps, 24–65% janky** | ~60 | 0.5 |
| B | One source, rebuilt per batch (4×/s), no grouping | 47–51 | 16.7 ms · 1–2% | idle | ~5 | 0.15 |
| C | B + per-frame batching, on-screen only | 48–49 | 16.7 ms · 1–2% | idle | ~5 | 0.17 |
| D | Our engine: still ≤ 1×/s, gliding on the UI thread, grouping | **19** | 33.4 ms · 5–6% | idle | ~4 | 0.15 |

**Reading:**
- **A fails** at 200 friends: the app UI draws ~5 frames a second.
- **B and C are fine at 200.** C's culling doesn't help when everyone is on screen, and per-frame batching changes nothing with 4 batches a second. This is the step that didn't help.
- **D draws the map 2.5× less often** (19 vs ~48 frames/s): fewer GPU frames, less battery. Its cost: when the grouped source updates once a second, about 1 frame in 20 runs late (33 ms). Grouping isn't asked for by the brief; it stays, but gets no more work.

## Engine cost at 1,000 friends (D, before → after the M3 fixes)

| | Before | After (measured at 200) |
| --- | --- | --- |
| Visibility per batch | 4–6 ms at 1,000 (1.2 ms at 200) | 0.04 ms at 200 |
| GCs/s | 34 at 1,000 (1.5 at 200) | 0.15 at 200 |
| Still frame + encode | 9–12 ms + encode at 1,000 | 2–3 ms at 200 |

Not re-measured at 1,000 after the fixes.

## Fixed in our measurement

- **Frame counts were capped.** `dumpsys SurfaceFlinger --latency` keeps only 127 frames, so the "42 frames/s" in M0–M2 was the tool's ceiling (127 ÷ 3 s). Corrected in those notes; the script now samples in 1 s chunks.
- **JS lag probe:** React Native fires timers on frame boundaries, so up to one frame of lateness is normal and not counted.

## Not done (trimmed)

- The 1,000-friend ladder after the fixes, and the label-fade comparison (fade is off by default, not compared on device).
- `docs/results/raw/`: `m3-ladder-200.txt` is this run; `m3-ladder-1000.txt` predates both the capture fix and the engine fixes (its JS numbers are valid, its frame rates are not).
