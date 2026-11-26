import { useLiveRow, useManagers, usePeople, useSessionList } from '@common/di';
import type { RootStack } from '@common/navigation';
import { colors, EVENTS } from '@common/ui';
import {
  formatAgo,
  formatDirection,
  formatDistance,
  formatMovement,
  formatPeople,
  formatSpeed,
  statusText,
} from '@common/utils';
import { colourFor, initialsOf } from '@core/utils';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * A person's page: who they are, where they are now if they're on the open map, and the sessions
 * you share. Live numbers re-render at most once a second, and only while a map is open.
 */
export function usePerson() {
  const { sessions, live } = useManagers();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { key } = useRoute<RouteProp<RootStack, 'Person'>>().params;
  const person = usePeople().find((p) => p.key === key);
  const list = useSessionList();
  const now = useLiveRow(key);

  const name = person?.name ?? now?.row.name ?? 'Unknown';
  const row = now?.row;
  const known = row !== undefined && Number.isFinite(row.distanceM);
  const movement = row ? formatMovement(row.speedMs) : '';

  const openMap = (id: string) => {
    // The open map is under this page: go back to it. Another session: open its map on top.
    if (live.current.get()?.id === id) navigation.popTo('SessionMap', { id, focus: key });
    else navigation.push('SessionMap', { id, focus: key });
  };

  return {
    name,
    initials: person ? initialsOf(person.name) : (row?.initials ?? '?'),
    colour: person ? colourFor(person.key) : (row?.colour ?? colors.faint),
    circle: person ? (person.circle === 'family' ? 'Family' : 'Friend') : '',
    live:
      now && row
        ? {
            where: sessions.get(now.view.id)?.title ?? now.view.session.title,
            presence: row.presence,
            status: statusText(row.presence, row.silentMs),
            distance: known ? formatDistance(row.distanceM) : '—',
            direction: known ? formatDirection(row.bearingDeg) : '—',
            bearingDeg: row.bearingDeg,
            speed: formatSpeed(row.speedMs) || 'Still',
            movement: movement ? movement[0]?.toUpperCase() + movement.slice(1) : 'Not moving',
            covered: formatDistance(row.coveredM),
            updated: `Updated ${formatAgo(row.silentMs)}`,
          }
        : null,
    together: list
      .filter((s) => s.people.some((p) => p.key === key))
      .map((s) => ({
        id: s.id,
        title: s.title,
        icon: EVENTS[s.event].icon,
        detail: `${EVENTS[s.event].name} · ${formatPeople(s.people.length)}`,
      })),
    showOnMap: () => now && openMap(now.view.id),
    openSession: openMap,
    canStartWith: person !== undefined,
    startWith: () => navigation.navigate('NewSession', { with: key }),
    back: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs')),
  };
}

/** Their live numbers, while they're on the open map. */
export type PersonLive = NonNullable<ReturnType<typeof usePerson>['live']>;
/** A session you share with them. */
export type SharedSession = ReturnType<typeof usePerson>['together'][number];
