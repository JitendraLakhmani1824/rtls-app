import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  type CameraRef,
  type GeoJSONSourceProps,
  type GeoJSONSourceRef,
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

import { MOTION_STRIDE } from '@core/models';

import { EMPTY_FC } from './encode';
import type { MapViewModel, MemberTable, TrailTip } from './viewModel';

const FONT = ['Noto Sans Bold']; // the only glyphs OpenFreeMap serves
const CLUSTER_MAX_ZOOM = 15;
/** Pins group only when they would overlap (a pin is ~18 points wide), so a small group stays individual. */
const PIN_GROUP_RADIUS = 20;
/** Room for the app's controls when fitting friends into view: the badge on top, panel and sheet below. */
const CAMERA_PADDING = { top: 120, right: 48, bottom: 260, left: 48 };
const CAMERA_MS = 600;

type PressEvent = Parameters<NonNullable<GeoJSONSourceProps['onPress']>>[0];
const ignore = () => {}; // feature-state calls fail harmlessly before the source is on the map

/** A map component bound to one model. Screens receive it as `MapView` and never see MapLibre. */
export function createMapView(model: MapViewModel): ComponentType {
  function BoundMapView() {
    return <MapLibreView model={model} />;
  }
  return memo(BoundMapView);
}

function MapLibreView({ model }: { model: MapViewModel }) {
  const cameraRef = useRef<CameraRef>(null);
  const fps = useSyncExternalStore(model.mapFps.subscribe, model.mapFps.get);
  const command = useSyncExternalStore(model.cameraCommand.subscribe, model.cameraCommand.get);
  useEffect(() => () => model.handleReady(false), [model]);
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera || !command) return;
    camera.fitBounds(command.bounds, { padding: CAMERA_PADDING, duration: CAMERA_MS });
  }, [command]);

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
      mapStyle={model.mapStyle}
      logo={false}
      preferredFramesPerSecond={fps}
      onDidFinishLoadingStyle={() => model.handleReady(true)}
      onRegionIsChanging={onRegion(true)}
      onRegionDidChange={onRegion(false)}
    >
      <Camera ref={cameraRef} initialViewState={model.initialView} />
      <Trails model={model} />
      <StillPins model={model} cameraRef={cameraRef} />
      <GlidingPins model={model} />
    </MapLibreMap>
  );
}

// ── Trails: a leaf component, re-rendered when trails change (≤ 1×/s); drawn under the pins ──

function Trails({ model }: { model: MapViewModel }) {
  const data = useSyncExternalStore(model.trailData.subscribe, model.trailData.get);
  return (
    <GeoJSONSource id="trails" data={data} tolerance={0.5}>
      <Layer
        id="trail-lines"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round', 'line-sort-key': ['get', 's'] }}
        paint={{
          'line-color': ['get', 'c'],
          'line-width': ['case', ['==', ['get', 's'], 1], 5, 3],
          // Fades by age bucket (0 newest … 3 oldest): one source, opacity per feature.
          'line-opacity': ['match', ['get', 'a'], 0, 0.9, 1, 0.65, 2, 0.4, 0.2],
        }}
      />
    </GeoJSONSource>
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
  const selected = useSyncExternalStore(model.selection.subscribe, model.selection.get);
  const sourceRef = useRef<GeoJSONSourceRef>(null);
  const ringed = useRef<number | null>(null);

  // Selection ring by feature state: paint only, the pins' data is not re-sent. Re-applied when the
  // data changes so it survives a style reload; the call is cheap.
  useEffect(() => {
    const source = sourceRef.current;
    if (!source) return;
    const prev = ringed.current;
    if (prev !== null && prev !== selected) source.removeFeatureState({ id: prev }).catch(ignore);
    if (selected !== null)
      source.setFeatureState({ id: selected }, { selected: true }).catch(ignore);
    ringed.current = selected;
  }, [selected, data]);

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
      clusterRadius={PIN_GROUP_RADIUS}
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
        id="still-halos"
        type="circle"
        filter={['all', ['!', ['has', 'point_count']], ['has', 'h']]}
        paint={{
          // h = radius in points at zoom 0; doubling per zoom level keeps it true to metres.
          'circle-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            0,
            ['get', 'h'],
            24,
            ['*', ['get', 'h'], 2 ** 24],
          ],
          'circle-color': ['get', 'c'],
          'circle-opacity': 0.12,
          'circle-stroke-color': ['get', 'c'],
          'circle-stroke-width': 1,
          'circle-stroke-opacity': 0.4,
        }}
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

/** member → [fromLng, fromLat, toLng, toLat, startMs, endMs, haloPoints] on the UI-thread clock. */
type Glides = Record<string, number[]>;

function GlidingPins({ model }: { model: MapViewModel }) {
  const { motion, table, selectedMember, glideFrameMs, trailTip } = model;
  const glides = useSharedValue<Glides>({});
  const applied = useSharedValue(-1);
  const drawnSelected = useSharedValue(-1);
  const drawnTip = useSharedValue(-1);
  const data = useSharedValue(EMPTY_FC);
  const tipData = useSharedValue(EMPTY_FC);
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
    if (trailTip.value.version !== drawnTip.value) {
      drawnTip.value = trailTip.value.version;
      changed = true;
    }
    if (!changed && settled.value) return; // nothing gliding: no work at all
    if (!changed && now - lastFrame.value < glideFrameMs.value) return;
    lastFrame.value = now;
    const out = encodeGliding(glides.value, now, table.value, selectedMember.value);
    data.value = out.json;
    settled.value = out.settled;
    const tip = encodeTip(glides.value, now, table.value, selectedMember.value, trailTip.value);
    if (tip !== tipData.value) tipData.value = tip;
  });

  const animatedProps = useAnimatedProps(() => ({ data: data.value }));
  const tipProps = useAnimatedProps(() => ({ data: tipData.value }));
  const onPress = useCallback(
    (e: PressEvent) => {
      const m = e.nativeEvent.features[0]?.properties?.m;
      if (typeof m === 'number') model.handlePress(m);
    },
    [model],
  );

  return (
    <>
      <AnimatedSource id="trail-tip" data={EMPTY_FC} animatedProps={tipProps}>
        <Layer
          id="trail-tip-line"
          type="line"
          beforeId="still-clusters"
          layout={{ 'line-cap': 'round' }}
          paint={{ 'line-color': ['get', 'c'], 'line-width': 5, 'line-opacity': 0.9 }}
        />
      </AnimatedSource>
      <AnimatedSource
        id="pins-moving"
        data={EMPTY_FC}
        onPress={onPress}
        animatedProps={animatedProps}
      >
        <Layer
          id="moving-halos"
          type="circle"
          filter={['has', 'h']}
          paint={{
            'circle-radius': [
              'interpolate',
              ['exponential', 2],
              ['zoom'],
              0,
              ['get', 'h'],
              24,
              ['*', ['get', 'h'], 2 ** 24],
            ],
            'circle-color': ['get', 'c'],
            'circle-opacity': 0.12,
            'circle-stroke-color': ['get', 'c'],
            'circle-stroke-width': 1,
            'circle-stroke-opacity': 0.4,
          }}
        />
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
    </>
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
  for (let i = 0; i + MOTION_STRIDE <= entries.length; i += MOTION_STRIDE) {
    const m = entries[i] as number;
    const lng = entries[i + 1] as number;
    const lat = entries[i + 2] as number;
    const duration = entries[i + 3] as number;
    const halo = entries[i + 4] as number;
    const cur = prev[m];
    if (cur && cur[2] === lng && cur[3] === lat) {
      cur[6] = halo;
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
    next[m] = [fromLng, fromLat, lng, lat, now, now + duration, halo];
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
    const halo = (g[6] as number) > 0 ? ',"h":' + (g[6] as number).toFixed(9) : '';
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
      halo +
      '},"geometry":{"type":"Point","coordinates":[' +
      lng.toFixed(6) +
      ',' +
      lat.toFixed(6) +
      ']}}';
  }
  return { json: s + ']}', settled };
}

/** The selected friend's trail, from its newest point to where the pin is drawn now. Empty unless it glides. */
function encodeTip(
  glides: Glides,
  now: number,
  table: MemberTable,
  selected: number,
  tip: TrailTip,
): string {
  'worklet';
  const g = glides[selected];
  if (!g || !Number.isFinite(tip.lng) || !Number.isFinite(tip.lat)) return EMPTY_FC;
  const k = progress(g, now);
  const lng = (g[0] as number) + ((g[2] as number) - (g[0] as number)) * k;
  const lat = (g[1] as number) + ((g[3] as number) - (g[1] as number)) * k;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return EMPTY_FC;
  return (
    '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"c":"' +
    (table.colours[selected] ?? '#334155') +
    '"},"geometry":{"type":"LineString","coordinates":[[' +
    tip.lng.toFixed(6) +
    ',' +
    tip.lat.toFixed(6) +
    '],[' +
    lng.toFixed(6) +
    ',' +
    lat.toFixed(6) +
    ']]}}]}'
  );
}
