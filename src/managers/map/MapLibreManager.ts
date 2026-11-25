import {
  MOTION_STRIDE,
  type Member,
  type MotionFrame,
  type PinFrame,
  type TrailFrame,
  type Viewport,
} from '@core/models';
import { noopPerf, type MapManager, type Perf, type Stop } from '@core/protocols';
import { createStore } from '@core/utils';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import type { ComponentType } from 'react';
import { makeMutable } from 'react-native-reanimated';

import { EMPTY_FC, encodeTrails, haloPoints, StillEncoder, trailTipFrom } from './encode';
import positron from '../../../assets/map-style/positron.json';
import { createMapView } from './MapView';
import type { CameraCommand, MapViewModel, MemberTable, MotionInput, TrailTip } from './viewModel';

/** Gliding pins update at most this often (≈ 33×/s): each update is a source re-parse. */
const MIN_GLIDE_FRAME_MS = 30;
/** The map still renders pans and zooms at this rate when the budget allows no gliding. */
const MIN_MAP_FPS = 30;

export type MapOptions = {
  center: [number, number];
  zoom: number;
  /** Label fade-in after a source update, ms. Default 0: a fade keeps the map redrawing. */
  symbolFadeMs?: number;
};

/**
 * MapLibre implementation of MapManager.
 * - Still pins: encoded here (JS) and handed to a small leaf component, ≤ 1×/s.
 * - Gliding pins: targets go to a UI-thread worklet (Reanimated), which interpolates and feeds the
 *   map every frame with zero JavaScript work (M0 spike: docs/results/m0-spike.md).
 * - Trails: encoded here when they change; the same worklet joins the selected trail to its gliding pin.
 */
export class MapLibreManager implements MapManager, MapViewModel {
  readonly ready = createStore(false);
  readonly viewport = createStore<Viewport | null>(null);
  readonly stillData = createStore(EMPTY_FC);
  readonly selection = createStore<number | null>(null);
  readonly cameraCommand = createStore<CameraCommand | null>(null);
  readonly trailData = createStore(EMPTY_FC);
  readonly mapFps = createStore(60);
  readonly motion = makeMutable<MotionInput>({ version: 0, entries: [] });
  readonly table = makeMutable<MemberTable>({ colours: [], initials: [] });
  readonly selectedMember = makeMutable(-1);
  readonly glideFrameMs = makeMutable(MIN_GLIDE_FRAME_MS);
  readonly trailTip = makeMutable<TrailTip>({ version: 0, lng: NaN, lat: NaN });
  readonly MapView: ComponentType;

  private members: Member[] = [];
  private selected: number | null = null;
  private readonly pressListeners = new Set<(member: number) => void>();

  private readonly stillEncoder = new StillEncoder();

  readonly initialView: { center: [number, number]; zoom: number };
  readonly mapStyle: StyleSpecification;

  constructor(
    options: MapOptions,
    private readonly perf: Perf = noopPerf,
  ) {
    this.initialView = { center: options.center, zoom: options.zoom };
    this.mapStyle = {
      ...(positron as unknown as StyleSpecification),
      // MapLibre fades labels in over the style's transition (300 ms by default) and keeps redrawing
      // until they're done, after every pin update. 0 = no fade.
      transition: { duration: options.symbolFadeMs ?? 0, delay: 0 },
    };
    this.MapView = createMapView(this);
  }

  setMembers(members: Member[]) {
    this.members = members;
    this.stillEncoder.setMembers(members);
    this.table.value = {
      colours: members.map((m) => m.colour),
      initials: members.map((m) => m.initials),
    };
  }

  setStill(frame: PinFrame) {
    // Encoded now: the sender reuses its buffer.
    this.stillData.set(this.perf.measure('encodeStill', () => this.stillEncoder.encode(frame)));
  }

  setMoving(frame: MotionFrame) {
    this.motion.value = {
      version: this.motion.value.version + 1,
      entries: haloInPoints(Array.from(frame.buf.subarray(0, frame.n * MOTION_STRIDE))),
    };
  }

  setTrails(frame: TrailFrame) {
    this.trailData.set(
      this.perf.measure('encodeTrails', () => encodeTrails(frame, this.members, this.selected)),
    );
    const [lng, lat] = trailTipFrom(frame, this.selected) ?? [NaN, NaN];
    const prev = this.trailTip.value;
    if (!Object.is(lng, prev.lng) || !Object.is(lat, prev.lat)) {
      this.trailTip.value = { version: prev.version + 1, lng, lat };
    }
  }

  setFrameRateCap(fps: number) {
    this.glideFrameMs.value = fps > 0 ? Math.max(MIN_GLIDE_FRAME_MS, 1000 / fps) : Infinity;
    this.mapFps.set(Math.max(MIN_MAP_FPS, fps));
  }

  fitTo(west: number, south: number, east: number, north: number) {
    const seq = (this.cameraCommand.get()?.seq ?? 0) + 1;
    this.cameraCommand.set({ seq, bounds: [west, south, east, north] });
  }

  setSelected(member: number | null) {
    this.selected = member;
    this.selectedMember.value = member ?? -1;
    this.selection.set(member); // still pins: feature state, no data re-send
  }

  onPinPress(listener: (member: number) => void): Stop {
    this.pressListeners.add(listener);
    return () => {
      this.pressListeners.delete(listener);
    };
  }

  // ── Called by the map view ──────────────────────────────────────────────────────
  handlePress(member: number) {
    this.pressListeners.forEach((listener) => listener(member));
  }
  handleReady(ready: boolean) {
    this.ready.set(ready);
  }
  handleRegion(viewport: Viewport) {
    this.viewport.set(viewport);
  }
}

/** Motion entries with haloM turned into the layer's unit (points at zoom 0), in place. */
function haloInPoints(entries: number[]): number[] {
  for (let o = 0; o + MOTION_STRIDE <= entries.length; o += MOTION_STRIDE) {
    entries[o + 4] = haloPoints(entries[o + 4] ?? 0, entries[o + 2] ?? 0);
  }
  return entries;
}
