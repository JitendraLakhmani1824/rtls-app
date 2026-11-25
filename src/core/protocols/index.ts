// Interfaces at the boundaries — only where an implementation is swapped or faked.
// Each states its promises; fakes in src/testing/fakes keep them too.
import type {
  ConnState,
  Cursor,
  FriendRow,
  FixBatch,
  Member,
  MotionFrame,
  PinFrame,
  PresenceBatch,
  TrailFrame,
  Viewport,
} from '../models';

export type Stop = () => void;

/** A value you can read and be told about when it changes. */
export interface Readable<T> {
  get(): T;
  subscribe(listener: () => void): Stop;
}

// ── Time and device ──────────────────────────────────────────────────────────────

export interface Clock {
  /** Wall-clock milliseconds (epoch). */
  now(): number;
  /** Calls `cb` every `ms` until stopped. */
  every(ms: number, cb: () => void): Stop;
  /** Calls `cb` once after `ms` unless stopped first. */
  after(ms: number, cb: () => void): Stop;
}

/** Screen-refresh ticks. Time comes from Clock, not from the tick. */
export interface FrameScheduler {
  start(cb: () => void): Stop;
}

export type Power = {
  lowPowerMode: boolean;
  thermal: 'nominal' | 'fair' | 'serious' | 'critical';
  battery: number;
};

export interface DeviceManager {
  clock: Clock;
  frames: FrameScheduler;
  /** App is on screen (active or briefly inactive). Never navigation focus. */
  foreground: Readable<boolean>;
  power: Readable<Power>;
}

// ── Friend feed ──────────────────────────────────────────────────────────────────

export interface FeedSink {
  onMembers(members: Member[]): void;
  /** Per member, `seq` only ever increases; anything older or equal is a duplicate. */
  onFixes(batch: FixBatch): void;
  /** Heartbeats from members who are still connected but not moving, and pause flags. */
  onPresence(batch: PresenceBatch): void;
  onState(state: ConnState): void;
  onSessionEnded(): void;
}

export interface FeedHandle {
  setViewport(viewport: Viewport): void;
  /** Where to resume from after stop(). */
  cursor(): Cursor;
  /** After stop() the feed never calls the sink again. */
  stop(): void;
}

export interface FeedManager {
  /** Starts delivering to `sink`, resuming after `resume` if given. Members arrive before any fixes. */
  start(sink: FeedSink, resume?: Cursor): FeedHandle;
}

// ── Map ──────────────────────────────────────────────────────────────────────────

export interface MapManager {
  /** True once the map is mounted and its style has loaded; false again if it unmounts. */
  ready: Readable<boolean>;
  viewport: Readable<Viewport | null>;
  setMembers(members: Member[]): void;
  /** Every still pin to draw (replaces the previous frame). */
  setStill(frame: PinFrame): void;
  /** The whole gliding set and each member's target; the map glides them itself. */
  setMoving(frame: MotionFrame): void;
  /** Every trail to draw (replaces the previous frame). */
  setTrails(frame: TrailFrame): void;
  setSelected(member: number | null): void;
  /** Animates the camera to show these bounds (degrees), leaving room for the app's controls. */
  fitTo(west: number, south: number, east: number, north: number): void;
  /** Most gliding updates per second the map should draw; 0 = no gliding. */
  setFrameRateCap(fps: number): void;
  onPinPress(listener: (member: number) => void): Stop;
}

// ── What screens see ─────────────────────────────────────────────────────────────

export interface Session {
  select(member: number | null): void;
  selected: Readable<number | null>;
  connection: Readable<ConnState>;
  /**
   * Every friend but me, nearest first. Updated at most once a second, and only while something
   * subscribes; unchanged otherwise.
   */
  rows: Readable<FriendRow[]>;
}

// ── Measurement (no-op in production) ───────────────────────────────────────────

export interface Perf {
  /** Runs `fn` and records how long it took under `name`. */
  measure<T>(name: string, fn: () => T): T;
  count(name: string, n?: number): void;
}

export const noopPerf: Perf = {
  measure: (_name, fn) => fn(),
  count: () => {},
};
