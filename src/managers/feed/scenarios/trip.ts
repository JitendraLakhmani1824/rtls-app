import type { Rng } from '@core/utils';

import { cumulative, pointAlong, type Scenario, type World } from './world';

// A ~24 km road through the centre, west to east, with a few bends.
const ROAD: [number, number][] = [
  [-12000, -2000],
  [-6000, -500],
  [-2000, 800],
  [0, 0],
  [3000, -900],
  [7000, 400],
  [12000, 1500],
];
const LENGTHS = cumulative(ROAD);
const SEATS = 4;
const STOP_CHANCE_PER_S = 1 / 120; // a stop roughly every two minutes per car
const STOP_S = 45;

/** A convoy: friends ride in cars of up to four, at 12–25 m/s, with occasional stops. Cars turn back at the road's end. */
export const trip: Scenario = {
  title: 'Road trip',
  profile: 'trip',
  zoom: 11.5,
  create(rng, people) {
    return new TripWorld(rng, people);
  },
};

class TripWorld implements World {
  readonly x: Float64Array;
  readonly y: Float64Array;
  private readonly car: Int32Array; // which car each person rides in
  private readonly seatX: Float64Array;
  private readonly seatY: Float64Array;
  private readonly carS: Float64Array;
  private readonly carSpeed: Float64Array;
  private readonly carDir: Float64Array;
  private readonly carStoppedFor: Float64Array;

  constructor(rng: Rng, people: number) {
    const cars = Math.max(1, Math.ceil(people / SEATS));
    const total = LENGTHS[LENGTHS.length - 1] ?? 1;
    this.x = new Float64Array(people);
    this.y = new Float64Array(people);
    this.car = new Int32Array(people);
    this.seatX = new Float64Array(people);
    this.seatY = new Float64Array(people);
    this.carS = new Float64Array(cars);
    this.carSpeed = new Float64Array(cars);
    this.carDir = new Float64Array(cars);
    this.carStoppedFor = new Float64Array(cars);
    for (let c = 0; c < cars; c++) {
      this.carS[c] = rng.range(total * 0.3, total * 0.7);
      this.carSpeed[c] = rng.range(12, 25);
      this.carDir[c] = rng.next() < 0.5 ? 1 : -1;
    }
    for (let i = 0; i < people; i++) {
      this.car[i] = i % cars;
      this.seatX[i] = rng.range(-1, 1);
      this.seatY[i] = rng.range(-1, 1);
    }
    this.place();
  }

  moving(i: number) {
    return (this.carStoppedFor[this.car[i] ?? 0] ?? 0) <= 0;
  }

  step(rng: Rng, seconds: number) {
    const total = LENGTHS[LENGTHS.length - 1] ?? 1;
    for (let c = 0; c < this.carS.length; c++) {
      if ((this.carStoppedFor[c] ?? 0) > 0) {
        this.carStoppedFor[c] = (this.carStoppedFor[c] ?? 0) - seconds;
        continue;
      }
      if (rng.next() < STOP_CHANCE_PER_S * seconds) {
        this.carStoppedFor[c] = STOP_S;
        continue;
      }
      let s = (this.carS[c] ?? 0) + (this.carDir[c] ?? 1) * (this.carSpeed[c] ?? 0) * seconds;
      if (s < 0 || s > total) {
        this.carDir[c] = -(this.carDir[c] ?? 1);
        s = Math.min(total, Math.max(0, s));
      }
      this.carS[c] = s;
    }
    this.place();
  }

  private place() {
    for (let i = 0; i < this.x.length; i++) {
      const [px, py] = pointAlong(ROAD, LENGTHS, this.carS[this.car[i] ?? 0] ?? 0);
      this.x[i] = px + (this.seatX[i] ?? 0);
      this.y[i] = py + (this.seatY[i] ?? 0);
    }
  }
}
