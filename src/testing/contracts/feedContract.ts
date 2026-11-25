import { FIX_STRIDE, PRESENCE_STRIDE, type Member } from '@core/models';
import type { FeedHandle, FeedManager, FeedSink } from '@core/protocols';

import { FakeClock } from '../fakes';

type Recording = {
  events: string[];
  members: Member[];
  /** Member ids named in fixes and heartbeats. */
  named: number[];
  fixes: number;
  handle: FeedHandle;
};

function record(feed: FeedManager, resume?: Parameters<FeedManager['start']>[1]): Recording {
  const r = { events: [] as string[], members: [] as Member[], named: [] as number[], fixes: 0 };
  const sink: FeedSink = {
    onMembers: (members) => {
      r.members = members;
      r.events.push('members');
    },
    onFixes: (batch) => {
      r.events.push('fixes');
      r.fixes += batch.n;
      for (let i = 0; i < batch.n; i++) r.named.push(batch.buf[i * FIX_STRIDE] ?? -1);
    },
    onPresence: (batch) => {
      r.events.push('presence');
      for (let i = 0; i < batch.n; i++) r.named.push(batch.buf[i * PRESENCE_STRIDE] ?? -1);
    },
    onState: () => r.events.push('state'),
    onSessionEnded: () => r.events.push('ended'),
  };
  return { ...r, handle: feed.start(sink, resume) } as Recording;
}

/**
 * The promises every FeedManager keeps (core/protocols). Run it for each implementation:
 * `feedContract('SyntheticFeedManager', (clock) => new SyntheticFeedManager(options, clock))`.
 * The feed must deliver fixes on its own within a few seconds of virtual time.
 */
export function feedContract(name: string, make: (clock: FakeClock) => FeedManager) {
  describe(`${name} keeps the FeedManager contract`, () => {
    it('delivers members before any fixes or heartbeats', () => {
      const clock = new FakeClock();
      const r = record(make(clock));
      clock.advance(5000);
      const first = r.events.findIndex((e) => e === 'fixes' || e === 'presence');
      expect(r.events.indexOf('members')).toBeGreaterThanOrEqual(0);
      expect(r.events.indexOf('members')).toBeLessThan(first);
      expect(r.fixes).toBeGreaterThan(0);
    });

    it('names only members it announced', () => {
      const clock = new FakeClock();
      const r = record(make(clock));
      clock.advance(5000);
      const ids = new Set(r.members.map((m) => m.id));
      expect(r.named.every((id) => ids.has(id))).toBe(true);
    });

    it('never calls the sink after stop()', () => {
      const clock = new FakeClock();
      const r = record(make(clock));
      clock.advance(2000);
      r.handle.stop();
      const before = r.events.length;
      clock.advance(60_000);
      expect(r.events).toHaveLength(before);
    });

    it('resumes from its cursor, never behind it', () => {
      const clock = new FakeClock();
      const feed = make(clock);
      const first = record(feed);
      clock.advance(3000);
      const cursor = first.handle.cursor();
      first.handle.stop();
      clock.advance(10_000);
      const second = record(feed, cursor);
      clock.advance(3000);
      expect(second.events[0]).toBe('members');
      expect(second.fixes).toBeGreaterThan(0);
      expect(second.handle.cursor().feedPosition).toBeGreaterThan(cursor.feedPosition);
      second.handle.stop();
    });
  });
}
