import { MOTION_STRIDE, PIN_STRIDE, Presence, type MotionFrame, type PinFrame } from '../models';
import type { LocationStore } from './store';

/** Moving slower than this (m/s) doesn't glide — it is redrawn once a second instead. */
export const MIN_GLIDE_SPEED = 0.5;
const MIN_GLIDE_MS = 500;
const MAX_GLIDE_MS = 5000;

/**
 * Decides who glides (redrawn every frame by the map) and who stays still (redrawn ≤ 1×/s),
 * and builds the frames for both. Pure calculation: no timers, no subscriptions.
 */
export class GlidePlanner {
  private gliding = new Set<number>();
  private next = new Set<number>();
  private candidates: number[] = [];
  private motion: MotionFrame = { n: 0, buf: new Float64Array(0) };
  private still: PinFrame = { n: 0, buf: new Float64Array(0) };

  constructor(private readonly limit: number) {}

  isGliding(m: number) {
    return this.gliding.has(m);
  }

  get glidingCount() {
    return this.gliding.size;
  }

  /**
   * The selected member (if it has a position) plus the fastest members moving ≥ MIN_GLIDE_SPEED,
   * at most `limit` in total. Returns true if the set changed.
   */
  update(store: LocationStore, selected: number | null): boolean {
    const c = this.candidates;
    c.length = 0;
    for (let m = 0; m < store.size; m++) {
      if (m !== selected && store.has(m) && store.speed(m) >= MIN_GLIDE_SPEED) c.push(m);
    }
    c.sort((a, b) => store.speed(b) - store.speed(a));

    this.next.clear();
    if (selected !== null && store.has(selected)) this.next.add(selected);
    for (let i = 0; i < c.length && this.next.size < this.limit; i++) this.next.add(c[i] as number);

    let changed = this.next.size !== this.gliding.size;
    if (!changed) for (const m of this.next) if (!this.gliding.has(m)) changed = true;
    if (changed) [this.gliding, this.next] = [this.next, this.gliding];
    return changed;
  }

  /** The whole gliding set, each member's latest position, glided over its last fix interval. */
  motionFrame(store: LocationStore): MotionFrame {
    const f = this.motion;
    if (f.buf.length < this.limit * MOTION_STRIDE)
      f.buf = new Float64Array(this.limit * MOTION_STRIDE);
    f.n = 0;
    for (const m of this.gliding) {
      const o = f.n * MOTION_STRIDE;
      const interval = store.interval(m);
      f.buf[o] = m;
      f.buf[o + 1] = store.lng(m);
      f.buf[o + 2] = store.lat(m);
      f.buf[o + 3] = Number.isNaN(interval)
        ? 0
        : Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, interval));
      f.n++;
    }
    return f;
  }

  /** Every member with a position that is not gliding (sources are replace-all). */
  stillFrame(store: LocationStore): PinFrame {
    const f = this.still;
    if (f.buf.length < store.size * PIN_STRIDE) f.buf = new Float64Array(store.size * PIN_STRIDE);
    f.n = 0;
    for (let m = 0; m < store.size; m++) {
      if (!store.has(m) || this.gliding.has(m)) continue;
      const o = f.n * PIN_STRIDE;
      f.buf[o] = m;
      f.buf[o + 1] = store.lng(m);
      f.buf[o + 2] = store.lat(m);
      f.buf[o + 3] = Presence.Live;
      f.n++;
    }
    return f;
  }
}
