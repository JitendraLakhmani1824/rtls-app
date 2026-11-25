import { FIX_STRIDE } from '../models';
import { GlidePlanner } from './glide';
import { LocationStore } from './store';

const M_PER_DEG_LAT = 111_195;

/** A store where member i moved `speeds[i]` m/s north over the last 1 s. */
function storeWithSpeeds(speeds: number[]) {
  const store = new LocationStore();
  store.reset(speeds.length);
  const changed: number[] = [];
  const buf = new Float64Array(speeds.length * FIX_STRIDE * 2);
  speeds.forEach((v, m) => {
    buf.set([m, 1, 72, 19, 0, 10], m * 2 * FIX_STRIDE);
    buf.set([m, 2, 72, 19 + v / M_PER_DEG_LAT, 1000, 10], (m * 2 + 1) * FIX_STRIDE);
  });
  store.ingest({ n: speeds.length * 2, buf }, changed);
  return store;
}

describe('GlidePlanner', () => {
  it('glides only members moving at least 0.5 m/s, fastest first, up to the limit', () => {
    const store = storeWithSpeeds([0, 0.3, 1.2, 3, 2]);
    const planner = new GlidePlanner(2);
    expect(planner.update(store, null)).toBe(true);
    expect([3, 4].every((m) => planner.isGliding(m))).toBe(true);
    expect(planner.isGliding(2)).toBe(false);
    expect(planner.isGliding(1)).toBe(false);
  });

  it('always glides the selected member, even when it is standing still', () => {
    const store = storeWithSpeeds([0, 2]);
    const planner = new GlidePlanner(5);
    planner.update(store, 0);
    expect(planner.isGliding(0)).toBe(true);
  });

  it('reports no change when the gliding set is the same', () => {
    const store = storeWithSpeeds([0, 2]);
    const planner = new GlidePlanner(5);
    planner.update(store, null);
    expect(planner.update(store, null)).toBe(false);
  });

  it('leaves gliding members out of the still frame', () => {
    const store = storeWithSpeeds([0, 2, 0]);
    const planner = new GlidePlanner(5);
    planner.update(store, null);
    const still = planner.stillFrame(store);
    const members = Array.from({ length: still.n }, (_, i) => still.buf[i * 4]);
    expect(members).toEqual([0, 2]);
  });

  it('glides each member over its last fix interval, clamped to 0.5–5 s', () => {
    const store = storeWithSpeeds([2]);
    const planner = new GlidePlanner(5);
    planner.update(store, null);
    const motion = planner.motionFrame(store);
    expect(motion.n).toBe(1);
    expect(motion.buf[3]).toBe(1000);
  });
});
