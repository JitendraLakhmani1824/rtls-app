# Decisions

Short log of choices made after the plan was closed. Newest first.

| Date | Decision | Why | Cost / revisit when |
| --- | --- | --- | --- |
| 2026-11-26 | Grouping only above 30 friends; selecting a friend zooms in and follows them; the feed sends the last 5 min on open | The brief is about tracking friends: a small group should never hide anyone in a "2", trails should be there when you open the map (a real join snapshot carries them), and a selected friend should stay in view | Large sessions keep grouping and the original glide rule |
| 2026-11-26 | App opens on a start page (event + 1–20 friends); Leave returns to it; scenario links skip it | A clear way in and out for a reviewer; measurement scripts keep using links | — |
| 2026-11-26 | Scope trimmed: no 1,000-friend re-run, no fade comparison, no viewer power measurement; default session is 10 friends | The brief judges smooth pins, battery and structure, not grouping or a full matrix; a real group of friends is ~10 | Re-run the ladder if a reviewer asks for scale numbers |
| 2026-11-26 | Sharing policy is a pure function of speed, watched, battery and Low Power Mode | Testable without a device; the battery model runs the same code | — |
| 2026-11-26 | Ladder rungs B and C build a GeoJSON object per pin (the common way) and pass it through React state; no clustering, no gliding | They stand for what a typical app does, so each later step's gain is visible | — |
| 2026-11-26 | `PerfRecorder` reports event-loop lag beyond one frame (`jsLagMs`), long tasks (> 50 ms) and Hermes GCs | jsFps alone hides busy-but-not-dropping JS. React Native fires timers on frame boundaries, so up to 17 ms late is normal and not counted | — |
| 2026-11-26 | Late fixes in `withFaults` arrive 1–2 s late (was one 250 ms batch) | A friend sends one fix a second, so one batch late rarely landed after a newer fix: the fault wasn't testing out-of-order delivery | — |
| 2026-11-26 | Accuracy halo travels in both `PinFrame` and `MotionFrame` (`haloM`, 5 numbers each) | The selected friend glides (so a cluster never hides it) and must keep its halo | — |
| 2026-11-26 | Selection ring on still pins via feature state; `setSelected` no longer re-encodes still pins | Selecting is paint-only. The selected friend usually glides, so the ring mostly comes from the moving source's `s` flag | — |
| 2026-11-26 | Who glides is re-decided on the 1 s tick (with the still frame), and a gliding pin keeps gliding down to 1 point/s (starts at 2) | Deciding on every batch made walkers flap in and out of gliding with GPS noise: the still source went out ~3×/s and pins showed twice between sources. Replay: still frames 164 → 63 per minute | A pin starts gliding up to 1 s late |
| 2026-11-26 | The GPS-jump speed check subtracts both fixes' accuracy from the distance | Normal noise at 1 Hz (a few metres) exceeded the 4 m/s event limit, so walkers' pins snapped instead of gliding | — |
| 2026-11-26 | `Live` window has a 10 s floor (2.5× the interval, at least 10 s) | At 1 s fixes, two lost fixes flickered a walker to `Recent` | — |
| 2026-11-26 | The synthetic feed's GPS error drifts (random walk pulled to zero, ≈ 1.5 m) instead of fresh noise per fix | Real receivers smooth their output; fresh noise each fix made gliding pins zigzag | — |
| 2026-11-26 | `systemClock` in its own file in `managers/device` | So the clock contract test runs without React Native | — |
| 2026-11-26 | `MotionFrame` = target + duration (4 numbers), not start/end timestamps (7) | M0 showed the UI thread and JS run on different clocks; with durations the renderer starts each glide from where it draws the pin, on its own clock — no clock mapping, works for a future native renderer too | — |
| 2026-11-26 | Reference phone: OnePlus 10T (Snapdragon 8+ Gen 1, Android 15); Android builds use Android Studio's bundled JDK 17 (`JAVA_HOME`) | The phone available for measurement; React Native's Android build needs JDK 17 and the system Java is 22 | Upper-end chip flatters the numbers, so the README says so. A mid-range run would strengthen the results |
| 2026-11-26 | Expo project `@harrylakhmani/rtls` (ID `eb8cce8b-…`), owner set in `app.config.ts`; `eas.json` profiles `development` and `preview` | Builds and share links come from EAS | — |
| 2026-11-26 | ESLint pinned to 9.x | `eslint-config-expo` 58 bundles `eslint-plugin-react`, which crashes on ESLint 10 (`context.getFilename` removed) | Move to 10 when Expo's config supports it |
| 2026-11-26 | TypeScript paths without `baseUrl`; `"types": ["jest"]` | TS 6 deprecates `baseUrl` and no longer includes `@types/*` by default | — |
| 2026-11-26 | Import rules: `lab/*` and `testing/*` subfolders are units, like `features/*` | Each lab tool and test kit has its own `index.ts` front door | — |
| 2026-11-26 | dependency-cruiser allow-rules carry their name in the comment (`name — text`) | The `allowed` schema has no `name` field; the generator splits it out for `docs/import-rules.md` | — |
| 2026-11-26 | Map update path: worklet (Reanimated animated props) for every-frame sources; leaf-component prop for 1 Hz sources; `setNativeProps` as fallback | M0 on the OnePlus 10T: worklet reaches 30 updates/s with 0 ms JS; `setNativeProps` costs ~4 ms JS/update; all paths keep map frame gaps ≤ 34 ms | Real-iPhone run still pending (main-thread parsing on iOS) |
| 2026-11-26 | Map frame metric = SurfaceFlinger present times (`scripts/map-frames-android.sh`) | MapLibre's `onDidFinishRenderingFrame` under-counts on both platforms; ColorOS blocks `screenrecord` over adb | iOS: screen recordings / Instruments |
| 2026-11-26 | Local Android release builds are arm64-only (`pnpm android:release`); EAS builds keep all CPU types | The universal APK is 134 MB, slow to build and to install; the test phone is arm64 | — |
| 2026-11-26 | `pnpm ios` sets `LANG=en_US.UTF-8` | CocoaPods fails without a UTF-8 locale, and non-interactive shells (CI, AI agents) often have none | — |
| 2026-11-26 | Watchman off for Jest and Metro | The local Homebrew watchman is broken (missing ICU library); file crawling is fast enough for this repo | Re-enable after `brew reinstall watchman` |
| 2026-11-26 | pnpm with `node-linker=hoisted` | React Native autolinking and Metro expect a flat `node_modules` | — |
| 2026-11-26 | Expo's template `AGENTS.md` replaced by ours | It mandates Expo Router; we use React Navigation. Its Expo rules (check SDK docs, `npx expo install`, never edit `ios/`/`android/`) are kept | — |
