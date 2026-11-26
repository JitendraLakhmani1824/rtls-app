# app — start-up wiring

The composition root. The only folder that names real implementations.

- `container.ts` — `createApp()`: device, storage, photos, the `SessionBook`, and `live` (one engine per opened session, built on first open; only the open map's session runs). The only place managers are created.
- `Root.tsx` — onboarding until it's done, then the app; a scenario link (`rtls://scenario?…`, measurement) opens that scenario's map; lab rungs A–C.
- `navigation.tsx` — two tabs (floating `TabBar`) inside a native stack; full-screen pages over the tabs; the friend sheet is a form sheet.
- `linking.ts` — `rtls://join/<code>?…` (invite) and `rtls://session/<id>`; scenario links are Root's.
- `launch-params.ts` — scenario link parsing.

**Add a screen:** register its route here (and in `linking.ts` if a link opens it). See the `new-screen` skill.
**Tests:** `linking.test.ts` (links → routes), `launch-params.test.ts`.
