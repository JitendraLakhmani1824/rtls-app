// The composition root: the only file that names real implementations.
import type { Screens } from '@common/di';
import { LiveSession } from '@core/engine';
import { noopPerf, type Stop } from '@core/protocols';
import { PerfRecorder } from '@lab/perf';
import { ExpoDeviceManager } from '@managers/device';
import { SyntheticFeedManager } from '@managers/feed';
import { MapLibreManager } from '@managers/map';

import type { LaunchParams } from './launch-params';

/** Concert venue centre (BKC grounds, Mumbai), [lng, lat]. */
export const VENUE: [number, number] = [72.8656, 19.0657];

export type Container = {
  /** All that screens ever see. */
  screens: Screens;
  /** Starts the device watch, session and (if enabled) perf recorder. The returned stop() undoes it; start() can run again. */
  start(): Stop;
};

export function createContainer(params: LaunchParams): Container {
  const device = new ExpoDeviceManager();
  const feed = new SyntheticFeedManager(
    {
      scenario: params.scenario,
      friends: params.friends,
      seed: params.seed,
      movingIntervalMs: params.intervalMs,
      center: VENUE,
    },
    device.clock,
  );
  const map = new MapLibreManager({ center: VENUE, zoom: 14.5 });
  const recorder = params.perf ? new PerfRecorder(`rung ${params.rung}`) : null;
  const session = new LiveSession({ feed, map, device, perf: recorder ?? noopPerf });

  return {
    screens: { session, MapView: map.MapView },
    start() {
      const stops = [device.watch(), session.start(), recorder?.start()];
      return () => stops.forEach((stop) => stop?.());
    },
  };
}
