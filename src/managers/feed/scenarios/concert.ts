import type { Rng } from '@core/utils';

import type { Scenario, World } from './world';

const VENUE_RADIUS_M = 500;
const WALKER_SHARE = 0.15;

/** A festival crowd: most people stay near a stage or stall; ~15% walk between spots at 0.8–1.6 m/s. */
export const concert: Scenario = {
  profile: 'event',
  zoom: 14.5,
  create(rng, people) {
    return new ConcertWorld(rng, people);
  },
};

class ConcertWorld implements World {
  readonly x: Float64Array;
  readonly y: Float64Array;
  private readonly speed: Float64Array;
  private readonly tx: Float64Array;
  private readonly ty: Float64Array;

  constructor(rng: Rng, people: number) {
    this.x = new Float64Array(people);
    this.y = new Float64Array(people);
    this.speed = new Float64Array(people);
    this.tx = new Float64Array(people);
    this.ty = new Float64Array(people);
    for (let i = 0; i < people; i++) {
      [this.x[i], this.y[i]] = pointInVenue(rng);
      [this.tx[i], this.ty[i]] = pointInVenue(rng);
      // Person 0 is "me": standing at the centre.
      this.speed[i] = i > 0 && rng.next() < WALKER_SHARE ? rng.range(0.8, 1.6) : 0;
    }
    this.x[0] = 0;
    this.y[0] = 0;
  }

  moving(i: number) {
    return (this.speed[i] ?? 0) > 0;
  }

  step(rng: Rng, seconds: number) {
    for (let i = 0; i < this.x.length; i++) {
      const v = this.speed[i] ?? 0;
      if (v === 0) continue;
      const dx = (this.tx[i] ?? 0) - (this.x[i] ?? 0);
      const dy = (this.ty[i] ?? 0) - (this.y[i] ?? 0);
      const dist = Math.hypot(dx, dy);
      const step = v * seconds;
      if (dist <= step) {
        this.x[i] = this.tx[i] ?? 0;
        this.y[i] = this.ty[i] ?? 0;
        [this.tx[i], this.ty[i]] = pointInVenue(rng);
      } else {
        this.x[i] = (this.x[i] ?? 0) + (dx / dist) * step;
        this.y[i] = (this.y[i] ?? 0) + (dy / dist) * step;
      }
    }
  }
}

function pointInVenue(rng: Rng): [number, number] {
  const r = VENUE_RADIUS_M * Math.sqrt(rng.next());
  const a = rng.range(0, Math.PI * 2);
  return [r * Math.cos(a), r * Math.sin(a)];
}
