import type { Screens } from '@common/di';

import { FakeSession } from './FakeSession';

/** What screens see, with a fake session and an empty map — for `renderHook` / `render` tests. */
export function createTestManagers(
  overrides: Partial<Screens> = {},
): Screens & { session: FakeSession } {
  return { session: new FakeSession(), MapView: () => null, ...overrides } as Screens & {
    session: FakeSession;
  };
}
