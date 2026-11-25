// Number frames → GeoJSON strings, built directly (no intermediate objects). Pure; golden-tested.
import {
  PIN_STRIDE,
  TRAIL_STRIDE,
  type Member,
  type PinFrame,
  type TrailFrame,
} from '@core/models';

export const EMPTY_FC = '{"type":"FeatureCollection","features":[]}';

const fixed = (n: number) => n.toFixed(6);

/** Still pins. Properties: m (member), c (colour), t (initials), p (presence), s (1 if selected). */
export function encodeStill(frame: PinFrame, members: Member[], selected: number | null): string {
  let s = '{"type":"FeatureCollection","features":[';
  let first = true;
  for (let i = 0; i < frame.n; i++) {
    const o = i * PIN_STRIDE;
    const m = frame.buf[o] ?? -1;
    const lng = frame.buf[o + 1] ?? NaN;
    const lat = frame.buf[o + 2] ?? NaN;
    const member = members[m];
    // One NaN would make the whole string invalid JSON and blank the layer: skip the pin instead.
    if (!member || !Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (!first) s += ',';
    first = false;
    s +=
      '{"type":"Feature","id":' +
      m +
      ',"properties":{"m":' +
      m +
      ',"c":"' +
      member.colour +
      '","t":"' +
      member.initials +
      '","p":' +
      (frame.buf[o + 3] ?? 0) +
      ',"s":' +
      (m === selected ? 1 : 0) +
      '},"geometry":{"type":"Point","coordinates":[' +
      fixed(lng) +
      ',' +
      fixed(lat) +
      ']}}';
  }
  return s + ']}';
}

/**
 * Trails. Each part becomes one LineString per run of points with the same age bucket; a run ends on the
 * next run's first point, so the line stays joined. Properties: m (member), c (colour),
 * a (age bucket, 0 newest … 3 oldest), s (1 if selected). Non-finite points split the line.
 */
export function encodeTrails(
  frame: TrailFrame,
  members: Member[],
  selected: number | null,
): string {
  let s = '{"type":"FeatureCollection","features":[';
  let first = true;
  for (let i = 0; i < frame.n; i++) {
    const m = frame.members[i] ?? -1;
    const member = members[m];
    if (!member) continue;
    const head =
      ',"properties":{"m":' + m + ',"c":"' + member.colour + '","s":' + (m === selected ? 1 : 0);
    let coords = '';
    let points = 0;
    let age = -1;
    const flush = () => {
      if (points >= 2) {
        if (!first) s += ',';
        first = false;
        s +=
          '{"type":"Feature"' +
          head +
          ',"a":' +
          age +
          '},"geometry":{"type":"LineString","coordinates":[' +
          coords +
          ']}}';
      }
      coords = '';
      points = 0;
    };
    const end = frame.offsets[i + 1] ?? 0;
    for (let p = frame.offsets[i] ?? 0; p < end; p++) {
      const o = p * TRAIL_STRIDE;
      const lng = frame.coords[o] ?? NaN;
      const lat = frame.coords[o + 1] ?? NaN;
      const a = frame.coords[o + 2] ?? 0;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        flush();
        continue;
      }
      const point = '[' + fixed(lng) + ',' + fixed(lat) + ']';
      if (points > 0 && a !== age) {
        coords += ',' + point; // close this run on the next run's first point
        points++;
        flush();
      }
      if (points === 0) age = a;
      coords += (points > 0 ? ',' : '') + point;
      points++;
    }
    flush();
  }
  return s + ']}';
}

/** The selected member's newest trail point, or null when it has no trail. */
export function trailTipFrom(frame: TrailFrame, selected: number | null): [number, number] | null {
  if (selected === null) return null;
  for (let i = frame.n - 1; i >= 0; i--) {
    if (frame.members[i] !== selected) continue;
    const o = ((frame.offsets[i + 1] ?? 0) - 1) * TRAIL_STRIDE;
    const lng = frame.coords[o] ?? NaN;
    const lat = frame.coords[o + 1] ?? NaN;
    return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
  }
  return null;
}
