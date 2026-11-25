import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  type CameraRef,
  type GeoJSONSourceProps,
  type GeoJSONSourceRef,
  type StyleSpecification,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ComponentType,
  type RefObject,
} from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import positron from '../../../assets/map-style/positron.json';
import { EMPTY_FC } from './encode';
import type { MapViewModel, MemberTable } from './viewModel';

const MAP_STYLE = positron as unknown as StyleSpecification;
const FONT = ['Noto Sans Bold']; // the only glyphs OpenFreeMap serves
const GLIDE_FRAME_MS = 30; // gliding pins update at most ~33×/s
const CLUSTER_MAX_ZOOM = 15;

type PressEvent = Parameters<NonNullable<GeoJSONSourceProps['onPress']>>[0];

/** A map component bound to one model. Screens receive it as `MapView` and never see MapLibre. */
export function createMapView(model: MapViewModel): ComponentType {
  function BoundMapView() {
    return <MapLibreView model={model} />;
  }
  return memo(BoundMapView);
}

function MapLibreView({ model }: { model: MapViewModel }) {
  const cameraRef = useRef<CameraRef>(null);
  useEffect(() => () => model.handleReady(false), [model]);

  const onRegion = (gesturing: boolean) => (e: { nativeEvent: ViewStateChangeEvent }) => {
    const { bounds, zoom, userInteraction } = e.nativeEvent;
    model.handleRegion({
      west: bounds[0],
      south: bounds[1],
      east: bounds[2],
      north: bounds[3],
      zoom,
      gesturing: gesturing && userInteraction,
    });
  };

  return (
    <MapLibreMap
      style={StyleSheet.absoluteFill}
      mapStyle={MAP_STYLE}
      logo={false}
      preferredFramesPerSecond={60}
      onDidFinishLoadingStyle={() => model.handleReady(true)}
      onRegionIsChanging={onRegion(true)}
      onRegionDidChange={onRegion(false)}
    >
      <Camera ref={cameraRef} initialViewState={model.initialView} />
      <StillPins model={model} cameraRef={cameraRef} />
      <GlidingPins model={model} />
    </MapLibreMap>
  );
}

// ── Still pins: a leaf component, re-rendered ≤ 1×/s with a new data string ─────────

function StillPins({
  model,
  cameraRef,
}: {
  model: MapViewModel;
  cameraRef: RefObject<CameraRef | null>;
}) {
  const data = useSyncExternalStore(model.stillData.subscribe, model.stillData.get);
  const sourceRef = useRef<GeoJSONSourceRef>(null);

  const onPress = useCallback(
    async (e: PressEvent) => {
      const f = e.nativeEvent.features[0];
      if (!f) return;
      const props = f.properties ?? {};
      if (props.cluster && typeof props.cluster_id === 'number' && f.geometry.type === 'Point') {
        const zoom = await sourceRef.current?.getClusterExpansionZoom(props.cluster_id);
        const [lng, lat] = f.geometry.coordinates;
        if (zoom !== undefined && lng !== undefined && lat !== undefined) {
          cameraRef.current?.easeTo({ center: [lng, lat], zoom, duration: 400 });
        }
        return;
      }
      if (typeof props.m === 'number') model.handlePress(props.m);
    },
    [model, cameraRef],
  );

  return (
    <GeoJSONSource
      id="pins-still"
      ref={sourceRef}
      data={data}
      cluster
      clusterRadius={40}
      clusterMaxZoom={CLUSTER_MAX_ZOOM}
      onPress={onPress}
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
          'text-font': FONT,
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
          'circle-radius': 9,
          'circle-opacity': ['match', ['get', 'p'], 1, 0.7, 2, 0.4, 1],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['case', ['==', ['get', 's'], 1], 4, 1.5],
        }}
      />
      <Layer
        id="still-initials"
        type="symbol"
        minzoom={CLUSTER_MAX_ZOOM}
        filter={['!', ['has', 'point_count']]}
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

// ── Gliding pins: interpolated and encoded on the UI thread, zero JS per frame ─────

const ForwardedSource = forwardRef<GeoJSONSourceRef, GeoJSONSourceProps>(
  function ForwardedSource(props, ref) {
    return <GeoJSONSource {...props} ref={ref} />;
  },
) as unknown as ComponentType<GeoJSONSourceProps>;
const AnimatedSource = Animated.createAnimatedComponent(ForwardedSource);

/** member → [fromLng, fromLat, toLng, toLat, startMs, endMs] on the UI-thread clock. */
type Glides = Record<string, number[]>;

function GlidingPins({ model }: { model: MapViewModel }) {
  const { motion, table, selectedMember } = model;
  const glides = useSharedValue<Glides>({});
  const applied = useSharedValue(-1);
  const drawnSelected = useSharedValue(-1);
  const data = useSharedValue(EMPTY_FC);
  const lastFrame = useSharedValue(0);
  const settled = useSharedValue(true);

  useFrameCallback((info) => {
    'worklet';
    const now = info.timestamp;
    let changed = false;
    const input = motion.value;
    if (input.version !== applied.value) {
      applied.value = input.version;
      glides.value = retarget(glides.value, input.entries, now);
      changed = true;
    }
    if (selectedMember.value !== drawnSelected.value) {
      drawnSelected.value = selectedMember.value;
      changed = true;
    }
    if (!changed && settled.value) return; // nothing gliding: no work at all
    if (!changed && now - lastFrame.value < GLIDE_FRAME_MS) return;
    lastFrame.value = now;
    const out = encodeGliding(glides.value, now, table.value, selectedMember.value);
    data.value = out.json;
    settled.value = out.settled;
  });

  const animatedProps = useAnimatedProps(() => ({ data: data.value }));
  const onPress = useCallback(
    (e: PressEvent) => {
      const m = e.nativeEvent.features[0]?.properties?.m;
      if (typeof m === 'number') model.handlePress(m);
    },
    [model],
  );

  return (
    <AnimatedSource
      id="pins-moving"
      data={EMPTY_FC}
      onPress={onPress}
      animatedProps={animatedProps}
    >
      <Layer
        id="moving-pins"
        type="circle"
        paint={{
          'circle-color': ['get', 'c'],
          'circle-radius': 10,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['case', ['==', ['get', 's'], 1], 4, 2],
        }}
      />
      <Layer
        id="moving-initials"
        type="symbol"
        layout={{
          'text-field': ['get', 't'],
          'text-font': FONT,
          'text-size': 9,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        }}
        paint={{ 'text-color': '#ffffff' }}
      />
    </AnimatedSource>
  );
}

// Worklet helpers must be defined BEFORE the worklets that call them: Reanimated's Babel plugin turns
// worklet function declarations into ordinary (unhoisted) variables, so a later helper is captured as undefined.

function progress(g: number[], now: number): number {
  'worklet';
  const start = g[4] as number;
  const end = g[5] as number;
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/** New targets: each glide starts from where the pin is drawn now; unchanged targets keep gliding. */
function retarget(prev: Glides, entries: number[], now: number): Glides {
  'worklet';
  const next: Glides = {};
  for (let i = 0; i + 3 < entries.length; i += 4) {
    const m = entries[i] as number;
    const lng = entries[i + 1] as number;
    const lat = entries[i + 2] as number;
    const duration = entries[i + 3] as number;
    const cur = prev[m];
    if (cur && cur[2] === lng && cur[3] === lat) {
      next[m] = cur;
      continue;
    }
    let fromLng = lng;
    let fromLat = lat;
    if (cur && duration > 0) {
      const k = progress(cur, now);
      fromLng = (cur[0] as number) + ((cur[2] as number) - (cur[0] as number)) * k;
      fromLat = (cur[1] as number) + ((cur[3] as number) - (cur[1] as number)) * k;
    }
    next[m] = [fromLng, fromLat, lng, lat, now, now + duration];
  }
  return next;
}

function encodeGliding(
  glides: Glides,
  now: number,
  table: MemberTable,
  selected: number,
): { json: string; settled: boolean } {
  'worklet';
  let s = '{"type":"FeatureCollection","features":[';
  let first = true;
  let settled = true;
  const keys = Object.keys(glides);
  for (let i = 0; i < keys.length; i++) {
    const m = Number(keys[i]);
    const g = glides[m] as number[];
    const k = progress(g, now);
    if (k < 1) settled = false;
    const lng = (g[0] as number) + ((g[2] as number) - (g[0] as number)) * k;
    const lat = (g[1] as number) + ((g[3] as number) - (g[1] as number)) * k;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (!first) s += ',';
    first = false;
    s +=
      '{"type":"Feature","id":' +
      m +
      ',"properties":{"m":' +
      m +
      ',"c":"' +
      (table.colours[m] ?? '#334155') +
      '","t":"' +
      (table.initials[m] ?? '') +
      '","s":' +
      (m === selected ? 1 : 0) +
      '},"geometry":{"type":"Point","coordinates":[' +
      lng.toFixed(6) +
      ',' +
      lat.toFixed(6) +
      ']}}';
  }
  return { json: s + ']}', settled };
}
