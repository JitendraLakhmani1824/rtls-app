import type { DeviceManager, FrameScheduler, Power, Stop } from '@core/protocols';
import { createStore } from '@core/utils';

import { FakeClock } from './FakeClock';

/** Device you control: virtual clock, manual frames, foreground and power you set. */
export class FakeDeviceManager implements DeviceManager {
  readonly clock: FakeClock;
  readonly foreground = createStore(true);
  readonly power = createStore<Power>({
    lowPowerMode: false,
    thermal: 'nominal',
    battery: 1,
    reduceMotion: false,
  });
  private frameListeners = new Set<() => void>();
  readonly frames: FrameScheduler = {
    start: (cb): Stop => {
      this.frameListeners.add(cb);
      return () => {
        this.frameListeners.delete(cb);
      };
    },
  };

  constructor(clock = new FakeClock()) {
    this.clock = clock;
  }

  setForeground(value: boolean) {
    this.foreground.set(value);
  }

  /** Fires one screen-refresh tick. */
  tick() {
    this.frameListeners.forEach((cb) => cb());
  }
}
