# M2 results — engine and fake friends

**Built:**
- **Engine:** location store (drops duplicates and late fixes by `seq`; holds a GPS jump until the next fix confirms it, then snaps), presence from heartbeats (Live / Recent / Stale / Paused), trails (fixed memory per member, window and step per session type, races thinned, breaks at jumps and gaps, 4 age buckets), presenter (who is on screen, who glides, the three frames), power budget, `LiveSession` wiring.
- **Map:** `trails` source faded by age, the trail tip drawn on the UI thread, frame-rate cap.
- **Fake friends:** three seeded scenarios — concert (most people standing), marathon (runners on a 5 km loop), trip (cars of four on a 24 km road) — with heartbeats, friends who go silent or pause, and a fault wrapper (drops, duplicates, late fixes, 300 m jumps).

## Tests

102 tests in 14 suites; `pnpm verify` green in ~2 s.
- **Contracts:** feed (`SyntheticFeedManager`, `withFaults`), clock (`FakeClock`, `systemClock`).
- **Replay fingerprint:** each scenario, seed 42, 60 virtual seconds, every fault on, a tap and a Low Power switch → hash of everything sent to the map.

## Android (OnePlus 10T, release build) — seed 42

| Run | Map frames | Gap p50 · p95 · max | JS fps | Engine cost |
| --- | --- | --- | --- | --- |
| Marathon 200, street zoom, runners gliding, one selected with its trail | **≥ 42/s** | 16.7 · 33.4 · **33.5 ms** | 58–60 | per batch: ingest 0.7–2.2 ms, motion frame 0.2–0.4 ms · per second: who glides 1–3.6 ms, trail frame 0.6–1.1 ms |
| Concert 200, overview | 24/s | 16.7 · 33.4 · 702 ms | 59–60 | ingest 0.16–0.34 ms · still frame 1.2–3.3 ms (1/s) |
| Marathon 200, overview | 30/s | 16.7 · 33.4 · 686 ms | 59–60 | ingest 1.1–1.2 ms |
| Trip 200, overview | 25/s | 16.7 · 33.5 · 686 ms | 60 | ingest 0.85–0.9 ms |
| Concert 500, all faults on | 25/s | 16.7 · 33.4 · 702 ms | 58 | visibility 1.7–3.1 ms per batch · still frame 2.8 ms (1/s) · no errors |

> **Correction (M3):** "42 frames/s" was a ceiling of the capture, not the frame rate. SurfaceFlinger keeps only the last 127 frames, and 127 ÷ 3 s = 42.3. The true rate was at least that. The gap figures are real but cover only the last ~2 s. Since M3 the script samples in 1-second chunks; corrected numbers are in `m3-map.md`.

**Reading:** while pins glide, the map never misses more than one refresh (longest gap 33.5 ms) — the same as M1, now with trails and the trail tip. In the overview nothing glides, so MapLibre draws only when still pins change: the long gaps are idle time, not stalls.

One run each, not yet the ABAB protocol (M6).

## iOS simulator (dev build) — indicative only

All three scenarios, no errors. JS 60 fps; ingest 0.03–0.2 ms, trail frame 0.1–0.2 ms. Trail and trail tip visible on a selected runner.

## Found and fixed during M2

| Problem | Cause | Fix |
| --- | --- | --- |
| Walkers' pins snapped instead of gliding | GPS noise at 1 Hz exceeded the 4 m/s event limit | The jump check subtracts both fixes' accuracy |
| Still pins sent ~3×/s; a pin drawn in both sources for up to 1 s | Walkers flipped in and out of gliding with GPS noise, decided on every batch | Who glides is decided on the 1 s tick with the still frame, with hysteresis (2 px/s to start, 1 to stop). Replay: 164 → 63 still frames a minute |
| Negative trail age | A sender's clock ahead of ours | Age clamped at 0 |
| Walkers flickered to Recent | Two lost 1 s fixes passed 2.5× the interval | Live window has a 10 s floor |
| Gliding pins zigzagged | Synthetic GPS noise was fresh every fix | Noise drifts slowly, like a real receiver |

## Open

- Visibility rescans everyone on each batch (1.7–3 ms at 500 friends): make it incremental.
- The overview still draws ~25 map frames/s with nothing gliding: check symbol fades and cluster updates (done in M3: `m3-ladder.md`).
- Session contract test arrives with the fake session in M3.
- `jsFps` read ~50,000 once on the iOS simulator right after a fresh dev-client load; not seen again.
- Real-iPhone run still pending.
