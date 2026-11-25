import type { SessionProfile } from '../models';
import { distanceMeters } from '../utils';
import { POOR_ACCURACY_M } from './store';

/** Points on a trail: lng, lat, tMs. A NaN lng marks a break (after a jump). */
const P = 3;
/** A gap longer than this breaks the line instead of joining it straight. */
export const TRAIL_GAP_MS = 120_000;

/**
 * Recent path per member in one preallocated ring buffer (fixed memory per member).
 * Events/trips: the oldest point is overwritten when full. Races: the oldest half is thinned
 * (every other point dropped) so the whole route survives at lower detail.
 */
export class TrailStore {
  private coords = new Float64Array(0);
  private head = new Int32Array(0); // next write slot
  private len = new Int32Array(0);
  private versions = new Uint32Array(0);
  private cap = 0;
  private profile: SessionProfile | null = null;

  reset(memberCount: number, profile: SessionProfile) {
    this.profile = profile;
    this.cap = profile.trailCapacity;
    this.coords = new Float64Array(memberCount * this.cap * P);
    this.head = new Int32Array(memberCount);
    this.len = new Int32Array(memberCount);
    this.versions = new Uint32Array(memberCount);
  }

  /** Changes whenever the member's trail changes — for caching. */
  version(m: number) {
    return this.versions[m] ?? 0;
  }

  length(m: number) {
    return this.len[m] ?? 0;
  }

  /**
   * Extends the trail if the fix is accurate enough and far enough from the last point.
   * `breakBefore` starts a new part (after a confirmed jump). Returns true if anything was added.
   */
  append(
    m: number,
    lng: number,
    lat: number,
    t: number,
    accuracyM: number,
    breakBefore: boolean,
  ): boolean {
    const profile = this.profile;
    if (!profile || !(accuracyM <= POOR_ACCURACY_M)) return false;
    const last = this.lastIndex(m);
    if (last >= 0 && !breakBefore) {
      const lastLng = this.at(m, last, 0);
      if (
        !Number.isNaN(lastLng) &&
        distanceMeters(lastLng, this.at(m, last, 1), lng, lat) < profile.trailMinStepM
      ) {
        return false;
      }
    }
    if (breakBefore && last >= 0) this.push(m, NaN, NaN, t);
    this.push(m, lng, lat, t);
    this.versions[m] = (this.versions[m] ?? 0) + 1;
    return true;
  }

  /**
   * Visits the member's trail oldest → newest, skipping points older than the window.
   * `visit(lng, lat, t)` receives NaN lng at breaks; gaps longer than TRAIL_GAP_MS also arrive as breaks.
   */
  forEach(m: number, now: number, visit: (lng: number, lat: number, t: number) => void) {
    const window = this.profile?.trailWindowMs ?? Infinity;
    const n = this.len[m] ?? 0;
    let prevT = NaN;
    for (let k = 0; k < n; k++) {
      const i = this.indexAt(m, k);
      const lng = this.at(m, i, 0);
      const t = this.at(m, i, 2);
      if (now - t > window) continue;
      if (!Number.isNaN(lng) && !Number.isNaN(prevT) && t - prevT > TRAIL_GAP_MS)
        visit(NaN, NaN, t);
      visit(lng, this.at(m, i, 1), t);
      if (!Number.isNaN(lng)) prevT = t;
    }
  }

  /** The newest point, or null. */
  last(m: number): [number, number] | null {
    const i = this.lastIndex(m);
    if (i < 0) return null;
    const lng = this.at(m, i, 0);
    return Number.isNaN(lng) ? null : [lng, this.at(m, i, 1)];
  }

  // ── ring buffer ───────────────────────────────────────────────────────────────

  private push(m: number, lng: number, lat: number, t: number) {
    if ((this.len[m] ?? 0) === this.cap && this.profile?.keepWholeTrail) this.thinOldestHalf(m);
    const slot = this.head[m] ?? 0;
    const o = (m * this.cap + slot) * P;
    this.coords[o] = lng;
    this.coords[o + 1] = lat;
    this.coords[o + 2] = t;
    this.head[m] = (slot + 1) % this.cap;
    this.len[m] = Math.min((this.len[m] ?? 0) + 1, this.cap);
  }

  /** Drops every other point in the oldest half, keeping order; frees a quarter of the ring. */
  private thinOldestHalf(m: number) {
    const n = this.len[m] ?? 0;
    const kept: number[] = [];
    const half = Math.floor(n / 2);
    for (let k = 0; k < n; k++) {
      if (k < half && k % 2 === 1) continue;
      const i = this.indexAt(m, k);
      kept.push(this.at(m, i, 0), this.at(m, i, 1), this.at(m, i, 2));
    }
    const base = m * this.cap * P;
    this.coords.set(kept, base);
    this.len[m] = kept.length / P;
    this.head[m] = (kept.length / P) % this.cap;
  }

  private indexAt(m: number, k: number) {
    const n = this.len[m] ?? 0;
    return ((this.head[m] ?? 0) - n + k + this.cap) % this.cap;
  }

  private lastIndex(m: number) {
    return (this.len[m] ?? 0) === 0 ? -1 : ((this.head[m] ?? 0) - 1 + this.cap) % this.cap;
  }

  private at(m: number, slot: number, field: number) {
    return this.coords[(m * this.cap + slot) * P + field] ?? NaN;
  }
}
