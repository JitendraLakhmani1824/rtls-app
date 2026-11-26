import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';

import type { Session } from '@core/protocols';

import { useFriendList } from './hooks/useFriendList';
import { useSessionMap } from './hooks/useSessionMap';
import { FriendList } from './views/FriendList';
import { FriendsPanel } from './views/FriendsPanel';
import { MissingSession } from './views/MissingSession';
import { TitleBar } from './views/TitleBar';

/** A session's live map: the title bar over it, and the friends panel (or a friend's sheet). */
export function SessionMapScreen() {
  const home = useSessionMap();
  const insets = useSafeAreaInsets();
  const { MapView, session } = home;
  if (!MapView || !session) return <MissingSession onBack={home.back} />;
  return (
    <View style={styles.fill}>
      <MapView />
      <TitleBar
        top={insets.top + 8}
        icon={home.icon}
        title={home.title}
        summary={home.summary}
        connection={home.connection}
        canInvite={home.canInvite}
        onBack={home.back}
        onInvite={home.invite}
      />
      {home.showPanel && (
        <FriendsPanel
          open={home.listOpen}
          onToggle={home.toggleList}
          live={home.live}
          away={home.away}
          preview={home.preview}
        >
          <LiveFriendList session={session} />
        </FriendsPanel>
      )}
    </View>
  );
}

/** Mounted only while the panel is open, so the list's rows are worked out only then. */
function LiveFriendList({ session }: { session: Session }) {
  const { items, select } = useFriendList(session);
  return <FriendList items={items} onSelect={select} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
