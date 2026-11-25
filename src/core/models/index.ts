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

/** Pins drawn still. Each pin is PIN_STRIDE numbers: member, lng, lat, presence. */
export type PinFrame = { n: number; buf: Float64Array };
export const PIN_STRIDE = 4;

/**
 * Gliding pins. Each entry is MOTION_STRIDE numbers: member, lng, lat, durationMs —
 * "glide this member to (lng, lat) over durationMs, starting from wherever it is drawn now".
 * The frame lists the whole gliding set: members not in it are no longer drawn as gliding.
 * Durations, not timestamps, so the renderer can animate on its own clock (UI thread or native).
 */
export type MotionFrame = { n: number; buf: Float64Array };
export const MOTION_STRIDE = 4;

/** Presence codes carried in PinFrame. */
export const Presence = { Live: 0, Recent: 1, Stale: 2 } as const;

export type Viewport = {
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
  gesturing: boolean;
};

export type ConnState = { kind: 'live' | 'reconnecting' | 'offline'; sinceMs: number };

/** Where a feed stopped, so it can resume without gaps. Opaque to everyone but the feed. */
export type Cursor = { readonly feedPosition: number };
