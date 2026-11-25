import { FIX_STRIDE, type FixBatch } from '../models';
import { distanceMeters } from '../utils';

// Per member, preallocated: lng, lat, tMs, accuracy, seq, speed (m/s), previous tMs.
const STRIDE = 7;
const LNG = 0;
const LAT = 1;
const T = 2;
const ACC = 3;
const SEQ = 4;
const SPEED = 5;
const PREV_T = 6;

/**
 * Latest position per member, in one preallocated typed array (no objects per fix).
 * Drops fixes whose per-member `seq` is not newer than the last one (duplicates, reordering).
 */
export class LocationStore {
  private data = new Float64Array(0);
  private touched = new Uint8Array(0);
  private count = 0;

  get size() {
    return this.count;
  }

  reset(memberCount: number) {
    this.count = memberCount;
    this.data = new Float64Array(memberCount * STRIDE).fill(NaN);
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
      const seq = buf[o + 1] ?? NaN;
      const b = m * STRIDE;
      const lastSeq = this.data[b + SEQ] ?? NaN;
      if (!(seq > lastSeq) && !Number.isNaN(lastSeq)) continue;

      const lng = buf[o + 2] ?? NaN;
      const lat = buf[o + 3] ?? NaN;
      const t = buf[o + 4] ?? NaN;
      const prevLng = this.data[b + LNG] ?? NaN;
      const prevLat = this.data[b + LAT] ?? NaN;
      const prevT = this.data[b + T] ?? NaN;
      let speed = 0;
      if (!Number.isNaN(prevT) && t > prevT) {
        speed = distanceMeters(prevLng, prevLat, lng, lat) / ((t - prevT) / 1000);
      }

      this.data[b + LNG] = lng;
      this.data[b + LAT] = lat;
      this.data[b + T] = t;
      this.data[b + ACC] = buf[o + 5] ?? NaN;
      this.data[b + SEQ] = seq;
      this.data[b + SPEED] = speed;
      this.data[b + PREV_T] = prevT;

      if (this.touched[m] === 0) {
        this.touched[m] = 1;
        changed.push(m);
      }
    }
    for (const m of changed) this.touched[m] = 0;
    return changed.length;
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
  /** Ground speed between the last two fixes, m/s (0 until there are two). */
  speed(m: number) {
    return this.data[m * STRIDE + SPEED] ?? 0;
  }
  /** Milliseconds between the last two fixes, or NaN if there is only one. */
  interval(m: number) {
    return (this.data[m * STRIDE + T] ?? NaN) - (this.data[m * STRIDE + PREV_T] ?? NaN);
  }
}
