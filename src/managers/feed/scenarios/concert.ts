import type { Rng } from '@core/utils';

/** Simulated people, positions in metres east/north of the venue centre. */
export type Crowd = {
  x: Float64Array;
  y: Float64Array;
  /** Walking speed in m/s; 0 for people who stay put. */
  speed: Float64Array;
  targetX: Float64Array;
  targetY: Float64Array;
};

const VENUE_RADIUS_M = 500;
const MOVER_SHARE = 0.15;

/** A festival crowd: most people stay near a stage or stall, ~15% walk between spots at 0.8–1.6 m/s. */
export function createConcert(rng: Rng, people: number): Crowd {
  const crowd: Crowd = {
    x: new Float64Array(people),
    y: new Float64Array(people),
    speed: new Float64Array(people),
    targetX: new Float64Array(people),
    targetY: new Float64Array(people),
  };
  for (let i = 0; i < people; i++) {
    const [x, y] = pointInVenue(rng);
    crowd.x[i] = x;
    crowd.y[i] = y;
    // Person 0 is "me": standing still at the centre.
    crowd.speed[i] = i > 0 && rng.next() < MOVER_SHARE ? rng.range(0.8, 1.6) : 0;
    const [tx, ty] = pointInVenue(rng);
    crowd.targetX[i] = tx;
    crowd.targetY[i] = ty;
  }
  crowd.x[0] = 0;
  crowd.y[0] = 0;
  return crowd;
}

/** Moves walkers towards their target for `seconds`; picks a new target on arrival. */
export function stepConcert(crowd: Crowd, rng: Rng, seconds: number) {
  for (let i = 0; i < crowd.x.length; i++) {
    const v = crowd.speed[i] ?? 0;
    if (v === 0) continue;
    const dx = (crowd.targetX[i] ?? 0) - (crowd.x[i] ?? 0);
    const dy = (crowd.targetY[i] ?? 0) - (crowd.y[i] ?? 0);
    const dist = Math.hypot(dx, dy);
    const step = v * seconds;
    if (dist <= step) {
      crowd.x[i] = crowd.targetX[i] ?? 0;
      crowd.y[i] = crowd.targetY[i] ?? 0;
      const [tx, ty] = pointInVenue(rng);
      crowd.targetX[i] = tx;
      crowd.targetY[i] = ty;
    } else {
      crowd.x[i] = (crowd.x[i] ?? 0) + (dx / dist) * step;
      crowd.y[i] = (crowd.y[i] ?? 0) + (dy / dist) * step;
    }
  }
}

function pointInVenue(rng: Rng): [number, number] {
  const r = VENUE_RADIUS_M * Math.sqrt(rng.next());
  const a = rng.range(0, Math.PI * 2);
  return [r * Math.cos(a), r * Math.sin(a)];
}
