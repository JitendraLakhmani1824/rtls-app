import { FAULTS, SCENARIOS, type Fault, type ScenarioName } from '@managers/feed';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

/**
 * Ladder rungs (design §2.10): A = one Marker per friend in React state; B = one source, sent per batch;
 * C = B + per-frame batching and on-screen only; D = the real engine.
 */
export type Rung = 'A' | 'B' | 'C' | 'D';
const RUNGS: readonly Rung[] = ['A', 'B', 'C', 'D'];

export type LaunchParams = {
  scenario: ScenarioName;
  /** Friends in the session, not counting me. */
  friends: number;
  seed: number;
  /** How often a moving friend sends a fix, ms. */
  intervalMs: number;
  rung: Rung;
  /** Feed faults to switch on: drops, dups, reorder, jumps. */
  faults: Fault[];
  /** Print a PERF line per second. */
  perf: boolean;
  /** Experiment: label fade-in after map updates, ms (MapLibre's default is 300). */
  fadeMs: number;
};

export const DEFAULT_PARAMS: LaunchParams = {
  scenario: 'concert',
  friends: 4, // a real group of friends; scale runs pass friends= in the link
  seed: 42,
  intervalMs: 1000,
  rung: 'D',
  faults: [],
  perf: __DEV__,
  fadeMs: 0,
};

const clampInt = (value: string | undefined, min: number, max: number, fallback: number) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/**
 * Reads a scenario deep link, e.g.
 * `rtls://scenario?name=marathon&friends=500&interval=1000&seed=7&faults=drops,jumps&rung=D&perf=1`.
 * Unknown or missing values fall back to the defaults; anything that isn't a scenario link gives the defaults.
 */
export function parseLaunchUrl(
  url: string | null,
  defaults: LaunchParams = DEFAULT_PARAMS,
): LaunchParams {
  const match = url?.match(/^rtls:\/\/scenario\/?\??(.*)$/);
  if (!match) return defaults;
  const query: Record<string, string> = {};
  for (const pair of (match[1] ?? '').split('&')) {
    const [key, value] = pair.split('=');
    if (key) query[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
  }
  const name = query.name ?? '';
  return {
    scenario: name in SCENARIOS ? (name as ScenarioName) : defaults.scenario,
    friends: clampInt(query.friends, 1, 5000, defaults.friends),
    seed: clampInt(query.seed, 0, 2 ** 31 - 1, defaults.seed),
    intervalMs: clampInt(query.interval, 100, 60_000, defaults.intervalMs),
    rung: RUNGS.find((r) => r === query.rung) ?? defaults.rung,
    faults:
      query.faults === undefined
        ? defaults.faults
        : FAULTS.filter((f) => query.faults?.split(',').includes(f)),
    perf: query.perf === undefined ? defaults.perf : query.perf === '1',
    fadeMs: clampInt(query.fade, 0, 1000, defaults.fadeMs),
  };
}

export const paramsKey = (p: LaunchParams) => JSON.stringify(p);

/** True for a scenario link (`rtls://scenario?…`), which skips the start page. */
export const isScenarioLink = (url: string | null | undefined) =>
  !!url?.match(/^rtls:\/\/scenario/);

export type Launch = {
  /** False until the link that opened the app (if any) has been read. */
  ready: boolean;
  /** The session to show, or null for the start page. */
  params: LaunchParams | null;
  /** From the start page: open the map with these parameters. */
  start(params: LaunchParams): void;
  /** Leave the session: back to the start page. */
  exit(): void;
};

/**
 * What to show: the start page, or a session. A scenario link (at launch or later) opens a session
 * directly; the start page opens one with the user's choices; leaving returns to the start page.
 */
export function useLaunch(): Launch {
  const [state, setState] = useState<{ ready: boolean; params: LaunchParams | null }>({
    ready: false,
    params: null,
  });
  useEffect(() => {
    let cancelled = false;
    void Linking.getInitialURL().then((url) => {
      if (cancelled) return;
      setState((s) =>
        s.ready
          ? s
          : { ready: true, params: isScenarioLink(url) ? parseLaunchUrl(url ?? null) : null },
      );
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isScenarioLink(url)) setState({ ready: true, params: parseLaunchUrl(url) });
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
  return {
    ...state,
    start: (params) => setState({ ready: true, params }),
    exit: () => setState({ ready: true, params: null }),
  };
}
