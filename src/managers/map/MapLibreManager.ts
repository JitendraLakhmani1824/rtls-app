import {
  MOTION_STRIDE,
  PIN_STRIDE,
  type Member,
  type MotionFrame,
  type PinFrame,
  type TrailFrame,
  type Viewport,
} from '@core/models';
import type { MapManager, Stop } from '@core/protocols';
import { createStore } from '@core/utils';
import type { ComponentType } from 'react';
import { makeMutable } from 'react-native-reanimated';

import { EMPTY_FC, encodeStill, encodeTrails, trailTipFrom } from './encode';
import { createMapView } from './MapView';
import type { MapViewModel, MemberTable, MotionInput, TrailTip } from './viewModel';

/** Gliding pins update at most this often (≈ 33×/s): each update is a source re-parse. */
const MIN_GLIDE_FRAME_MS = 30;
/** The map still renders pans and zooms at this rate when the budget allows no gliding. */
const MIN_MAP_FPS = 30;

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
  private still: PinFrame = { n: 0, buf: new Float64Array(0) };
  private readonly pressListeners = new Set<(member: number) => void>();

  constructor(readonly initialView: { center: [number, number]; zoom: number }) {
    this.MapView = createMapView(this);
  }

  setMembers(members: Member[]) {
    this.members = members;
    this.table.value = {
      colours: members.map((m) => m.colour),
      initials: members.map((m) => m.initials),
    };
  }

  setStill(frame: PinFrame) {
    // Copy: the sender reuses its buffer.
    const size = frame.n * PIN_STRIDE;
    if (this.still.buf.length < size) this.still.buf = new Float64Array(size);
    this.still.buf.set(frame.buf.subarray(0, size));
    this.still.n = frame.n;
    this.stillData.set(encodeStill(this.still, this.members, this.selected));
  }

  setMoving(frame: MotionFrame) {
    this.motion.value = {
      version: this.motion.value.version + 1,
      entries: Array.from(frame.buf.subarray(0, frame.n * MOTION_STRIDE)),
    };
  }

  setTrails(frame: TrailFrame) {
    this.trailData.set(encodeTrails(frame, this.members, this.selected));
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

  setSelected(member: number | null) {
    this.selected = member;
    this.selectedMember.value = member ?? -1;
    this.stillData.set(encodeStill(this.still, this.members, member));
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
