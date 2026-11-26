---
paths:
  - 'src/managers/**'
---

# Rules for managers (src/managers)

- A manager implements one protocol from `core/protocols` and keeps every promise in its doc comment; its fake in `src/testing/fakes` keeps them too, and both pass the contract test where Jest can run the real one.
- Only this folder imports its outside library (an allow-rule in `.dependency-cruiser.cjs`, then `pnpm gen:rules`).
- Never throw across the protocol: turn platform failures into the protocol's "nothing" (null, a lost save, a stopped feed).
- Created only in `src/app/container.ts`. No singletons, no module-level state.
- Native behaviour (permissions, plugins) goes in `app.config.ts`, then `npx expo prebuild` — never edit `ios/` or `android/` by hand.
- Never log coordinates.
