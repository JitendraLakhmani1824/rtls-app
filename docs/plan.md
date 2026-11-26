# RTLS — Build Plan

v1.0 · **Final** · 2026-11-26. Later changes are logged in `docs/decisions.md`.

| Doc | Answers |
| --- | --- |
| `docs/prd.md` | What we build |
| `docs/design.md` | How it works (HLD + LLD) |
| `docs/plan.md` | How we build it: stack, rules, AI setup, measurement, milestones |

**Approach:** one Expo app that does one thing very well — many friends' pins moving smoothly on a map — and proves it with numbers, for rendering and for battery. A design doc covers everything we don't build.

---

## 1. Deliverables

| Deliverable | Contents |
| --- | --- |
| App repo | Expo app (portrait phone), fake friend generator, comparison ladder A–D, perf recorder, battery model, `.claude/` committed |
| README | What it is, how to run, a code tour ("pins update here", five files), results, how AI was used |
| `docs/design.md` | HLD + LLD |
| Demo video (~90 s) | Scripted with deep links on the Android phone |
| Android APK | EAS internal-distribution link |
| iOS simulator build | EAS, unsigned `.app` for reviewers on a Mac |

---

## 2. Pre-flight

1. `git init`, `main` branch. Node 22, pnpm 10, Xcode 26.6 and adb are installed.
2. Keep the brief PDF local: `docs/brief/` is git-ignored.
3. `eas login` (you), then `eas init`.

---

## 3. Stack

Checked against the Expo SDK 58 compatibility list and npm, 2026-11-25/26. Native packages go in with `npx expo install`, each when its milestone needs it.

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | Expo SDK 58, dev build | `expo ~58.0.26` |
| Runtime | React Native 0.88 (New Architecture), React 19.3 | `0.88.1` / `19.3.0` |
| Language | TypeScript (typescript-eslint supports `<6.1`) | `~6.0.3` |
| Map | MapLibre React Native | `11.5.1` |
| Map style | OpenFreeMap Positron, bundled as JSON; `Noto Sans *` fonts only | — |
| Navigation | React Navigation native stack | `@react-navigation/native ^7.5`, `@react-navigation/native-stack ^7.21`, `react-native-screens ~4.30.1`, `react-native-safe-area-context ~5.11.1` |
| Deep links | `expo-linking` | `~58.0.17` |
| Power signals | `expo-battery` | `~58.0.4` |
| Gestures / animation | Gesture Handler 3 + Reanimated 4 (friend-list panel) | `~3.3.0` / `4.7.1` |
| Tests | `jest-expo` + Testing Library RN | `~58.0.15` / `14.1` |
| Quality | ESLint (`eslint-config-expo` + `typescript-eslint`), Prettier, dependency-cruiser | depcruise `18.9` |

| Stage | Where | How |
| --- | --- | --- |
| Development | iOS simulator | `npx expo run:ios` |
| On the phone | Android phone (USB) | `npx expo run:android --device` |
| **Measuring** | **Android phone, release build only** | Dev builds run JS in debug mode |
| iOS check | Real iPhone, if available | One Instruments run, or the gap is stated |
| Sharing | EAS `preview` profile | `distribution: internal`, Android `buildType: apk`, iOS `simulator: true` |

---

## 4. Architecture rules

How it works is in `design.md` §2.1–2.6. These are the rules the code must follow.

### 4.1 Folders

```
src/
├── app/            start-up wiring: container.ts · launch-params.ts · navigation.tsx · Root.tsx
├── features/
│   ├── home/       HomeScreen · useHome            (+ views/ past ~150 lines, logic/ only with real logic)
│   └── detail/     DetailSheet · useDetail
├── managers/       talk to the outside world, implement core protocols
│   ├── map/        MapLibreManager · MapView · layers · encode
│   ├── feed/       SyntheticFeedManager · scenarios/ · tracks · withFaults
│   └── device/     ExpoDeviceManager: clock · frames · visibility · power
├── common/
│   ├── ui/         theme · Button · Badge · Avatar · Panel · ErrorBoundary
│   ├── utils/      distance / direction / "10 s ago" text
│   ├── di/         ManagersProvider · useManagers() · useRows / useSelected / useConnection
│   └── navigation/ routes.ts (RootStack types)
├── core/
│   ├── utils/      geo · interpolate · ring buffer · seeded Rng
│   ├── models/     Member · Viewport · ConnState · frame layouts
│   ├── protocols/  MapManager · FeedManager · DeviceManager · Session · Perf · LocationSource · Uplink
│   ├── engine/     LiveSession · store · trails · presence · presenter · budget
│   └── sharing/    SharingPolicy · radio model · simulated GPS + uplink
├── lab/            dev only: ladder rungs · PerfRecorder + overlay · battery table
└── testing/        fakes · contract tests · createTestManagers
modules/rtls-thermal/   native heat reader (P2)
```

### 4.2 Imports

| Folder | May import |
| --- | --- |
| `app`, `lab` | everything (`lab` not `app`) |
| `features/*` | `core/protocols`, `core/models`, `core/utils`, `common`, React, React Native, React Navigation |
| `managers/*` | `core/protocols`, `core/models`, `core/utils`; MapLibre only in `managers/map`; `expo-battery` and `modules/rtls-thermal` only in `managers/device` |
| `common/*` | `core/protocols`, `core/models`, `core/utils` |
| `core/engine`, `core/sharing` | `core/protocols`, `core/models`, `core/utils` — imported only by `app`, `lab`, `testing` |
| `core/protocols` → `core/models` → `core/utils` | each only the ones to its right |
| `testing` | everything; used only by `*.test.ts(x)` |

Also:
- no cycles;
- import through each folder's `index.ts` only;
- features never import each other;
- only `app/` and tests create managers;
- no singletons or module-level state;
- no `Date.now()` / `Math.random()` in `core` and `common`;
- `core` never imports React, React Native or Expo.

The rules are a dependency-cruiser **allow-list**; `docs/import-rules.md` is generated from it.

### 4.3 Naming

- `*Manager` means an implementation in `managers/` that talks to the outside world (`MapLibreManager`, `SyntheticFeedManager`, `ExpoDeviceManager`).
- The engine's controller is `LiveSession`, implementing `Session`.
- The map component is `MapView` everywhere.

### 4.4 Dependency injection

- Pure DI: constructor injection, typed as protocols. No container library: decorator-based ones need `reflect-metadata`, which Metro doesn't emit.
- `app/container.ts` creates everything and starts the session; it's the only file naming implementations.
- Screens call `useManagers()` and get **only** `{ session, MapView }`.
- Tests use `createTestManagers(overrides)`.

### 4.5 Navigation and the Detail sheet

- React Navigation native stack in `app/navigation.tsx`: `Home` (headerless) and `Friend` (`DetailSheet`).
- `Friend` options:
  - `presentation: 'formSheet'`;
  - at most three fixed `sheetAllowedDetents`;
  - `sheetLargestUndimmedDetentIndex` set, so the map stays undimmed and touchable;
  - `contentStyle.backgroundColor` set.
- **Never call `enableFreeze()`**: the map must keep drawing under the sheet.
- **Selection lives only in the session:**
  - `useHome` opens the sheet when `selected` becomes non-null;
  - `useDetail` closes it when selection becomes null;
  - dismissing the sheet calls `session.select(null)`;
  - the route has no params.
- "Visible" for the session means **app in the foreground**, never navigation focus.
- **Fallback, decided now:** if the M0 sheet check fails on Android, the detail card renders inside Home's panel and React Navigation is removed.

### 4.6 State

| State | Lives in |
| --- | --- |
| Positions, trails, gliding pins | `core/engine` store, outside React |
| Selected friend, camera mode, connection | `LiveSession`, read via `useRows` / `useSelected` / `useConnection`. Each part is computed only while something subscribes to it |
| Panel open / closed | `useState` |

---

## 5. AI setup

Most code is written with LLMs. The setup is lean on text and strong on automatic checks: anything a tool can check is checked by a tool, not described in prose.

### 5.1 Guides

| File | Purpose |
| --- | --- |
| `AGENTS.md` (root, ≤ ~120 lines) | The map: product in three lines, folder map, top rules, commands, short recipes (add a screen, add a manager), links to docs |
| `CLAUDE.md` (root) | `@AGENTS.md` plus Claude-specific notes |
| `docs/import-rules.md` | Generated from the dependency-cruiser allow-list; the only place the import table is written |
| `src/core/engine/CLAUDE.md` | The fast lane: invariants, start-here file, tests to keep green |
| `src/managers/map/CLAUDE.md` | Four sources, update path, fonts, iOS vs Android, sheet constraints |
| `src/features/CLAUDE.md` | Screen shape (`XScreen` + `useX`), what a screen may see, selection flow |
| `.claude/rules/core.md` (`paths: src/core/**`) | No React/Expo; Clock and Rng only; typed arrays on hot paths; protocols state their promises |
| `.claude/rules/views.md` (`paths: src/features/**`) | Screens see `{ session, MapView }` only; props-in views; memoised rows |
| `.claude/rules/tests.md` (`paths: **/*.test.ts(x)`) | Behaviour names; fakes and virtual time; no real timers or network |
| `.claude/skills/run-scenario` | Build, launch on iOS simulator or Android, open a scenario deep link, screenshot, read PERF lines |
| `.claude/skills/perf-check` (`disable-model-invocation: true`) | Release build on Android, the measurement matrix, ABAB runs, update design §2.10 |
| `.claude/skills/new-manager` | Protocol → implementation → fake → contract test → one line in `container.ts` |
| Expo skills plugin | `/plugin marketplace add expo/skills`, `/plugin install expo`: EAS builds and Expo APIs |

### 5.2 Sensors (where the strength is)

| Check | Catches |
| --- | --- |
| `pnpm verify` | `tsc` + ESLint + dependency-cruiser + Jest + "`import-rules.md` is current". One command, also run in CI on every push |
| ESLint restrictions with fix-it messages | `Date.now` / `Math.random` / React in `core`; managers or navigation in views; `console.*` |
| dependency-cruiser allow-list (`tsPreCompilationDeps` on) | Any import outside §4.2, cycles, deep imports — each message says what to do instead |
| Tests | Unit; contract tests for feed, session and clock; lifecycle; replay fingerprint (seed → 60 virtual seconds → hash of everything sent to the map) catches unintended behaviour changes; golden files for `encode.ts` |
| Hook: after each edit (`PostToolUse`, `Edit\|Write`) | Prettier + ESLint on that file; errors go straight back |
| Hook: before finishing (`Stop`) | Runs `pnpm verify` if files changed since the last green run; on failure exits 2 with the errors so Claude keeps working. Its own counter stops after 3 failed attempts in a row and reports |
| `permissions.deny` in `.claude/settings.json` | `npm`/`yarn` installs; edits to `ios/**`, `android/**`, `.env*` |
| `run-scenario` | The change works on a real build: screenshot + PERF lines |

`.claude/settings.local.json` is git-ignored; everything else in `.claude/` is committed.

---

## 6. Measurement

- **Metrics:** map frame present times and gaps p50/p95/max from SurfaceFlinger (`scripts/map-frames-android.sh`; MapLibre's own frame event under-counts and screen recording is blocked on the test phone); JS thread busy % and long tasks; main-thread ms per source update; Hermes GC count and time; React renders per update.
- **Runs:** release build, cold start by deep link, overlay off (PERF lines come from `PerfRecorder`), fixed brightness, ABAB order, 3 runs each, battery temperature noted.
- **Matrix (12 cells):**
  - ladder A–D at 200 and 1,000 friends, concert;
  - rung D at 50 and 500, concert;
  - rung D at 200 and 1,000, marathon.
- **Energy step:** glide at 30 vs 60 fps, rung D, 500 friends.
- **Viewer energy:** on-device power rails (Perfetto / Android Studio Power Profiler) on a Pixel; otherwise Android battery stats, with the limit stated.
- **Results:** design §2.10 and the README, including the crossover point and one step that didn't help. Raw runs in `docs/results/`.

---

## 7. Milestones

≈ 7–8 working days. **Deadline pressure cuts UI, never measurement.**

| # | Milestone | Done when | ~Effort |
| --- | --- | --- | --- |
| **M0** | Setup + spike | App on the iOS simulator; EAS linked; `AGENTS.md`, `CLAUDE.md`, rules, `permissions.deny`; `pnpm verify` green; `design.md` in place. **Spike:** 30 gliding at 30×/s + 470 still + 30 trails, clustering + labels on, tap a cluster mid-update, iOS sim then Android release build; three update paths timed. **Sheet check on Android:** undimmed and touchable map, map keeps drawing, session stays Running, selection round-trip | 1½ days |
| **M1** | HLD + vertical slice | HLD written (architecture, three sequence diagrams, wire format, observability, security); feed → session → still + gliding sources; PERF lines; deep links; rung A; hooks; the three skills | 1 day |
| **M2** | Engine + fake friends | Store, trails, presence, presenter, budget, `LiveSession` lifecycle with tests (unit, contract, lifecycle, replay); 3 scenarios, faults, seeded | 1½ days |
| **M3** | Full map, measured | Trails, clustering, speed budget, feature state; rungs B–D recorded | 1 day |
| **M4** | Battery | `SharingPolicy` + battery model table; viewer energy; Low Power Mode budget | ½–1 day |
| **M5** | Screens | Home (panel, camera buttons, connection badge) + Detail sheet (or the fallback); screen tests | 1 day |
| **M6** | Results + write-up + share | 12-cell matrix + energy step; LLD results and summary; README (code tour, AI use); scripted video; EAS builds | 1 day |

**As built (scope trimmed in M3–M6: the brief judges smooth pins, battery and structure, not scale tuning):**
- M3: ladder recorded at 200 friends only; the 1,000-friend re-run and the label-fade comparison were dropped.
- M4: viewer energy not measured; Low Power Mode wired (expo-battery), heat not (needs a native module).
- M5: camera buttons dropped; the map frames everyone automatically. Default session is 4 friends plus you.
- M6: no 12-cell matrix or energy step; README, demo video and an EAS APK instead.

| Priority | What |
| --- | --- |
| **P0** | Spike + sheet check, HLD, engine, four sources + speed budget, ladder A–D, battery model table, Home + Detail, LLD results, README, video, APK, AI setup |
| **P1** | Low Power Mode budget, real-iPhone run, power-rail viewer energy, connection badge, CI |
| **P2** | `rtls-thermal` native module (2–3 h, cut first), real "my location", photo avatars, ±180° trails, split-screen check |

---

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| MapLibre v11 + RN 0.88 issues | M0 spike first; fallback MapLibre's previous major or `@rnmapbox/maps` |
| Per-frame updates too slow through the `data` prop | Three update paths timed in M0; native hand-off is the specified next step |
| Sheet dims or blocks the map, or stops it drawing | Sheet check in M0; the fallback is already decided (§4.5) |
| iOS parses map data on the main thread | Tiny per-frame payloads; real-iPhone run or a stated gap |
| Dev-build or simulator numbers mislead | Release builds on the Android phone only |
| No power rails on a non-Pixel phone | Battery model + Android battery stats, limit stated |
| LLM-written code breaks the rules | Allow-list imports, lint fix-it messages, replay fingerprint, Stop hook running `pnpm verify`, CI |
| Native module build problems | P2, time-boxed, JS stand-in behind the same protocol |

---

## 9. Open

1. Deadline.
2. Real iPhone for one measurement run?

Reference phone: **OnePlus 10T** (CPH2413, Snapdragon 8+ Gen 1, Android 15). It's an upper-end chip, so the README says numbers on a mid-range phone would be worse. It isn't a Pixel, so viewer energy uses Android battery stats unless Perfetto power rails turn out to work on it.
