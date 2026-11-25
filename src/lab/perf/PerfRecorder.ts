import type { Perf, Stop } from '@core/protocols';

type Totals = { ms: number; calls: number };
type HermesStats = { js_numGCs?: number; js_gcCPUTime?: number };
type Hermes = { getInstrumentedStats?: () => HermesStats };

/** The lag probe asks to run this often; how late it actually runs is time the JS thread was busy. */
const PROBE_MS = 50;
/** React Native fires timers on frame boundaries, so up to one frame late is normal, not busy time. */
const TIMER_SLACK_MS = 17;
/** A delay longer than this is a long task: the JS thread couldn't respond for a visible moment. */
const LONG_TASK_MS = 50;

const hermes = () => (globalThis as { HermesInternal?: Hermes }).HermesInternal;

/**
 * Dev/measurement implementation of Perf. Once a second it prints one line:
 *   PERF {"label":"rung D","jsFps":60,"jsLagMs":12,"longTasks":0,"gcs":1,"fixes":120,"ingestMs":0.04,…}
 * — JS frames, event-loop lag (how late a 50 ms timer ran beyond one frame, summed: JS busy time),
 * long tasks (lag > 50 ms), Hermes garbage collections, per-second counts, and average
 * milliseconds per call for everything measured.
 * Read it from Metro (iOS) or `adb logcat -s ReactNativeJS` (Android).
 */
export class PerfRecorder implements Perf {
  private times = new Map<string, Totals>();
  private counts = new Map<string, number>();
  private jsFrames = 0;
  private lagMs = 0;
  private longTasks = 0;
  private lastGcs = hermes()?.getInstrumentedStats?.().js_numGCs ?? NaN;

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
    let expected = performance.now() + PROBE_MS;
    const probe = setInterval(() => {
      const now = performance.now();
      const lag = Math.max(0, now - expected - TIMER_SLACK_MS);
      this.lagMs += lag;
      if (lag > LONG_TASK_MS) this.longTasks += 1;
      expected = now + PROBE_MS;
    }, PROBE_MS);
    const id = setInterval(() => this.flush(), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(probe);
      clearInterval(id);
    };
  }

  private flush() {
    const gcs = hermes()?.getInstrumentedStats?.().js_numGCs ?? NaN;
    const line: Record<string, string | number> = {
      label: this.label,
      jsFps: this.jsFrames,
      jsLagMs: Math.round(this.lagMs),
      longTasks: this.longTasks,
    };
    if (Number.isFinite(gcs) && Number.isFinite(this.lastGcs)) line.gcs = gcs - this.lastGcs;
    this.lastGcs = gcs;
    for (const [name, n] of this.counts) line[name] = n;
    for (const [name, t] of this.times)
      line[`${name}Ms`] = +(t.ms / Math.max(1, t.calls)).toFixed(3);
    console.log('PERF ' + JSON.stringify(line));
    this.jsFrames = 0;
    this.lagMs = 0;
    this.longTasks = 0;
    this.counts.clear();
    this.times.clear();
  }
}
