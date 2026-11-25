import { clockContract } from '@testing/contracts';

import { systemClock } from './systemClock';

describe('systemClock', () => {
  beforeEach(() => jest.useFakeTimers({ now: 1_700_000_000_000 }));
  afterEach(() => jest.useRealTimers());

  clockContract('systemClock', () => ({
    clock: systemClock,
    advance: (ms) => jest.advanceTimersByTime(ms),
  }));
});
