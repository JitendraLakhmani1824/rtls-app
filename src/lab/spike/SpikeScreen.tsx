// M0 spike screen: 470 still friends (clustered, 1×/s) + 30 movers (30×/s) + 30 trails + selected trail tip.
// Switch the update path (A/B/C) and read the counters; tap a pin to open the native form sheet.
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  type CameraRef,
  type GeoJSONSourceRef,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { useIsFocused, type NavigationProp } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import positron from '../../../assets/map-style/positron.json';
import { EMPTY_FC, encodeStill, encodeTrails } from './encode';
import { MovingA, MovingB, MovingC } from './movingSources';
import {
  CENTER,
  MOVER_COUNT,
  Trails,
  jitterStill,
  makeMovers,
  makeStill,
  moverPosition,
} from './sim';
import { counters, selection, sheetOpen, stats, type UpdatePath } from './spikeStore';

export type SpikeStack = { Spike: undefined; SpikeSheet: undefined };

const MAP_STYLE = positron as unknown as StyleSpecification;

function createWorld() {
  return { movers: makeMovers(), still: makeStill(), trails: new Trails(), t0: performance.now() };
}

type PressedFeature = {
  id?: string | number;
  properties?: { cluster?: boolean; cluster_id?: number; m?: number } | null;
  geometry?: { type: string; coordinates?: unknown };
};
type PressEvent = NativeSyntheticEvent<{ features: PressedFeature[] }>;

export function SpikeScreen({ navigation }: { navigation: NavigationProp<SpikeStack> }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const cameraRef = useRef<CameraRef>(null);
  const stillRef = useRef<GeoJSONSourceRef>(null);
  const [path, setPath] = useState<UpdatePath>('A');
  const selected = useSyncExternalStore(selection.subscribe, selection.get);

  // World state lives outside React; only the 1×/s strings go through state.
  const [world] = useState(createWorld);
  const [stillData, setStillData] = useState(() => encodeStill(world.still));
  const [trailsData, setTrailsData] = useState(EMPTY_FC);

  useEffect(() => {
    const p = [0, 0];
    const id = setInterval(() => {
      jitterStill(world.still);
      const tSec = (performance.now() - world.t0) / 1000;
      for (let m = 0; m < MOVER_COUNT; m++) {
        moverPosition(world.movers, m, tSec, p);
        world.trails.push(m, p[0] as number, p[1] as number);
      }
      setStillData(encodeStill(world.still));
      setTrailsData(encodeTrails(world.trails));
    }, 1000);
    return () => clearInterval(id);
  }, [world]);

  // Selection ring on still pins via feature state (paint only, no data re-send).
  const prevSelected = useRef<number | null>(null);
  useEffect(() => {
    const src = stillRef.current;
    if (!src) return;
    if (prevSelected.current !== null)
      void src.setFeatureState({ id: prevSelected.current }, { selected: false });
    if (selected !== null && selected >= MOVER_COUNT)
      void src.setFeatureState({ id: selected }, { selected: true });
    prevSelected.current = selected;
  }, [selected]);

  const openFriend = useCallback(
    (member: number) => {
      selection.set(member);
      navigation.navigate('SpikeSheet');
    },
    [navigation],
  );

  const onStillPress = useCallback(
    async (e: PressEvent) => {
      const f = e.nativeEvent.features[0];
      if (!f) return;
      if (f.properties?.cluster && f.properties.cluster_id !== undefined) {
        const zoom = await stillRef.current?.getClusterExpansionZoom(f.properties.cluster_id);
        const c = f.geometry?.coordinates as [number, number] | undefined;
        if (zoom !== undefined && c) cameraRef.current?.easeTo({ center: c, zoom, duration: 400 });
        return;
      }
      if (typeof f.properties?.m === 'number') openFriend(f.properties.m);
    },
    [openFriend],
  );

  const onMovingPress = useCallback(
    (e: PressEvent) => {
      const m = e.nativeEvent.features[0]?.properties?.m;
      if (typeof m === 'number') openFriend(m);
    },
    [openFriend],
  );

  const movingProps = {
    movers: world.movers,
    t0: world.t0,
    trails: world.trails,
    selected,
    onPress: onMovingPress,
  };

  return (
    <View style={styles.fill}>
      <MapLibreMap
        style={styles.fill}
        mapStyle={MAP_STYLE}
        preferredFramesPerSecond={60}
        logo={false}
        attributionPosition={{ bottom: insets.bottom + 64, right: 8 }}
        onDidFinishRenderingFrame={() => {
          counters.mapFrames += 1;
        }}
      >
        <Camera ref={cameraRef} initialViewState={{ center: CENTER, zoom: 13.5 }} />

        <GeoJSONSource id="trails" data={trailsData}>
          <Layer
            id="trails-line"
            type="line"
            paint={{ 'line-color': ['get', 'c'], 'line-width': 3, 'line-opacity': 0.55 }}
          />
        </GeoJSONSource>

        <GeoJSONSource
          id="pins-still"
          ref={stillRef}
          data={stillData}
          cluster
          clusterRadius={40}
          clusterMaxZoom={15}
          onPress={onStillPress}
        >
          <Layer
            id="still-clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': '#334155',
              'circle-radius': ['step', ['get', 'point_count'], 14, 20, 18, 100, 24],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            }}
          />
          <Layer
            id="still-cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': ['get', 'point_count_abbreviated'],
              'text-font': ['Noto Sans Bold'],
              'text-size': 12,
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            }}
            paint={{ 'text-color': '#ffffff' }}
          />
          <Layer
            id="still-pins"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': ['get', 'c'],
              'circle-radius': 8,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                4,
                1.5,
              ],
            }}
          />
          <Layer
            id="still-initials"
            type="symbol"
            minzoom={15}
            filter={['!', ['has', 'point_count']]}
            layout={{
              'text-field': ['get', 't'],
              'text-font': ['Noto Sans Bold'],
              'text-size': 8,
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            }}
            paint={{ 'text-color': '#ffffff' }}
          />
        </GeoJSONSource>

        {path === 'A' && <MovingA {...movingProps} />}
        {path === 'B' && <MovingB {...movingProps} />}
        {path === 'C' && <MovingC {...movingProps} />}
      </MapLibreMap>

      <PerfOverlay path={path} focused={focused} topInset={insets.top} />

      <View style={[styles.controls, { paddingBottom: insets.bottom + 8 }]}>
        {(['A', 'B', 'C'] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPath(p)}
            style={[styles.button, path === p && styles.buttonOn]}
          >
            <Text style={[styles.buttonText, path === p && styles.buttonTextOn]}>Path {p}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => cameraRef.current?.easeTo({ center: CENTER, zoom: 13.5, duration: 400 })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PerfOverlay({
  path,
  focused,
  topInset,
}: {
  path: UpdatePath;
  focused: boolean;
  topInset: number;
}) {
  const s = useSyncExternalStore(stats.subscribe, stats.get);
  const uiFrames = useSharedValue(0);
  useFrameCallback(() => {
    'worklet';
    uiFrames.value += 1;
  });

  // JS thread frame counter.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      counters.jsFrames += 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Fold counters into stats once a second; also print a PERF line for the harness.
  const live = useRef({ path, focused });
  useEffect(() => {
    live.current = { path, focused };
  }, [path, focused]);
  useEffect(() => {
    const id = setInterval(() => {
      const n = Math.max(counters.movingUpdates, 1);
      const next = {
        path: live.current.path,
        jsFps: counters.jsFrames,
        uiFps: uiFrames.value,
        mapFps: counters.mapFrames,
        movingUpdates: counters.movingUpdates,
        encodeMs: +(counters.encodeMsTotal / n).toFixed(2),
        updateMs: +(counters.updateMsTotal / n).toFixed(2),
        appState: AppState.currentState ?? 'unknown',
        homeFocused: live.current.focused,
        sheetOpen: sheetOpen.get(),
      };
      uiFrames.value = 0;
      counters.reset();
      stats.set(next);
      console.log('PERF ' + JSON.stringify(next));
    }, 1000);
    return () => clearInterval(id);
  }, [uiFrames]);

  return (
    <View pointerEvents="none" style={[styles.overlay, { top: topInset + 8 }]}>
      <Text style={styles.overlayText}>
        {s
          ? `Path ${s.path} · JS ${s.jsFps} · UI ${s.uiFps} · map ${s.mapFps} fps\n` +
            `moving updates ${s.movingUpdates}/s · encode ${s.encodeMs} ms · update ${s.updateMs} ms\n` +
            `app ${s.appState} · home focused ${s.homeFocused ? 'yes' : 'no'} · sheet ${s.sheetOpen ? 'open' : 'closed'}`
          : 'measuring…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: {
    position: 'absolute',
    left: 8,
    right: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  overlayText: { color: '#ffffff', fontSize: 11, fontVariant: ['tabular-nums'] },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  buttonOn: { backgroundColor: '#0f172a' },
  buttonText: { color: '#0f172a', fontWeight: '600' },
  buttonTextOn: { color: '#ffffff' },
});
