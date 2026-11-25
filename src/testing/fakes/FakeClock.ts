import type { Clock, Stop } from '@core/protocols';

type Timer = { at: number; every: number | null; cb: () => void; id: number };

/** Virtual time: nothing happens until a test calls advance(ms). Timers fire in time order. */
export class FakeClock implements Clock {
  private time: number;
  private timers: Timer[] = [];
  private nextId = 1;

  constructor(start = 1_700_000_000_000) {
    this.time = start;
  }

  now() {
    return this.time;
  }

  every(ms: number, cb: () => void): Stop {
    return this.add(ms, ms, cb);
  }

  after(ms: number, cb: () => void): Stop {
    return this.add(ms, null, cb);
  }

  /** Moves time forward, firing every timer that falls due on the way. */
  advance(ms: number) {
    const end = this.time + ms;
    for (;;) {
      const next = this.timers.reduce<Timer | null>((a, t) => (!a || t.at < a.at ? t : a), null);
      if (!next || next.at > end) break;
      this.time = next.at;
      if (next.every === null) this.timers = this.timers.filter((t) => t !== next);
      else next.at += next.every;
      next.cb();
    }
    this.time = end;
  }

  get pendingTimers() {
    return this.timers.length;
  }

  private add(ms: number, every: number | null, cb: () => void): Stop {
    const timer = { at: this.time + ms, every, cb, id: this.nextId++ };
    this.timers.push(timer);
    return () => {
      this.timers = this.timers.filter((t) => t !== timer);
    };
  }
}
