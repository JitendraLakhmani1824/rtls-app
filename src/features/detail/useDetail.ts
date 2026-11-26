import { useLive, useRows, useSelected } from '@common/di';
import type { RootStack } from '@common/navigation';
import {
  formatAgo,
  formatDirection,
  formatDistance,
  formatMovement,
  statusText,
} from '@common/utils';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';

/**
 * The selected friend's sheet. The route has no params: the selection lives in the session.
 * Selection cleared elsewhere → the sheet closes; the sheet dismissed → the selection is cleared.
 */
export function useDetail() {
  const session = useLive()?.session ?? null;
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const selected = useSelected(session);
  const row = useRows(session).find((r) => r.id === selected);

  useEffect(() => {
    if (selected === null && navigation.canGoBack()) navigation.goBack();
  }, [selected, navigation]);
  useEffect(
    () => navigation.addListener('beforeRemove', () => session?.select(null)),
    [navigation, session],
  );

  if (!row) return { friend: null, close: () => navigation.goBack(), details: () => {} };
  const known = Number.isFinite(row.distanceM);
  const movement = formatMovement(row.speedMs);
  return {
    friend: {
      name: row.name,
      initials: row.initials,
      colour: row.colour,
      presence: row.presence,
      /** Chip text: "Live", "Active 2 min ago", "Last seen 10 min ago", "Paused sharing". */
      status: statusText(row.presence, row.silentMs),
      updated: `Updated ${formatAgo(row.silentMs)}`,
      distance: known ? formatDistance(row.distanceM) : '—',
      direction: known ? formatDirection(row.bearingDeg) : '—',
      bearingDeg: row.bearingDeg,
      movement: movement ? movement[0]?.toUpperCase() + movement.slice(1) : 'Still',
      /** One line for screen readers and the summary under the name. */
      where: known
        ? `${formatDistance(row.distanceM)} ${formatDirection(row.bearingDeg)} of you`
        : 'Location not known yet',
    },
    close: () => navigation.goBack(),
    /** Their full page. The sheet closes first: never a sheet over a sheet. */
    details: () => {
      navigation.goBack();
      navigation.navigate('Person', { key: row.key });
    },
  };
}
