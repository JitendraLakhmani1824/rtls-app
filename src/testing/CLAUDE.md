# testing — fakes, contracts, replay

Only test files import this folder.

- `fakes/` — one fake per protocol: `FakeClock` (virtual time), `FakeDeviceManager`, `FakeFeedManager`, `FakeMapManager` (records frames and camera moves), `FakeSession`, `FakeLive`, `FakePhotos`, `MemoryStorage`. `createTestManagers()` gives screens' hooks a real `SessionBook` over memory storage and one open map with a fake session.
- `contracts/` — shared suites every implementation passes: feed, clock, storage.
- `replay/` — seed → 60 virtual seconds, every fault on → a hash of everything sent to the map. If it changes, behaviour changed: update it in the same change and say why (in the test and `docs/decisions.md`).

Never real timers or network. See `.claude/rules/tests.md`.
