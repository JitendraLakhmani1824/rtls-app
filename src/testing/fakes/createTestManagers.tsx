import type { LiveView, Screens } from '@common/di';
import { SessionBook } from '@core/sessions';
import { createRng } from '@core/utils';

import { FakeClock } from './FakeClock';
import { FakeLive } from './FakeLive';
import { FakeSession } from './FakeSession';
import { MemoryStorage } from './MemoryStorage';

export type TestManagers = Screens & {
  /** A real book over memory storage. Call `await sessions.load()` for the sample people and sessions. */
  sessions: SessionBook;
  live: FakeLive;
  /** The open map's session (live.current), id 'TEST01'. */
  session: FakeSession;
  view: LiveView;
  storage: MemoryStorage;
};

/** What screens see: a book in memory and one open map with a fake session — for `renderHook` tests. */
export function createTestManagers(): TestManagers {
  const storage = new MemoryStorage();
  const sessions = new SessionBook({ storage, clock: new FakeClock(), rng: createRng(1) });
  const session = new FakeSession();
  const view: LiveView = { id: 'TEST01', session, MapView: () => null };
  const live = new FakeLive();
  live.views.set(view.id, view);
  live.current.set(view);
  return { sessions, live, session, view, storage };
}
