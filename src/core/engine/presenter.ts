import {
  MOTION_STRIDE,
  PIN_STRIDE,
  TRAIL_STRIDE,
  type Budget,
  type MotionFrame,
  type PinFrame,
  type TrailFrame,
  type Viewport,
} from '../models';
import { HEARTBEAT_MS, presenceOf } from './presence';
import type { LocationStore } from './store';
import type { TrailStore } from './trails';

/** Must match the map's clusterMaxZoom: below it, pins may be grouped, so only the selected friend glides. */
export const CLUSTER_MAX_ZOOM = 15;
/** Moving less than this on screen isn't worth animating… */
export const MIN_GLIDE_PX_PER_S = 2;
/** …but a pin already gliding keeps gliding down to this, so GPS noise doesn't flip it back and forth. */
export const KEEP_GLIDE_PX_PER_S = 1;
/** Above this many friends on screen, only the selected friend's trail is drawn. */
export const TRAILS_FOR_ALL_MAX = 30;
const ENTER_PAD = 1.5;
const LEAVE_PAD = 1.8;
const MIN_GLIDE_MS = 500;
const MAX_GLIDE_MS = 5000;
const MOVING_MS = 0.5;
const PAUSED_CODE = 3;
const RAD = Math.PI / 180;

/** Metres per screen point at a zoom and latitude (MapLibre: 512-point tiles). */
export function metersPerPoint(zoom: number, lat: number): number {
  return (40_075_016.686 * Math.cos(lat * RAD)) / (512 * 2 ** zoom);
}

/**
 * Decides what the map draws: who is on screen, who glides (every frame) and who stays still
 * (≤ 1×/s), and builds the frames. Pure calculation over the stores — no timers, no subscriptions.
 */
export class Presenter {
  private viewport: Viewport | null = null;
  private budget: Budget = { glideLimit: 30, glideFps: 60, gestureUpdatesPerSec: 4 };
  private visible = new Uint8Array(0);
  private visibleN = 0;
  private lastPresence = new Uint8Array(0);
  private gliding = new Set<number>();
  private next = new Set<number>();
  private candidates: number[] = [];
  private motion: MotionFrame = { n: 0, buf: new Float64Array(0) };
  private still: PinFrame = { n: 0, buf: new Float64Array(0) };
  private trail = new TrailFrameBuilder();

  reset(memberCount: number) {
    this.visible = new Uint8Array(memberCount);
    this.visibleN = 0;
    this.lastPresence = new Uint8Array(memberCount).fill(255);
    this.gliding.clear();
  }

  setBudget(budget: Budget) {
    this.budget = budget;
  }

  setViewport(viewport: Viewport | null) {
    this.viewport = viewport;
  }

  get visibleCount() {
    return this.visibleN;
  }
  isVisible(m: number) {
    return this.visible[m] === 1;
  }
  isGliding(m: number) {
    return this.gliding.has(m);
  }

  /** Who is on screen: inside the viewport padded 1.5×; already-visible members leave only past 1.8×. */
  updateVisibility(store: LocationStore): boolean {
    const v = this.viewport;
    let changed = false;
    let count = 0;
    for (let m = 0; m < store.size; m++) {
      let on = store.has(m);
      if (on && v) {
        const pad = this.visible[m] === 1 ? LEAVE_PAD : ENTER_PAD;
        const hw = ((v.east - v.west) / 2) * pad;
        const hh = ((v.north - v.south) / 2) * pad;
        on =
          Math.abs(store.lng(m) - (v.east + v.west) / 2) <= hw &&
          Math.abs(store.lat(m) - (v.north + v.south) / 2) <= hh;
      }
      const flag = on ? 1 : 0;
      if (this.visible[m] !== flag) {
        this.visible[m] = flag;
        changed = true;
      }
      count += flag;
    }
    this.visibleN = count;
    return changed;
  }

  /**
   * The selected friend glides (if it has a position and isn't paused). At street zoom, so do the
   * fastest on-screen friends moving ≥ MIN_GLIDE_PX_PER_S, up to the budget. Returns true if the set changed.
   */
  updateGliding(store: LocationStore, selected: number | null): boolean {
    const { glideLimit } = this.budget;
    this.next.clear();
    if (glideLimit > 0 && selected !== null && store.has(selected) && !store.paused(selected)) {
      this.next.add(selected);
    }
    const zoom = this.viewport?.zoom ?? CLUSTER_MAX_ZOOM;
    if (glideLimit > 0 && zoom >= CLUSTER_MAX_ZOOM) {
      const c = this.candidates;
      c.length = 0;
      for (let m = 0; m < store.size; m++) {
        if (m === selected || this.visible[m] !== 1 || store.paused(m)) continue;
        if (store.speed(m) < MOVING_MS) continue;
        const minPxPerS = this.gliding.has(m) ? KEEP_GLIDE_PX_PER_S : MIN_GLIDE_PX_PER_S;
        if (store.speed(m) / metersPerPoint(zoom, store.lat(m)) >= minPxPerS) c.push(m);
      }
      c.sort((a, b) => store.speed(b) - store.speed(a));
      for (let i = 0; i < c.length && this.next.size < glideLimit; i++)
        this.next.add(c[i] as number);
    }

    let changed = this.next.size !== this.gliding.size;
    if (!changed) for (const m of this.next) if (!this.gliding.has(m)) changed = true;
    if (changed) [this.gliding, this.next] = [this.next, this.gliding];
    return changed;
  }

  /** The whole gliding set: latest position, glided over the last fix interval (0 = snap after a jump). */
  motionFrame(store: LocationStore): MotionFrame {
    const f = this.motion;
    const size = Math.max(1, this.gliding.size) * MOTION_STRIDE;
    if (f.buf.length < size) f.buf = new Float64Array(size);
    f.n = 0;
    for (const m of this.gliding) {
      const o = f.n * MOTION_STRIDE;
      const interval = store.interval(m);
      f.buf[o] = m;
      f.buf[o + 1] = store.lng(m);
      f.buf[o + 2] = store.lat(m);
      f.buf[o + 3] =
        store.snapped(m) || Number.isNaN(interval)
          ? 0
          : Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, interval));
      f.n++;
    }
    return f;
  }

  /** Every on-screen member that isn't gliding or paused, with its presence (sources are replace-all). */
  stillFrame(store: LocationStore, now: number): PinFrame {
    const f = this.still;
    if (f.buf.length < store.size * PIN_STRIDE) f.buf = new Float64Array(store.size * PIN_STRIDE);
    f.n = 0;
    for (let m = 0; m < store.size; m++) {
      if (this.visible[m] !== 1 || this.gliding.has(m) || store.paused(m)) continue;
      const o = f.n * PIN_STRIDE;
      f.buf[o] = m;
      f.buf[o + 1] = store.lng(m);
      f.buf[o + 2] = store.lat(m);
      f.buf[o + 3] = presenceOf(now, store.heardAt(m), expectedInterval(store, m));
      f.n++;
    }
    return f;
  }

  /** True if any member's presence (Live / Recent / Stale / paused) changed since the last call. */
  presenceChanged(store: LocationStore, now: number): boolean {
    let changed = false;
    for (let m = 0; m < store.size; m++) {
      if (!store.has(m)) continue;
      const code = store.paused(m)
        ? PAUSED_CODE
        : presenceOf(now, store.heardAt(m), expectedInterval(store, m));
      if (this.lastPresence[m] !== code) {
        this.lastPresence[m] = code;
        changed = true;
      }
    }
    return changed;
  }

  /** Members whose trails are drawn: the selected friend always; everyone on screen when few enough. */
  drawsTrail(m: number, store: LocationStore, selected: number | null): boolean {
    if (store.paused(m)) return false;
    return m === selected || (this.visible[m] === 1 && this.visibleN <= TRAILS_FOR_ALL_MAX);
  }

  /** Trails for drawsTrail() members, split at breaks, each point tagged with an age bucket (0 newest … 3 oldest). */
  trailFrame(
    trails: TrailStore,
    store: LocationStore,
    selected: number | null,
    now: number,
    windowMs: number,
  ): TrailFrame {
    const b = this.trail;
    b.begin();
    for (let m = 0; m < store.size; m++) {
      if (!this.drawsTrail(m, store, selected) || trails.length(m) < 2) continue;
      let oldest = now;
      if (!Number.isFinite(windowMs))
        trails.forEach(m, now, (_lng, _lat, t) => (oldest = Math.min(oldest, t)));
      const span = Number.isFinite(windowMs) ? windowMs : Math.max(1, now - oldest);
      b.startPart(m);
      trails.forEach(m, now, (lng, lat, t) => {
        if (Number.isNaN(lng)) b.startPart(m);
        // Clamped: a sender's clock may run ahead of ours.
        else b.point(lng, lat, Math.min(3, Math.max(0, Math.floor(((now - t) / span) * 4))));
      });
    }
    return b.end();
  }
}

function expectedInterval(store: LocationStore, m: number) {
  const interval = store.interval(m);
  return store.speed(m) >= MOVING_MS && Number.isFinite(interval) ? interval : HEARTBEAT_MS;
}

/** Builds a TrailFrame in reused, growing buffers; drops parts with fewer than two points. */
class TrailFrameBuilder {
  private frame: TrailFrame = {
    n: 0,
    members: new Float64Array(16),
    offsets: new Uint32Array(17),
    coords: new Float64Array(256 * TRAIL_STRIDE),
  };
  private points = 0;
  private partStart = 0;
  private open = false;

  begin() {
    this.frame.n = 0;
    this.points = 0;
    this.open = false;
  }

  startPart(member: number) {
    this.closePart();
    const f = this.frame;
    if (f.n + 2 > f.offsets.length) {
      f.members = grow(f.members, f.members.length * 2) as Float64Array;
      f.offsets = grow(f.offsets, f.offsets.length * 2) as Uint32Array;
    }
    f.members[f.n] = member;
    f.offsets[f.n] = this.points;
    this.partStart = this.points;
    this.open = true;
  }

  point(lng: number, lat: number, age: number) {
    const f = this.frame;
    if ((this.points + 1) * TRAIL_STRIDE > f.coords.length) {
      f.coords = grow(f.coords, f.coords.length * 2) as Float64Array;
    }
    const o = this.points * TRAIL_STRIDE;
    f.coords[o] = lng;
    f.coords[o + 1] = lat;
    f.coords[o + 2] = age;
    this.points++;
  }

  end(): TrailFrame {
    this.closePart();
    this.frame.offsets[this.frame.n] = this.points;
    return this.frame;
  }

  private closePart() {
    if (!this.open) return;
    this.open = false;
    if (this.points - this.partStart >= 2) this.frame.n++;
    else this.points = this.partStart; // a single point isn't a line
  }
}

function grow(a: Float64Array | Uint32Array, size: number): Float64Array | Uint32Array {
  const bigger = a instanceof Float64Array ? new Float64Array(size) : new Uint32Array(size);
  bigger.set(a);
  return bigger;
}
