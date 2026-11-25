// Number frames → GeoJSON strings, built directly (no intermediate objects). Pure; golden-tested.
import { PIN_STRIDE, type Member, type PinFrame } from '@core/models';

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
