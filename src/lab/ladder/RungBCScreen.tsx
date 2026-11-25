// Ladder rungs B and C — kept only for comparison (design §2.10). Pins jump; nothing glides.
// B: one GeoJSON source holding every friend, rebuilt and sent as each batch arrives.
// C: B + updates coalesced to at most one per animation frame, and only friends on screen.
// Both build GeoJSON objects the common way (an object per pin), handed to a leaf component via React state.
import { LocationStore } from '@core/engine';
import { PROFILES, type Member } from '@core/models';
import { ExpoDeviceManager } from '@managers/device';
import { SCENARIOS, SyntheticFeedManager, type ScenarioName } from '@managers/feed';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  type StyleSpecification,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import positron from '../../../assets/map-style/positron.json';
import { PerfRecorder } from '../perf';

type Props = {
  rung: 'B' | 'C';
  scenario: ScenarioName;
  friends: number;
  seed: number;
  intervalMs: number;
  center: [number, number];
};
type Bounds = [west: number, south: number, east: number, north: number];
type Collection = GeoJSON.FeatureCollection<GeoJSON.Point>;

const EMPTY: Collection = { type: 'FeatureCollection', features: [] };
const FONT = ['Noto Sans Bold'];
const PAD = 1.5;

export function RungBCScreen({ rung, scenario, friends, seed, intervalMs, center }: Props) {
  const [data, setData] = useState<Collection>(EMPTY);
  const bounds = useRef<Bounds | null>(null);

  useEffect(() => {
    const device = new ExpoDeviceManager();
    const feed = new SyntheticFeedManager(
      { scenario, friends, seed, movingIntervalMs: intervalMs, center },
      device.clock,
    );
    const store = new LocationStore();
    const changed: number[] = [];
    const perf = new PerfRecorder(`rung ${rung} ${scenario}`);
    const stopPerf = perf.start();
    let members: Member[] = [];
    let frame = 0;

    const send = () => {
      frame = 0;
      const json = perf.measure('encode', () =>
        encode(store, members, rung === 'C' ? bounds.current : null),
      );
      perf.count('sourceUpdates');
      setData(json);
    };

    const handle = feed.start({
      onMembers: (m) => {
        members = m;
        store.reset(m.length, PROFILES[SCENARIOS[scenario].profile].maxSpeedMs);
      },
      onFixes: (batch) => {
        perf.count('fixes', batch.n);
        if (perf.measure('ingest', () => store.ingest(batch, changed)) === 0) return;
        if (rung === 'B') send();
        else if (frame === 0) frame = requestAnimationFrame(send);
      },
      onPresence: () => {},
      onState: () => {},
      onSessionEnded: () => {},
    });
    return () => {
      handle.stop();
      cancelAnimationFrame(frame);
      stopPerf();
    };
  }, [rung, scenario, friends, seed, intervalMs, center]);

  const onRegion = (e: { nativeEvent: ViewStateChangeEvent }) => {
    bounds.current = e.nativeEvent.bounds as Bounds;
  };

  return (
    <MapLibreMap
      style={StyleSheet.absoluteFill}
      mapStyle={positron as unknown as StyleSpecification}
      logo={false}
      onRegionIsChanging={onRegion}
      onRegionDidChange={onRegion}
    >
      <Camera initialViewState={{ center, zoom: SCENARIOS[scenario].zoom }} />
      <Pins data={data} />
    </MapLibreMap>
  );
}

function Pins({ data }: { data: Collection }) {
  return (
    <GeoJSONSource id="pins" data={data}>
      <Layer
        id="pins-circle"
        type="circle"
        paint={{
          'circle-color': ['get', 'c'],
          'circle-radius': 9,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        }}
      />
      <Layer
        id="pins-initials"
        type="symbol"
        minzoom={15}
        layout={{
          'text-field': ['get', 't'],
          'text-font': FONT,
          'text-size': 9,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        }}
        paint={{ 'text-color': '#ffffff' }}
      />
    </GeoJSONSource>
  );
}

/** Every known friend (B), or only those inside the viewport padded 1.5× (C). */
function encode(store: LocationStore, members: Member[], view: Bounds | null): Collection {
  const features: Collection['features'] = [];
  const [w, s, e, n] = view ?? [0, 0, 0, 0];
  const cx = (w + e) / 2;
  const cy = (s + n) / 2;
  const hw = ((e - w) / 2) * PAD;
  const hh = ((n - s) / 2) * PAD;
  for (let m = 0; m < store.size; m++) {
    if (!store.has(m)) continue;
    const lng = store.lng(m);
    const lat = store.lat(m);
    if (view && (Math.abs(lng - cx) > hw || Math.abs(lat - cy) > hh)) continue;
    const member = members[m];
    features.push({
      type: 'Feature',
      id: m,
      properties: { m, c: member?.colour ?? '#334155', t: member?.initials ?? '' },
      geometry: { type: 'Point', coordinates: [lng, lat] },
    });
  }
  return { type: 'FeatureCollection', features };
}
