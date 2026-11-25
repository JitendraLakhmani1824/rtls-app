import type { Rng } from '@core/utils';

import { cumulative, pointAlong, type Scenario, type World } from './world';

// A ~5 km loop around the centre.
const ROUTE: [number, number][] = [
  [-800, -450],
  [800, -450],
  [900, 0],
  [800, 450],
  [-800, 450],
  [-900, 0],
  [-800, -450],
];
const LENGTHS = cumulative(ROUTE);
const RUNNER_SHARE = 0.75;

/** A race: ~75% run the loop at 2.4–4.2 m/s; the rest watch from spots along the route. */
export const marathon: Scenario = {
  profile: 'race',
  zoom: 14,
  create(rng, people) {
    return new MarathonWorld(rng, people);
  },
};

class MarathonWorld implements World {
  readonly x: Float64Array;
  readonly y: Float64Array;
  private readonly s: Float64Array; // distance along the route (runners)
  private readonly pace: Float64Array; // m/s; 0 = spectator

  constructor(rng: Rng, people: number) {
    this.x = new Float64Array(people);
    this.y = new Float64Array(people);
    this.s = new Float64Array(people);
    this.pace = new Float64Array(people);
    const total = LENGTHS[LENGTHS.length - 1] ?? 1;
    for (let i = 0; i < people; i++) {
      this.s[i] = rng.range(0, total);
      // Person 0 is "me": a spectator.
      this.pace[i] = i > 0 && rng.next() < RUNNER_SHARE ? rng.range(2.4, 4.2) : 0;
      const [px, py] = pointAlong(ROUTE, LENGTHS, this.s[i] ?? 0);
      const off = (this.pace[i] ?? 0) > 0 ? 0 : 25; // spectators stand beside the course
      this.x[i] = px + rng.range(-off, off);
      this.y[i] = py + rng.range(-off, off);
    }
  }

  moving(i: number) {
    return (this.pace[i] ?? 0) > 0;
  }

  step(_rng: Rng, seconds: number) {
    for (let i = 0; i < this.x.length; i++) {
      const v = this.pace[i] ?? 0;
      if (v === 0) continue;
      this.s[i] = (this.s[i] ?? 0) + v * seconds;
      [this.x[i], this.y[i]] = pointAlong(ROUTE, LENGTHS, this.s[i] ?? 0);
    }
  }
}
