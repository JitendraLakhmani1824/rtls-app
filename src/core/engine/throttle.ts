import type { Clock, Stop } from '../protocols';

/**
 * Runs `fn` at most once per `intervalMs`: the first call runs now, later calls in the same window
 * collapse into one call at the end of it (so the last value always lands). `cancel()` drops a pending call.
 */
export function throttle(clock: Clock, intervalMs: () => number, fn: () => void) {
  let lastRun = -Infinity;
  let pending: Stop | null = null;
  const run = () => {
    pending = null;
    lastRun = clock.now();
    fn();
  };
  return {
    call() {
      if (pending) return;
      const wait = lastRun + intervalMs() - clock.now();
      if (wait <= 0) run();
      else pending = clock.after(wait, run);
    },
    cancel() {
      pending?.();
      pending = null;
    },
  };
}
