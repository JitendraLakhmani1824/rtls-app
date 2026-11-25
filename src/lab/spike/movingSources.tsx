// M0 spike: the three ways of pushing per-frame data into a MapLibre GeoJSONSource.
// A: React state on a tiny leaf component · B: setNativeProps on the native source · C: Reanimated animated props from a UI-thread worklet.
import {
  GeoJSONSource,
  Layer,
  type GeoJSONSourceProps,
  type GeoJSONSourceRef,
} from '@maplibre/maplibre-react-native';
import {
  forwardRef,
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import Animated, {
  useAnimatedProps,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import { EMPTY_FC, encodeMovers, encodeTip } from './encode';
import { MOVER_COUNT, PALETTE, moverPosition, type Trails } from './sim';
import { counters } from './spikeStore';

const FRAME_MS = 1000 / 30; // movers update at 30×/s

type Props = {
  movers: number[];
  t0: number;
  trails: Trails;
  selected: number | null;
  onPress: GeoJSONSourceProps['onPress'];
};

function MovingLayers({ selected }: { selected: number | null }) {
  return (
    <>
      <Layer
        id="moving-pins"
        type="circle"
        paint={{
          'circle-color': ['get', 'c'],
          'circle-radius': 10,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['case', ['==', ['get', 'm'], selected ?? -1], 4, 2],
        }}
      />
      <Layer
        id="moving-initials"
        type="symbol"
        layout={{
          'text-field': ['get', 't'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        }}
        paint={{ 'text-color': '#ffffff' }}
      />
    </>
  );
}

function TipSource({ data }: { data: string }) {
  return (
    <GeoJSONSource id="trail-tip" data={data}>
      <Layer
        id="trail-tip-line"
        type="line"
        paint={{ 'line-color': ['get', 'c'], 'line-width': 3 }}
      />
    </GeoJSONSource>
  );
}

function tipFor(trails: Trails, movers: number[], selected: number | null, tSec: number) {
  if (selected === null || selected >= MOVER_COUNT) return EMPTY_FC;
  const p = [0, 0];
  moverPosition(movers, selected, tSec, p);
  return encodeTip(trails.last(selected), p, selected);
}

// ── A: React state on a leaf component ─────────────────────────────────────────────

export const MovingA = memo(function MovingA({ movers, t0, trails, selected, onPress }: Props) {
  const [data, setData] = useState(EMPTY_FC);
  const [tip, setTip] = useState(EMPTY_FC);
  const encodeMs = useRef(0);
  const setAt = useRef(0);

  // Time from setState to commit = React's share of the update. React's Profiler is off in release builds,
  // so this layout effect does the measuring instead.
  useLayoutEffect(() => {
    if (setAt.current === 0) return;
    counters.movingUpdates += 1;
    counters.encodeMsTotal += encodeMs.current;
    counters.updateMsTotal += performance.now() - setAt.current;
    setAt.current = 0;
  }, [data]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      const tSec = (performance.now() - t0) / 1000;
      const s0 = performance.now();
      const next = encodeMovers(movers, tSec);
      const nextTip = tipFor(trails, movers, selected, tSec);
      encodeMs.current = performance.now() - s0;
      setAt.current = performance.now();
      setData(next);
      setTip(nextTip);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [movers, t0, trails, selected]);

  return (
    <>
      <GeoJSONSource id="pins-moving" data={data} onPress={onPress}>
        <MovingLayers selected={selected} />
      </GeoJSONSource>
      <TipSource data={tip} />
    </>
  );
});

// ── B: setNativeProps on the native source (no React render per frame) ────────────

export const MovingB = memo(function MovingB({ movers, t0, trails, selected, onPress }: Props) {
  const ref = useRef<GeoJSONSourceRef>(null);
  const tipRef = useRef<GeoJSONSourceRef>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      const tSec = (performance.now() - t0) / 1000;
      const s0 = performance.now();
      const next = encodeMovers(movers, tSec);
      const nextTip = tipFor(trails, movers, selected, tSec);
      const s1 = performance.now();
      ref.current?.getAnimatableRef()?.setNativeProps({ data: next });
      tipRef.current?.getAnimatableRef()?.setNativeProps({ data: nextTip });
      const s2 = performance.now();
      counters.movingUpdates += 1;
      counters.encodeMsTotal += s1 - s0;
      counters.updateMsTotal += s2 - s1;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [movers, t0, trails, selected]);

  return (
    <>
      <GeoJSONSource id="pins-moving" ref={ref} data={EMPTY_FC} onPress={onPress}>
        <MovingLayers selected={selected} />
      </GeoJSONSource>
      <GeoJSONSource id="trail-tip" ref={tipRef} data={EMPTY_FC}>
        <Layer
          id="trail-tip-line"
          type="line"
          paint={{ 'line-color': ['get', 'c'], 'line-width': 3 }}
        />
      </GeoJSONSource>
    </>
  );
});

// ── C: Reanimated animated props, positions and JSON built on the UI thread ───────

type ForwardedSource = ComponentType<GeoJSONSourceProps & { ref?: unknown }>;
const ForwardedGeoJSONSource = forwardRef<GeoJSONSourceRef, GeoJSONSourceProps>(
  function ForwardedGeoJSONSource(props, ref) {
    return <GeoJSONSource {...props} ref={ref} />;
  },
) as unknown as ForwardedSource;
const AnimatedGeoJSONSource = Animated.createAnimatedComponent(ForwardedGeoJSONSource);

function encodeMoversWorklet(movers: number[], tSec: number, palette: string[]): string {
  'worklet';
  const p = [0, 0];
  let s = '{"type":"FeatureCollection","features":[';
  for (let i = 0; i < 30; i++) {
    moverPosition(movers, i, tSec, p);
    if (i > 0) s += ',';
    const initials = String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i * 7) % 26));
    s +=
      '{"type":"Feature","id":' +
      i +
      ',"properties":{"m":' +
      i +
      ',"c":"' +
      palette[i % palette.length] +
      '","t":"' +
      initials +
      '"}' +
      ',"geometry":{"type":"Point","coordinates":[' +
      (p[0] as number).toFixed(6) +
      ',' +
      (p[1] as number).toFixed(6) +
      ']}}';
  }
  return s + ']}';
}

export const MovingC = memo(function MovingC({ movers, selected, onPress }: Props) {
  const data = useSharedValue(EMPTY_FC);
  const lastFrame = useSharedValue(0);
  const updates = useSharedValue(0);
  const palette = PALETTE;

  useFrameCallback((info) => {
    'worklet';
    if (info.timestamp - lastFrame.value < 1000 / 30) return;
    lastFrame.value = info.timestamp;
    data.value = encodeMoversWorklet(movers, info.timestamp / 1000, palette);
    updates.value += 1;
  });

  // Fold UI-thread update counts into the JS counters once a second.
  useEffect(() => {
    const id = setInterval(() => {
      counters.movingUpdates += updates.value;
      updates.value = 0;
    }, 1000);
    return () => clearInterval(id);
  }, [updates]);

  const animatedProps = useAnimatedProps(() => ({ data: data.value }));

  return (
    <AnimatedGeoJSONSource
      id="pins-moving"
      data={EMPTY_FC}
      onPress={onPress}
      animatedProps={animatedProps}
    >
      <MovingLayers selected={selected} />
    </AnimatedGeoJSONSource>
  );
});
