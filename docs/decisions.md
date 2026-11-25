# Decisions

Short log of choices made after the plan was closed. Newest first.

| Date | Decision | Why | Cost / revisit when |
| --- | --- | --- | --- |
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
