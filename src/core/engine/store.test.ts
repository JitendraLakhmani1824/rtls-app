import { FIX_STRIDE, PRESENCE_STRIDE, type FixBatch, type PresenceBatch } from '../models';
import { LocationStore } from './store';

/** Each fix: [member, seq, lng, lat, tMs, accuracyM = 10]. */
const batch = (...fixes: [number, number, number, number, number, number?][]): FixBatch => {
  const buf = new Float64Array(fixes.length * FIX_STRIDE);
  fixes.forEach(([m, seq, lng, lat, t, acc = 10], i) =>
    buf.set([m, seq, lng, lat, t, acc], i * FIX_STRIDE),
  );
  return { n: fixes.length, buf };
};

const beats = (...items: [number, number, number][]): PresenceBatch => {
  const buf = new Float64Array(items.length * PRESENCE_STRIDE);
  items.forEach((b, i) => buf.set(b, i * PRESENCE_STRIDE));
  return { n: items.length, buf };
};

/** ~1.11 m per 0.00001° of latitude. */
const NORTH_1M = 0.000009;

function storeOf(members: number, maxSpeedMs = Infinity) {
  const store = new LocationStore();
  store.reset(members, maxSpeedMs);
  return store;
}

describe('LocationStore', () => {
  it('drops a fix whose sequence number is not newer than the last one', () => {
    const store = storeOf(2);
    const changed: number[] = [];
    store.ingest(batch([1, 5, 72.1, 19.1, 1000]), changed);
    store.ingest(batch([1, 5, 72.2, 19.2, 2000], [1, 4, 72.3, 19.3, 3000]), changed);
    expect(changed).toEqual([]);
    expect(store.lng(1)).toBe(72.1);
  });

  it('reports each changed member once per batch', () => {
    const store = storeOf(3);
    const changed: number[] = [];
    const n = store.ingest(
      batch([2, 1, 72, 19, 0], [2, 2, 72, 19.0001, 1000], [0, 1, 72, 19, 0]),
      changed,
    );
    expect(n).toBe(2);
    expect(changed.sort()).toEqual([0, 2]);
    expect(store.lat(2)).toBe(19.0001);
  });

  it('computes ground speed and fix interval from the last two fixes', () => {
    const store = storeOf(1);
    const changed: number[] = [];
    store.ingest(batch([0, 1, 72, 19, 0]), changed);
    expect(store.speed(0)).toBe(0);
    store.ingest(batch([0, 2, 72, 19.0001, 2000]), changed); // ~11.1 m north in 2 s
    expect(store.speed(0)).toBeCloseTo(5.56, 1);
    expect(store.interval(0)).toBe(2000);
  });

  it('ignores fixes for members it does not know, and fixes with non-finite numbers', () => {
    const store = storeOf(1);
    const changed: number[] = [];
    expect(store.ingest(batch([5, 1, 72, 19, 0]), changed)).toBe(0);
    expect(store.ingest(batch([0, 1, NaN, 19, 0]), changed)).toBe(0);
    expect(store.has(0)).toBe(false);
  });

  it('does not treat GPS noise within the fixes’ accuracy as movement too fast to be real', () => {
    const store = storeOf(1, 4);
    const changed: number[] = [];
    store.ingest(batch([0, 1, 72, 19, 0, 8]), changed);
    // 10 m in 1 s is over 4 m/s, but both fixes are only good to 8 m.
    expect(store.ingest(batch([0, 2, 72, 19 + 10 * NORTH_1M, 1000, 8]), changed)).toBe(1);
    expect(store.snapped(0)).toBe(false);
  });

  it('holds back a fix that implies impossible speed, and discards it when the next fix disagrees', () => {
    const store = storeOf(1, 4);
    const changed: number[] = [];
    store.ingest(batch([0, 1, 72, 19, 0, 5]), changed);
    expect(store.ingest(batch([0, 2, 72, 19.003, 1000, 5]), changed)).toBe(0); // +330 m in 1 s
    expect(store.lat(0)).toBe(19);
    expect(store.ingest(batch([0, 3, 72, 19 + NORTH_1M, 2000, 5]), changed)).toBe(1);
    expect(store.lat(0)).toBe(19 + NORTH_1M);
    expect(store.snapped(0)).toBe(false);
  });

  it('accepts a jump the next fix confirms, and marks it to snap instead of glide', () => {
    const store = storeOf(1, 4);
    const changed: number[] = [];
    store.ingest(batch([0, 1, 72, 19, 0, 5]), changed);
    store.ingest(batch([0, 2, 72, 19.003, 1000, 5]), changed);
    expect(store.ingest(batch([0, 3, 72, 19.003 + NORTH_1M, 2000, 5]), changed)).toBe(1);
    expect(store.snapped(0)).toBe(true);
    expect(store.speed(0)).toBe(0);
    expect(store.interval(0)).toBeNaN();
  });

  it('records heartbeats as last heard, without moving the member', () => {
    const store = storeOf(1);
    const changed: number[] = [];
    store.ingest(batch([0, 1, 72, 19, 1000]), changed);
    expect(store.heartbeat(beats([0, 61_000, 0]))).toBe(false);
    expect(store.heardAt(0)).toBe(61_000);
    expect(store.time(0)).toBe(1000);
    store.heartbeat(beats([0, 30_000, 0])); // an older heartbeat never moves last-heard back
    expect(store.heardAt(0)).toBe(61_000);
  });

  it('reports a change when a member pauses or resumes sharing', () => {
    const store = storeOf(2);
    expect(store.heartbeat(beats([1, 1000, 1]))).toBe(true);
    expect(store.paused(1)).toBe(true);
    expect(store.heartbeat(beats([1, 2000, 1]))).toBe(false);
    expect(store.heartbeat(beats([1, 3000, 0]))).toBe(true);
    expect(store.paused(1)).toBe(false);
  });

  it('treats a heartbeat newer than the last fix as standing still', () => {
    const store = storeOf(1);
    const changed: number[] = [];
    store.ingest(batch([0, 1, 72, 19, 0], [0, 2, 72, 19 + 2 * NORTH_1M, 1000]), changed);
    expect(store.speed(0)).toBeGreaterThan(1);
    store.heartbeat(beats([0, 500, 0])); // older than the last fix: ignored
    expect(store.speed(0)).toBeGreaterThan(1);
    store.heartbeat(beats([0, 2000, 0]));
    expect(store.speed(0)).toBe(0);
  });
});
