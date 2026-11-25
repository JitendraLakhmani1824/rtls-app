import { useManagers, useRows, useSelected } from '@common/di';
import type { RootStack } from '@common/navigation';
import {
  formatAgo,
  formatDirection,
  formatDistance,
  formatMovement,
  presenceLabel,
} from '@common/utils';
import { Presence } from '@core/models';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';

/**
 * The selected friend's sheet. The route has no params: the selection lives in the session.
 * Selection cleared elsewhere → the sheet closes; the sheet dismissed → the selection is cleared.
 */
export function useDetail() {
  const { session } = useManagers();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const selected = useSelected();
  const row = useRows().find((r) => r.id === selected);

  useEffect(() => {
    if (selected === null && navigation.canGoBack()) navigation.goBack();
  }, [selected, navigation]);
  useEffect(
    () => navigation.addListener('beforeRemove', () => session.select(null)),
    [navigation, session],
  );

  if (!row) return { friend: null, close: () => navigation.goBack() };
  const known = Number.isFinite(row.distanceM);
  const movement = formatMovement(row.speedMs);
  return {
    friend: {
      name: row.name,
      initials: row.initials,
      colour: row.colour,
      presence: row.presence,
      /** Chip text: "Live", "Active 2 min ago", "Last seen 10 min ago", "Paused sharing". */
      status:
        row.presence === Presence.Live
          ? 'Live'
          : row.presence === Presence.Recent
            ? `Active ${formatAgo(row.silentMs)}`
            : row.presence === Presence.Paused
              ? presenceLabel(row.presence)
              : `${presenceLabel(row.presence)} ${formatAgo(row.silentMs)}`,
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
  };
}
