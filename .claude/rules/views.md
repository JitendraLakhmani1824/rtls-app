---
paths:
  - 'src/features/**'
---

# Rules for screens (src/features)

- Shape: `index.ts`, `<Name>Screen.tsx` (thin), `hooks/useX.ts` + test, `views/` (props-only), optional `logic/`. `node scripts/check-features.mjs` says what's wrong.
- `hooks/useX.ts` is the only file that calls `useManagers()` or navigation. It gets **only** `{ sessions, live, photos }` — never import `@managers/*`, `@core/engine`, `@core/sessions` or `@core/sharing`.
- Screens call their hook and lay out views; views take props (only `import type` from `hooks/`). Lint enforces both.
- Read session state with `useRows(session)`, `useSelected(session)`, `useConnection(session)`, `useLiveRow(key)`. Never subscribe to per-frame data; location updates must cause **zero** React renders.
- Memoise list rows; use fixed row heights. Colours, sizes and type from `@common/ui` (`colors`, `radius`, `typeScale`) — no hex literals.
- Selection lives only in the session: open the `Friend` sheet when `selected` becomes non-null; dismissing calls `session.select(null)`. The route has no params.
- Never call `enableFreeze()`. Layout reads window size, never screen size. Portrait only.
- Function components and hooks only (the one class is `ErrorBoundary` in `common/ui`).
