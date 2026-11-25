import { Presence } from '../models';

/** A still member's phone sends "I'm still here" this often (design §2.7). */
export const HEARTBEAT_MS = 60_000;
/** Live while heard within this many expected intervals… */
export const LIVE_FACTOR = 2.5;
/** …but never less than this, so one or two lost fixes don't flicker a walker to Recent. */
export const LIVE_MIN_MS = 10_000;
/** Recent up to this long; Stale after. */
export const RECENT_MAX_MS = 5 * 60_000;

/**
 * Live / Recent / Stale from when we last heard from the member, not from GPS movement,
 * so someone standing still at a concert (heartbeat only) stays Live.
 * `expectedIntervalMs` is how often we expect to hear from them: their fix interval while
 * moving, the heartbeat interval while still.
 */
export function presenceOf(now: number, heardAt: number, expectedIntervalMs: number): number {
  const silence = now - heardAt;
  if (!(silence <= RECENT_MAX_MS)) return Presence.Stale; // also NaN: never heard
  return silence <= Math.max(LIVE_FACTOR * expectedIntervalMs, LIVE_MIN_MS)
    ? Presence.Live
    : Presence.Recent;
}
