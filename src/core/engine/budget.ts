import type { Budget } from '../models';
import type { Power } from '../protocols';

/** How much animation the phone can afford (design §2.4). Pure: same power state → same budget. */
export function budgetFor(power: Power): Budget {
  if (power.thermal === 'critical') return { glideLimit: 0, glideFps: 0, gestureUpdatesPerSec: 1 };
  if (power.thermal === 'serious') return { glideLimit: 15, glideFps: 15, gestureUpdatesPerSec: 2 };
  if (power.lowPowerMode) return { glideLimit: 10, glideFps: 30, gestureUpdatesPerSec: 2 };
  return { glideLimit: 30, glideFps: 60, gestureUpdatesPerSec: 4 };
}
