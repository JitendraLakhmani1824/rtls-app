import { FIX_STRIDE, PRESENCE_STRIDE } from '@core/models';
import { FakeMapManager } from '@testing/fakes';

import { CameraDirector } from './camera';
import { LocationStore } from './store';

const NORTH = 0.000009; // ~1 m of latitude
const EAST = 0.0000095; // ~1 m of longitude at 19° N

function setup({ calm = false, intro = false } = {}) {
  const map = new FakeMapManager();
  map.viewport.set({
    west: 71.99,
    east: 72.01,
    south: 18.99,
    north: 19.01,
    zoom: 14,
    gesturing: false,
  });
  const store = new LocationStore();
  store.reset(2, Infinity);
  const camera = new CameraDirector(map, intro);
  camera.setCalm(calm);
  let seq = 0;
  /** Friend 1 reports a fix `dx`/`dy` metres from (72, 19) at time t (ms). */
  const fix = (dx: number, dy: number, t: number) => {
    const buf = new Float64Array(FIX_STRIDE);
    buf.set([1, ++seq, 72 + dx * EAST, 19 + dy * NORTH, t, 10]);
    store.ingest({ n: 1, buf }, []);
    camera.follow(store, t);
  };
  /** Friend 1 says "still here" at time t. */
  const heartbeat = (t: number) => {
    const buf = new Float64Array(PRESENCE_STRIDE);
    buf.set([1, t, 0]);
    store.heartbeat({ n: 1, buf });
    camera.follow(store, t);
  };
  return { map, store, camera, fix, heartbeat };
}

describe('CameraDirector', () => {
  it('flies to a selected friend, zooming in to street level', () => {
    const { map, store, camera, fix } = setup();
    fix(0, 0, 0);
    camera.select(1, store, 0);
    expect(map.moves).toEqual([
      { lng: 72, lat: 19, zoom: 16, pitch: 0, bearing: 0, ms: 1200, path: 'fly' },
    ]);
  });

  it('lets the flight land before following', () => {
    const { map, store, camera, fix } = setup();
    fix(0, 0, 0);
    camera.select(1, store, 0);
    fix(0, 1, 1000);
    expect(map.moves).toHaveLength(1);
    fix(0, 2, 2000);
    expect(map.moves).toHaveLength(2);
  });

  it('moves with a gliding friend: same target and duration as the pin, at constant speed', () => {
    const { map, store, camera, fix } = setup();
    fix(0, 0, 0);
    camera.select(1, store, 0);
    fix(0, 1, 2000);
    fix(0, 2, 3000);
    expect(map.moves.at(-1)).toMatchObject({
      lng: 72,
      lat: 19 + 2 * NORTH,
      pitch: 0,
      bearing: 0,
      ms: 1000,
      path: 'linear',
    });
  });

  it('tilts and turns to a fast friend’s direction of travel, ignoring small wobbles', () => {
    const { map, store, camera, fix } = setup();
    fix(0, 0, 0);
    camera.select(1, store, 0);
    fix(0, 30, 2000); // 15 m/s north
    expect(map.moves.at(-1)).toMatchObject({ pitch: 45, bearing: 0 });
    fix(15, 30, 3000); // turns east
    expect(map.moves.at(-1)).toMatchObject({ pitch: 45, bearing: 90 });
    fix(30, 31, 4000); // ~4° off east: not worth turning the map
    expect(map.moves.at(-1)).toMatchObject({ pitch: 45, bearing: 90 });
  });

  it('levels the map when the friend stops', () => {
    const { map, store, camera, fix, heartbeat } = setup();
    fix(0, 0, 0);
    camera.select(1, store, 0);
    fix(0, 30, 2000);
    heartbeat(10_000);
    expect(map.moves.at(-1)).toMatchObject({ pitch: 0, bearing: 0, path: 'ease' });
  });

  it('levels the map and stops following when the sheet closes', () => {
    const { map, store, camera, fix } = setup();
    fix(0, 0, 0);
    camera.select(1, store, 0);
    fix(0, 30, 2000);
    camera.select(null, store, 2500);
    expect(map.moves.at(-1)).toMatchObject({ pitch: 0, bearing: 0 });
    const moves = map.moves.length;
    fix(0, 60, 3000);
    expect(map.moves).toHaveLength(moves);
  });

  it('leaves the camera alone after a gesture', () => {
    const { map, store, camera, fix } = setup();
    fix(0, 0, 0);
    camera.select(1, store, 0);
    camera.release();
    fix(0, 30, 2000);
    expect(map.moves).toHaveLength(1);
  });

  it('when calm: eases without tilting, re-centring only once the friend nears the edge', () => {
    const { map, store, camera, fix } = setup({ calm: true });
    fix(0, 0, 0);
    camera.select(1, store, 0);
    expect(map.moves.at(-1)).toMatchObject({ pitch: 0, ms: 400, path: 'ease' });
    fix(0, 30, 1000); // 30 m: well inside the view
    expect(map.moves).toHaveLength(1);
    fix(0, 400, 30_000); // past 15% of the view
    expect(map.moves.at(-1)).toMatchObject({ pitch: 0, bearing: 0, path: 'ease' });
  });

  it('flies in from the city once per new map, and never when calm', () => {
    const { map, store, camera, fix } = setup({ intro: true });
    fix(0, 0, 0);
    camera.newMap();
    camera.fit(store, null);
    camera.reset();
    camera.fit(store, null);
    expect(map.fitPaths).toEqual(['fly', 'ease']);

    const calm = setup({ calm: true, intro: true });
    calm.fix(0, 0, 0);
    calm.camera.newMap();
    calm.camera.fit(calm.store, null);
    expect(calm.map.fitPaths).toEqual(['ease']);
  });
});
