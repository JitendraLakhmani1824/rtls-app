---
name: new-manager
description: Add a new capability that talks to the outside world (a real server feed, GPS, notifications, a native map renderer) the RTLS way — protocol, implementation, fake, contract test, one line of wiring. Use whenever new code would call a platform API, a native module or the network.
---

# Add a manager

A manager is the only kind of code that touches the outside world. Screens and the engine see it only through a protocol, so it can be swapped or faked.

## Steps

1. **Protocol** in `src/core/protocols/index.ts`. Plain numbers and typed arrays only — never React or library types. Add a doc comment stating its promises (e.g. "never calls the sink after stop()", "members arrive before fixes").
2. **Implementation** in `src/managers/<name>/` with an `index.ts` front door. Only this folder may import its outside library: add an allow-rule in `.dependency-cruiser.cjs`, then run `pnpm gen:rules`.
3. **Fake** in `src/testing/fakes/` that keeps the same promises and records what it was told, so tests can drive it.
4. **Contract test** (when both sides can run in Jest): one shared set of `it(...)` cases that the fake and the real class both pass.
5. **Wire it** with one line in `src/app/container.ts`. Nothing else constructs it.
6. If screens need it, expose the smallest piece through `Screens` in `src/common/di` — never the manager itself.
7. `pnpm verify`.

## Example: a real server feed

`WebSocketFeedManager implements FeedManager` in `src/managers/feed/` → reuse the feed tests in `src/managers/feed/SyntheticFeedManager.test.ts` as the contract (members first, nothing after `stop()`, resume from cursor) → in `container.ts`, swap `new SyntheticFeedManager(...)` for `new WebSocketFeedManager(...)`. Engine, map and screens don't change.
