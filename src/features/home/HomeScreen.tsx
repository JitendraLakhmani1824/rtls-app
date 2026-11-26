import { colors, radius, shadow } from '@common/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHome } from './useHome';
import { FriendList } from './views/FriendList';
import { FriendsPanel } from './views/FriendsPanel';

const CONNECTION_COLORS = {
  live: { color: colors.live, soft: colors.liveSoft },
  reconnecting: { color: colors.recent, soft: colors.recentSoft },
  offline: { color: colors.danger, soft: colors.dangerSoft },
} as const;

/** The live map, a title card with the connection state, and the friends panel. */
export function HomeScreen() {
  const home = useHome();
  const insets = useSafeAreaInsets();
  const tone = CONNECTION_COLORS[home.connection.kind];
  const { MapView } = home;
  return (
    <View style={styles.fill}>
      <MapView />
      <View pointerEvents="box-none" style={[styles.top, { top: insets.top + 8 }]}>
        <View style={[styles.card, shadow]}>
          <View style={styles.cardText}>
            <Text style={styles.title} numberOfLines={1}>
              {home.title}
            </Text>
            <Text style={styles.summary} numberOfLines={1}>
              {home.summary}
            </Text>
          </View>
          <View
            style={[styles.pill, { backgroundColor: tone.soft }]}
            accessibilityLabel={`Connection: ${home.connection.label}`}
          >
            <View style={[styles.pillDot, { backgroundColor: tone.color }]} />
            <Text style={[styles.pillText, { color: tone.color }]}>{home.connection.label}</Text>
          </View>
        </View>
        <Pressable
          onPress={home.leave}
          style={({ pressed }) => [styles.leave, shadow, pressed && styles.leavePressed]}
          accessibilityRole="button"
          accessibilityLabel="Leave session"
        >
          <Text style={styles.leaveText}>Leave</Text>
        </Pressable>
      </View>
      {home.showPanel && (
        <FriendsPanel
          open={home.listOpen}
          onToggle={home.toggleList}
          live={home.live}
          away={home.away}
          preview={home.preview}
        >
          <FriendList />
        </FriendsPanel>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', gap: 10 },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  cardText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink },
  summary: { fontSize: 13, color: colors.muted, marginTop: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 13, fontWeight: '700' },
  leave: {
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leavePressed: { backgroundColor: colors.subtle },
  leaveText: { fontSize: 15, fontWeight: '700', color: colors.danger },
});
