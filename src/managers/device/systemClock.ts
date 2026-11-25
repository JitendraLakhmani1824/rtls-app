import type { Clock } from '@core/protocols';

/** The real clock: wall time and JS timers. */
export const systemClock: Clock = {
  now: () => Date.now(),
  every(ms, cb) {
    const id = setInterval(cb, ms);
    return () => clearInterval(id);
  },
  after(ms, cb) {
    const id = setTimeout(cb, ms);
    return () => clearTimeout(id);
  },
};
