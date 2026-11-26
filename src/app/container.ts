// The composition root: the only file that names real implementations.
import type { Screens } from '@common/di';
import { LiveSession } from '@core/engine';
import { noopPerf, type Stop } from '@core/protocols';
import { PerfRecorder } from '@lab/perf';
import { ExpoDeviceManager } from '@managers/device';
import { PROFILES } from '@core/models';
import { SCENARIOS, SyntheticFeedManager, withFaults } from '@managers/feed';
import { MapLibreManager } from '@managers/map';

import type { LaunchParams } from './launch-params';

/** Scene centre for every scenario (BKC grounds, Mumbai), [lng, lat]. */
export const VENUE: [number, number] = [72.8656, 19.0657];

/** Sessions with more friends than this group overlapping pins. */
const GROUPING_ABOVE = 30;

export type Container = {
  /** All that screens ever see. */
  screens: Screens;
  /** Starts the device watch, session and (if enabled) perf recorder. The returned stop() undoes it; start() can run again. */
  start(): Stop;
};

/** `onLeave` runs when the user leaves the session (back to the start page). */
export function createContainer(params: LaunchParams, onLeave?: () => void): Container {
  const scenario = SCENARIOS[params.scenario];
  const device = new ExpoDeviceManager();
  const synthetic = new SyntheticFeedManager(
    {
      scenario: params.scenario,
      friends: params.friends + 1, // the feed's people include me
      seed: params.seed,
      movingIntervalMs: params.intervalMs,
      center: VENUE,
    },
    device.clock,
  );
  const feed = withFaults(synthetic, params.faults, params.seed);
  const recorder = params.perf ? new PerfRecorder(`rung ${params.rung} ${params.scenario}`) : null;
  // A group of friends always shows every friend; grouping is only for large sessions.
  const grouping = params.friends > GROUPING_ABOVE;
  const map = new MapLibreManager(
    { center: VENUE, zoom: scenario.zoom, symbolFadeMs: params.fadeMs, groupPins: grouping },
    recorder ?? noopPerf,
  );
  const session = new LiveSession({
    feed,
    map,
    device,
    perf: recorder ?? noopPerf,
    profile: PROFILES[scenario.profile],
    title: scenario.title,
    grouping,
    onLeave,
  });

  return {
    screens: { session, MapView: map.MapView },
    start() {
      const stops = [device.watch(), session.start(), recorder?.start()];
      return () => stops.forEach((stop) => stop?.());
    },
  };
}
