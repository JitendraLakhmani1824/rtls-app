// Shared data shapes. Hot-path data is plain numbers in typed arrays ("frames"), so a native
// implementation could read it without conversion. Senders reuse their buffers: a receiver must
// use or copy the data before returning and never keep a reference.

/** A friend in the session. `id` is a dense index 0…N−1, assigned once per session. */
export type Member = {
  id: number;
  key: string;
  name: string;
  initials: string;
  colour: string;
  isMe: boolean;
};

/** Location fixes. Each fix is FIX_STRIDE numbers: member, seq, lng, lat, tMs, accuracyM. */
export type FixBatch = { n: number; buf: Float64Array };
export const FIX_STRIDE = 6;

/**
 * Pins drawn still. Each pin is PIN_STRIDE numbers: member, lng, lat, presence, haloM —
 * haloM is the accuracy radius to draw around a poorly located pin, 0 for none.
 */
export type PinFrame = { n: number; buf: Float64Array };
export const PIN_STRIDE = 5;

/**
 * Gliding pins. Each entry is MOTION_STRIDE numbers: member, lng, lat, durationMs, haloM —
 * "glide this member to (lng, lat) over durationMs, starting from wherever it is drawn now";
 * haloM as in PinFrame.
 * The frame lists the whole gliding set: members not in it are no longer drawn as gliding.
 * Durations, not timestamps, so the renderer can animate on its own clock (UI thread or native).
 */
export type MotionFrame = { n: number; buf: Float64Array };
export const MOTION_STRIDE = 5;

/** Presence codes. Paused members are not drawn on the map, so PinFrame never carries Paused. */
export const Presence = { Live: 0, Recent: 1, Stale: 2, Paused: 3 } as const;

/** Heartbeats ("I'm still here") and pause flags. Each entry is PRESENCE_STRIDE numbers: member, heardAtMs, paused (0/1). */
export type PresenceBatch = { n: number; buf: Float64Array };
export const PRESENCE_STRIDE = 3;

/**
 * Trails to draw. Part i belongs to member `members[i]`; its points are TRAIL_STRIDE numbers each
 * (lng, lat, ageBucket 0 = newest … 3 = oldest) from coords[offsets[i] * TRAIL_STRIDE] up to offsets[i + 1].
 * A member's trail splits into several parts at data gaps and jumps — never a straight line across them.
 */
export type TrailFrame = {
  n: number;
  members: Float64Array;
  offsets: Uint32Array;
  coords: Float64Array;
};
export const TRAIL_STRIDE = 3;

/** How a session behaves, set by its type (PRD §3). */
export type SessionProfile = {
  name: 'event' | 'race' | 'trip';
  /** Faster than this between two fixes is a GPS jump, not movement. */
  maxSpeedMs: number;
  /** Trail points older than this are not drawn. Infinity = the whole session. */
  trailWindowMs: number;
  /** Fixed memory per member. */
  trailCapacity: number;
  /** A new trail point only after moving at least this far. */
  trailMinStepM: number;
  /** When full: thin the oldest half (true) or overwrite the oldest point (false). */
  keepWholeTrail: boolean;
};

export const PROFILES: Record<SessionProfile['name'], SessionProfile> = {
  event: {
    name: 'event',
    maxSpeedMs: 4,
    trailWindowMs: 15 * 60_000,
    trailCapacity: 256,
    trailMinStepM: 5,
    keepWholeTrail: false,
  },
  race: {
    name: 'race',
    maxSpeedMs: 8,
    trailWindowMs: Infinity,
    trailCapacity: 512,
    trailMinStepM: 10,
    keepWholeTrail: true,
  },
  trip: {
    name: 'trip',
    maxSpeedMs: 60,
    trailWindowMs: 60 * 60_000,
    trailCapacity: 256,
    trailMinStepM: 50,
    keepWholeTrail: false,
  },
};

/** How much animation the phone can afford right now (design §2.4). */
export type Budget = {
  /** Most members gliding at once. */
  glideLimit: number;
  /** Cap on gliding-pin updates per second; 0 = no gliding, pins step once a second. */
  glideFps: number;
  /** Motion updates per second while the user pans or zooms. */
  gestureUpdatesPerSec: number;
};

export type Viewport = {
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
  gesturing: boolean;
};

export type ConnState = { kind: 'live' | 'reconnecting' | 'offline'; sinceMs: number };

/** A friend as the list and the Detail sheet show it. Plain numbers; screens format them. */
export type FriendRow = {
  id: number;
  name: string;
  initials: string;
  colour: string;
  /** Presence code (Presence.*). */
  presence: number;
  /** From me, metres; NaN when either position is unknown. */
  distanceM: number;
  /** From me, degrees clockwise from north; NaN when unknown. */
  bearingDeg: number;
  /** Since we last heard from them (fix or heartbeat), ms; NaN if never. */
  silentMs: number;
  speedMs: number;
};

/** Where a feed stopped, so it can resume without gaps. Opaque to everyone but the feed. */
export type Cursor = { readonly feedPosition: number };
