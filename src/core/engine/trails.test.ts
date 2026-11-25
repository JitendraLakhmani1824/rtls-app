import { PROFILES, type SessionProfile } from '../models';
import { TRAIL_GAP_MS, TrailStore } from './trails';

const M = 0.000009; // ~1 m of latitude

function trailOf(profile: SessionProfile = PROFILES.event, members = 1) {
  const trails = new TrailStore();
  trails.reset(members, profile);
  return trails;
}

/** The trail as visited: [lat in metres from 19°, or 'break'] oldest → newest. */
function walk(trails: TrailStore, m: number, now: number) {
  const out: (number | 'break')[] = [];
  trails.forEach(m, now, (_lng, lat) =>
    out.push(Number.isNaN(lat) ? 'break' : Math.round((lat - 19) / M)),
  );
  return out;
}

describe('TrailStore', () => {
  it('adds a point only after the member has moved the profile’s minimum step', () => {
    const trails = trailOf(); // event: 5 m
    expect(trails.append(0, 72, 19, 0, 5, false)).toBe(true);
    expect(trails.append(0, 72, 19 + 3 * M, 1000, 5, false)).toBe(false);
    expect(trails.append(0, 72, 19 + 6 * M, 2000, 5, false)).toBe(true);
    expect(walk(trails, 0, 2000)).toEqual([0, 6]);
  });

  it('skips fixes too inaccurate to draw', () => {
    const trails = trailOf();
    expect(trails.append(0, 72, 19, 0, 80, false)).toBe(false);
    expect(trails.length(0)).toBe(0);
  });

  it('starts a new part after a confirmed jump instead of drawing a line across it', () => {
    const trails = trailOf();
    trails.append(0, 72, 19, 0, 5, false);
    trails.append(0, 72, 19 + 10 * M, 1000, 5, false);
    trails.append(0, 72, 19 + 500 * M, 2000, 5, true);
    expect(walk(trails, 0, 2000)).toEqual([0, 10, 'break', 500]);
  });

  it('breaks the line across a long silence', () => {
    const trails = trailOf();
    trails.append(0, 72, 19, 0, 5, false);
    trails.append(0, 72, 19 + 10 * M, TRAIL_GAP_MS + 1000, 5, false);
    expect(walk(trails, 0, TRAIL_GAP_MS + 1000)).toEqual([0, 'break', 10]);
  });

  it('leaves out points older than the profile’s window', () => {
    const trails = trailOf(); // event: 15 min
    trails.append(0, 72, 19, 0, 5, false);
    trails.append(0, 72, 19 + 10 * M, 60_000, 5, false);
    trails.append(0, 72, 19 + 20 * M, 120_000, 5, false);
    expect(walk(trails, 0, 15 * 60_000 + 30_000)).toEqual([10, 20]);
  });

  it('overwrites the oldest point when full, for events', () => {
    const profile = { ...PROFILES.event, trailCapacity: 4 };
    const trails = trailOf(profile);
    for (let i = 0; i < 6; i++) trails.append(0, 72, 19 + i * 10 * M, i * 1000, 5, false);
    expect(walk(trails, 0, 6000)).toEqual([20, 30, 40, 50]);
  });

  it('thins the oldest half when full, for races, so the whole route survives', () => {
    const profile = { ...PROFILES.race, trailCapacity: 8 };
    const trails = trailOf(profile);
    for (let i = 0; i < 9; i++) trails.append(0, 72, 19 + i * 20 * M, i * 1000, 5, false);
    const route = walk(trails, 0, 9000);
    expect(route[0]).toBe(0); // the start is still there
    expect(route[route.length - 1]).toBe(160); // and the newest point
    expect(route.length).toBeLessThanOrEqual(8);
  });

  it('keeps members’ trails apart', () => {
    const trails = trailOf(PROFILES.event, 2);
    trails.append(0, 72, 19, 0, 5, false);
    trails.append(1, 72, 19 + 50 * M, 0, 5, false);
    expect(walk(trails, 0, 0)).toEqual([0]);
    expect(walk(trails, 1, 0)).toEqual([50]);
    expect(trails.last(1)?.[1]).toBeCloseTo(19 + 50 * M, 9);
  });
});
