import type { TrailFrame } from '@core/models';
import { metersPerPoint } from '@core/utils';
import { fakeMembers } from '@testing/fakes';

import { encodeStill, encodeTrails, StillEncoder, trailTipFrom } from './encode';

/** Each pin: [member, lng, lat, presence, haloM]. */
const frame = (...pins: [number, number, number, number, number][]) => ({
  n: pins.length,
  buf: Float64Array.from(pins.flat()),
});

describe('StillEncoder', () => {
  it('gives the same GeoJSON as encodeStill, also after some pins change', () => {
    const encoder = new StillEncoder();
    encoder.setMembers(fakeMembers(3));
    const before = frame([0, 72, 19, 0, 0], [1, 72.1, 19.1, 1, 0], [2, 72.2, 19.2, 0, 80]);
    expect(encoder.encode(before)).toBe(encodeStill(before, fakeMembers(3)));
    const after = frame([0, 72, 19, 0, 0], [1, 72.15, 19.1, 2, 0], [2, 72.2, 19.2, 0, 80]);
    expect(encoder.encode(after)).toBe(encodeStill(after, fakeMembers(3)));
  });
});

describe('encodeStill', () => {
  it('matches the expected GeoJSON exactly', () => {
    const json = encodeStill(frame([1, 72.5, 19.25, 0, 0]), fakeMembers(2));
    expect(json).toBe(
      '{"type":"FeatureCollection","features":[{"type":"Feature","id":1,"properties":{"m":1,"c":"#334155","t":"F1","p":0},"geometry":{"type":"Point","coordinates":[72.500000,19.250000]}}]}',
    );
  });

  it('skips a pin with an invalid coordinate instead of producing invalid JSON', () => {
    const json = encodeStill(frame([0, NaN, 19, 0, 0], [1, 72, 19, 0, 0]), fakeMembers(2));
    expect(JSON.parse(json).features).toHaveLength(1);
  });

  it('gives a poorly located pin a halo that is true to metres on screen', () => {
    const json = encodeStill(frame([0, 72, 19, 0, 0], [1, 72, 19, 0, 100]), fakeMembers(2));
    const [plain, poor] = JSON.parse(json).features as { properties: { h?: number } }[];
    expect(plain?.properties.h).toBeUndefined();
    // The layer doubles h per zoom level: at zoom 16, 100 m is 100 / metersPerPoint(16, 19) points.
    expect((poor?.properties.h ?? 0) * 2 ** 16).toBeCloseTo(100 / metersPerPoint(16, 19), 3);
  });
});

/** Parts: [member, [lng, lat, age][]]. */
const trails = (...parts: [number, [number, number, number][]][]): TrailFrame => {
  const offsets = [0];
  for (const [, points] of parts) offsets.push((offsets.at(-1) ?? 0) + points.length);
  return {
    n: parts.length,
    members: Float64Array.from(parts.map(([m]) => m)),
    offsets: Uint32Array.from(offsets),
    coords: Float64Array.from(parts.flatMap(([, points]) => points.flat())),
  };
};

type LineFeature = {
  properties: { m: number; a: number; s: number };
  geometry: { coordinates: number[][] };
};

describe('encodeTrails', () => {
  it('matches the expected GeoJSON exactly', () => {
    const json = encodeTrails(
      trails([
        1,
        [
          [72, 19, 0],
          [72.1, 19.1, 0],
        ],
      ]),
      fakeMembers(2),
      1,
    );
    expect(json).toBe(
      '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"m":1,"c":"#334155","s":1,"a":0},"geometry":{"type":"LineString","coordinates":[[72.000000,19.000000],[72.100000,19.100000]]}}]}',
    );
  });

  it('splits a trail into one line per age bucket, joined end to start', () => {
    const json = encodeTrails(
      trails([
        1,
        [
          [72, 19, 3],
          [72.1, 19, 3],
          [72.2, 19, 1],
          [72.3, 19, 0],
        ],
      ]),
      fakeMembers(2),
      null,
    );
    const lines = (JSON.parse(json).features as LineFeature[]).map((f) => [
      f.properties.a,
      f.geometry.coordinates.map(([lng]) => lng),
    ]);
    expect(lines).toEqual([
      [3, [72, 72.1, 72.2]],
      [1, [72.2, 72.3]],
    ]);
  });

  it('splits the line at an invalid point instead of producing invalid JSON', () => {
    const json = encodeTrails(
      trails([
        1,
        [
          [72, 19, 0],
          [72.1, 19, 0],
          [NaN, 19, 0],
          [72.3, 19, 0],
          [72.4, 19, 0],
        ],
      ]),
      fakeMembers(2),
      null,
    );
    expect(JSON.parse(json).features).toHaveLength(2);
  });
});

describe('trailTipFrom', () => {
  it('finds the newest point of the selected friend’s last trail part', () => {
    const frame = trails(
      [
        1,
        [
          [72, 19, 1],
          [72.1, 19, 0],
        ],
      ],
      [
        2,
        [
          [73, 20, 0],
          [73.1, 20, 0],
        ],
      ],
      [
        1,
        [
          [74, 21, 0],
          [74.1, 21.1, 0],
        ],
      ],
    );
    expect(trailTipFrom(frame, 1)).toEqual([74.1, 21.1]);
    expect(trailTipFrom(frame, 3)).toBeNull();
    expect(trailTipFrom(frame, null)).toBeNull();
  });
});
