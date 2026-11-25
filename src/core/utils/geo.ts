const EARTH_RADIUS_M = 6_371_000;
const RAD = Math.PI / 180;

/** Great-circle distance in metres. */
export function distanceMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLng = (lng2 - lng1) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Moves a point by metres east (dx) and north (dy). Accurate enough over a few kilometres. */
export function offsetMeters(lng: number, lat: number, dx: number, dy: number): [number, number] {
  const dLat = dy / (EARTH_RADIUS_M * RAD);
  const dLng = dx / (EARTH_RADIUS_M * RAD * Math.cos(lat * RAD));
  return [lng + dLng, lat + dLat];
}
