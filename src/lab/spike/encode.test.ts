import { encodeStill, encodeTip, EMPTY_FC } from './encode';

describe('spike encode', () => {
  it('builds valid GeoJSON for still friends with ids after the movers', () => {
    const fc = JSON.parse(encodeStill(new Float64Array([72.1, 19.2, 72.3, 19.4])));
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].id).toBe(30);
    expect(fc.features[1].geometry.coordinates).toEqual([72.3, 19.4]);
  });

  it('returns an empty collection when there is no trail point to attach the tip to', () => {
    expect(encodeTip(null, [72, 19], 0)).toBe(EMPTY_FC);
  });

  it('draws the tip from the last trail point to the current position', () => {
    const fc = JSON.parse(encodeTip([72, 19], [72.001, 19.001], 3));
    expect(fc.features[0].geometry.coordinates).toEqual([
      [72, 19],
      [72.001, 19.001],
    ]);
  });
});
