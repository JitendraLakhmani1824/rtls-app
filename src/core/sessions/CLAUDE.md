# core/sessions — your people, sessions and profile

Pure TypeScript, not on the location hot path.

- `SessionBook` implements the `Sessions` protocol: profile (name, photo, onboarded), people (family / friends), sessions. Loads once (`load()`), applies changes in memory at once, saves in order in the background through `Storage`. One JSON document, versioned (v2; v1 is read too). Bad entries are dropped one by one; unreadable data → the sample book.
- `invite.ts` — `inviteUrl` / `parseInvite` / `invitePartsOf`. A link carries the whole session (code, event, title, names in order, sender); the code seeds the simulation.
- `sample.ts` — first-launch book: family, friends, and four sessions (one a 150-person running club).

**Tests:** `SessionBook.test.ts`, `invite.test.ts` with `MemoryStorage` and `FakeClock`.
