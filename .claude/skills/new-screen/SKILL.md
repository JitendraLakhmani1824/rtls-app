---
name: new-screen
description: Add a screen (a feature folder) the RTLS way — Screen + hooks/ + views/, route, navigation, deep link if any, hook test. Use whenever the app needs a new page, tab or sheet.
---

# Add a screen

Every feature has the same shape, so a reviewer can see how the app grows. `pnpm verify` checks it (`scripts/check-features.mjs`).

```
src/features/<name>/
  index.ts             export { XScreen } from './XScreen';
  XScreen.tsx          calls useX(), lays out views — no @common/di, no navigation
  hooks/useX.ts        data + actions: useManagers(), navigation, snapshot hooks
  hooks/useX.test.tsx  renderHook + createTestManagers()
  views/*.tsx          props-only components (import only types from hooks/)
```

## Steps

1. **Route type** in `src/common/navigation/routes.ts` (params, or `undefined`). Selection-driven sheets have no params.
2. **Hook** `hooks/useX.ts`: read with `useSessionList()`, `usePeople()`, `useProfile()`, `useLive()`, `useRows(session)`…; act through `sessions.*`, `live.*`, `photos.*`; navigate by route name. Return plain data and functions. Export the types views need (`export type XItem = …`).
3. **Views** in `views/`: props in, JSX out. Colours, sizes, type from `@common/ui` (`colors`, `radius`, `typeScale`); `ScreenHeader`, `PrimaryButton`, `Avatar`, `StatTile` already exist. Memoise list rows.
4. **Screen** `XScreen.tsx`: `const x = useX();` then lay out views. Pad tab screens' lists by `TAB_BAR_SPACE`.
5. **Register** it in `src/app/navigation.tsx` (a stack screen, a tab, or `presentation: 'formSheet'`); add a path in `src/app/linking.ts` if a link opens it, and a case in `linking.test.ts`.
6. **Test** the hook: behaviours, not lines (`it('opens the map once the session is saved')`). Mock navigation with a `mockNavigation` object.
7. `pnpm verify`, then look at it on the simulator (`pnpm ios`).

## Don'ts

Features never import each other (navigate by name). No location data in React state. No hex colours. No logic in views — if it isn't layout, it goes in the hook or `logic/`.
