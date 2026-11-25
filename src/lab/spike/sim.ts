// M0 spike: synthetic positions. Still friends scattered around a centre; movers ride circles at ~20 m/s.
// Movers use a closed-form position so the same maths runs on the JS thread and in a UI-thread worklet.

export const CENTER: [number, number] = [72.8777, 19.076];
export const STILL_COUNT = 470;
export const MOVER_COUNT = 30;
export const TRAIL_POINTS = 120; // one point per second → 2 minutes of trail

const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LNG = 111_320 * Math.cos((CENTER[1] * Math.PI) / 180);

export const PALETTE = [
  '#E4572E',
  '#17BEBB',
  '#FFC914',
  '#2E282A',
  '#76B041',
  '#7B2CBF',
  '#3A86FF',
  '#FF006E',
];

export const colourOf = (member: number) => PALETTE[member % PALETTE.length] as string;
export const initialsOf = (member: number) =>
  String.fromCharCode(65 + (member % 26)) + String.fromCharCode(65 + ((member * 7) % 26));

/** Mover circle parameters, flattened: [cLng, cLat, rLng, rLat, omega, phase] per mover. */
export function makeMovers(count = MOVER_COUNT): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const radiusM = 300 + Math.random() * 500;
    const speedMs = 15 + Math.random() * 10;
    out.push(
      CENTER[0] + ((Math.random() - 0.5) * 2000) / M_PER_DEG_LNG,
      CENTER[1] + ((Math.random() - 0.5) * 2000) / M_PER_DEG_LAT,
      radiusM / M_PER_DEG_LNG,
      radiusM / M_PER_DEG_LAT,
      (speedMs / radiusM) * (i % 2 === 0 ? 1 : -1),
      Math.random() * Math.PI * 2,
    );
  }
  return out;
}

/** Writes mover i's position at time tSec into out[0..1]. Pure maths, safe in a worklet. */
export function moverPosition(movers: number[], i: number, tSec: number, out: number[]) {
  'worklet';
  const b = i * 6;
  const angle = (movers[b + 4] as number) * tSec + (movers[b + 5] as number);
  out[0] = (movers[b] as number) + (movers[b + 2] as number) * Math.cos(angle);
  out[1] = (movers[b + 1] as number) + (movers[b + 3] as number) * Math.sin(angle);
}

/** Still friends: lng,lat pairs scattered within ~2 km of the centre. */
export function makeStill(count = STILL_COUNT): Float64Array {
  const out = new Float64Array(count * 2);
  for (let i = 0; i < count; i++) {
    out[i * 2] = CENTER[0] + ((Math.random() - 0.5) * 4000) / M_PER_DEG_LNG;
    out[i * 2 + 1] = CENTER[1] + ((Math.random() - 0.5) * 4000) / M_PER_DEG_LAT;
  }
  return out;
}

/** Nudges still friends by up to ±2 m so every 1 Hz update really changes the data. */
export function jitterStill(still: Float64Array) {
  for (let i = 0; i < still.length; i += 2) {
    still[i] = (still[i] as number) + ((Math.random() - 0.5) * 4) / M_PER_DEG_LNG;
    still[i + 1] = (still[i + 1] as number) + ((Math.random() - 0.5) * 4) / M_PER_DEG_LAT;
  }
}

/** Fixed-size trail per mover: a ring of lng,lat pairs. */
export class Trails {
  readonly coords: Float64Array;
  readonly length = new Int32Array(MOVER_COUNT);
  readonly head = new Int32Array(MOVER_COUNT);

  constructor() {
    this.coords = new Float64Array(MOVER_COUNT * TRAIL_POINTS * 2);
  }

  push(mover: number, lng: number, lat: number) {
    const slot = (mover * TRAIL_POINTS + (this.head[mover] as number)) * 2;
    this.coords[slot] = lng;
    this.coords[slot + 1] = lat;
    this.head[mover] = ((this.head[mover] as number) + 1) % TRAIL_POINTS;
    this.length[mover] = Math.min((this.length[mover] as number) + 1, TRAIL_POINTS);
  }

  /** Calls visit(lng, lat) from oldest to newest. */
  forEach(mover: number, visit: (lng: number, lat: number) => void) {
    const len = this.length[mover] as number;
    const start = ((this.head[mover] as number) - len + TRAIL_POINTS) % TRAIL_POINTS;
    for (let k = 0; k < len; k++) {
      const slot = (mover * TRAIL_POINTS + ((start + k) % TRAIL_POINTS)) * 2;
      visit(this.coords[slot] as number, this.coords[slot + 1] as number);
    }
  }

  last(mover: number): [number, number] | null {
    if ((this.length[mover] as number) === 0) return null;
    const slot =
      (mover * TRAIL_POINTS + (((this.head[mover] as number) - 1 + TRAIL_POINTS) % TRAIL_POINTS)) *
      2;
    return [this.coords[slot] as number, this.coords[slot + 1] as number];
  }
}
