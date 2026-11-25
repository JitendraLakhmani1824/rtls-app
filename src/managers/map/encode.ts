// Number frames → GeoJSON strings, built directly (no intermediate objects). Pure; golden-tested.
import {
  PIN_STRIDE,
  TRAIL_STRIDE,
  type Member,
  type PinFrame,
  type TrailFrame,
} from '@core/models';
import { metersPerPoint } from '@core/utils';

export const EMPTY_FC = '{"type":"FeatureCollection","features":[]}';

const fixed = (n: number) => n.toFixed(6);

/** A halo radius in metres → points at zoom 0 (the layer doubles it per zoom level); 0 for none. */
export function haloPoints(haloM: number, lat: number): number {
  const h = haloM / metersPerPoint(0, lat);
  return h > 0 && Number.isFinite(h) ? h : 0;
}

/** My own position: one point, with the accuracy halo (h, points at zoom 0) when the fix is poor. */
export function encodeMe(lng: number, lat: number, haloM: number): string {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return EMPTY_FC;
  const h = haloPoints(haloM, lat);
  return (
    '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{' +
    (h > 0 ? '"h":' + h.toFixed(9) : '') +
    '},"geometry":{"type":"Point","coordinates":[' +
    fixed(lng) +
    ',' +
    fixed(lat) +
    ']}}]}'
  );
}

/**
 * Still pins (everyone but me). Properties: m (member), c (colour), t (initials), n (name),
 * p (presence), and h — the accuracy
 * halo's radius in points at zoom 0 (the layer doubles it per zoom level), only for poor fixes.
 * Selection is not encoded: it is feature state, so tapping a pin re-sends no data.
 */
export function encodeStill(frame: PinFrame, members: Member[]): string {
  const encoder = new StillEncoder();
  encoder.setMembers(members);
  return encoder.encode(frame);
}

/**
 * `encodeStill` with a cache per member: a pin whose numbers didn't change reuses its JSON from
 * last time, so each update encodes only the friends who changed — less work, far less garbage.
 */
export class StillEncoder {
  private members: Member[] = [];
  private pieces: string[] = [];
  private keys = new Float64Array(0); // per member: lng, lat, presence, halo of the cached piece
  private readonly parts: string[] = [];

  setMembers(members: Member[]) {
    this.members = members;
    this.pieces = new Array<string>(members.length).fill('');
    this.keys = new Float64Array(members.length * 4).fill(NaN);
  }

  encode(frame: PinFrame): string {
    const parts = this.parts;
    parts.length = 0;
    for (let i = 0; i < frame.n; i++) {
      const o = i * PIN_STRIDE;
      const m = frame.buf[o] ?? -1;
      const lng = frame.buf[o + 1] ?? NaN;
      const lat = frame.buf[o + 2] ?? NaN;
      const presence = frame.buf[o + 3] ?? 0;
      const halo = frame.buf[o + 4] ?? 0;
      const member = this.members[m];
      // One NaN would make the whole string invalid JSON and blank the layer: skip the pin instead.
      // Me is drawn by its own layer (encodeMe), never grouped with friends.
      if (!member || member.isMe || !Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      const k = m * 4;
      const keys = this.keys;
      if (
        keys[k] !== lng ||
        keys[k + 1] !== lat ||
        keys[k + 2] !== presence ||
        keys[k + 3] !== halo
      ) {
        this.pieces[m] = stillFeature(m, member, lng, lat, presence, haloPoints(halo, lat));
        keys[k] = lng;
        keys[k + 1] = lat;
        keys[k + 2] = presence;
        keys[k + 3] = halo;
      }
      parts.push(this.pieces[m] ?? '');
    }
    return '{"type":"FeatureCollection","features":[' + parts.join(',') + ']}';
  }
}

function stillFeature(
  m: number,
  member: Member,
  lng: number,
  lat: number,
  presence: number,
  halo: number,
): string {
  return (
    '{"type":"Feature","id":' +
    m +
    ',"properties":{"m":' +
    m +
    ',"c":"' +
    member.colour +
    '","t":' +
    JSON.stringify(member.initials) +
    ',"n":' +
    JSON.stringify(member.name) +
    ',"p":' +
    presence +
    (halo > 0 ? ',"h":' + halo.toFixed(9) : '') +
    '},"geometry":{"type":"Point","coordinates":[' +
    fixed(lng) +
    ',' +
    fixed(lat) +
    ']}}'
  );
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
