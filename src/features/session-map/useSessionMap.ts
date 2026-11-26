import { useConnection, useManagers, useRows, useSelected } from '@common/di';
import type { RootStack } from '@common/navigation';
import { EVENTS } from '@common/ui';
import { formatClock, inviteMessage } from '@common/utils';
import { Presence } from '@core/models';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Share } from 'react-native';

/**
 * A session's live map. The session runs while this screen is open (on top, or under its friend
 * sheet or a page pushed over it) and stops when it closes. The only file in this feature that
 * touches managers or navigation.
 */
export function useSessionMap() {
  const { sessions, live } = useManagers();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const { id, focus } = useRoute<RouteProp<RootStack, 'SessionMap'>>().params;
  const view = live.view(id);
  const session = view?.session ?? null;
  const record = sessions.get(id);

  useFocusEffect(
    useCallback(() => {
      live.open(id); // again after another session's map was opened on top of this one
    }, [live, id]),
  );
  useEffect(() => () => live.close(id), [live, id]);

  const connection = useConnection(session);
  const selected = useSelected(session);
  const rows = useRows(session);
  const [listOpen, setListOpen] = useState(false);

  // Selection lives in the session: whoever selects (a pin tap, a list row), the sheet follows.
  useEffect(() => {
    if (selected !== null) navigation.navigate('Friend');
  }, [selected, navigation]);

  // Opened to show someone (from their page): select them once the map has them.
  const focusId = focus ? rows.find((r) => r.key === focus)?.id : undefined;
  useEffect(() => {
    if (focusId === undefined || !session) return;
    session.select(focusId);
    navigation.setParams({ focus: undefined });
  }, [focusId, session, navigation]);

  const live_ = rows.filter((r) => r.presence === Presence.Live).length;
  const asOf = formatClock(connection.sinceMs);
  const title = record?.title ?? session?.title ?? 'Session';
  return {
    MapView: view?.MapView ?? null,
    title,
    icon: record ? EVENTS[record.event].icon : '',
    summary: rows.length === 0 ? 'Waiting for friends…' : `${live_} of ${rows.length} friends live`,
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
    away: rows.length - live_,
    live: live_,
    session,
    // One bottom surface at a time: while a friend's sheet is open, the friends panel is hidden.
    showPanel: selected === null,
    listOpen,
    toggleList: () => setListOpen((open) => !open),
    /** Saved sessions can invite; a measurement scenario can't. */
    canInvite: record !== undefined,
    invite: () => {
      const url = sessions.inviteUrl(id);
      if (!url) return;
      void Share.share({ message: inviteMessage(sessions.myName.get(), title, url) });
    },
    back: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs')),
  };
}
