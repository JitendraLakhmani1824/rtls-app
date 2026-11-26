import {
  FIX_STRIDE,
  PRESENCE_STRIDE,
  type Cursor,
  type FixBatch,
  type Member,
  type PresenceBatch,
} from '@core/models';
import type { Clock, FeedHandle, FeedManager, FeedSink, Stop } from '@core/protocols';
import { colourFor, createRng, initialsOf, offsetMeters, PALETTE, type Rng } from '@core/utils';

import { SCENARIOS, type ScenarioName, type World } from './scenarios';

export type SyntheticFeedOptions = {
  scenario: ScenarioName;
  /** People in the scene, me included. */
  friends: number;
  /**
   * Who they are, in order (as many as `friends`). The same people, seed and order give the same
   * crowd on every phone. Default: "Me", "Friend 1", ….
   */
  people?: readonly { key: string; name: string }[];
  /** Which of them is me (drawn as my own dot). Default 0. */
  meIndex?: number;
  seed: number;
  /** How often a moving friend sends a fix. */
  movingIntervalMs: number;
  /** Scene centre, [lng, lat]. */
  center: [number, number];
};

const BATCH_MS = 250;
/** A still friend's heartbeat, and an occasional fix so small drifts show up. */
const HEARTBEAT_MS = 60_000;
const STILL_FIX_MS = 5 * 60_000;
/** GPS error drifts slowly rather than jumping each fix: a random walk pulled back to zero (≈ 1.5 m typical). */
const GPS_NOISE_STEP_M = 1;
const GPS_NOISE_PULL = 0.85;
/** Some friends' phones go silent (battery, tunnel) between 30 s and 2 min in → Recent, then Stale. */
const OFFLINE_SHARE = 0.04;
/** Some friends have paused sharing → hidden. */
const PAUSED_SHARE = 0.02;
/** Some friends are indoors: poor accuracy (60–120 m) → an accuracy halo, no trail. */
const INDOOR_SHARE = 0.03;
/**
 * On opening, a real server's snapshot carries each friend's recent trail. The fake replays the
 * last few minutes of the scene, one batch per step, so trails show at once. Small groups only.
 */
const HISTORY_S = 300;
const HISTORY_STEP_S = 5;
const HISTORY_MAX_PEOPLE = 50;

/**
 * Stands in for the server feed, behind the same FeedManager protocol. Seeded: the same options
 * give the same crowd. Sends a snapshot first (everyone's position), then fixes for moving friends
 * and heartbeats for still ones. The world keeps living while stopped: on resume, people have moved on.
 */
export class SyntheticFeedManager implements FeedManager {
  private readonly rng: Rng;
  private readonly world: World;
  private readonly members: Member[];
  private readonly nextFixAt: Float64Array;
  private readonly nextBeatAt: Float64Array;
  private readonly seq: Float64Array;
  private readonly silentFrom: Float64Array; // Infinity = never goes offline
  private readonly paused: Uint8Array;
  private readonly wasMoving: Uint8Array;
  private readonly indoorAccuracy: Float64Array; // 0 = outdoors
  private readonly noiseX: Float64Array;
  private readonly noiseY: Float64Array;
  private readonly fixes: FixBatch;
  private readonly beats: PresenceBatch;
  private lastStepAt = NaN;
  private position = 0;

  constructor(
    private readonly options: SyntheticFeedOptions,
    private readonly clock: Clock,
  ) {
    const n = options.friends;
    this.rng = createRng(options.seed);
    this.world = SCENARIOS[options.scenario].create(this.rng, n);
    const me = options.meIndex ?? 0;
    this.members = Array.from({ length: n }, (_, i) => memberAt(i, me, options.people?.[i]));
    this.nextFixAt = new Float64Array(n);
    this.nextBeatAt = new Float64Array(n);
    this.seq = new Float64Array(n);
    this.silentFrom = new Float64Array(n).fill(Infinity);
    this.paused = new Uint8Array(n);
    this.wasMoving = new Uint8Array(n);
    this.indoorAccuracy = new Float64Array(n);
    this.noiseX = new Float64Array(n);
    this.noiseY = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      const r = this.rng.next();
      if (r < OFFLINE_SHARE) this.silentFrom[i] = this.rng.range(30_000, 120_000);
      else if (r < OFFLINE_SHARE + PAUSED_SHARE) this.paused[i] = 1;
      else if (r < OFFLINE_SHARE + PAUSED_SHARE + INDOOR_SHARE)
        this.indoorAccuracy[i] = this.rng.range(60, 120);
    }
    // My own phone is always sharing, outdoors and online. (Drawn for everyone, then cleared, so
    // the rest of the crowd is the same whoever is me.)
    this.silentFrom[me] = Infinity;
    this.paused[me] = 0;
    this.indoorAccuracy[me] = 0;
    this.fixes = { n: 0, buf: new Float64Array(n * FIX_STRIDE) };
    this.beats = { n: 0, buf: new Float64Array(n * PRESENCE_STRIDE) };
  }

  start(sink: FeedSink, resume?: Cursor): FeedHandle {
    let stopped = false;
    if (resume) this.position = resume.feedPosition;
    const now = this.clock.now();
    const firstStart = Number.isNaN(this.lastStepAt);
    if (firstStart) {
      for (let i = 0; i < this.members.length; i++) {
        this.silentFrom[i] = now + (this.silentFrom[i] ?? Infinity);
        // Spread regular traffic over one interval so batches stay even.
        this.nextFixAt[i] = now + this.rng.range(0, this.intervalOf(i));
        this.nextBeatAt[i] = now + this.rng.range(0, HEARTBEAT_MS);
      }
    }
    this.lastStepAt = now;

    sink.onMembers(this.members);
    sink.onState({ kind: 'live', sinceMs: now });
    if (firstStart && this.members.length <= HISTORY_MAX_PEOPLE) this.sendHistory(sink, now);
    sink.onFixes(this.snapshot(now)); // like the server's snapshot: everyone's latest position
    sink.onPresence(this.joinBeats(now));

    const stopTimer: Stop = this.clock.every(BATCH_MS, () => {
      if (stopped) return;
      this.position++;
      this.step();
      if (this.fixes.n > 0) sink.onFixes(this.fixes);
      if (this.beats.n > 0) sink.onPresence(this.beats);
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

  /** The last HISTORY_S seconds of everyone moving, as batches ending just before `now`. */
  private sendHistory(sink: FeedSink, now: number) {
    for (let t = now - HISTORY_S * 1000; t < now; t += HISTORY_STEP_S * 1000) {
      this.fixes.n = 0;
      for (let i = 0; i < this.members.length; i++) {
        if (!this.paused[i] && this.world.moving(i)) this.addFix(i, t);
      }
      if (this.fixes.n > 0) sink.onFixes(this.fixes);
      this.world.step(this.rng, HISTORY_STEP_S);
    }
  }

  private intervalOf(i: number) {
    return this.world.moving(i) ? this.options.movingIntervalMs : STILL_FIX_MS;
  }

  private snapshot(now: number): FixBatch {
    this.fixes.n = 0;
    for (let i = 0; i < this.members.length; i++) this.addFix(i, now);
    return this.fixes;
  }

  /** At join: pause flags, and a heartbeat from everyone standing still (so they show as still at once). */
  private joinBeats(now: number): PresenceBatch {
    this.beats.n = 0;
    for (let i = 0; i < this.members.length; i++) {
      const moving = this.world.moving(i);
      this.wasMoving[i] = moving ? 1 : 0;
      if (this.paused[i] || !moving) this.addBeat(i, now);
    }
    return this.beats;
  }

  /** Advances the world to now; collects due fixes (moving friends) and heartbeats (still friends). */
  private step() {
    const now = this.clock.now();
    this.world.step(this.rng, (now - this.lastStepAt) / 1000);
    this.lastStepAt = now;
    this.fixes.n = 0;
    this.beats.n = 0;
    for (let i = 0; i < this.members.length; i++) {
      if (now >= (this.silentFrom[i] ?? Infinity)) continue;
      const moving = this.world.moving(i);
      const stopped = this.wasMoving[i] === 1 && !moving;
      this.wasMoving[i] = moving ? 1 : 0;
      // A phone that just stopped says so at once, as the sharing policy does; then once a minute.
      if (stopped || now >= (this.nextBeatAt[i] ?? 0)) {
        this.nextBeatAt[i] = now + HEARTBEAT_MS;
        if (!moving || this.paused[i]) this.addBeat(i, now);
      }
      if (this.paused[i]) continue;
      if (now >= (this.nextFixAt[i] ?? 0)) {
        this.nextFixAt[i] = now + this.intervalOf(i);
        this.addFix(i, now);
      } else if (
        this.world.moving(i) &&
        (this.nextFixAt[i] ?? 0) - now > this.options.movingIntervalMs
      ) {
        this.nextFixAt[i] = now; // started moving after a still spell: report right away
      }
    }
  }

  private addFix(i: number, now: number) {
    this.seq[i] = (this.seq[i] ?? 0) + 1;
    const nx = (this.noiseX[i] ?? 0) * GPS_NOISE_PULL + this.rng.range(-1, 1) * GPS_NOISE_STEP_M;
    const ny = (this.noiseY[i] ?? 0) * GPS_NOISE_PULL + this.rng.range(-1, 1) * GPS_NOISE_STEP_M;
    this.noiseX[i] = nx;
    this.noiseY[i] = ny;
    const [lng, lat] = offsetMeters(
      this.options.center[0],
      this.options.center[1],
      (this.world.x[i] ?? 0) + nx,
      (this.world.y[i] ?? 0) + ny,
    );
    const f = this.fixes;
    const o = f.n * FIX_STRIDE;
    f.buf[o] = i;
    f.buf[o + 1] = this.seq[i] ?? 0;
    f.buf[o + 2] = lng;
    f.buf[o + 3] = lat;
    f.buf[o + 4] = now;
    const indoor = this.indoorAccuracy[i] ?? 0;
    f.buf[o + 5] = indoor > 0 ? indoor : this.rng.range(5, 15);
    f.n++;
  }

  private addBeat(i: number, now: number) {
    const b = this.beats;
    const o = b.n * PRESENCE_STRIDE;
    b.buf[o] = i;
    b.buf[o + 1] = now;
    b.buf[o + 2] = this.paused[i] ?? 0;
    b.n++;
  }
}

function memberAt(i: number, me: number, person?: { key: string; name: string }): Member {
  if (person) {
    return {
      id: i,
      key: person.key,
      name: i === me ? 'You' : person.name,
      initials: i === me ? 'ME' : initialsOf(person.name),
      colour: colourFor(person.key),
      isMe: i === me,
    };
  }
  const name = i === me ? 'Me' : `Friend ${i}`;
  const initials =
    i === me ? 'ME' : String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i * 7) % 26));
  return {
    id: i,
    key: `synthetic-${i}`,
    name,
    initials,
    colour: PALETTE[i % PALETTE.length] as string,
    isMe: i === me,
  };
}
