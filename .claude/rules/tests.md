---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Rules for tests

- Name tests as behaviours: `it('drops a fix older than the last one')`, not `it('works')`.
- Use fakes from `src/testing/fakes` and virtual time (`FakeClock`, `ManualFrames`). Never real timers, `setTimeout` waits, or network.
- Test `useX` hooks with `renderHook` and `createTestManagers(overrides)`, with a stub navigation object.
- `encode.ts`-style pure functions get golden tests (fixed input → saved expected output).
- The replay fingerprint test (seed → 60 virtual seconds → hash of everything sent to the map) must stay green. If you change behaviour on purpose, update the fingerprint in the same change and say why.
- No coverage targets — test the rules that matter, not lines.
