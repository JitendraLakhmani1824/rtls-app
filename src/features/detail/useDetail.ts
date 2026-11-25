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

  return {
    friend: row
      ? {
          name: row.name,
          initials: row.initials,
          colour: row.colour,
          status:
            row.presence === Presence.Live
              ? `Live · updated ${formatAgo(row.silentMs)}`
              : row.presence === Presence.Paused
                ? presenceLabel(row.presence)
                : `${presenceLabel(row.presence)} ${formatAgo(row.silentMs)}`,
          where: Number.isFinite(row.distanceM)
            ? `${formatDistance(row.distanceM)} ${formatDirection(row.bearingDeg)} of you`.replace(
                '  ',
                ' ',
              )
            : 'Location not known yet',
          movement: formatMovement(row.speedMs),
        }
      : null,
    close: () => navigation.goBack(),
  };
}
