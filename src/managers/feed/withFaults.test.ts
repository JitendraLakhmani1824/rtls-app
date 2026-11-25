import { FIX_STRIDE } from '@core/models';
import type { FeedManager, FeedSink } from '@core/protocols';
import { distanceMeters } from '@core/utils';
import { feedContract } from '@testing/contracts';
import { FakeClock } from '@testing/fakes';

import { SyntheticFeedManager } from './SyntheticFeedManager';
import { FAULTS, withFaults, type Fault } from './withFaults';

const make = (clock: FakeClock) =>
  new SyntheticFeedManager(
    {
      scenario: 'marathon',
      friends: 100,
      seed: 3,
      movingIntervalMs: 1000,
      center: [72.8656, 19.0657],
    },
    clock,
  );

/** Every fix delivered, in order, as rows. */
function fixesOf(feed: FeedManager, clock: FakeClock, ms: number) {
  const out: number[][] = [];
  const sink: FeedSink = {
    onMembers: () => {},
    onFixes: (b) => {
      for (let i = 0; i < b.n; i++)
        out.push(Array.from(b.buf.subarray(i * FIX_STRIDE, (i + 1) * FIX_STRIDE)));
    },
    onPresence: () => {},
    onState: () => {},
    onSessionEnded: () => {},
  };
  feed.start(sink);
  clock.advance(ms);
  return out;
}

function compare(faults: Fault[]) {
  const a = new FakeClock();
  const b = new FakeClock();
  return {
    clean: fixesOf(make(a), a, 30_000),
    faulty: fixesOf(withFaults(make(b), faults, 3), b, 30_000),
  };
}

const key = (f: number[]) => `${f[0]}:${f[1]}`;

feedContract('withFaults(all)', (clock) => withFaults(make(clock), FAULTS, 1));

describe('withFaults', () => {
  it('returns the feed itself when no faults are asked for', () => {
    const feed = make(new FakeClock());
    expect(withFaults(feed, [], 1)).toBe(feed);
  });

  it('drops about one fix in ten', () => {
    const { clean, faulty } = compare(['drops']);
    expect(faulty.length / clean.length).toBeGreaterThan(0.85);
    expect(faulty.length / clean.length).toBeLessThan(0.95);
  });

  it('delivers some fixes twice', () => {
    const { faulty } = compare(['dups']);
    expect(new Set(faulty.map(key)).size).toBeLessThan(faulty.length);
  });

  it('delivers some fixes after newer ones', () => {
    const { faulty } = compare(['reorder']);
    const last = new Map<number, number>();
    let late = 0;
    for (const f of faulty) {
      if ((f[1] ?? 0) < (last.get(f[0] ?? -1) ?? 0)) late++;
      last.set(f[0] ?? -1, Math.max(f[1] ?? 0, last.get(f[0] ?? -1) ?? 0));
    }
    expect(late).toBeGreaterThan(0);
  });

  it('throws a few fixes 300 m off', () => {
    const { clean, faulty } = compare(['jumps']);
    const truth = new Map(clean.map((f) => [key(f), f]));
    const thrown = faulty.filter((f) => {
      const t = truth.get(key(f));
      return t && distanceMeters(t[2] ?? 0, t[3] ?? 0, f[2] ?? 0, f[3] ?? 0) > 400;
    });
    expect(thrown.length / faulty.length).toBeGreaterThan(0.01);
    expect(thrown.length / faulty.length).toBeLessThan(0.04);
  });

  it('is deterministic for a seed', () => {
    expect(compare(FAULTS as Fault[]).faulty).toEqual(compare(FAULTS as Fault[]).faulty);
  });
});
