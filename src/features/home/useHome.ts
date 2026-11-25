import { useConnection, useManagers, useRows, useSelected } from '@common/di';
import type { RootStack } from '@common/navigation';
import { formatClock } from '@common/utils';
import { Presence } from '@core/models';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';

/** Data and actions for the Home screen. The only file in this feature that touches managers or navigation. */
export function useHome() {
  const { MapView, session } = useManagers();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const connection = useConnection();
  const selected = useSelected();
  const rows = useRows();
  const [listOpen, setListOpen] = useState(false);

  // Selection lives in the session: whoever selects (a pin tap, a list row), the sheet follows.
  useEffect(() => {
    if (selected !== null) navigation.navigate('Friend');
  }, [selected, navigation]);

  const live = rows.filter((r) => r.presence === Presence.Live).length;
  const asOf = formatClock(connection.sinceMs);
  return {
    MapView,
    title: session.title,
    summary: rows.length === 0 ? 'Waiting for friends…' : `${live} of ${rows.length} friends live`,
    connection: {
      kind: connection.kind,
      label:
        connection.kind === 'live'
          ? 'Live'
          : connection.kind === 'reconnecting'
            ? 'Reconnecting…'
            : `Offline${asOf ? ` · as of ${asOf}` : ''}`,
    },
    preview: rows
      .slice(0, 5)
      .map((r) => ({ id: r.id, initials: r.initials, colour: r.colour, presence: r.presence })),
    away: rows.length - live,
    live,
    // One bottom surface at a time: while a friend's sheet is open, the friends panel is hidden.
    showPanel: selected === null,
    listOpen,
    toggleList: () => setListOpen((open) => !open),
  };
}
