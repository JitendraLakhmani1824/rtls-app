import {
  FIX_STRIDE,
  PRESENCE_STRIDE,
  type FixBatch,
  type Member,
  type PresenceBatch,
} from '@core/models';
import type { FeedSink } from '@core/protocols';
import { feedContract } from '@testing/contracts';
import { FakeClock } from '@testing/fakes';

import type { ScenarioName } from './scenarios';
import { SyntheticFeedManager, type SyntheticFeedOptions } from './SyntheticFeedManager';

const options = (scenario: ScenarioName = 'concert', friends = 200): SyntheticFeedOptions => ({
  scenario,
  friends,
  seed: 7,
  movingIntervalMs: 1000,
  center: [72.8656, 19.0657],
});

/** Runs the feed for `ms` of virtual time; returns every fix and heartbeat as rows. */
function run(opts: SyntheticFeedOptions, ms: number) {
  const clock = new FakeClock();
  const t0 = clock.now();
  const fixes: number[][] = [];
  const beats: number[][] = [];
  const rows = (b: FixBatch | PresenceBatch, stride: number, into: number[][]) => {
    for (let i = 0; i < b.n; i++)
      into.push(Array.from(b.buf.subarray(i * stride, (i + 1) * stride)));
  };
  const sink: FeedSink = {
    onMembers: () => {},
    onFixes: (b) => rows(b, FIX_STRIDE, fixes),
    onPresence: (b) => rows(b, PRESENCE_STRIDE, beats),
    onState: () => {},
    onSessionEnded: () => {},
  };
  new SyntheticFeedManager(opts, clock).start(sink);
  clock.advance(ms);
  return { fixes, beats, t0 };
}

const countBy = (rows: number[][]) => {
  const counts = new Map<number, number>();
  for (const r of rows) counts.set(r[0] ?? -1, (counts.get(r[0] ?? -1) ?? 0) + 1);
  return counts;
};

feedContract('SyntheticFeedManager', (clock) => new SyntheticFeedManager(options(), clock));

describe('SyntheticFeedManager', () => {
  it('starts with a snapshot of everyone’s position', () => {
    const { fixes, t0 } = run(options('concert', 50), 0);
    expect(fixes.filter((f) => f[4] === t0)).toHaveLength(50);
  });

  it('sends the last few minutes of everyone moving first, so trails show at once', () => {
    const { fixes, t0 } = run(options('marathon', 10), 0);
    const history = fixes.filter((f) => (f[4] ?? 0) < t0);
    expect(history.length).toBeGreaterThan(100);
    expect(Math.min(...history.map((f) => f[4] ?? 0))).toBe(t0 - 300_000);
  });

  it('sends no history to large sessions, which are for measuring', () => {
    const { fixes, t0 } = run(options('marathon', 200), 0);
    expect(fixes.filter((f) => (f[4] ?? 0) < t0)).toHaveLength(0);
  });

  it('sends a heartbeat as soon as a moving friend stops, not up to a minute later', () => {
    const { fixes, beats } = run(options('trip', 12), 4 * 60_000); // cars stop every ~2 min
    const quickBeats = beats.filter((b) => {
      const t = b[1] ?? 0;
      return fixes.some((f) => f[0] === b[0] && t - (f[4] ?? 0) > 0 && t - (f[4] ?? 0) <= 1000);
    });
    expect(quickBeats.length).toBeGreaterThan(0);
  });

  it('produces the same fixes and heartbeats for the same seed', () => {
    const a = run(options('marathon'), 20_000);
    const b = run(options('marathon'), 20_000);
    expect(a.fixes).toEqual(b.fixes);
    expect(a.beats).toEqual(b.beats);
  });

  it('sends moving friends every interval, and still friends a heartbeat a minute and a fix every 5 min', () => {
    const { fixes, beats } = run(options('concert'), 5 * 60_000);
    const fixCounts = [...countBy(fixes).values()];
    expect(Math.max(...fixCounts)).toBeGreaterThanOrEqual(280); // a walker: ~300 in 5 min
    expect(Math.min(...fixCounts)).toBeLessThanOrEqual(2); // someone standing: snapshot + 1
    const beatCounts = [...countBy(beats).values()];
    expect(Math.max(...beatCounts)).toBeLessThanOrEqual(6); // ≤ 1 a minute
  });

  it('numbers each member’s fixes in order', () => {
    const { fixes } = run(options('trip', 40), 30_000);
    const last = new Map<number, number>();
    for (const [m = -1, seq = 0] of fixes) {
      expect(seq).toBeGreaterThan(last.get(m) ?? 0);
      last.set(m, seq);
    }
  });

  it('lets some friends go silent, and has some pause sharing', () => {
    const { fixes, beats, t0 } = run(options('concert'), 4 * 60_000);
    const lastHeard = new Map<number, number>();
    const heard = (m = -1, t = 0) => lastHeard.set(m, Math.max(t, lastHeard.get(m) ?? 0));
    for (const f of fixes) heard(f[0], f[4]);
    for (const b of beats) heard(b[0], b[1]);
    const silent = [...lastHeard.values()].filter((t) => t < t0 + 3 * 60_000);
    expect(silent.length).toBeGreaterThan(0);
    expect(beats.some((b) => b[2] === 1)).toBe(true);
  });

  it('keeps the world moving while stopped: after a resume, people are somewhere else', () => {
    const clock = new FakeClock();
    const feed = new SyntheticFeedManager(options('trip', 8), clock);
    const snapshots: number[][] = [];
    const sink = (): FeedSink => {
      let first = true;
      return {
        onMembers: () => {},
        onFixes: (b) => {
          if (first) snapshots.push(Array.from(b.buf.subarray(0, b.n * FIX_STRIDE)));
          first = false;
        },
        onPresence: () => {},
        onState: () => {},
        onSessionEnded: () => {},
      };
    };
    const handle = feed.start(sink());
    clock.advance(1000);
    const cursor = handle.cursor();
    handle.stop();
    clock.advance(60_000);
    feed.start(sink(), cursor).stop();
    expect(snapshots[1]?.[2]).not.toBe(snapshots[0]?.[2]);
  });

  describe('a session’s people', () => {
    const people = ['Asha', 'Riya', 'Dev Patel', 'Sam'].map((name) => ({
      key: name.toLowerCase(),
      name,
    }));
    const membersOf = (meIndex: number) => {
      let members: Member[] = [];
      new SyntheticFeedManager({ ...options('trip', 4), people, meIndex }, new FakeClock()).start({
        onMembers: (m) => (members = m),
        onFixes: () => {},
        onPresence: () => {},
        onState: () => {},
        onSessionEnded: () => {},
      });
      return members;
    };

    it('names members after the people, with me as "You"', () => {
      const members = membersOf(1);
      expect(members.map((m) => [m.key, m.name, m.initials, m.isMe])).toEqual([
        ['asha', 'Asha', 'A', false],
        ['riya', 'You', 'ME', true],
        ['dev patel', 'Dev Patel', 'DP', false],
        ['sam', 'Sam', 'S', false],
      ]);
    });

    it('moves the crowd the same whoever is me, so phones that joined one link agree', () => {
      const positions = (meIndex: number) =>
        run({ ...options('trip', 4), people, meIndex }, 10_000).fixes.filter(
          (f) => f[0] !== 0 && f[0] !== 2,
        );
      expect(positions(2)).toEqual(positions(0));
    });
  });
});
