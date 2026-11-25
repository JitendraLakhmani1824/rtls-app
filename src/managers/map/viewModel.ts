import type { Viewport } from '@core/models';
import type { Store } from '@core/utils';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import type { SharedValue } from 'react-native-reanimated';

/**
 * The gliding set for the UI-thread worklet: MOTION_STRIDE numbers per member (the halo already in
 * points at zoom 0, as the layer wants it), with a version to spot changes.
 */
export type MotionInput = { version: number; entries: number[] };
export type MemberTable = { colours: string[]; initials: string[] };
/** Where the selected friend's drawn trail ends; the worklet joins it to the gliding pin. */
export type TrailTip = { version: number; lng: number; lat: number };

/** What the map view reads from and reports to. Implemented by MapLibreManager. */
export interface MapViewModel {
  readonly initialView: { center: [number, number]; zoom: number };
  readonly mapStyle: StyleSpecification;
  readonly stillData: Store<string>;
  /** The selected member, for the still pins' feature state. */
  readonly selection: Store<number | null>;
  readonly trailData: Store<string>;
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
