# managers/feed — synthetic friends

`SyntheticFeedManager` stands in for the server feed behind `FeedManager`. Seeded: the same options give the same crowd.

- Scenarios (`scenarios/`): concert, marathon, trip — each a `World` stepped in seconds. Titles and zooms there.
- `people` + `meIndex`: real names, and which person is me. Fault shares (offline, paused, indoor) are drawn for everyone, then cleared for me, so the rest of the crowd is identical whoever is me (that's what lets two phones that joined one link agree).
- On first start it replays the last 5 minutes (`history`, default: up to 50 people; saved sessions pass `history: true`) so trails show at once, then a snapshot, then fixes for movers and heartbeats for the still.
- `withFaults` adds drops, duplicates, reordering and GPS jumps for tests and measurement.

**Tests:** `SyntheticFeedManager.test.ts` (+ the feed contract), `withFaults.test.ts`, `scenarios.test.ts`. The replay fingerprint (`src/testing/replay`) runs the engine on this feed: if it changes, behaviour changed.
