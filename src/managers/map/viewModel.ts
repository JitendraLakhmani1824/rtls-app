import type { Viewport } from '@core/models';
import type { Store } from '@core/utils';
import type { SharedValue } from 'react-native-reanimated';

/** The gliding set for the UI-thread worklet: MOTION_STRIDE numbers per member, with a version to spot changes. */
export type MotionInput = { version: number; entries: number[] };
export type MemberTable = { colours: string[]; initials: string[] };

/** What the map view reads from and reports to. Implemented by MapLibreManager. */
export interface MapViewModel {
  readonly initialView: { center: [number, number]; zoom: number };
  readonly stillData: Store<string>;
  readonly motion: SharedValue<MotionInput>;
  readonly table: SharedValue<MemberTable>;
  readonly selectedMember: SharedValue<number>;
  handlePress(member: number): void;
  handleReady(ready: boolean): void;
  handleRegion(viewport: Viewport): void;
}
