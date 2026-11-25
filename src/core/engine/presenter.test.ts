import { FIX_STRIDE, PIN_STRIDE, PROFILES, Presence, TRAIL_STRIDE, type Viewport } from '../models';
import { metersPerPoint } from '../utils';
import { Presenter, TRAILS_FOR_ALL_MAX } from './presenter';
import { LocationStore } from './store';
import { TrailStore } from './trails';

const M = 0.000009; // ~1 m of latitude
type Fix = [member: number, seq: number, lng: number, lat: number, tMs: number];

function storeWith(members: number, ...fixes: Fix[]) {
  const store = new LocationStore();
  store.reset(members, Infinity);
  const buf = new Float64Array(fixes.length * FIX_STRIDE);
  fixes.forEach(([m, seq, lng, lat, t], i) => buf.set([m, seq, lng, lat, t, 5], i * FIX_STRIDE));
  store.ingest({ n: fixes.length, buf }, []);
  return store;
}

/** A member at (lng, 19) moving north at `speed` m/s, last fix at t = 1000. */
const mover = (m: number, lng: number, speed: number): Fix[] => [
  [m, 1, lng, 19, 0],
  [m, 2, lng, 19 + speed * M, 1000],
];

const view = (zoom: number, half = 0.01): Viewport => ({
  west: 72 - half,
  east: 72 + half,
  south: 19 - half,
  north: 19 + half,
  zoom,
  gesturing: false,
});

function presenterAt(viewport: Viewport | null, glideLimit = 30) {
  const p = new Presenter();
  p.reset(64);
  p.setBudget({ glideLimit, glideFps: 60, gestureUpdatesPerSec: 4 });
  p.setViewport(viewport);
  return p;
}

const members = (frame: { n: number; buf: Float64Array }, stride: number) =>
  Array.from({ length: frame.n }, (_, i) => frame.buf[i * stride]);

describe('Presenter', () => {
  describe('visibility', () => {
    it('shows members just outside the screen, so pins are ready before they scroll in', () => {
      const store = storeWith(3, [1, 1, 72.014, 19, 0], [2, 1, 72.016, 19, 0]);
      const p = presenterAt(view(15));
      p.updateVisibility(store);
      expect(p.isVisible(1)).toBe(true); // within 1.5× the viewport
      expect(p.isVisible(2)).toBe(false);
    });

    it('lets a visible member wander further before hiding it, so pins on the edge don’t flicker', () => {
      const p = presenterAt(view(15));
      const store = storeWith(2, [1, 1, 72.014, 19, 0]);
      p.updateVisibility(store);
      store.ingest(
        { n: 1, buf: new Float64Array([1, 2, 72.017, 19, 1000, 5]) },
        [], // now beyond the entry pad, inside the exit pad
      );
      expect(p.updateVisibility(store)).toBe(false);
      expect(p.isVisible(1)).toBe(true);
      store.ingest({ n: 1, buf: new Float64Array([1, 3, 72.019, 19, 2000, 5]) }, []);
      expect(p.updateVisibility(store)).toBe(true);
      expect(p.isVisible(1)).toBe(false);
    });
  });

  it('checks only the members that moved, with the same result as a full pass', () => {
    const rng = { s: 7, next: () => (rng.s = (rng.s * 16807) % 2147483647) / 2147483647 };
    const fixes: Fix[] = Array.from({ length: 50 }, (_, m) => [
      m,
      1,
      72 + (rng.next() - 0.5) * 0.04,
      19,
      0,
    ]);
    const store = storeWith(50, ...fixes);
    const incremental = presenterAt(view(15));
    const full = presenterAt(view(15));
    incremental.updateVisibility(store);
    full.updateVisibility(store);
    const moved = [3, 17, 42];
    const buf = new Float64Array(moved.length * FIX_STRIDE);
    moved.forEach((m, i) =>
      buf.set([m, 2, 72.0005 * (i + 1) - 0.0005 * i * 2, 19, 1000, 5], i * FIX_STRIDE),
    );
    store.ingest({ n: moved.length, buf }, []);
    incremental.updateVisibility(store, moved);
    full.updateVisibility(store);
    const visible = (p: Presenter) => Array.from({ length: 50 }, (_, m) => p.isVisible(m));
    expect(visible(incremental)).toEqual(visible(full));
    expect(incremental.visibleCount).toBe(full.visibleCount);
  });

  describe('gliding', () => {
    it('glides only the selected friend below street zoom, where pins may be clustered', () => {
      const store = storeWith(4, ...mover(1, 72, 5), ...mover(2, 72.001, 5));
      const p = presenterAt(view(14));
      p.updateVisibility(store);
      p.updateGliding(store, 2);
      expect(p.isGliding(1)).toBe(false);
      expect(p.isGliding(2)).toBe(true);
    });

    it('at street zoom, glides the fastest on-screen friends up to the budget', () => {
      const store = storeWith(
        5,
        ...mover(1, 72, 5),
        ...mover(2, 72.001, 3),
        ...mover(3, 72.002, 0.3), // standing about
        ...mover(4, 72.003, 1), // under 2 points per second at zoom 16
      );
      expect(1 / metersPerPoint(16, 19)).toBeLessThan(2);
      const p = presenterAt(view(16), 1);
      p.updateVisibility(store);
      p.updateGliding(store, null);
      expect([1, 2, 3, 4].filter((m) => p.isGliding(m))).toEqual([1]);
      p.setBudget({ glideLimit: 30, glideFps: 60, gestureUpdatesPerSec: 4 });
      p.updateGliding(store, null);
      expect([1, 2, 3, 4].filter((m) => p.isGliding(m))).toEqual([1, 2]);
    });

    it('keeps a gliding friend gliding as they slow a little, so GPS noise doesn’t flip them', () => {
      const store = storeWith(2, ...mover(1, 72, 3));
      const p = presenterAt(view(16));
      p.updateVisibility(store); // zoom 16: ~1.13 m per point
      p.updateGliding(store, null);
      expect(p.isGliding(1)).toBe(true); // 2.7 points/s
      store.ingest({ n: 1, buf: new Float64Array([1, 3, 72, 19 + 4.5 * M, 2000, 5]) }, []);
      p.updateGliding(store, null);
      expect(p.isGliding(1)).toBe(true); // 1.5 m/s = 1.3 points/s: would not start, does not stop
    });

    it('glides nobody, not even the selected friend, when the budget allows none', () => {
      const store = storeWith(2, ...mover(1, 72, 5));
      const p = presenterAt(view(16), 0);
      p.updateVisibility(store);
      p.updateGliding(store, 1);
      expect(p.isGliding(1)).toBe(false);
    });

    it('keeps a poorly located friend’s accuracy halo while it glides', () => {
      const store = new LocationStore();
      store.reset(2, Infinity);
      store.ingest({ n: 1, buf: new Float64Array([1, 1, 72, 19, 0, 90]) }, []);
      const p = presenterAt(view(14));
      p.updateVisibility(store);
      p.updateGliding(store, 1);
      expect(p.motionFrame(store).buf[4]).toBe(90);
    });

    it('reports whether the gliding set changed', () => {
      const store = storeWith(2, ...mover(1, 72, 5));
      const p = presenterAt(view(14));
      p.updateVisibility(store);
      expect(p.updateGliding(store, 1)).toBe(true);
      expect(p.updateGliding(store, 1)).toBe(false);
      expect(p.updateGliding(store, null)).toBe(true);
    });

    it('glides over the last fix interval, and snaps after a confirmed jump', () => {
      const store = new LocationStore();
      store.reset(2, 4);
      const fixes = [
        [1, 1, 72, 19, 0],
        [1, 2, 72, 19 + 2 * M, 2000],
      ];
      for (const f of fixes) store.ingest({ n: 1, buf: new Float64Array([...f, 5]) }, []);
      const p = presenterAt(view(14));
      p.updateVisibility(store);
      p.updateGliding(store, 1);
      expect(Array.from(p.motionFrame(store).buf.subarray(0, 4))).toEqual([
        1,
        72,
        19 + 2 * M,
        2000,
      ]);
      store.ingest({ n: 1, buf: new Float64Array([1, 3, 72, 19.01, 3000, 5]) }, []); // held
      store.ingest({ n: 1, buf: new Float64Array([1, 4, 72, 19.01 + M, 4000, 5]) }, []); // confirmed
      expect(p.motionFrame(store).buf[3]).toBe(0);
    });
  });

  describe('still frame', () => {
    it('holds every on-screen member that isn’t gliding or paused, with presence', () => {
      const store = storeWith(
        5,
        [1, 1, 72, 19, 1000],
        [2, 1, 72.001, 19, 1000],
        [3, 1, 72.5, 19, 1000], // off screen
        [4, 1, 72.002, 19, 1000],
      );
      store.heartbeat({ n: 1, buf: new Float64Array([4, 1000, 1]) }); // paused
      const p = presenterAt(view(14));
      p.updateVisibility(store);
      p.updateGliding(store, 2);
      const frame = p.stillFrame(store, 1000 + 200_000);
      expect(members(frame, PIN_STRIDE)).toEqual([1]);
      expect(frame.buf[3]).toBe(Presence.Recent);
    });

    it('notices when someone’s presence changes, and only then', () => {
      const store = storeWith(2, [1, 1, 72, 19, 0]);
      const p = presenterAt(view(14));
      expect(p.presenceChanged(store, 1000)).toBe(true);
      expect(p.presenceChanged(store, 2000)).toBe(false);
      expect(p.presenceChanged(store, 200_000)).toBe(true); // Live → Recent
    });
  });

  describe('trail frame', () => {
    function trailsFor(store: LocationStore, upTo: number) {
      const trails = new TrailStore();
      trails.reset(store.size, PROFILES.event);
      for (let m = 0; m < store.size; m++) {
        for (let t = 0; t <= upTo; t += 60_000) {
          trails.append(m, 72 + m * 0.0001, 19 + (t / 60_000) * 10 * M, t, 5, false);
        }
      }
      return trails;
    }

    it('draws everyone’s trail when few friends are on screen', () => {
      const store = storeWith(3, [1, 1, 72, 19, 0], [2, 1, 72.001, 19, 0]);
      const p = presenterAt(view(14));
      p.updateVisibility(store);
      const frame = p.trailFrame(trailsFor(store, 120_000), store, null, 120_000, 15 * 60_000);
      expect(Array.from(frame.members.subarray(0, frame.n))).toEqual([1, 2]);
    });

    it('draws only the selected friend’s trail in a crowd', () => {
      const n = TRAILS_FOR_ALL_MAX + 5;
      const fixes: Fix[] = Array.from({ length: n }, (_, m) => [m, 1, 72 + m * 0.0001, 19, 0]);
      const store = storeWith(n, ...fixes);
      const p = presenterAt(view(14));
      p.updateVisibility(store);
      const frame = p.trailFrame(trailsFor(store, 120_000), store, 7, 120_000, 15 * 60_000);
      expect(Array.from(frame.members.subarray(0, frame.n))).toEqual([7]);
    });

    it('tags each point with an age bucket, newest 0 to oldest 3', () => {
      const store = storeWith(2, [1, 1, 72, 19, 0]);
      const p = presenterAt(view(14));
      p.updateVisibility(store);
      const now = 14 * 60_000;
      const frame = p.trailFrame(trailsFor(store, now), store, 1, now, 15 * 60_000);
      const ages: number[] = [];
      for (let i = frame.offsets[0] ?? 0; i < (frame.offsets[1] ?? 0); i++)
        ages.push(frame.coords[i * TRAIL_STRIDE + 2] ?? -1);
      expect(ages[0]).toBe(3);
      expect(ages[ages.length - 1]).toBe(0);
      expect([...ages].sort((a, b) => b - a)).toEqual(ages); // never gets older towards the pin
    });

    it('never draws a paused friend’s trail', () => {
      const store = storeWith(2, [1, 1, 72, 19, 0]);
      store.heartbeat({ n: 1, buf: new Float64Array([1, 0, 1]) });
      const p = presenterAt(view(14));
      p.updateVisibility(store);
      expect(p.trailFrame(trailsFor(store, 120_000), store, 1, 120_000, 15 * 60_000).n).toBe(0);
    });
  });
});
