// Ladder rung A — the "typical" approach, kept only for comparison (design §2.10):
// friends live in React state and each one is a MapLibre <Marker> (a native view), re-rendered per batch.
import { FIX_STRIDE, type Member } from '@core/models';
import { ExpoDeviceManager } from '@managers/device';
import { SyntheticFeedManager } from '@managers/feed';
import {
  Camera,
  Map as MapLibreMap,
  Marker,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import positron from '../../../assets/map-style/positron.json';
import { PerfRecorder } from '../perf';

type Props = { friends: number; seed: number; intervalMs: number; center: [number, number] };
type Position = [lng: number, lat: number];

export function RungAScreen({ friends, seed, intervalMs, center }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [positions, setPositions] = useState<Record<number, Position>>({});

  useEffect(() => {
    const device = new ExpoDeviceManager();
    const feed = new SyntheticFeedManager(
      { scenario: 'concert', friends, seed, movingIntervalMs: intervalMs, center },
      device.clock,
    );
    const perf = new PerfRecorder('rung A');
    const stopPerf = perf.start();
    const handle = feed.start({
      onMembers: setMembers,
      onFixes: (batch) => {
        perf.count('fixes', batch.n);
        const updates: Record<number, Position> = {};
        for (let i = 0; i < batch.n; i++) {
          const o = i * FIX_STRIDE;
          updates[batch.buf[o] ?? -1] = [batch.buf[o + 2] ?? NaN, batch.buf[o + 3] ?? NaN];
        }
        setPositions((prev) => ({ ...prev, ...updates }));
      },
      onState: () => {},
      onSessionEnded: () => {},
    });
    return () => {
      handle.stop();
      stopPerf();
    };
  }, [friends, seed, intervalMs, center]);

  return (
    <MapLibreMap
      style={StyleSheet.absoluteFill}
      mapStyle={positron as unknown as StyleSpecification}
      logo={false}
    >
      <Camera initialViewState={{ center, zoom: 14.5 }} />
      {members.map((m) => {
        const p = positions[m.id];
        if (!p) return null;
        return (
          <Marker key={m.key} lngLat={p}>
            <View style={[styles.pin, { backgroundColor: m.colour }]}>
              <Text style={styles.initials}>{m.initials}</Text>
            </View>
          </Marker>
        );
      })}
    </MapLibreMap>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#ffffff', fontSize: 8, fontWeight: '700' },
});
