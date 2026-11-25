// M0 spike: number arrays → GeoJSON strings, built directly (no intermediate objects).
import { MOVER_COUNT, colourOf, initialsOf, moverPosition, type Trails } from './sim';

const FC_START = '{"type":"FeatureCollection","features":[';
const FC_END = ']}';

const fixed = (n: number) => n.toFixed(6);

function pointFeature(id: number, lng: number, lat: number) {
  return (
    '{"type":"Feature","id":' +
    id +
    ',"properties":{"m":' +
    id +
    ',"c":"' +
    colourOf(id) +
    '","t":"' +
    initialsOf(id) +
    '"}' +
    ',"geometry":{"type":"Point","coordinates":[' +
    fixed(lng) +
    ',' +
    fixed(lat) +
    ']}}'
  );
}

/** Still friends. Member ids start after the movers so ids never collide. */
export function encodeStill(still: Float64Array): string {
  let s = FC_START;
  for (let i = 0; i < still.length; i += 2) {
    if (i > 0) s += ',';
    s += pointFeature(MOVER_COUNT + i / 2, still[i] as number, still[i + 1] as number);
  }
  return s + FC_END;
}

/** Movers at time tSec (JS-thread version). */
export function encodeMovers(movers: number[], tSec: number): string {
  const p = [0, 0];
  let s = FC_START;
  for (let i = 0; i < MOVER_COUNT; i++) {
    moverPosition(movers, i, tSec, p);
    if (i > 0) s += ',';
    s += pointFeature(i, p[0] as number, p[1] as number);
  }
  return s + FC_END;
}

export function encodeTrails(trails: Trails): string {
  let s = FC_START;
  let first = true;
  for (let m = 0; m < MOVER_COUNT; m++) {
    if ((trails.length[m] as number) < 2) continue;
    if (!first) s += ',';
    first = false;
    s +=
      '{"type":"Feature","id":' +
      m +
      ',"properties":{"c":"' +
      colourOf(m) +
      '"},"geometry":{"type":"LineString","coordinates":[';
    let firstPoint = true;
    trails.forEach(m, (lng, lat) => {
      if (!firstPoint) s += ',';
      firstPoint = false;
      s += '[' + fixed(lng) + ',' + fixed(lat) + ']';
    });
    s += ']}}';
  }
  return s + FC_END;
}

/** Selected mover: last trail point → current position, so the trail stays attached to the gliding pin. */
export function encodeTip(from: [number, number] | null, to: number[], member: number): string {
  if (!from) return FC_START + FC_END;
  return (
    FC_START +
    '{"type":"Feature","properties":{"c":"' +
    colourOf(member) +
    '"},"geometry":{"type":"LineString","coordinates":[[' +
    fixed(from[0]) +
    ',' +
    fixed(from[1]) +
    '],[' +
    fixed(to[0] as number) +
    ',' +
    fixed(to[1] as number) +
    ']]}}' +
    FC_END
  );
}

export const EMPTY_FC = FC_START + FC_END;
