# features — screens

Every feature has the same shape (checked by `scripts/check-features.mjs` in `pnpm verify`):

```
features/<name>/
  index.ts           exports <Name>Screen
  <Name>Screen.tsx   thin: calls the hook, lays out views
  hooks/             useX.ts (data + actions) + useX.test.tsx; the only files that use managers or navigation
  views/             components that take props (import only types from hooks/)
  logic/             optional: pure functions, only for real logic
```

**What a hook may see:** `useManagers()` → `{ sessions, live, photos }`: the saved book and your profile (`Sessions` protocol), the live maps, the photo picker. Hooks: `useSessionList()`, `usePeople()`, `useProfile()`, `useLive()` (the open map's `{ id, session, MapView }`), and for a session `useSelected(session)`, `useConnection(session)`, `useRows(session)`, `useLiveRow(key)`. Text formatting lives in `@common/utils`. Nothing from `managers/`, `core/engine`, `core/sessions` or `core/sharing`.

**Rules** (lint errors say how to fix)

- Location data never enters React state: hooks read the session's snapshot hooks, which change at most once a second.
- Features never import each other; navigate by route name (`common/navigation/routes.ts`).
- Screens and views don't import `@common/di` or React Navigation; views don't call hooks (only `import type` from `hooks/`). A view that must mount lazily is wrapped by a small component in the screen file (see `session-map`).
- No hard-coded colours: `colors` from `@common/ui`.
- Selection lives only in the session. The friend sheet opens when `selected` becomes non-null; dismissing it calls `session.select(null)`.
- A session runs only while its map screen is mounted: `useSessionMap` opens it on focus and closes it on unmount.
- Tab screens pad their lists by `TAB_BAR_SPACE` (the floating tab bar).

**Tests:** `hooks/useX.test.tsx` with `renderHook` (async in RNTL 14: `await renderHook`, `await act`), `createTestManagers()` from `@testing/fakes` (`await managers.sessions.load()` for the sample book; `managers.session` is the open map's fake session), and `jest.mock('@react-navigation/native')` with a `mockNavigation` object (Jest only allows `mock*` names in mock factories).

**Screens:** `onboarding` (first launch, outside navigation), tabs `sessions` and `friends`, `profile`, `new-session`, `join` (invite link), `session-map`, `detail` (the friend sheet), `person`. Add one with the `new-screen` skill.
