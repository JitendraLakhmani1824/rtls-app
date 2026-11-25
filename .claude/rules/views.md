---
paths:
  - "src/features/**"
---

# Rules for screens (src/features)

- A feature is `XScreen.tsx` (thin wiring) + `useX.ts` (data + actions). Add `views/` past ~150 lines, `logic/` only for real logic.
- `useX` is the only file that calls `useManagers()` or navigation. It gets **only** `{ session, MapView }` — never import `@managers/*`, `@core/engine` or `@core/sharing`.
- Read session state with `useRows()`, `useSelected()`, `useConnection()`. Never subscribe to per-frame data; location updates must cause **zero** React renders.
- Views take props and return JSX. Memoise list rows; use fixed row heights.
- Selection lives only in the session: open the `Friend` sheet when `selected` becomes non-null; dismissing calls `session.select(null)`. The route has no params.
- Never call `enableFreeze()`. Layout reads window size, never screen size. Portrait only.
- Function components and hooks only (the one class is `ErrorBoundary` in `common/ui`).
