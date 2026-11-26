# features — screens

Each feature is a folder: `XScreen.tsx` (thin wiring) + `useX.ts` (data + actions) + `index.ts`. Add `views/` past ~150 lines and `logic/` only for real logic.

**What a screen may see:** `useManagers()` → `{ sessions, live }`: the saved book (`Sessions` protocol) and the live maps. Hooks: `useSessionList()`, `usePeople()`, `useMyName()`, `useLive()` (the open map's `{ id, session, MapView }`), and for a session `useSelected(session)`, `useConnection(session)`, `useRows(session)`, `useLiveRow(key)`. Text formatting lives in `@common/utils`. Nothing from `managers/`, `core/engine`, `core/sessions` or `core/sharing`.

**Rules**

- Location data never enters React state: screens read the session's snapshot hooks, which change at most once a second.
- Features never import each other; navigate by route name (`common/navigation/routes.ts`).
- Selection lives only in the session. The Detail sheet opens when `selected` becomes non-null; dismissing it calls `session.select(null)`.
- `useRows()` costs work every second (all friends, sorted): fine for a group; call it only from components on screen.
- A session runs only while its map screen is mounted: `useSessionMap` opens it on focus and closes it on unmount.

**Tests:** `useX` with `renderHook` (async in RNTL 14: `await renderHook`, `await act`), `createTestManagers()` from `@testing/fakes` (`await managers.sessions.load()` for the sample book; `managers.session` is the open map's fake session), and `jest.mock('@react-navigation/native')` with a `mockNavigation` object (Jest only allows `mock*` names in mock factories).

**Current screens:** tabs `sessions` and `friends`; `new-session`, `join` (invite link), `session-map` (map, Back, title card with connection, Invite, friends panel), `detail` (the selected friend, a native form sheet, View details) and `person` (one person's page). Shared look: `@common/ui` (colours, `ScreenHeader`, `PrimaryButton`, `Avatar`, `StatTile`, `StatusChip`, `DirectionArrow`, icons, `EVENTS`).
