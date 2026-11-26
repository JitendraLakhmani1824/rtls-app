import type { Storage } from '@core/protocols';

/** Storage in memory. `failing` makes every call fail the way real storage can (reads null, saves lost). */
export class MemoryStorage implements Storage {
  readonly data = new Map<string, string>();
  failing = false;
  saves = 0;

  async load(key: string) {
    if (this.failing) return null;
    return this.data.get(key) ?? null;
  }

  async save(key: string, value: string) {
    if (this.failing) return;
    this.saves++;
    this.data.set(key, value);
  }
}
