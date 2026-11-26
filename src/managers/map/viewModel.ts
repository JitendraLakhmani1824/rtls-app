import type { Viewport } from '@core/models';
import type { Store } from '@core/utils';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import type { SharedValue } from 'react-native-reanimated';

/**
 * The gliding set for the UI-thread worklet: MOTION_STRIDE numbers per member (the halo already in
 * points at zoom 0, as the layer wants it), with a version to spot changes.
 */
export type MotionInput = { version: number; entries: number[] };
/** Per member, for the worklet. Initials and names are already JSON strings (quoted, escaped). */
export type MemberTable = { colours: string[]; initials: string[]; names: string[] };
/** A camera move asked for by the session; `seq` makes a repeated request a new value. */
export type CameraCommand =
  | { seq: number; kind: 'fit'; bounds: [west: number, south: number, east: number, north: number] }
  | { seq: number; kind: 'center'; center: [lng: number, lat: number]; zoom?: number };

/** Where the selected friend's drawn trail ends; the worklet joins it to the gliding pin. */
export type TrailTip = { version: number; lng: number; lat: number };

/** What the map view reads from and reports to. Implemented by MapLibreManager. */
export interface MapViewModel {
  readonly initialView: { center: [number, number]; zoom: number };
  readonly mapStyle: StyleSpecification;
  /** Group overlapping pins (large sessions only). */
  readonly groupPins: boolean;
  readonly stillData: Store<string>;
  readonly cameraCommand: Store<CameraCommand | null>;
  /** The selected member, for the still pins' feature state. */
  readonly selection: Store<number | null>;
  readonly trailData: Store<string>;
  /** My own position, drawn apart from friends and on top of them. */
  readonly meData: Store<string>;
  /** The map's preferredFramesPerSecond. */
  readonly mapFps: Store<number>;
  readonly motion: SharedValue<MotionInput>;
  readonly table: SharedValue<MemberTable>;
  readonly selectedMember: SharedValue<number>;
  /** Shortest time between two gliding-pin updates; Infinity = no gliding updates. */
  readonly glideFrameMs: SharedValue<number>;
  readonly trailTip: SharedValue<TrailTip>;
  handlePress(member: number): void;
  handleReady(ready: boolean): void;
  handleRegion(viewport: Viewport): void;
}
