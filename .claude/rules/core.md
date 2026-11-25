---
paths:
  - "src/core/**"
---

# Rules for src/core

- Pure TypeScript. No React, React Native, Expo or MapLibre imports — platform code goes in `src/managers/` behind a protocol here.
- Inside core: `utils → models → protocols → engine, sharing`. Protocols never import the engine; engine never imports sharing.
- Time only from the injected `Clock`; randomness only from the seeded `Rng`. Same seed + same events → same output.
- Hot paths (store, presenter, trails) use preallocated typed arrays. Don't create an object per location fix.
- The presenter only calculates: no timers, no subscriptions. `LiveSession` is the only code that starts or stops anything.
- Every protocol has a doc comment stating its promises (e.g. "never calls the sink after stop()"), a fake in `src/testing/fakes`, and — for feed, session and clock — a contract test.
- Behaviour details live in `docs/design.md` §2.2–2.4. If code and design disagree, stop and say which is right.
