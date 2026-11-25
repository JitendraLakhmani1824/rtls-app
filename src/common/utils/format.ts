import { Presence } from '@core/models';

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** "40 m", "350 m", "1.2 km", "12 km"; "—" when unknown. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters / 10) * 10 || Math.round(meters)} m`;
  return meters < 10_000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters / 1000)} km`;
}

/** Compass point for a bearing in degrees: "NE". Empty when unknown. */
export function formatDirection(bearingDeg: number): string {
  if (!Number.isFinite(bearingDeg)) return '';
  return COMPASS[Math.round((((bearingDeg % 360) + 360) % 360) / 45) % 8] ?? '';
}

/** "just now", "40 s ago", "3 min ago", "2 h ago"; "never" when unknown. */
export function formatAgo(ms: number): string {
  if (!Number.isFinite(ms)) return 'never';
  if (ms < 10_000) return 'just now';
  if (ms < 60_000) return `${Math.round(ms / 1000)} s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min ago`;
  return `${Math.round(ms / 3_600_000)} h ago`;
}

/** Words for a presence code — never colour alone. */
export function presenceLabel(presence: number): string {
  if (presence === Presence.Live) return 'Live';
  if (presence === Presence.Recent) return 'Recently';
  if (presence === Presence.Paused) return 'Paused sharing';
  return 'Last seen';
}

/** "walking", "running", "driving"; empty when still. Same classes as the sharing policy. */
export function formatMovement(speedMs: number): string {
  if (!(speedMs >= 0.5)) return '';
  if (speedMs < 2.5) return 'walking';
  return speedMs < 7 ? 'running' : 'driving';
}
