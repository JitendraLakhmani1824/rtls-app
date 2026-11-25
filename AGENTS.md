# RTLS — guide for AI assistants

Live location sharing for events: friends' pins and short trails on one map — smooth with hundreds of people on screen, cheap on battery. A case study (Principal Engineer, Mobile). Expo SDK 58 · React Native 0.88 (New Architecture) · TypeScript · MapLibre.

**Status:** M5 — complete for the brief: live map (still + gliding pins on the UI thread, trails, presence), friend list and Detail sheet, sharing policy with a battery model. Default session: 10 friends. Results in `docs/results/`.

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
src/app/          start-up wiring: container.ts (the only file that creates managers), navigation, Root
src/features/x/   screens: XScreen + useX (views/ and logic/ only when needed)
src/managers/x/   talk to the outside world (map, feed, device); implement core protocols
src/common/       ui, utils, di (ManagersProvider, useManagers), navigation route types
src/core/         pure TypeScript: utils → models → protocols → engine, sharing
src/lab/          dev-only: spike, ladder, perf recorder, battery table
src/testing/      fakes, contract tests, createTestManagers
```

## Rules (each is enforced by a check — the error message tells you the fix)

1. **Location data never enters React state.** Positions and trails live in `core/engine`; screens read a once-a-second snapshot via `useRows` / `useSelected` / `useConnection`.
2. **Screens see only `{ session, MapView }`** from `useManagers()`. They never import `managers/`, `core/engine` or `core/sharing`.
3. **Features never import each other.** They navigate by route name.
4. **Import another folder only through its `index.ts`.** See `docs/import-rules.md`.
5. **`core` is pure TypeScript:** no React, React Native or Expo. Time comes from `Clock`, randomness from the seeded `Rng` — `Date.now()` and `Math.random()` are lint errors in `core` and `common`.
6. **Only `app/container.ts` and tests create managers.** No singletons, no module-level state outside `lab/`.
7. **Protocols only at boundaries** (feed, map, device, session, perf). Internal classes are concrete and tested directly.
8. **Hot paths use typed arrays,** not objects per point. The map gets plain numbers; `managers/map` turns them into GeoJSON.
9. **Selection lives only in the session.** The Detail sheet opens when `selected` becomes non-null and calls `select(null)` when dismissed.
10. **Never call `enableFreeze()`** — the map must keep drawing under the Detail sheet.

## Recipes

**Add a screen:** `src/features/x/` with `XScreen.tsx` + `useX.ts` + `index.ts` → add the route type in `src/common/navigation/routes.ts` → register it in `src/app/navigation.tsx` → test `useX` with `renderHook` + `createTestManagers()`.

**Add a manager:** protocol in `src/core/protocols` (doc comment stating its promises) → implementation in `src/managers/x/` → fake in `src/testing/fakes` → contract test both pass → one line in `src/app/container.ts`. Or use the `new-manager` skill.

## Tests

Name tests as behaviours ("drops a fix older than the last one"). Use fakes and virtual time (`FakeClock`), never real timers or network. Keep the replay fingerprint test green — if it changes, the behaviour changed: say so and why.

## Don't

Edit `ios/`, `android/` or `docs/import-rules.md` by hand · add packages with npm/yarn · log coordinates · mention other projects.
