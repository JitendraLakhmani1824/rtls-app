import { useManagers, useRows } from '@common/di';
import { formatAgo, formatDirection, formatDistance, formatMovement } from '@common/utils';
import { Presence, type FriendRow } from '@core/models';

export type FriendItem = {
  id: number;
  name: string;
  initials: string;
  colour: string;
  presence: number;
  /** "Live · walking", "Last seen 10 min ago", "Paused sharing". */
  status: string;
  /** "350 m", or "" when unknown. */
  distance: string;
  /** "NE", or "". */
  direction: string;
  bearingDeg: number;
};

/** The friend list: mounted only while the panel is open. */
export function useFriendList() {
  const { session } = useManagers();
  const rows = useRows();
  return { items: rows.map(toItem), select: (id: number) => session.select(id) };
}

export function toItem(row: FriendRow): FriendItem {
  let status: string;
  if (row.presence === Presence.Live)
    status = ['Live', formatMovement(row.speedMs)].filter(Boolean).join(' · ');
  else if (row.presence === Presence.Recent) status = `Active ${formatAgo(row.silentMs)}`;
  else if (row.presence === Presence.Paused) status = 'Paused sharing';
  else status = `Last seen ${formatAgo(row.silentMs)}`;
  const known = Number.isFinite(row.distanceM);
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    colour: row.colour,
    presence: row.presence,
    status,
    distance: known ? formatDistance(row.distanceM) : '',
    direction: known ? formatDirection(row.bearingDeg) : '',
    bearingDeg: row.bearingDeg,
  };
}
