# core/engine — the fast lane

Turns location fixes into what the map draws. Pure TypeScript.

**Start with:** `LiveSession.ts` (the controller) → `presenter.ts` (who is on screen, who glides, what each frame holds) → `store.ts` (latest position and presence per member) → `trails.ts` (recent path per member).
Small pure helpers: `presence.ts` (Live / Recent / Stale), `budget.ts` (power → animation budget), `throttle.ts`. `camera.ts` decides camera moves (fit, fly to, follow with tilt, calm mode).

**Invariants**

- `LiveSession` is the only code that starts or stops anything. Running = app in foreground **and** map ready. Navigation focus is ignored.
- No React, React Native or Expo. Time from the injected `Clock`, randomness from `Rng`.
- `store.ingest()` creates no objects per fix: typed arrays, reused `changed` array.
- Frames are reused buffers — receivers copy. Still frames hold **every** still pin (map sources are replace-all); gliding members are left out of them.
- Motion frames carry target + duration, not timestamps: the map glides on its own clock. Duration 0 = snap (confirmed GPS jump).
- Who glides is decided on the 1 s tick, with the still frame in the same tick, so a pin is never drawn twice and the still source stays ≤ 1×/s. Taps, zooms and budget changes apply at once.
- Session behaviour comes from the `SessionProfile` (event / race / trip): jump speed, trail window, capacity, step.
- Presence comes from when we last heard (fix or heartbeat), never from movement.

**Tests:** `pnpm test src/core/engine` with `FakeDeviceManager`, `FakeFeedManager`, `FakeMapManager` from `@testing/fakes` (virtual time via `device.clock.advance(ms)`). The replay fingerprint (`src/testing/replay`) runs the engine on all three scenarios with every fault on: if it changes, behaviour changed.

**Design:** `docs/design.md` §2.4.
