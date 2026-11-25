import { FIX_STRIDE, type FixBatch } from '../models';
import { LocationStore } from './store';

const batch = (...fixes: [number, number, number, number, number][]): FixBatch => {
  const buf = new Float64Array(fixes.length * FIX_STRIDE);
  fixes.forEach(([m, seq, lng, lat, t], i) => buf.set([m, seq, lng, lat, t, 10], i * FIX_STRIDE));
  return { n: fixes.length, buf };
};

describe('LocationStore', () => {
  it('drops a fix whose sequence number is not newer than the last one', () => {
    const store = new LocationStore();
    store.reset(2);
    const changed: number[] = [];
    store.ingest(batch([1, 5, 72.1, 19.1, 1000]), changed);
    store.ingest(batch([1, 5, 72.2, 19.2, 2000], [1, 4, 72.3, 19.3, 3000]), changed);
    expect(changed).toEqual([]);
    expect(store.lng(1)).toBe(72.1);
  });

  it('reports each changed member once per batch', () => {
    const store = new LocationStore();
    store.reset(3);
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
    const store = new LocationStore();
    store.reset(1);
    const changed: number[] = [];
    store.ingest(batch([0, 1, 72, 19, 0]), changed);
    expect(store.speed(0)).toBe(0);
    // ~11.1 m north in 2 s
    store.ingest(batch([0, 2, 72, 19.0001, 2000]), changed);
    expect(store.speed(0)).toBeCloseTo(5.56, 1);
    expect(store.interval(0)).toBe(2000);
  });

  it('ignores fixes for members it does not know', () => {
    const store = new LocationStore();
    store.reset(1);
    const changed: number[] = [];
    expect(store.ingest(batch([5, 1, 72, 19, 0]), changed)).toBe(0);
  });
});
