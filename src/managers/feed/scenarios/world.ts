import type { SessionProfile } from '@core/models';
import type { Rng } from '@core/utils';

/** Simulated people. Positions are metres east (x) / north (y) of the scenario centre. */
export interface World {
  readonly x: Float64Array;
  readonly y: Float64Array;
  /** True while the person is moving (sends fixes at the moving interval); false = heartbeats only. */
  moving(i: number): boolean;
  step(rng: Rng, seconds: number): void;
}

export type ScenarioName = 'concert' | 'marathon' | 'trip';

export type Scenario = {
  /** Shown as the session's title. */
  title: string;
  profile: SessionProfile['name'];
  /** Comfortable starting zoom for the whole scene. */
  zoom: number;
  create(rng: Rng, people: number): World;
};

/** Point at distance `s` along a polyline of [x, y] vertices (s wraps if `loop`). */
export function pointAlong(
  path: [number, number][],
  lengths: number[],
  s: number,
): [number, number] {
  const total = lengths[lengths.length - 1] ?? 0;
  let d = ((s % total) + total) % total;
  for (let i = 1; i < path.length; i++) {
    const seg = (lengths[i] ?? 0) - (lengths[i - 1] ?? 0);
    if (d <= seg || i === path.length - 1) {
      const [ax, ay] = path[i - 1] as [number, number];
      const [bx, by] = path[i] as [number, number];
      const k = seg > 0 ? Math.min(1, d / seg) : 0;
      return [ax + (bx - ax) * k, ay + (by - ay) * k];
    }
    d -= seg;
  }
  return path[0] as [number, number];
}

/** Cumulative lengths along a polyline. */
export function cumulative(path: [number, number][]): number[] {
  const out = [0];
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1] as [number, number];
    const [bx, by] = path[i] as [number, number];
    out.push((out[i - 1] ?? 0) + Math.hypot(bx - ax, by - ay));
  }
  return out;
}
