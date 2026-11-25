// Battery model for the SHARING phone (design §2.7). A model, not a measurement: it runs the sharing
// policy over an hour of each scenario and adds up GPS and radio time with the assumed currents below.
import { sharingDecision, type GpsMode, type SharingDecision } from '@core/sharing';
import { createRng } from '@core/utils';
import { SCENARIOS, type ScenarioName } from '@managers/feed';

/**
 * Assumed currents, mA. GPS: typical `gps.on` in Android power profiles is 30–60 mA; balanced and low
 * modes lean on Wi-Fi/cell positioning and duty-cycle the GPS. Radio: LTE connected, ~100–200 mA.
 */
export const CURRENT_MA: Record<GpsMode, number> & { radio: number } = {
  high: 45,
  balanced: 12,
  low: 3,
  radio: 120,
};
/** After each send the radio stays awake this long (the "tail"). */
export const RADIO_TAIL_S = 10;
/** A typical phone battery (OnePlus 10T: 4,800 mAh). */
export const BATTERY_MAH = 4_800;

export type Mode = 'naive' | 'live' | 'idle';
export type Row = {
  scenario: ScenarioName;
  mode: Mode;
  fixesPerHour: number;
  sendsPerHour: number;
  radioAwakeMinPerHour: number;
  mAhPerHour: number;
  batteryPctPerHour: number;
};

/**
 * One hour, `people` sharers, 1 s steps. naive = high-accuracy GPS every second and every fix sent;
 * live = the policy while someone watches; idle = the policy while nobody does. Per-person averages.
 */
export function batteryRow(scenario: ScenarioName, mode: Mode, people = 20, seed = 1): Row {
  const rng = createRng(seed);
  const world = SCENARIOS[scenario].create(rng, people);
  const lastFix = new Float64Array(people).fill(-Infinity);
  const lastSend = new Float64Array(people).fill(-Infinity);
  const awakeUntil = new Float64Array(people);
  const fixX = new Float64Array(people);
  const fixY = new Float64Array(people);
  const pending = new Uint8Array(people); // a fix waiting to be sent
  let fixes = 0;
  let sends = 0;
  let radioS = 0;
  let mAs = 0; // mA·s
  for (let t = 0; t < 3600; t++) {
    const x0 = Float64Array.from(world.x);
    const y0 = Float64Array.from(world.y);
    world.step(rng, 1);
    for (let i = 0; i < people; i++) {
      const x = world.x[i] ?? 0;
      const y = world.y[i] ?? 0;
      const speed = Math.hypot(x - (x0[i] ?? 0), y - (y0[i] ?? 0));
      const d: SharingDecision =
        mode === 'naive'
          ? {
              movement: 'run',
              gps: 'high',
              fixIntervalMs: 1000,
              minDistanceM: 0,
              sendIntervalMs: 1000,
              sends: 'each-fix',
            }
          : sharingDecision({
              speedMs: speed,
              watched: mode === 'live',
              battery: 1,
              lowPowerMode: false,
            });
      mAs += CURRENT_MA[d.gps];
      const moved = Math.hypot(x - (fixX[i] ?? 0), y - (fixY[i] ?? 0));
      if (
        t - (lastFix[i] ?? 0) >= d.fixIntervalMs / 1000 &&
        (d.minDistanceM === 0 || moved >= d.minDistanceM)
      ) {
        lastFix[i] = t;
        fixX[i] = x;
        fixY[i] = y;
        fixes++;
        pending[i] = 1;
      }
      const due = t - (lastSend[i] ?? 0) >= d.sendIntervalMs / 1000;
      if (due && (pending[i] === 1 || d.sends === 'heartbeat')) {
        lastSend[i] = t;
        pending[i] = 0;
        sends++;
        awakeUntil[i] = t + RADIO_TAIL_S;
      }
      if (t < (awakeUntil[i] ?? 0)) {
        radioS++;
        mAs += CURRENT_MA.radio;
      }
    }
  }
  const mAh = mAs / 3600 / people;
  return {
    scenario,
    mode,
    fixesPerHour: Math.round(fixes / people),
    sendsPerHour: Math.round(sends / people),
    radioAwakeMinPerHour: Math.round(radioS / people / 60),
    mAhPerHour: Math.round(mAh),
    batteryPctPerHour: Math.round((1000 * mAh) / BATTERY_MAH) / 10,
  };
}

/** The table for docs/results/m4-battery.md. */
export function batteryTable(): string {
  const lines = [
    '| Scenario | Sharing | Fixes/h | Sends/h | Radio awake (min/h) | mAh/h | Battery %/h |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const scenario of Object.keys(SCENARIOS) as ScenarioName[]) {
    for (const mode of ['naive', 'live', 'idle'] as const) {
      const r = batteryRow(scenario, mode);
      lines.push(
        `| ${scenario} | ${mode} | ${r.fixesPerHour} | ${r.sendsPerHour} | ${r.radioAwakeMinPerHour} | ${r.mAhPerHour} | ${r.batteryPctPerHour} |`,
      );
    }
  }
  return lines.join('\n');
}
