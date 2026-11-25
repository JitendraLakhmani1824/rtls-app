import { FIX_STRIDE, type FixBatch, type Member } from '@core/models';
import type { FeedSink } from '@core/protocols';
import { FakeClock } from '@testing/fakes';

import { SyntheticFeedManager } from './SyntheticFeedManager';

const options = {
  scenario: 'concert' as const,
  friends: 50,
  seed: 7,
  movingIntervalMs: 1000,
  center: [72.8656, 19.0657] as [number, number],
};

function record(feed: SyntheticFeedManager, clock: FakeClock, ms: number) {
  const events: string[] = [];
  const fixes: number[][] = [];
  let members: Member[] = [];
  const sink: FeedSink = {
    onMembers: (m) => {
      members = m;
      events.push('members');
    },
    onFixes: (b: FixBatch) => {
      events.push('fixes');
      for (let i = 0; i < b.n; i++)
        fixes.push(Array.from(b.buf.subarray(i * FIX_STRIDE, (i + 1) * FIX_STRIDE)));
    },
    onState: () => events.push('state'),
    onSessionEnded: () => events.push('ended'),
  };
  const handle = feed.start(sink);
  clock.advance(ms);
  return { events, fixes, members, handle };
}

describe('SyntheticFeedManager', () => {
  it('delivers members before any fixes, with me first', () => {
    const clock = new FakeClock();
    const { events, members } = record(new SyntheticFeedManager(options, clock), clock, 2000);
    expect(events[0]).toBe('members');
    expect(members).toHaveLength(50);
    expect(members[0]?.isMe).toBe(true);
  });

  it('produces the same fixes for the same seed', () => {
    const a = new FakeClock();
    const b = new FakeClock();
    const runA = record(new SyntheticFeedManager(options, a), a, 10_000);
    const runB = record(new SyntheticFeedManager(options, b), b, 10_000);
    expect(runA.fixes).toEqual(runB.fixes);
    expect(runA.fixes.length).toBeGreaterThan(0);
  });

  it('sends moving friends every interval and still friends every 30 s', () => {
    const clock = new FakeClock();
    const { fixes } = record(new SyntheticFeedManager(options, clock), clock, 60_000);
    const perMember = new Map<number, number>();
    for (const f of fixes) perMember.set(f[0] ?? -1, (perMember.get(f[0] ?? -1) ?? 0) + 1);
    const counts = [...perMember.values()];
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(55); // movers: ~60 in 60 s
    expect(Math.min(...counts)).toBeLessThanOrEqual(2); // still: 2 in 60 s
  });

  it('never calls the sink after stop()', () => {
    const clock = new FakeClock();
    const feed = new SyntheticFeedManager(options, clock);
    const { events, handle } = record(feed, clock, 1000);
    handle.stop();
    const before = events.length;
    clock.advance(10_000);
    expect(events).toHaveLength(before);
  });
});
