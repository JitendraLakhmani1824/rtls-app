import { noopPerf } from '@core/protocols';
import { FakeDeviceManager, FakeFeedManager, FakeMapManager, fakeMembers } from '@testing/fakes';

import { LiveSession } from './LiveSession';

function setup() {
  const device = new FakeDeviceManager();
  const feed = new FakeFeedManager();
  const map = new FakeMapManager();
  const session = new LiveSession({ feed, map, device, perf: noopPerf });
  return { device, feed, map, session };
}

describe('LiveSession', () => {
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
    const { device, feed, session } = setup();
    session.start();
    feed.members(fakeMembers(2));
    feed.fixes([1, 1, 72, 19, 0]);
    feed.fixes([1, 2, 72, 19.001, 1000]);
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

  it('sends gliding targets for moving friends and still pins once a second', () => {
    const { device, feed, map, session } = setup();
    session.start();
    feed.members(fakeMembers(3));
    feed.fixes([1, 1, 72, 19, 0], [2, 1, 72.01, 19, 0]);
    feed.fixes([1, 2, 72, 19.0001, 1000]); // friend 1 walks ~11 m in 1 s
    expect(map.lastMoving).toEqual([[1, 72, 19.0001, 1000]]);
    expect(map.stillFrames).toHaveLength(0);
    device.clock.advance(1000);
    expect(map.lastStill).toEqual([[2, 72.01, 19, 0]]);
  });

  it('does not resend still pins when nothing changed', () => {
    const { device, feed, map, session } = setup();
    session.start();
    feed.members(fakeMembers(2));
    feed.fixes([1, 1, 72, 19, 0]);
    device.clock.advance(1000);
    device.clock.advance(1000);
    expect(map.stillFrames).toHaveLength(1);
  });

  it('re-sends everything when the map comes back', () => {
    const { feed, map, session } = setup();
    session.start();
    feed.members(fakeMembers(2));
    feed.fixes([1, 1, 72, 19, 0]);
    map.setReady(false);
    map.members = [];
    map.setReady(true);
    expect(map.members).toHaveLength(2);
    expect(map.lastStill).toEqual([[1, 72, 19, 0]]);
  });

  it('selects a friend when their pin is tapped and tells the map', () => {
    const { feed, map, session } = setup();
    session.start();
    feed.members(fakeMembers(2));
    feed.fixes([1, 1, 72, 19, 0]);
    map.pressPin(1);
    expect(session.selected.get()).toBe(1);
    expect(map.selected).toBe(1);
    expect(map.lastMoving).toEqual([[1, 72, 19, 0]]); // the selected friend always glides
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
