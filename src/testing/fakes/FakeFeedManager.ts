import {
  FIX_STRIDE,
  PRESENCE_STRIDE,
  type ConnState,
  type Cursor,
  type Member,
} from '@core/models';
import type { FeedHandle, FeedManager, FeedSink } from '@core/protocols';

/** A feed you drive by hand. Records every start (with its resume cursor) and stop. */
export class FakeFeedManager implements FeedManager {
  readonly starts: (Cursor | undefined)[] = [];
  stops = 0;
  private sink: FeedSink | null = null;
  private position = 0;

  get running() {
    return this.sink !== null;
  }

  start(sink: FeedSink, resume?: Cursor): FeedHandle {
    this.starts.push(resume);
    if (resume) this.position = resume.feedPosition;
    this.sink = sink;
    return {
      setViewport: () => {},
      cursor: () => ({ feedPosition: this.position }),
      stop: () => {
        this.stops += 1;
        this.sink = null;
      },
    };
  }

  members(members: Member[]) {
    this.sink?.onMembers(members);
  }

  /** Sends one batch. Each fix: [member, seq, lng, lat, tMs, accuracyM = 10]. */
  fixes(...fixes: [number, number, number, number, number, number?][]) {
    if (!this.sink) return;
    const buf = new Float64Array(fixes.length * FIX_STRIDE);
    fixes.forEach(([m, seq, lng, lat, t, acc = 10], i) =>
      buf.set([m, seq, lng, lat, t, acc], i * FIX_STRIDE),
    );
    this.position += 1;
    this.sink.onFixes({ n: fixes.length, buf });
  }

  /** Sends heartbeats. Each: [member, heardAtMs, paused (0 | 1)]. */
  presence(...beats: [number, number, number][]) {
    if (!this.sink) return;
    const buf = new Float64Array(beats.length * PRESENCE_STRIDE);
    beats.forEach((beat, i) => buf.set(beat, i * PRESENCE_STRIDE));
    this.sink.onPresence({ n: beats.length, buf });
  }

  state(state: ConnState) {
    this.sink?.onState(state);
  }
}

export function fakeMembers(n: number): Member[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    key: `m${i}`,
    name: `Friend ${i}`,
    initials: `F${i}`,
    colour: '#334155',
    isMe: i === 0,
  }));
}
