# common — shared by screens

- `di/` — `ManagersProvider`, `useManagers()` → `{ sessions, live, photos }`, and the snapshot hooks (`useLive`, `useRows(session)`, `useSelected(session)`, `useConnection(session)`, `useLiveRow(key)`, `useSessionList`, `usePeople`, `useProfile`). `LiveSessions` is defined here (it carries a React component).
- `ui/` — design tokens (`theme.ts`: `colors`, `radius`, `shadow`, `typeScale`) and shared components: `ScreenHeader`, `PrimaryButton`, `Avatar` (photo or initials), `PhotoButton`, `StatTile`, `StatusChip`, `TabBar`, `askPhotoSource`, icons, `EVENTS`.
- `utils/` — text formatting ("350 m NE", "2 min ago", invite message). Pure.
- `navigation/` — route types (`RootStack`, `TabsParams`).

**Rules:** no `Date.now()` / `Math.random()` here (lint). `common` imports only core's protocols, models and utils, plus React, React Native, React Navigation types and safe-area. A component used by two features belongs in `ui/`; used by one, it stays in that feature's `views/`.
