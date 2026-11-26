import { Chevron, colors, PrimaryButton, radius, shadow } from '@common/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSessionMap } from './useSessionMap';
import { FriendList } from './views/FriendList';
import { FriendsPanel } from './views/FriendsPanel';

const CONNECTION_COLORS = {
  live: { color: colors.live, soft: colors.liveSoft },
  reconnecting: { color: colors.recent, soft: colors.recentSoft },
  offline: { color: colors.danger, soft: colors.dangerSoft },
} as const;

/** A session's live map: back, a title card with the connection state, invite, and the friends panel. */
export function SessionMapScreen() {
  const home = useSessionMap();
  const insets = useSafeAreaInsets();
  const tone = CONNECTION_COLORS[home.connection.kind];
  const { MapView, session } = home;
  if (!MapView || !session) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.missingTitle}>This session isn’t on this phone</Text>
        <Text style={styles.missingText}>It may have been left. Ask for a new invite link.</Text>
        <PrimaryButton label="Back to sessions" onPress={home.back} />
      </View>
    );
  }
  return (
    <View style={styles.fill}>
      <MapView />
      <View pointerEvents="box-none" style={[styles.top, { top: insets.top + 8 }]}>
        <Pressable
          onPress={home.back}
          hitSlop={8}
          style={({ pressed }) => [styles.square, shadow, pressed && styles.squarePressed]}
          accessibilityRole="button"
          accessibilityLabel="Back to sessions"
        >
          <Chevron color={colors.ink} size={11} />
        </Pressable>
        <View style={[styles.card, shadow]}>
          <View style={styles.cardText}>
            <Text style={styles.title} numberOfLines={1}>
              {home.icon ? `${home.icon} ` : ''}
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
        {home.canInvite && (
          <Pressable
            onPress={home.invite}
            style={({ pressed }) => [styles.square, shadow, pressed && styles.squarePressed]}
            accessibilityRole="button"
            accessibilityLabel="Invite people to this session"
          >
            <Text style={styles.inviteText}>Invite</Text>
          </Pressable>
        )}
      </View>
      {home.showPanel && (
        <FriendsPanel
          open={home.listOpen}
          onToggle={home.toggleList}
          live={home.live}
          away={home.away}
          preview={home.preview}
        >
          <FriendList session={session} />
        </FriendsPanel>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', gap: 8 },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
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
  square: {
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squarePressed: { backgroundColor: colors.subtle },
  inviteText: { fontSize: 15, fontWeight: '700', color: colors.accent },
  missing: { flex: 1, backgroundColor: colors.page, paddingHorizontal: 24, gap: 12 },
  missingTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  missingText: { fontSize: 15, color: colors.muted, marginBottom: 12 },
});
