import { FIX_STRIDE, type Cursor, type FixBatch, type Member } from '@core/models';
import type { Clock, FeedHandle, FeedManager, FeedSink, Stop } from '@core/protocols';
import { createRng, offsetMeters, type Rng } from '@core/utils';

import { createConcert, stepConcert, type Crowd } from './scenarios/concert';

export type ScenarioName = 'concert';

export type SyntheticFeedOptions = {
  scenario: ScenarioName;
  friends: number;
  seed: number;
  /** How often a moving friend sends a fix. */
  movingIntervalMs: number;
  /** Venue centre, [lng, lat]. */
  center: [number, number];
};

const BATCH_MS = 250;
const STILL_INTERVAL_MS = 30_000;
const GPS_NOISE_M = 3;
const PALETTE = [
  '#E4572E',
  '#17BEBB',
  '#D4A20A',
  '#2E282A',
  '#76B041',
  '#7B2CBF',
  '#3A86FF',
  '#FF006E',
];

/**
 * Stands in for the server feed. Seeded, so the same options give the same crowd.
 * The crowd keeps living while stopped: on resume, people have moved on.
 */
export class SyntheticFeedManager implements FeedManager {
  private readonly rng: Rng;
  private readonly crowd: Crowd;
  private readonly members: Member[];
  private readonly nextFixAt: Float64Array;
  private readonly seq: Float64Array;
  private readonly batch: FixBatch;
  private lastStepAt = NaN;
  private position = 0;

  constructor(
    private readonly options: SyntheticFeedOptions,
    private readonly clock: Clock,
  ) {
    const n = options.friends;
    this.rng = createRng(options.seed);
    this.crowd = createConcert(this.rng, n);
    this.members = Array.from({ length: n }, (_, i) => memberAt(i));
    this.nextFixAt = new Float64Array(n);
    this.seq = new Float64Array(n);
    this.batch = { n: 0, buf: new Float64Array(n * FIX_STRIDE) };
  }

  start(sink: FeedSink, resume?: Cursor): FeedHandle {
    let stopped = false;
    if (resume) this.position = resume.feedPosition;
    const now = this.clock.now();
    if (Number.isNaN(this.lastStepAt)) {
      // First start: spread first fixes over one interval so batches stay even.
      for (let i = 0; i < this.members.length; i++)
        this.nextFixAt[i] = now + this.rng.range(0, this.intervalOf(i));
    }
    this.lastStepAt = now;

    sink.onMembers(this.members);
    sink.onState({ kind: 'live', sinceMs: now });

    const stopTimer: Stop = this.clock.every(BATCH_MS, () => {
      if (stopped) return;
      this.position++;
      const batch = this.step();
      if (batch.n > 0) sink.onFixes(batch);
    });

    return {
      setViewport: () => {},
      cursor: () => ({ feedPosition: this.position }),
      stop: () => {
        stopped = true;
        stopTimer();
      },
    };
  }

  private intervalOf(i: number) {
    return (this.crowd.speed[i] ?? 0) > 0 ? this.options.movingIntervalMs : STILL_INTERVAL_MS;
  }

  /** Advances the crowd to now and emits a fix for everyone whose next fix is due. */
  private step(): FixBatch {
    const now = this.clock.now();
    stepConcert(this.crowd, this.rng, (now - this.lastStepAt) / 1000);
    this.lastStepAt = now;

    const b = this.batch;
    b.n = 0;
    for (let i = 0; i < this.members.length; i++) {
      if (now < (this.nextFixAt[i] ?? 0)) continue;
      this.nextFixAt[i] = now + this.intervalOf(i);
      this.seq[i] = (this.seq[i] ?? 0) + 1;
      const [lng, lat] = offsetMeters(
        this.options.center[0],
        this.options.center[1],
        (this.crowd.x[i] ?? 0) + this.rng.range(-GPS_NOISE_M, GPS_NOISE_M),
        (this.crowd.y[i] ?? 0) + this.rng.range(-GPS_NOISE_M, GPS_NOISE_M),
      );
      const o = b.n * FIX_STRIDE;
      b.buf[o] = i;
      b.buf[o + 1] = this.seq[i] ?? 0;
      b.buf[o + 2] = lng;
      b.buf[o + 3] = lat;
      b.buf[o + 4] = now;
      b.buf[o + 5] = this.rng.range(5, 15);
      b.n++;
    }
    return b;
  }
}

function memberAt(i: number): Member {
  const name = i === 0 ? 'Me' : `Friend ${i}`;
  const initials =
    i === 0 ? 'ME' : String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i * 7) % 26));
  return {
    id: i,
    key: `synthetic-${i}`,
    name,
    initials,
    colour: PALETTE[i % PALETTE.length] as string,
    isMe: i === 0,
  };
}
