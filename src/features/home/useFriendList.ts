import { useManagers, useRows } from '@common/di';
import {
  formatAgo,
  formatDirection,
  formatDistance,
  formatMovement,
  presenceLabel,
} from '@common/utils';
import { Presence, type FriendRow } from '@core/models';

export type FriendItem = {
  id: number;
  name: string;
  initials: string;
  colour: string;
  detail: string;
  dimmed: boolean;
};

/**
 * The friend list. Used only by the list itself, which mounts only while the panel is open — so the
 * session computes rows only while someone can see them.
 */
export function useFriendList() {
  const { session } = useManagers();
  const rows = useRows();
  return {
    items: rows.map(toItem),
    select: (id: number) => session.select(id),
  };
}

export function toItem(row: FriendRow): FriendItem {
  const where = Number.isFinite(row.distanceM)
    ? `${formatDistance(row.distanceM)} ${formatDirection(row.bearingDeg)}`.trim()
    : '';
  let detail: string;
  if (row.presence === Presence.Paused) detail = presenceLabel(row.presence);
  else if (row.presence === Presence.Live)
    detail = [presenceLabel(row.presence), where, formatMovement(row.speedMs)]
      .filter(Boolean)
      .join(' · ');
  else
    detail = [`${presenceLabel(row.presence)} ${formatAgo(row.silentMs)}`, where]
      .filter(Boolean)
      .join(' · ');
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    colour: row.colour,
    detail,
    dimmed: row.presence !== Presence.Live,
  };
}
