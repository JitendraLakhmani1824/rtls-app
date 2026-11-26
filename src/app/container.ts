// The composition root: the only file that names real implementations.
import type { LiveSessions, LiveView, Screens } from '@common/di';
import { LiveSession } from '@core/engine';
import { ME_KEY, PROFILES, type SessionRecord } from '@core/models';
import { noopPerf, type DeviceManager, type Stop } from '@core/protocols';
import { SessionBook } from '@core/sessions';
import { createRng, createStore, hashString } from '@core/utils';
import { PerfRecorder } from '@lab/perf';
import { ExpoDeviceManager } from '@managers/device';
import { SCENARIOS, SyntheticFeedManager, withFaults } from '@managers/feed';
import { MapLibreManager } from '@managers/map';
import { AsyncStorageManager } from '@managers/storage';

import { DEFAULT_PARAMS, type LaunchParams } from './launch-params';

/** Scene centre for every scenario (BKC grounds, Mumbai), [lng, lat]. */
export const VENUE: [number, number] = [72.8656, 19.0657];

/** Sessions with more friends than this group overlapping pins. */
const GROUPING_ABOVE = 30;
/** A session's map opens over the city, then flies in to the event. */
const CITY_ZOOM = 11;
/** The live view a scenario link opens (measurement). Never saved. */
export const SCENARIO_ID = 'scenario';

type Live = { view: LiveView; start(): Stop };

type LiveOptions = {
  title: string;
  /** Who's in it, in order; default: synthetic names. */
  people?: readonly { key: string; name: string }[];
  meIndex?: number;
  intro: boolean;
};

/** One session's engine: feed → LiveSession → map. Built when its map first opens. */
function createLive(
  id: string,
  params: LaunchParams,
  device: DeviceManager,
  options: LiveOptions,
): Live {
  const scenario = SCENARIOS[params.scenario];
  const synthetic = new SyntheticFeedManager(
    {
      scenario: params.scenario,
      friends: params.friends + 1, // the feed's people include me
      seed: params.seed,
      movingIntervalMs: params.intervalMs,
      center: VENUE,
      people: options.people,
      meIndex: options.meIndex,
    },
    device.clock,
  );
  const feed = withFaults(synthetic, params.faults, params.seed);
  const recorder = params.perf ? new PerfRecorder(`rung ${params.rung} ${params.scenario}`) : null;
  // A group of friends always shows every friend; grouping is only for large sessions.
  const grouping = params.friends > GROUPING_ABOVE;
  const map = new MapLibreManager(
    {
      center: VENUE,
      zoom: options.intro ? CITY_ZOOM : scenario.zoom,
      symbolFadeMs: params.fadeMs,
      groupPins: grouping,
    },
    recorder ?? noopPerf,
  );
  const session = new LiveSession({
    feed,
    map,
    device,
    perf: recorder ?? noopPerf,
    profile: PROFILES[scenario.profile],
    title: options.title,
    grouping,
    intro: options.intro,
  });
  return {
    view: { id, session, MapView: map.MapView },
    start() {
      const stops = [session.start(), recorder?.start()];
      return () => stops.forEach((stop) => stop?.());
    },
  };
}

/**
 * A saved session's simulation. The invite code seeds it and everyone keeps their order, so every
 * phone that joined from the same link simulates the same people and routes.
 */
function liveFor(record: SessionRecord, device: DeviceManager): Live {
  return createLive(
    record.id,
    {
      ...DEFAULT_PARAMS,
      scenario: record.event,
      friends: record.people.length - 1,
      seed: hashString(record.id) % 2 ** 31,
    },
    device,
    {
      title: record.title,
      people: record.people,
      meIndex: Math.max(
        0,
        record.people.findIndex((p) => p.key === ME_KEY),
      ),
      intro: true,
    },
  );
}

export type App = {
  /** All that screens ever see. */
  screens: Screens;
  /** Watches the device and loads the saved book. The returned stop() undoes it; start() can run again. */
  start(): Stop;
  /** A scenario link (measurement): builds its live view under SCENARIO_ID, replacing any earlier one. */
  openScenario(params: LaunchParams): void;
};

export function createApp(): App {
  const device = new ExpoDeviceManager();
  const sessions = new SessionBook({
    storage: new AsyncStorageManager(),
    clock: device.clock,
    rng: createRng(device.clock.now() % 2 ** 31), // invite codes: different on every phone
  });
  const built = new Map<string, Live>();
  const current = createStore<LiveView | null>(null);
  let running: { id: string; stop: Stop } | null = null;

  const build = (id: string): Live | null => {
    const existing = built.get(id);
    if (existing) return existing;
    const record = sessions.get(id);
    if (!record) return null;
    const live = liveFor(record, device);
    built.set(id, live);
    return live;
  };
  const stopRunning = () => {
    running?.stop();
    running = null;
    current.set(null);
  };

  const live: LiveSessions = {
    current,
    view: (id) => build(id)?.view ?? null,
    open(id) {
      if (running?.id === id) return;
      const next = build(id);
      if (!next) return;
      stopRunning();
      running = { id, stop: next.start() };
      current.set(next.view);
    },
    close(id) {
      if (running?.id === id) stopRunning();
    },
  };

  // A session you leave is gone: drop its engine.
  sessions.list.subscribe(() => {
    for (const id of [...built.keys()]) {
      if (id === SCENARIO_ID || sessions.get(id)) continue;
      live.close(id);
      built.delete(id);
    }
  });

  return {
    screens: { sessions, live },
    start() {
      const stopWatch = device.watch();
      void sessions.load();
      return () => {
        stopRunning();
        stopWatch();
      };
    },
    openScenario(params) {
      live.close(SCENARIO_ID);
      built.set(
        SCENARIO_ID,
        createLive(SCENARIO_ID, params, device, {
          title: SCENARIOS[params.scenario].title,
          intro: false,
        }),
      );
    },
  };
}
