import { FakeClock } from '@testing/fakes';

import { throttle } from './throttle';

describe('throttle', () => {
  it('runs the first call at once and folds later calls in the window into one at its end', () => {
    const clock = new FakeClock(0);
    const runs: number[] = [];
    const t = throttle(
      clock,
      () => 250,
      () => runs.push(clock.now()),
    );
    t.call();
    clock.advance(50);
    t.call();
    t.call();
    clock.advance(500);
    expect(runs).toEqual([0, 250]);
  });

  it('drops a pending call when cancelled', () => {
    const clock = new FakeClock(0);
    const runs: number[] = [];
    const t = throttle(
      clock,
      () => 250,
      () => runs.push(clock.now()),
    );
    t.call();
    t.call();
    t.cancel();
    clock.advance(1000);
    expect(runs).toEqual([0]);
    expect(clock.pendingTimers).toBe(0);
  });

  it('reads the interval on every call, so a new budget applies at once', () => {
    const clock = new FakeClock(0);
    let interval = 1000;
    const runs: number[] = [];
    const t = throttle(
      clock,
      () => interval,
      () => runs.push(clock.now()),
    );
    t.call();
    interval = 100;
    t.call();
    clock.advance(1000);
    expect(runs).toEqual([0, 100]);
  });
});
