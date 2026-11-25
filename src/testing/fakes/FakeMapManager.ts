import {
  MOTION_STRIDE,
  PIN_STRIDE,
  TRAIL_STRIDE,
  type Member,
  type MotionFrame,
  type PinFrame,
  type TrailFrame,
  type Viewport,
} from '@core/models';
import type { MapManager, Stop } from '@core/protocols';
import { createStore } from '@core/utils';

/** A map that records what it was told. Frames are copied (senders reuse their buffers). */
export class FakeMapManager implements MapManager {
  readonly ready = createStore(true);
  readonly viewport = createStore<Viewport | null>(null);
  members: Member[] = [];
  selected: number | null = null;
  /** Each still frame as [member, lng, lat, presence] rows. */
  readonly stillFrames: number[][][] = [];
  /** Each motion frame as [member, lng, lat, durationMs] rows. */
  readonly movingFrames: number[][][] = [];
  /** Each trail frame as parts: { member, points: [lng, lat, ageBucket][] }. */
  readonly trailFrames: TrailPart[][] = [];
  /** Every frame-rate cap the map was given. */
  readonly frameRateCaps: number[] = [];
  /** Every fitTo, as [west, south, east, north]. */
  readonly fits: number[][] = [];
  /** Every centerOn, as [lng, lat]. */
  readonly centers: number[][] = [];
  private pressListeners = new Set<(member: number) => void>();

  setMembers(members: Member[]) {
    this.members = members;
  }
  setStill(frame: PinFrame) {
    this.stillFrames.push(rows(frame, PIN_STRIDE));
  }
  setMoving(frame: MotionFrame) {
    this.movingFrames.push(rows(frame, MOTION_STRIDE));
  }
  setTrails(frame: TrailFrame) {
    this.trailFrames.push(
      Array.from({ length: frame.n }, (_, i) => ({
        member: frame.members[i] ?? -1,
        points: rows(
          {
            n: (frame.offsets[i + 1] ?? 0) - (frame.offsets[i] ?? 0),
            buf: frame.coords.subarray((frame.offsets[i] ?? 0) * TRAIL_STRIDE),
          },
          TRAIL_STRIDE,
        ),
      })),
    );
  }
  fitTo(west: number, south: number, east: number, north: number) {
    this.fits.push([west, south, east, north]);
  }
  centerOn(lng: number, lat: number) {
    this.centers.push([lng, lat]);
  }
  setFrameRateCap(fps: number) {
    this.frameRateCaps.push(fps);
  }
  setSelected(member: number | null) {
    this.selected = member;
  }
  onPinPress(listener: (member: number) => void): Stop {
    this.pressListeners.add(listener);
    return () => {
      this.pressListeners.delete(listener);
    };
  }

  /** Simulates the user tapping a pin. */
  pressPin(member: number) {
    this.pressListeners.forEach((l) => l(member));
  }
  setReady(ready: boolean) {
    this.ready.set(ready);
  }
  get lastStill() {
    return this.stillFrames[this.stillFrames.length - 1];
  }
  get lastMoving() {
    return this.movingFrames[this.movingFrames.length - 1];
  }
  get lastTrails() {
    return this.trailFrames[this.trailFrames.length - 1];
  }
}

export type TrailPart = { member: number; points: number[][] };

function rows(frame: { n: number; buf: Float64Array }, stride: number): number[][] {
  return Array.from({ length: frame.n }, (_, i) =>
    Array.from(frame.buf.subarray(i * stride, (i + 1) * stride)),
  );
}
