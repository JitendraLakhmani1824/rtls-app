import { PROFILES, Presence, type Viewport } from '@core/models';
import { noopPerf } from '@core/protocols';
import { FakeDeviceManager, FakeFeedManager, FakeMapManager, fakeMembers } from '@testing/fakes';

import { LiveSession } from './LiveSession';

const M = 0.000009; // ~1 m of latitude

function setup() {
  const device = new FakeDeviceManager();
  const feed = new FakeFeedManager();
  const map = new FakeMapManager();
  const session = new LiveSession({ feed, map, device, perf: noopPerf, profile: PROFILES.event });
  return { device, feed, map, session, t0: device.clock.now() };
}

const view = (zoom: number, gesturing = false): Viewport => ({
  west: 71.99,
  east: 72.01,
  south: 18.99,
  north: 19.01,
  zoom,
  gesturing,
});

describe('LiveSession', () => {
  describe('lifecycle', () => {
    it('starts the feed only when the app is in the foreground and the map is ready', () => {
      const { device, feed, map, session } = setup();
      map.setReady(false);
      session.start();
      expect(feed.running).toBe(false);
      map.setReady(true);
      expect(feed.running).toBe(true);
      device.setForeground(false);
      expect(feed.running).toBe(false);
    });

    it('pauses in the background and resumes from the same cursor', () => {
      const { device, feed, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      feed.fixes([1, 1, 72, 19, t0]);
      feed.fixes([1, 2, 72, 19 + M, t0 + 1000]);
      device.setForeground(false);
      device.setForeground(true);
      expect(feed.starts).toEqual([undefined, { feedPosition: 2 }]);
      expect(feed.stops).toBe(1);
    });

    it('stops its timers while paused', () => {
      const { device, session } = setup();
      session.start();
      expect(device.clock.pendingTimers).toBe(1);
      device.setForeground(false);
      expect(device.clock.pendingTimers).toBe(0);
    });

    it('re-sends everything when the map comes back', () => {
      const { feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      feed.fixes([1, 1, 72, 19, t0]);
      map.setReady(false);
      map.members = [];
      map.setReady(true);
      expect(map.members).toHaveLength(2);
      expect(map.lastStill).toEqual([[1, 72, 19, Presence.Live, 0]]);
      expect(map.frameRateCaps.at(-1)).toBe(60);
    });

    it('can be started again after stop()', () => {
      const { feed, session } = setup();
      const stop = session.start();
      stop();
      expect(feed.running).toBe(false);
      session.start();
      expect(feed.running).toBe(true);
    });
  });

  describe('pins', () => {
    it('at street zoom, sends gliding targets for moving friends and still pins once a second', () => {
      const { device, feed, map, session, t0 } = setup();
      map.viewport.set(view(17)); // a walker moves ~5 points/s here
      session.start();
      feed.members(fakeMembers(3));
      feed.fixes([1, 1, 72, 19, t0], [2, 1, 72.001, 19, t0]);
      device.clock.advance(1000);
      expect(map.lastStill).toEqual([
        [1, 72, 19, Presence.Live, 0],
        [2, 72.001, 19, Presence.Live, 0],
      ]);
      feed.fixes([1, 2, 72, 19 + 3 * M, t0 + 1000]); // friend 1 walks 3 m in 1 s
      device.clock.advance(1000);
      // On the same tick, friend 1 starts gliding and leaves the still pins: never drawn twice
      expect(map.lastMoving).toEqual([[1, 72, 19 + 3 * M, 1000, 0]]);
      expect(map.lastStill).toEqual([[2, 72.001, 19, Presence.Live, 0]]);
    });

    it('does not resend still pins when nothing changed', () => {
      const { device, feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      feed.fixes([1, 1, 72, 19, t0]);
      device.clock.advance(1000);
      device.clock.advance(1000);
      expect(map.stillFrames).toHaveLength(1);
    });

    it('never moves a pin back for a duplicate or late fix', () => {
      const { device, feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      feed.fixes([1, 2, 72, 19 + 2 * M, t0 + 1000]);
      device.clock.advance(1000);
      feed.fixes([1, 1, 72, 19, t0], [1, 2, 72, 19 + 2 * M, t0 + 1000]);
      device.clock.advance(1000);
      expect(map.stillFrames).toEqual([[[1, 72, 19 + 2 * M, Presence.Live, 0]]]);
    });

    it('snaps instead of gliding across the map after a confirmed jump', () => {
      const { device, feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      map.pressPin(1);
      feed.fixes([1, 1, 72, 19, t0, 5]);
      device.clock.advance(1000);
      feed.fixes([1, 2, 72, 19.005, t0 + 1000, 5]); // 550 m in 1 s: held
      expect(map.lastMoving?.[0]?.[2]).toBe(19);
      feed.fixes([1, 3, 72, 19.005 + M, t0 + 2000, 5]); // confirmed
      expect(map.lastMoving).toEqual([[1, 72, 19.005 + M, 0, 0]]);
    });
  });

  describe('presence', () => {
    it('ages a silent friend from Live to Recent to Stale', () => {
      const { device, feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      feed.fixes([1, 1, 72, 19, t0]);
      device.clock.advance(1000);
      expect(map.lastStill?.[0]?.[3]).toBe(Presence.Live);
      device.clock.advance(160_000);
      expect(map.lastStill?.[0]?.[3]).toBe(Presence.Recent);
      device.clock.advance(160_000);
      expect(map.lastStill?.[0]?.[3]).toBe(Presence.Stale);
    });

    it('keeps a friend standing still Live while heartbeats arrive', () => {
      const { device, feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      feed.fixes([1, 1, 72, 19, t0]);
      for (let s = 60; s <= 300; s += 60) {
        device.clock.advance(60_000);
        feed.presence([1, t0 + s * 1000, 0]);
      }
      device.clock.advance(1000);
      expect(map.lastStill?.[0]?.[3]).toBe(Presence.Live);
    });

    it('hides a friend who pauses sharing right away, not at the next tick', () => {
      const { feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(3));
      feed.fixes([1, 1, 72, 19, t0], [2, 1, 72.001, 19, t0]);
      feed.presence([2, t0, 1]);
      expect(map.lastStill?.map((row) => row[0])).toEqual([1]);
    });
  });

  describe('trails', () => {
    it('sends the selected friend’s trail as it grows', () => {
      const { device, feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      map.pressPin(1);
      feed.fixes([1, 1, 72, 19, t0]);
      device.clock.advance(2000);
      feed.fixes([1, 2, 72, 19 + 4 * M, t0 + 2000]);
      device.clock.advance(2000);
      feed.fixes([1, 3, 72, 19 + 8 * M, t0 + 4000]); // trail points need 5 m between them
      device.clock.advance(1000); // trails go out on the 1 s tick
      expect(map.lastTrails).toEqual([
        {
          member: 1,
          points: [
            [72, 19, 0],
            [72, 19 + 8 * M, 0],
          ],
        },
      ]);
    });
  });

  describe('selection', () => {
    it('selects a friend when their pin is tapped and tells the map', () => {
      const { feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      feed.fixes([1, 1, 72, 19, t0]);
      map.pressPin(1);
      expect(session.selected.get()).toBe(1);
      expect(map.selected).toBe(1);
      expect(map.lastMoving).toEqual([[1, 72, 19, 0, 0]]); // the selected friend always glides
    });
  });

  describe('budget', () => {
    it('caps the frame rate and stops gliding when the phone is critically hot', () => {
      const { device, feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      feed.fixes([1, 1, 72, 19, t0]);
      map.pressPin(1);
      expect(map.lastMoving).toHaveLength(1);
      device.power.set({
        lowPowerMode: false,
        thermal: 'critical',
        battery: 0.5,
        reduceMotion: false,
      });
      expect(map.frameRateCaps.at(-1)).toBe(0);
      expect(map.lastMoving).toEqual([]);
      device.clock.advance(1000);
      expect(map.lastStill).toEqual([[1, 72, 19, Presence.Live, 0]]); // drawn as a still pin instead
    });

    it('slows motion updates to the gesture rate while the user pans', () => {
      const { device, feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      map.viewport.set(view(16));
      feed.fixes([1, 1, 72, 19, t0]);
      device.clock.advance(200);
      map.pressPin(1);
      map.viewport.set(view(16, true));
      device.clock.advance(200);
      const before = map.movingFrames.length;
      for (let i = 2; i <= 11; i++) {
        feed.fixes([1, i, 72, 19 + i * M, t0 + i * 100]);
        device.clock.advance(100);
      }
      // 1 s of fixes at 10 Hz → about 4 motion updates (normal budget: 4/s while gesturing)
      expect(map.movingFrames.length - before).toBeLessThanOrEqual(5);
      expect(map.movingFrames.length - before).toBeGreaterThanOrEqual(3);
    });
  });

  describe('friend rows', () => {
    it('lists everyone but me, nearest first, paused friends last', () => {
      const { device, feed, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(4));
      feed.fixes(
        [0, 1, 72, 19, t0],
        [1, 1, 72, 19.01, t0],
        [2, 1, 72, 19.001, t0],
        [3, 1, 72, 19.0005, t0],
      );
      feed.presence([3, t0, 1]);
      device.clock.advance(1000);
      const rows = session.rows.get();
      expect(rows.map((r) => r.id)).toEqual([2, 1, 3]);
      expect(rows[0]?.distanceM).toBeCloseTo(111, 0);
      expect(rows[0]?.bearingDeg).toBeCloseTo(0, 0);
      expect(rows[2]?.presence).toBe(Presence.Paused);
    });

    it('tells subscribers once a tick, and only while someone subscribes', () => {
      const { device, feed, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(2));
      feed.fixes([1, 1, 72, 19, t0]);
      let calls = 0;
      const stop = session.rows.subscribe(() => calls++);
      device.clock.advance(3000);
      expect(calls).toBe(3);
      stop();
      device.clock.advance(3000);
      expect(calls).toBe(3);
    });
  });

  describe('camera', () => {
    it('frames everyone once friends appear', () => {
      const { device, feed, map, session, t0 } = setup();
      session.start();
      feed.members(fakeMembers(3));
      feed.fixes([1, 1, 72, 19, t0], [2, 1, 72.01, 19.02, t0]);
      device.clock.advance(1000);
      expect(map.fits).toEqual([[72, 19, 72.01, 19.02]]);
      device.clock.advance(1000);
      expect(map.fits).toHaveLength(1); // no re-fit while everyone is in view
    });

    it('re-frames when a friend leaves the view, until the user moves the map', () => {
      const { device, feed, map, session, t0 } = setup();
      map.viewport.set(view(15));
      session.start();
      feed.members(fakeMembers(2));
      feed.fixes([1, 1, 72, 19, t0]);
      device.clock.advance(1000);
      feed.fixes([1, 2, 72.02, 19, t0 + 600_000]); // ten minutes later, out of the view
      device.clock.advance(1000);
      expect(map.fits).toHaveLength(2);
      map.viewport.set(view(15, true)); // the user pans
      feed.fixes([1, 3, 72.04, 19, t0 + 1_200_000]);
      device.clock.advance(1000);
      expect(map.fits).toHaveLength(2);
    });
  });

  describe('tracking a friend', () => {
    it('flies to the selected friend, moves with them, and stops when the user pans', () => {
      const { device, feed, map, session, t0 } = setup();
      map.viewport.set(view(14));
      session.start();
      feed.members(fakeMembers(2));
      feed.fixes([1, 1, 72, 19, t0]);
      device.clock.advance(1000);
      session.select(1);
      expect(map.moves.at(-1)).toMatchObject({ lng: 72, lat: 19, zoom: 16, path: 'fly' });
      device.clock.advance(2000); // the flight lands
      feed.fixes([1, 2, 72, 19 + M, t0 + 3000]);
      expect(map.moves.at(-1)).toMatchObject({ lat: 19 + M, ms: 3000, path: 'linear' });
      map.viewport.set({ ...view(16), gesturing: true }); // the user pans
      const moves = map.moves.length;
      feed.fixes([1, 3, 72, 19 + 2 * M, t0 + 4000]);
      device.clock.advance(1000);
      expect(map.moves).toHaveLength(moves);
    });

    it('flies in from the city the first time a map opens, and eases after that', () => {
      const device = new FakeDeviceManager();
      const feed = new FakeFeedManager();
      const map = new FakeMapManager();
      map.setReady(false);
      const session = new LiveSession({
        feed,
        map,
        device,
        perf: noopPerf,
        profile: PROFILES.event,
        intro: true,
      });
      session.start();
      map.setReady(true);
      feed.members(fakeMembers(2));
      feed.fixes([1, 1, 72, 19, device.clock.now()]);
      device.clock.advance(1000);
      device.setForeground(false); // back from the background: same map, no intro
      device.setForeground(true);
      feed.members(fakeMembers(2));
      feed.fixes([1, 2, 72, 19, device.clock.now()]);
      device.clock.advance(1000);
      expect(map.fitPaths).toEqual(['fly', 'ease']);
    });
  });
});
