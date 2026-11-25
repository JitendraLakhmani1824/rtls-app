import type { Perf, Stop } from '@core/protocols';

type Totals = { ms: number; calls: number };

/**
 * Dev/measurement implementation of Perf. Once a second it prints one line:
 *   PERF {"label":"rung D","jsFps":60,"fixes":120,"ingestMs":0.04,…}
 * — per-second counts, and average milliseconds per call for everything measured.
 * Read it from Metro (iOS) or `adb logcat -s ReactNativeJS` (Android).
 */
export class PerfRecorder implements Perf {
  private times = new Map<string, Totals>();
  private counts = new Map<string, number>();
  private jsFrames = 0;

  constructor(private readonly label: string) {}

  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const t = this.times.get(name) ?? { ms: 0, calls: 0 };
      t.ms += performance.now() - start;
      t.calls += 1;
      this.times.set(name, t);
    }
  }

  count(name: string, n = 1) {
    this.counts.set(name, (this.counts.get(name) ?? 0) + n);
  }

  start(): Stop {
    let raf = 0;
    const loop = () => {
      this.jsFrames += 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const id = setInterval(() => this.flush(), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }

  private flush() {
    const line: Record<string, string | number> = { label: this.label, jsFps: this.jsFrames };
    for (const [name, n] of this.counts) line[name] = n;
    for (const [name, t] of this.times)
      line[`${name}Ms`] = +(t.ms / Math.max(1, t.calls)).toFixed(3);
    console.log('PERF ' + JSON.stringify(line));
    this.jsFrames = 0;
    this.counts.clear();
    this.times.clear();
  }
}
