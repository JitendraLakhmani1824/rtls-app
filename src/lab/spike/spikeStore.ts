// M0 spike: selection and per-second measurements, outside React. Lab-only code.

type Listener = () => void;

function readable<T>(initial: T) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

export type UpdatePath = 'A' | 'B' | 'C';

export const selection = readable<number | null>(null);

export type SpikeStats = {
  path: UpdatePath;
  jsFps: number;
  uiFps: number;
  mapFps: number;
  movingUpdates: number;
  encodeMs: number; // avg JS time to build the moving-pins string
  updateMs: number; // avg JS time to hand it to the map (A: React render, B: setNativeProps, C: n/a — UI thread)
  appState: string;
  homeFocused: boolean;
  sheetOpen: boolean;
};

export const stats = readable<SpikeStats | null>(null);

/** Raw counters for the current second; the overlay folds them into `stats` once a second. */
export const counters = {
  jsFrames: 0,
  mapFrames: 0,
  movingUpdates: 0,
  encodeMsTotal: 0,
  updateMsTotal: 0,
  reset() {
    this.jsFrames = 0;
    this.mapFrames = 0;
    this.movingUpdates = 0;
    this.encodeMsTotal = 0;
    this.updateMsTotal = 0;
  },
};

export const sheetOpen = readable(false);
