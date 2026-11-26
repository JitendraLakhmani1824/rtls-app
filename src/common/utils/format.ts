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

/** "14:05" — a time of day, for "positions as of 14:05". */
export function formatClock(epochMs: number): string {
  if (!Number.isFinite(epochMs) || epochMs <= 0) return '';
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "12 km/h"; '' when still. */
export function formatSpeed(speedMs: number): string {
  if (!(speedMs >= 0.5)) return '';
  return `${Math.round(speedMs * 3.6)} km/h`;
}

/** "5 people" — everyone in a session, you included. */
export function formatPeople(count: number): string {
  return `${count} ${count === 1 ? 'person' : 'people'}`;
}

/** The text an invite is shared with. */
export function inviteMessage(from: string, title: string, url: string): string {
  const who = from ? `${from} invited you` : 'You’re invited';
  return `${who} to “${title}” on RTLS — see each other live on the map.\n${url}`;
}

/** A friend's status chip: "Live", "Active 2 min ago", "Last seen 10 min ago", "Paused sharing". */
export function statusText(presence: number, silentMs: number): string {
  if (presence === Presence.Live) return 'Live';
  if (presence === Presence.Recent) return `Active ${formatAgo(silentMs)}`;
  if (presence === Presence.Paused) return presenceLabel(presence);
  return `${presenceLabel(presence)} ${formatAgo(silentMs)}`;
}
