# RTLS — guide for AI assistants

Live location sharing for events: friends' pins and short trails on one map — smooth with hundreds of people on screen, cheap on battery. A case study (Principal Engineer, Mobile). Expo SDK 58 · React Native 0.88 (New Architecture) · TypeScript · MapLibre.

**Status:** feature-complete for the brief, plus an app around it: onboarding and a profile (name, photo), Sessions and Friends tabs, several saved sessions (one a 150-person running club), invite links (`rtls://join/…`), a live map per session (still + gliding pins on the UI thread, trails, presence, my location, a camera that flies to and follows friends), friend sheet and person page, sharing policy with a battery model, Low Power Mode budget. Results in `docs/results/`.

| Read                   | For                                                                            |
| ---------------------- | ------------------------------------------------------------------------------ |
| `docs/prd.md`          | What we build                                                                  |
| `docs/design.md`       | How it works (HLD + LLD) — the source of truth for the engine, map and battery |
| `docs/plan.md`         | Stack, rules, milestones                                                       |
| `docs/import-rules.md` | Who may import whom (generated — never edit by hand)                           |

## Commands

```bash
pnpm verify                 # typecheck + lint + import rules + tests + import-rules doc current. Must pass before you say "done".
pnpm test <path>            # Jest for one folder
pnpm ios                    # dev build on the iOS simulator
pnpm android                # dev build on a USB-connected Android phone
pnpm android:release        # release build — the only builds whose performance numbers count
pnpm gen:rules              # regenerate docs/import-rules.md after editing .dependency-cruiser.cjs
npx expo install <package>  # add packages this way (SDK-compatible versions), never npm/yarn
```

## Expo changes fast — don't trust memory

Before touching an Expo, EAS or React Native API, check the docs for **SDK 58**: `https://docs.expo.dev/versions/v58.0.0/` (index: `https://docs.expo.dev/llms.txt`). For MapLibre read the installed types in `node_modules/@maplibre/maplibre-react-native/lib/typescript/`. `ios/` and `android/` are generated (CNG): configure native behaviour in `app.config.ts` and config plugins, never by hand. Navigation is **React Navigation** (not Expo Router).

## Folders

```
src/app/          start-up wiring: container.ts (the only file that creates managers), navigation, linking, Root
src/features/x/   screens: XScreen.tsx (thin) + hooks/useX.ts (+ test) + views/ (props-only) [+ logic/]
src/managers/x/   talk to the outside world (map, feed, device); implement core protocols
src/common/       ui, utils, di (ManagersProvider, useManagers), navigation route types
src/core/         pure TypeScript: utils → models → protocols → engine, sessions, sharing
src/lab/          dev-only: spike, ladder, perf recorder, battery table
src/testing/      fakes, contract tests, createTestManagers
```

## Rules (each is enforced by a check — the error message tells you the fix)

1. **Location data never enters React state.** Positions and trails live in `core/engine`; screens read a once-a-second snapshot via `useRows` / `useSelected` / `useConnection`.
2. **Screens see only `{ sessions, live, photos }`** from `useManagers()`: the saved book and your profile, the open map's `{ session, MapView }`, and the photo picker. They never import `managers/`, `core/engine`, `core/sessions` or `core/sharing`.
3. **Features never import each other.** They navigate by route name.
4. **Import another folder only through its `index.ts`.** See `docs/import-rules.md`.
5. **`core` is pure TypeScript:** no React, React Native or Expo. Time comes from `Clock`, randomness from the seeded `Rng` — `Date.now()` and `Math.random()` are lint errors in `core` and `common`.
6. **Only `app/container.ts` and tests create managers.** No singletons, no module-level state outside `lab/`.
7. **Protocols only at boundaries** (feed, map, device, session, perf). Internal classes are concrete and tested directly.
8. **Hot paths use typed arrays,** not objects per point. The map gets plain numbers; `managers/map` turns them into GeoJSON.
9. **Selection lives only in the session.** The Detail sheet opens when `selected` becomes non-null and calls `select(null)` when dismissed.
10. **Never call `enableFreeze()`** — the map must keep drawing under the Detail sheet.

## Design

Colours, radius, shadow and type sizes live in `src/common/ui/theme.ts` (palette: Whiteout, Nebulous White, Astroscopus Grey, Indian Dance coral, Hypnotic slate, Tricon Black). Coral is for fills; text on coral is ink; coral text uses `accentInk`. No hard-coded colours in screens.

## Recipes

**Add a screen:** `src/features/x/` with `index.ts`, `XScreen.tsx`, `hooks/useX.ts` + test, `views/` → route type in `src/common/navigation/routes.ts` → register in `src/app/navigation.tsx` (and `src/app/linking.ts` if a link opens it). `pnpm verify` checks the shape. Or use the `new-screen` skill.

**Ship a build:** the `release` skill (APK, screenshots, demo videos, README, GitHub release).

**Add a manager:** protocol in `src/core/protocols` (doc comment stating its promises) → implementation in `src/managers/x/` → fake in `src/testing/fakes` → contract test both pass → one line in `src/app/container.ts`. Or use the `new-manager` skill.

Folder cards (`CLAUDE.md`) in `src/app`, `src/common`, `src/features`, `src/core/engine`, `src/core/sessions`, `src/managers` (+ `map`, `feed`), `src/testing`, `src/lab`, `scripts`. Skills: `new-screen`, `new-manager`, `run-scenario`, `perf-check`, `release`.

## Tests

Name tests as behaviours ("drops a fix older than the last one"). Use fakes and virtual time (`FakeClock`), never real timers or network. Keep the replay fingerprint test green — if it changes, the behaviour changed: say so and why.

## Don't

Edit `ios/`, `android/` or `docs/import-rules.md` by hand · add packages with npm/yarn · log coordinates · mention other projects.
