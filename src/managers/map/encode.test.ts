import { fakeMembers } from '@testing/fakes';

import { encodeStill } from './encode';

const frame = (...pins: [number, number, number, number][]) => ({
  n: pins.length,
  buf: Float64Array.from(pins.flat()),
});

describe('encodeStill', () => {
  it('matches the expected GeoJSON exactly', () => {
    const json = encodeStill(frame([1, 72.5, 19.25, 0]), fakeMembers(2), null);
    expect(json).toBe(
      '{"type":"FeatureCollection","features":[{"type":"Feature","id":1,"properties":{"m":1,"c":"#334155","t":"F1","p":0,"s":0},"geometry":{"type":"Point","coordinates":[72.500000,19.250000]}}]}',
    );
  });

  it('skips a pin with an invalid coordinate instead of producing invalid JSON', () => {
    const json = encodeStill(frame([0, NaN, 19, 0], [1, 72, 19, 0]), fakeMembers(2), null);
    expect(JSON.parse(json).features).toHaveLength(1);
  });

  it('marks the selected pin', () => {
    const json = encodeStill(frame([0, 72, 19, 0], [1, 72, 19, 0]), fakeMembers(2), 1);
    const features = JSON.parse(json).features;
    expect(features.map((f: { properties: { s: number } }) => f.properties.s)).toEqual([0, 1]);
  });
});
