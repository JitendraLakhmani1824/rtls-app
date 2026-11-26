// Interfaces at the boundaries — only where an implementation is swapped or faked.
// Each states its promises; fakes in src/testing/fakes keep them too.
import type {
  CameraMove,
  Circle,
  ConnState,
  Cursor,
  EventKind,
  FriendRow,
  FixBatch,
  Invite,
  Member,
  Person,
  SessionRecord,
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
  /** The user asked the phone for less motion (accessibility): no flying, tilting or rotating camera. */
  reduceMotion: boolean;
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
  /**
   * Animates the camera to show these bounds (degrees), flat and north up, leaving room for the
   * app's controls. Default: a short ease.
   */
  fitTo(
    west: number,
    south: number,
    east: number,
    north: number,
    how?: { ms: number; path: 'fly' | 'ease' },
  ): void;
  /**
   * Animates the camera to centre on a point, in the part of the map not covered by the app's
   * controls. A new move replaces one still running. Animated by the map itself: no JS per frame.
   */
  moveCamera(move: CameraMove): void;
  /** Most gliding updates per second the map should draw; 0 = no gliding. */
  setFrameRateCap(fps: number): void;
  onPinPress(listener: (member: number) => void): Stop;
}

// ── What screens see ─────────────────────────────────────────────────────────────

export interface Session {
  /** What this session is, for the screen title, e.g. "Concert at BKC". */
  readonly title: string;
  select(member: number | null): void;
  selected: Readable<number | null>;
  connection: Readable<ConnState>;
  /**
   * Every friend but me, nearest first. Updated at most once a second, and only while something
   * subscribes; unchanged otherwise.
   */
  rows: Readable<FriendRow[]>;
}

/**
 * Your people and sessions, kept on the phone. Changes apply at once in memory and are saved in
 * the background; a failed save never breaks the app.
 */
export interface Sessions {
  /** False until the saved book has been read. */
  readonly loaded: Readable<boolean>;
  /** Everyone you know, by name. Never includes you. */
  readonly people: Readable<Person[]>;
  /** Your sessions, newest first. */
  readonly list: Readable<SessionRecord[]>;
  /** Your name, as invites show it ('' until you set it). */
  readonly myName: Readable<string>;
  get(id: string): SessionRecord | undefined;
  /** Starts a session with you and these people (keys from `people`). */
  create(input: { title: string; event: EventKind; people: string[] }): SessionRecord;
  /** Reads an invite link's parts (path code + query); null if the link is broken. */
  readInvite(parts: Partial<Record<'code' | 'e' | 't' | 'p' | 'f', string>>): Invite | null;
  /**
   * Joins as `as` (an index into invite.names). People you don't know yet are added to Friends.
   * Joining a session you already have returns it unchanged.
   */
  join(invite: Invite, as: number): SessionRecord;
  remove(id: string): void;
  addPerson(name: string, circle: Circle): Person;
  setMyName(name: string): void;
  /** The link that invites someone into this session. */
  inviteUrl(id: string): string;
}

// ── Storage ──────────────────────────────────────────────────────────────────────

/** Text saved on the phone. Never throws: unreadable storage reads as null, a failed save is lost. */
export interface Storage {
  load(key: string): Promise<string | null>;
  save(key: string, value: string): Promise<void>;
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
