import { createStore } from '@core/utils';
import type { DeviceManager, FrameScheduler, Power, Readable, Stop } from '@core/protocols';
import { AppState, type AppStateStatus } from 'react-native';

import { systemClock } from './systemClock';

const animationFrames: FrameScheduler = {
  start(cb) {
    let id = requestAnimationFrame(function loop() {
      cb();
      id = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  },
};

/** 'inactive' (Control Center, an incoming call) still counts as foreground: no teardown churn. */
const isForeground = (state: AppStateStatus | string | null | undefined) => state !== 'background';

/** Real clock, screen-refresh ticks and app foreground state. Power is fixed until M4 adds expo-battery. */
export class ExpoDeviceManager implements DeviceManager {
  readonly clock = systemClock;
  readonly frames = animationFrames;
  readonly power: Readable<Power> = createStore<Power>({
    lowPowerMode: false,
    thermal: 'nominal',
    battery: 1,
  });
  private readonly foregroundStore = createStore(isForeground(AppState.currentState));
  readonly foreground: Readable<boolean> = this.foregroundStore;

  /** Follows AppState until the returned stop() is called. Safe to call again after stopping. */
  watch(): Stop {
    this.foregroundStore.set(isForeground(AppState.currentState));
    const subscription = AppState.addEventListener('change', (state) =>
      this.foregroundStore.set(isForeground(state)),
    );
    return () => subscription.remove();
  }
}
