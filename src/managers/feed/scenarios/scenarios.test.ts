import { createRng } from '@core/utils';

import { SCENARIOS, type ScenarioName } from './index';

/** Steps a scenario for `seconds` in 250 ms steps; returns each person's fastest speed, m/s. */
function simulate(name: ScenarioName, people: number, seconds: number, seed = 1) {
  const rng = createRng(seed);
  const world = SCENARIOS[name].create(rng, people);
  const fastest = new Float64Array(people);
  const farthest = new Float64Array(people);
  let movingNow = 0;
  for (let step = 0; step < seconds * 4; step++) {
    const x = Float64Array.from(world.x);
    const y = Float64Array.from(world.y);
    world.step(rng, 0.25);
    for (let i = 0; i < people; i++) {
      const v = Math.hypot((world.x[i] ?? 0) - (x[i] ?? 0), (world.y[i] ?? 0) - (y[i] ?? 0)) / 0.25;
      fastest[i] = Math.max(fastest[i] ?? 0, v);
      farthest[i] = Math.max(farthest[i] ?? 0, Math.hypot(world.x[i] ?? 0, world.y[i] ?? 0));
    }
  }
  for (let i = 0; i < people; i++) if (world.moving(i)) movingNow++;
  return { fastest: Math.max(...fastest), farthest: Math.max(...farthest), movingNow, world };
}

describe('scenarios', () => {
  it('build the same world from the same seed', () => {
    for (const name of Object.keys(SCENARIOS) as ScenarioName[]) {
      const a = simulate(name, 50, 30, 9).world;
      const b = simulate(name, 50, 30, 9).world;
      expect(Array.from(a.x)).toEqual(Array.from(b.x));
    }
  });

  it('concert: most people stand, walkers stay under 1.6 m/s inside the venue', () => {
    const { fastest, farthest, movingNow } = simulate('concert', 200, 120);
    expect(fastest).toBeLessThanOrEqual(1.61);
    expect(farthest).toBeLessThanOrEqual(520);
    expect(movingNow).toBeLessThan(200 * 0.3);
  });

  it('marathon: most people run at race pace, nobody faster than 4.2 m/s', () => {
    const { fastest, movingNow } = simulate('marathon', 200, 60);
    expect(fastest).toBeLessThanOrEqual(4.21);
    expect(movingNow).toBeGreaterThan(200 * 0.6);
  });

  it('trip: cars drive at 12–25 m/s along one road; a large group shares cars of four', () => {
    const { fastest, world } = simulate('trip', 40, 60);
    expect(fastest).toBeLessThanOrEqual(25.5);
    expect(fastest).toBeGreaterThan(12);
    // 10 cars for 40 people: 0 and 10 share a car, so they stay within a couple of metres
    expect(
      Math.hypot((world.x[0] ?? 0) - (world.x[10] ?? 0), (world.y[0] ?? 0) - (world.y[10] ?? 0)),
    ).toBeLessThan(3);
  });

  it('trip: a small group drives a convoy, one car each, so nobody hides under another pin', () => {
    const { world } = simulate('trip', 8, 30);
    for (let i = 1; i < 8; i++) {
      expect(
        Math.hypot((world.x[0] ?? 0) - (world.x[i] ?? 0), (world.y[0] ?? 0) - (world.y[i] ?? 0)),
      ).toBeGreaterThan(3);
    }
  });
});
