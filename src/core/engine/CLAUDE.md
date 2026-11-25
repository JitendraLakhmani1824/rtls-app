# core/engine — the fast lane

Turns location fixes into what the map draws. Pure TypeScript.

**Start with:** `LiveSession.ts` (the controller) → `glide.ts` (who glides, who stays still) → `store.ts` (latest position per member).

**Invariants**
- `LiveSession` is the only code that starts or stops anything. Running = app in foreground **and** map ready. Navigation focus is ignored.
- No React, React Native or Expo. Time from the injected `Clock`, randomness from `Rng`.
- `store.ingest()` creates no objects per fix: typed arrays, reused `changed` array.
- Frames are reused buffers — receivers copy. Still frames hold **every** still pin (map sources are replace-all); gliding members are left out of them.
- Motion frames carry target + duration, not timestamps: the map glides on its own clock.

**Tests:** `pnpm test src/core/engine` with `FakeDeviceManager`, `FakeFeedManager`, `FakeMapManager` from `@testing/fakes` (virtual time via `device.clock.advance(ms)`).

**Design:** `docs/design.md` §2.4.
