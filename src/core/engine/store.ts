import { FIX_STRIDE, PRESENCE_STRIDE, type FixBatch, type PresenceBatch } from '../models';
import { distanceMeters } from '../utils';
import { expectedIntervalMs, PAUSED_PRESENCE, presenceOf } from './presence';

/** Above this accuracy (m) a fix is poor: it doesn't extend the trail, and its pin shows an accuracy halo. */
export const POOR_ACCURACY_M = 50;

// Per member, preallocated in one Float64Array.
const STRIDE = 14;
const LNG = 0;
const LAT = 1;
const T = 2;
const ACC = 3;
const SEQ = 4;
const SPEED = 5;
const PREV_T = 6;
const HEARD = 7; // last time we heard from the member (fix or heartbeat)
const PAUSED = 8; // 1 = sharing paused
const SNAP = 9; // 1 = the latest fix was a confirmed jump: draw it without gliding
const JUMP_LNG = 10; // a fix too far from the last one, held until the next fix confirms or rejects it
const JUMP_LAT = 11;
const JUMP_T = 12;
const COVERED = 13; // metres moved, counting only moves at walking pace or faster

/** Slower than this between two fixes is GPS drift, not movement: it doesn't add to distance covered. */
const COVER_MIN_MS = 0.5;

/** A held jump is confirmed when the next fix lands this close to it. */
const JUMP_CONFIRM_M = 50;

/**
 * Latest position and presence per member, in one preallocated typed array (no objects per fix).
 * - Drops fixes whose per-member `seq` is not newer than the last one (duplicates, reordering).
 * - A fix implying more than `maxSpeedMs` (beyond both fixes' accuracy) is held, not shown. If the next fix
 *   lands within 50 m of it, the jump was real: it is accepted and marked to snap (no glide across the map).
 *   Otherwise it is discarded.
 */
export class LocationStore {
  private data = new Float64Array(0);
  private touched = new Uint8Array(0);
  private count = 0;
  private maxSpeedMs = Infinity;

  get size() {
    return this.count;
  }

  reset(memberCount: number, maxSpeedMs: number) {
    this.count = memberCount;
    this.maxSpeedMs = maxSpeedMs;
    this.data = new Float64Array(memberCount * STRIDE).fill(NaN);
    for (let m = 0; m < memberCount; m++) {
      this.data[m * STRIDE + PAUSED] = 0;
      this.data[m * STRIDE + SNAP] = 0;
      this.data[m * STRIDE + COVERED] = 0;
    }
    this.touched = new Uint8Array(memberCount);
  }

  /**
   * Applies a batch. Writes the ids of members whose position changed into `changed`
   * (cleared first, each id once) and returns how many there are.
   */
  ingest(batch: FixBatch, changed: number[]): number {
    changed.length = 0;
    const { buf, n } = batch;
    for (let i = 0; i < n; i++) {
      const o = i * FIX_STRIDE;
      const m = buf[o] ?? -1;
      if (m < 0 || m >= this.count) continue;
      if (
        this.apply(
          m,
          buf[o + 1] ?? NaN,
          buf[o + 2] ?? NaN,
          buf[o + 3] ?? NaN,
          buf[o + 4] ?? NaN,
          buf[o + 5] ?? NaN,
        )
      ) {
        if (this.touched[m] === 0) {
          this.touched[m] = 1;
          changed.push(m);
        }
      }
    }
    for (const m of changed) this.touched[m] = 0;
    return changed.length;
  }

  /**
   * Heartbeats and pause flags. A heartbeat comes from a phone that is standing still, so one newer
   * than the last fix also sets the speed to 0: we stop expecting a fix every second.
   * Returns true if any member's pause state changed.
   */
  heartbeat(batch: PresenceBatch): boolean {
    let pauseChanged = false;
    for (let i = 0; i < batch.n; i++) {
      const o = i * PRESENCE_STRIDE;
      const m = batch.buf[o] ?? -1;
      if (m < 0 || m >= this.count) continue;
      const b = m * STRIDE;
      const heard = batch.buf[o + 1] ?? NaN;
      if (!(heard <= (this.data[b + HEARD] ?? NaN))) this.data[b + HEARD] = heard;
      if (heard >= (this.data[b + T] ?? NaN)) this.data[b + SPEED] = 0;
      const paused = batch.buf[o + 2] === 1 ? 1 : 0;
      if (this.data[b + PAUSED] !== paused) {
        this.data[b + PAUSED] = paused;
        pauseChanged = true;
      }
    }
    return pauseChanged;
  }

  private apply(m: number, seq: number, lng: number, lat: number, t: number, acc: number): boolean {
    const d = this.data;
    const b = m * STRIDE;
    const lastSeq = d[b + SEQ] ?? NaN;
    if (!Number.isNaN(lastSeq) && !(seq > lastSeq)) return false; // duplicate or out of order
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(t)) return false;
    d[b + SEQ] = seq;
    if (!(t <= (d[b + HEARD] ?? NaN))) d[b + HEARD] = t;

    const prevT = d[b + T] ?? NaN;
    let snap = 0;
    if (!Number.isNaN(prevT)) {
      const prevLng = d[b + LNG] ?? NaN;
      const prevLat = d[b + LAT] ?? NaN;
      const dt = Math.max(1, t - prevT) / 1000;
      // GPS noise is not movement: only distance beyond both accuracy radii counts.
      const slack = (Number.isFinite(acc) ? acc : 0) + (d[b + ACC] ?? 0);
      const beyond =
        distanceMeters(prevLng, prevLat, lng, lat) - (Number.isFinite(slack) ? slack : 0);
      if (beyond / dt > this.maxSpeedMs) {
        const heldT = d[b + JUMP_T] ?? NaN;
        const confirms =
          !Number.isNaN(heldT) &&
          distanceMeters(d[b + JUMP_LNG] ?? NaN, d[b + JUMP_LAT] ?? NaN, lng, lat) <=
            JUMP_CONFIRM_M;
        if (!confirms) {
          d[b + JUMP_LNG] = lng; // hold it; the next fix decides
          d[b + JUMP_LAT] = lat;
          d[b + JUMP_T] = t;
          return false;
        }
        snap = 1;
      }
    }
    d[b + JUMP_T] = NaN;

    const prevLng = d[b + LNG] ?? NaN;
    const prevLat = d[b + LAT] ?? NaN;
    const moved = snap || Number.isNaN(prevT) ? 0 : distanceMeters(prevLng, prevLat, lng, lat);
    d[b + SPEED] = snap || Number.isNaN(prevT) || t <= prevT ? 0 : moved / ((t - prevT) / 1000);
    if ((d[b + SPEED] ?? 0) >= COVER_MIN_MS) d[b + COVERED] = (d[b + COVERED] ?? 0) + moved;
    d[b + PREV_T] = snap ? NaN : prevT;
    d[b + LNG] = lng;
    d[b + LAT] = lat;
    d[b + T] = t;
    d[b + ACC] = acc;
    d[b + SNAP] = snap;
    return true;
  }

  has(m: number) {
    return !Number.isNaN(this.data[m * STRIDE + T] ?? NaN);
  }
  lng(m: number) {
    return this.data[m * STRIDE + LNG] ?? NaN;
  }
  lat(m: number) {
    return this.data[m * STRIDE + LAT] ?? NaN;
  }
  time(m: number) {
    return this.data[m * STRIDE + T] ?? NaN;
  }
  accuracy(m: number) {
    return this.data[m * STRIDE + ACC] ?? NaN;
  }
  /** Ground speed between the last two accepted fixes, m/s (0 until there are two, and after a jump). */
  speed(m: number) {
    return this.data[m * STRIDE + SPEED] ?? 0;
  }
  /** Metres moved so far (walking pace or faster; GPS drift and confirmed jumps don't count). */
  covered(m: number) {
    return this.data[m * STRIDE + COVERED] ?? 0;
  }
  /** Milliseconds between the last two fixes, or NaN if there is only one (or the last was a jump). */
  interval(m: number) {
    return (this.data[m * STRIDE + T] ?? NaN) - (this.data[m * STRIDE + PREV_T] ?? NaN);
  }
  /** When we last heard from the member: a fix or a heartbeat. */
  heardAt(m: number) {
    return this.data[m * STRIDE + HEARD] ?? NaN;
  }
  paused(m: number) {
    return this.data[m * STRIDE + PAUSED] === 1;
  }
  /**
   * Live / Recent / Stale right now, or PAUSED_PRESENCE. One call with direct reads, because the
   * presenter asks for every member each second.
   */
  presence(m: number, now: number): number {
    const d = this.data;
    const b = m * STRIDE;
    if (d[b + PAUSED] === 1) return PAUSED_PRESENCE;
    const interval = (d[b + T] ?? NaN) - (d[b + PREV_T] ?? NaN);
    return presenceOf(now, d[b + HEARD] ?? NaN, expectedIntervalMs(d[b + SPEED] ?? 0, interval));
  }

  /** The accuracy radius to draw around a poorly located pin; 0 for none. */
  halo(m: number) {
    const accuracy = this.data[m * STRIDE + ACC] ?? NaN;
    return accuracy > POOR_ACCURACY_M ? accuracy : 0;
  }

  /** True if the latest fix was a confirmed jump. */
  snapped(m: number) {
    return this.data[m * STRIDE + SNAP] === 1;
  }
}
