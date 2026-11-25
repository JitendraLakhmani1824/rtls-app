import type { DeviceManager, FrameScheduler, Power, Readable, Stop } from '@core/protocols';
import { createStore } from '@core/utils';
import * as Battery from 'expo-battery';
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

/**
 * Real clock, screen-refresh ticks, app foreground state, and power: Low Power Mode and battery
 * level from expo-battery. Heat stays 'nominal' (reading it needs a small native module, design §2.8).
 */
export class ExpoDeviceManager implements DeviceManager {
  readonly clock = systemClock;
  readonly frames = animationFrames;
  private readonly powerStore = createStore<Power>({
    lowPowerMode: false,
    thermal: 'nominal',
    battery: 1,
  });
  readonly power: Readable<Power> = this.powerStore;
  private readonly foregroundStore = createStore(isForeground(AppState.currentState));
  readonly foreground: Readable<boolean> = this.foregroundStore;

  /** Follows AppState until the returned stop() is called. Safe to call again after stopping. */
  watch(): Stop {
    this.foregroundStore.set(isForeground(AppState.currentState));
    const subscriptions = [
      AppState.addEventListener('change', (state) => this.foregroundStore.set(isForeground(state))),
      Battery.addLowPowerModeListener(({ lowPowerMode }) => this.setPower({ lowPowerMode })),
      Battery.addBatteryLevelListener(({ batteryLevel }) =>
        this.setPower({ battery: level(batteryLevel) }),
      ),
    ];
    let stopped = false;
    void Battery.getPowerStateAsync()
      .then((state) => {
        if (!stopped)
          this.setPower({ lowPowerMode: state.lowPowerMode, battery: level(state.batteryLevel) });
      })
      .catch(() => {}); // no battery info (some simulators): keep the defaults
    return () => {
      stopped = true;
      subscriptions.forEach((s) => s.remove());
    };
  }

  private setPower(change: Partial<Power>) {
    const next = { ...this.powerStore.get(), ...change };
    const prev = this.powerStore.get();
    // Only a real change reaches the session (a new budget re-plans gliding).
    if (next.lowPowerMode !== prev.lowPowerMode || next.battery !== prev.battery)
      this.powerStore.set(next);
  }
}

/** expo-battery reports -1 when unknown: treat that as full, so nothing is cut back by mistake. */
const level = (batteryLevel: number) => (batteryLevel >= 0 ? batteryLevel : 1);
