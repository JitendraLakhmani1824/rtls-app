import { useConnection, useManagers, useSelected } from '@common/di';
import type { RootStack } from '@common/navigation';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';

const CONNECTION_LABEL = { live: 'Live', reconnecting: 'Connecting…', offline: 'Offline' } as const;

/** Data and actions for the Home screen. The only file in this feature that touches managers or navigation. */
export function useHome() {
  const { MapView } = useManagers();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const connection = useConnection();
  const selected = useSelected();
  const [listOpen, setListOpen] = useState(false);

  // Selection lives in the session: whoever selects (a pin tap, a list row), the sheet follows.
  useEffect(() => {
    if (selected !== null) navigation.navigate('Friend');
  }, [selected, navigation]);

  return {
    MapView,
    connection: { kind: connection.kind, label: CONNECTION_LABEL[connection.kind] },
    // One bottom surface at a time: while a friend's sheet is open, the list panel is hidden.
    showPanel: selected === null,
    listOpen,
    toggleList: () => setListOpen((open) => !open),
  };
}
