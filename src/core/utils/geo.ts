const EARTH_RADIUS_M = 6_371_000;
const RAD = Math.PI / 180;
const EQUATOR_M = 40_075_016.686;

/** Metres per screen point at a zoom and latitude (MapLibre: 512-point tiles). */
export function metersPerPoint(zoom: number, lat: number): number {
  return (EQUATOR_M * Math.cos(lat * RAD)) / (512 * 2 ** zoom);
}

/** Great-circle distance in metres. */
export function distanceMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLng = (lng2 - lng1) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from point 1 to point 2, degrees clockwise from north (0–360). */
export function bearingDeg(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const φ1 = lat1 * RAD;
  const φ2 = lat2 * RAD;
  const dλ = (lng2 - lng1) * RAD;
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/** Moves a point by metres east (dx) and north (dy). Accurate enough over a few kilometres. */
export function offsetMeters(lng: number, lat: number, dx: number, dy: number): [number, number] {
  const dLat = dy / (EARTH_RADIUS_M * RAD);
  const dLng = dx / (EARTH_RADIUS_M * RAD * Math.cos(lat * RAD));
  return [lng + dLng, lat + dLat];
}
