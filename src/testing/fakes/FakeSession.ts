import type { ConnState, FriendRow } from '@core/models';
import type { Session } from '@core/protocols';
import { createStore } from '@core/utils';

/** A session for screen tests: set its values by hand; it records what screens ask of it. */
export class FakeSession implements Session {
  readonly title = 'Test session';
  readonly selected = createStore<number | null>(null);
  readonly connection = createStore<ConnState>({ kind: 'live', sinceMs: 0 });
  readonly rows = createStore<FriendRow[]>([]);
  readonly calls: string[] = [];

  leave() {
    this.calls.push('leave');
  }
  select(member: number | null) {
    this.calls.push(`select ${member}`);
    this.selected.set(member);
  }
}

export function fakeRow(id: number, more: Partial<FriendRow> = {}): FriendRow {
  return {
    id,
    name: `Friend ${id}`,
    initials: `F${id}`,
    colour: '#334155',
    presence: 0,
    distanceM: id * 100,
    bearingDeg: 45,
    silentMs: 2000,
    speedMs: 0,
    ...more,
  };
}
