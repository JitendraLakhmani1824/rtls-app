/**
 * How the sharing phone uses GPS and the radio (design §2.7). Pure: the same situation always gives
 * the same decision. The movement class comes from GPS speed, so no motion-sensor permission is needed.
 */

export type Movement = 'still' | 'walk' | 'run' | 'drive';
export type GpsMode = 'high' | 'balanced' | 'low';

export type SharingState = {
  /** Ground speed from the last fixes, m/s. */
  speedMs: number;
  /** Someone has the map open on this friend's session (the server's `watchers` hint > 0). */
  watched: boolean;
  /** 0–1. */
  battery: number;
  lowPowerMode: boolean;
};

export type SharingDecision = {
  movement: Movement;
  gps: GpsMode;
  /** Ask the OS for a fix at most this often… */
  fixIntervalMs: number;
  /** …and only after moving this far (0 = no distance filter). */
  minDistanceM: number;
  /** Send at most this often: each fix, a batch, or (when still) a heartbeat. */
  sendIntervalMs: number;
  sends: 'each-fix' | 'batch' | 'heartbeat';
};

/** Below this battery level the phone saves energy as in Low Power Mode. */
export const LOW_BATTERY = 0.2;

export function movementOf(speedMs: number): Movement {
  if (!(speedMs >= 0.5)) return 'still';
  if (speedMs < 2.5) return 'walk';
  if (speedMs < 7) return 'run';
  return 'drive';
}

const LOWER: Record<GpsMode, GpsMode> = { high: 'balanced', balanced: 'low', low: 'low' };

export function sharingDecision(state: SharingState): SharingDecision {
  const movement = movementOf(state.speedMs);
  const d = base(movement, state.watched);
  if (state.lowPowerMode || state.battery < LOW_BATTERY) {
    // One GPS level lower; and unless someone is watching, never send more than once a minute.
    d.gps = LOWER[d.gps];
    if (!state.watched) d.sendIntervalMs = Math.max(d.sendIntervalMs, 60_000);
  }
  return d;
}

function base(movement: Movement, watched: boolean): SharingDecision {
  if (watched) {
    if (movement === 'still')
      return {
        movement,
        gps: 'low',
        fixIntervalMs: 30_000,
        minDistanceM: 0,
        sendIntervalMs: 60_000,
        sends: 'heartbeat',
      };
    if (movement === 'drive')
      return {
        movement,
        gps: 'balanced',
        fixIntervalMs: 5_000,
        minDistanceM: 25,
        sendIntervalMs: 5_000,
        sends: 'each-fix',
      };
    return {
      movement,
      gps: 'high',
      fixIntervalMs: 5_000,
      minDistanceM: 5,
      sendIntervalMs: 4_000,
      sends: 'each-fix',
    };
  }
  if (movement === 'still')
    return {
      movement,
      gps: 'low',
      fixIntervalMs: 60_000,
      minDistanceM: 0,
      sendIntervalMs: 120_000,
      sends: 'heartbeat',
    };
  return {
    movement,
    gps: 'balanced',
    fixIntervalMs: 15_000,
    minDistanceM: 20,
    sendIntervalMs: 60_000,
    sends: 'batch',
  };
}
