# features — screens

Each feature is a folder: `XScreen.tsx` (thin wiring) + `useX.ts` (data + actions) + `index.ts`. Add `views/` past ~150 lines and `logic/` only for real logic.

**What a screen may see:** `useManagers()` → `{ session, MapView }`, plus the hooks `useSelected()`, `useConnection()`, `useRows()`. Text formatting lives in `@common/utils`. Nothing from `managers/`, `core/engine` or `core/sharing`.

**Rules**

- Location data never enters React state: screens read the session's snapshot hooks, which change at most once a second.
- Features never import each other; navigate by route name (`common/navigation/routes.ts`).
- Selection lives only in the session. The Detail sheet opens when `selected` becomes non-null; dismissing it calls `session.select(null)`.
- `useRows()` costs work every second: call it only in components that are on screen (the list mounts only while the panel is open).

**Tests:** `useX` with `renderHook` (async in RNTL 14: `await renderHook`, `await act`), `createTestManagers()` from `@testing/fakes`, and `jest.mock('@react-navigation/native')` with a `mockNavigation` object (Jest only allows `mock*` names in mock factories).

**Current screens:** `home` (map, connection badge, friend list panel) and `detail` (the selected friend, a native form sheet).
