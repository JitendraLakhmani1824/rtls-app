// The replay fingerprint: seed → 60 virtual seconds → hash of everything sent to the map.
// If a fingerprint changes, the app's behaviour changed. Update it in the same change only if that
// was intended, and say why in the commit.
import { LiveSession } from '@core/engine';
import { PROFILES } from '@core/models';
import { noopPerf } from '@core/protocols';
import {
  FAULTS,
  SCENARIOS,
  SyntheticFeedManager,
  withFaults,
  type ScenarioName,
} from '@managers/feed';

import { FakeDeviceManager, FakeMapManager } from '../fakes';

const CENTER: [number, number] = [72.8656, 19.0657];

function replay(scenario: ScenarioName) {
  const device = new FakeDeviceManager();
  const map = new FakeMapManager();
  const feed = withFaults(
    new SyntheticFeedManager(
      { scenario, friends: 200, seed: 42, movingIntervalMs: 1000, center: CENTER },
      device.clock,
    ),
    FAULTS,
    42,
  );
  const session = new LiveSession({
    feed,
    map,
    device,
    perf: noopPerf,
    profile: PROFILES[SCENARIOS[scenario].profile],
  });
  // A phone screen (390 × 844 points) at street zoom around the centre: friends glide, trails draw.
  map.viewport.set({
    west: CENTER[0] - 0.0021,
    east: CENTER[0] + 0.0021,
    south: CENTER[1] - 0.0043,
    north: CENTER[1] + 0.0043,
    zoom: 16,
    gesturing: false,
  });
  session.start();
  device.clock.advance(10_000);
  map.pressPin(1);
  device.clock.advance(20_000);
  device.power.set({ lowPowerMode: true, thermal: 'nominal', battery: 0.15 });
  device.clock.advance(30_000);

  const sent = JSON.stringify(
    [map.stillFrames, map.movingFrames, map.trailFrames, map.frameRateCaps],
    (_key, value: unknown) => (typeof value === 'number' ? Math.round(value * 1e7) / 1e7 : value),
  );
  return {
    still: map.stillFrames.length,
    moving: map.movingFrames.length,
    trails: map.trailFrames.length,
    hash: fnv1a(sent),
  };
}

/** FNV-1a, 32-bit, as 8 hex digits. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

describe('replay fingerprint (seed 42, 60 s, all faults on)', () => {
  it.each([
    ['concert', { still: 63, moving: 170, trails: 11, hash: 'a558854c' }],
    ['marathon', { still: 64, moving: 286, trails: 32, hash: 'ed8589ca' }],
    ['trip', { still: 54, moving: 263, trails: 62, hash: 'deff0d5f' }],
  ] as const)('%s sends the same frames to the map as before', (scenario, expected) => {
    expect(replay(scenario)).toEqual(expected);
  });
});
