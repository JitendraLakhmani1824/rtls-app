# RTLS — real-time location sharing

Friends' live locations on one map, with a short trail of recent movement. Smooth with many people on screen, light on battery. Case study for Principal Engineer, Mobile.

Expo SDK 58 · React Native 0.88 (New Architecture) · TypeScript · MapLibre · Reanimated worklets.

## The brief, and where each part is answered

| The brief asks for | Answer | Where |
| --- | --- | --- |
| Friends' real-time locations on a map | Pins from a seeded synthetic feed (concert, marathon, trip) behind the same protocol a server feed would use | `src/managers/feed`, `src/core/engine` |
| A trail of recent movement | Per-friend trail, fixed memory, fading with age; breaks at GPS jumps and gaps instead of drawing straight lines across them | `src/core/engine/trails.ts` |
| **Smooth** with **many users** | Friends who stand still update at most once a second; moving friends **glide on the UI thread with zero JavaScript per frame**; location data never enters React state | `src/managers/map`, `docs/results/` |
| Minimise **battery drain** | Sharing phone: GPS and send rate follow speed and whether anyone is watching. Viewing phone: nothing redraws unless something changed; paused in the background | `src/core/sharing`, `docs/results/m4-battery.md` |
| Minimise **performance issues** | Typed arrays on the hot path, still pins re-encoded only when they change, animation budget that shrinks in Low Power Mode or heat | `src/core/engine`, `docs/results/m3-map.md` |
| **Recognise when native optimisation helps** | The per-frame pin animation is the native-shaped part: today a UI-thread worklet; next a native animator behind the same `MapManager` protocol, with the trigger stated | `docs/design.md` §2.8 |
| Structure for future scalability | Pure TypeScript core behind protocols, one composition root, import rules checked on every change | `docs/design.md` §2.1, `docs/import-rules.md` |
| HLD + LLD | Requirements, architecture, flows, wire format, battery, scaling, failures (HLD); engine, map, screens, battery, testing (LLD) | `docs/design.md` |
| Code: update the pins on the map | Feed → `LiveSession` → map, with presence, trails, faults and a replay test | `src/` |

## Numbers (OnePlus 10T, release build)

- **200 friends, zoomed out:** the "one marker view per friend" approach draws its UI at ~5 fps; ours draws the map at 19 frames/s, 2.5× fewer than a single rebuilt source (~48 frames/s). Details and caveats: `docs/results/m3-map.md`.
- **Gliding at street zoom:** frame gaps p50 16.7 ms, max 33.5 ms; JS 58–60 fps (`docs/results/m2-engine.md`).
- **Sharing battery (model):** 0.3–0.6 %/h standing still or unwatched vs 3.4 %/h for GPS-every-second; live updates for a watched runner cost 2.8 %/h (`docs/results/m4-battery.md`).

## Run it

```bash
pnpm install
pnpm ios                 # iOS simulator (dev build)
pnpm android:release     # Android phone over USB (release: the only numbers that count)
pnpm verify              # typecheck, lint, import rules, tests
```

Scenario links: `rtls://scenario?name=marathon&friends=200&faults=drops,jumps&perf=1`. The default is 10 friends at a concert. All parameters: `.claude/skills/run-scenario/SKILL.md`.

## Code tour

```
src/core/engine    LiveSession (starts/stops everything) → presenter (what to draw) → store, trails, presence
src/core/sharing   the sharing phone's GPS/send policy
src/managers/map   MapLibre: still pins (≤ 1×/s), gliding pins (UI-thread worklet), trails, halo
src/managers/feed  synthetic friends + fault injection (drops, duplicates, late fixes, jumps)
src/features       Home (map, badge, friend list) and Detail (native sheet for the selected friend)
src/app            composition root and deep links
src/lab            comparison ladder (A–D), PerfRecorder, battery model — dev only
```

## How AI was used

Built with Claude Code. The repository is set up so an assistant follows the architecture without being told: `AGENTS.md` and per-folder `CLAUDE.md` cards, path rules, import rules that fail the build with a fix-it message, a hook that runs `pnpm verify` before finishing, and skills to run a scenario on a device. Measurements and conclusions were checked on the phone; two of our own measurement mistakes were caught that way and corrected in the notes.

## Not built

A real server and real GPS, camera buttons, measured viewer energy, and the phone's heat signal (Low Power Mode is wired; heat needs a small native module behind `DeviceManager.power`).
