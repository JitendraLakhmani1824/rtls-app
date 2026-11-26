import { colors, HeaderButton, PrimaryButton, ScreenHeader } from '@common/ui';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { useSessions, type SessionCard } from './useSessions';
import { SessionCardView } from './views/SessionCardView';

/** Your sessions, newest first. */
export function SessionsScreen() {
  const s = useSessions();
  const confirmLeave = (card: SessionCard) =>
    Alert.alert(`Leave “${card.title}”?`, 'You’ll stop seeing everyone in it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => s.leave(card.id) },
    ]);
  const more = (card: SessionCard) =>
    Alert.alert(card.title, undefined, [
      { text: 'Invite people', onPress: () => s.invite(card.id) },
      { text: 'Leave session', style: 'destructive', onPress: () => confirmLeave(card) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  return (
    <View style={styles.fill}>
      <ScreenHeader
        title="Sessions"
        subtitle="Live maps with your family and friends"
        right={<HeaderButton label="+" onPress={s.create} a11y="New session" />}
      />
      <FlatList
        data={s.cards}
        keyExtractor={(card) => card.id}
        renderItem={({ item }) => <SessionCardView card={item} onOpen={s.open} onMore={more} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Gap}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyText}>
              Start one for an event and pick who’s coming, or open an invite link.
            </Text>
            <PrimaryButton label="New session" onPress={s.create} />
          </View>
        }
        ListFooterComponent={
          s.cards.length > 0 ? (
            <Text style={styles.hint}>Got an invite link? Open it on this phone to join.</Text>
          ) : undefined
        }
      />
    </View>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  gap: { height: 12 },
  empty: { paddingTop: 40, paddingHorizontal: 8, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 12 },
  hint: { fontSize: 13, color: colors.faint, textAlign: 'center', marginTop: 20 },
});
