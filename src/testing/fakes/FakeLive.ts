import type { LiveSessions, LiveView } from '@common/di';
import { createStore } from '@core/utils';

/** Live maps for screen tests: register views by id; it records what screens ask of it. */
export class FakeLive implements LiveSessions {
  readonly current = createStore<LiveView | null>(null);
  readonly views = new Map<string, LiveView>();
  readonly calls: string[] = [];

  view(id: string) {
    return this.views.get(id) ?? null;
  }
  open(id: string) {
    this.calls.push(`open ${id}`);
    const view = this.views.get(id);
    if (view) this.current.set(view);
  }
  close(id: string) {
    this.calls.push(`close ${id}`);
    if (this.current.get()?.id === id) this.current.set(null);
  }
}
