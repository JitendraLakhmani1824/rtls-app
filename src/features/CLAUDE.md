# features — screens

Each feature is a folder: `XScreen.tsx` (thin wiring) + `useX.ts` (data + actions) + `index.ts`. Add `views/` past ~150 lines and `logic/` only for real logic.

**What a screen may see:** `useManagers()` → `{ session, MapView }`, plus the hooks `useSelected()`, `useConnection()` (and `useRows()` from M5). Nothing from `managers/`, `core/engine` or `core/sharing`.

**Rules**

- Location data never enters React state: screens read the session's snapshot hooks, which change at most once a second.
- Features never import each other; navigate by route name (`common/navigation/routes.ts`).
- Selection lives only in the session. The Detail sheet (M5) opens when `selected` becomes non-null; dismissing it calls `session.select(null)`.

**Tests:** `useX` with `renderHook`, a fake `session` and a stub navigation object.

**Current screens:** `home` (live map + connection chip). `detail` arrives in M5.
