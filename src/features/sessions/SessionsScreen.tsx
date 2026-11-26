import { Avatar, colors, HeaderButton, ScreenHeader, TAB_BAR_SPACE } from '@common/ui';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSessions, type SessionCard } from './hooks/useSessions';
import { EmptySessions } from './views/EmptySessions';
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
      ...(card.canInvite ? [{ text: 'Invite people', onPress: () => s.invite(card.id) }] : []),
      { text: 'Leave session', style: 'destructive', onPress: () => confirmLeave(card) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  return (
    <View style={styles.fill}>
      <ScreenHeader
        title={s.greeting}
        subtitle="Live maps with your family and friends"
        left={
          <Pressable
            onPress={s.openProfile}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Your profile"
          >
            <Avatar initials={s.me.initials} colour={colors.muted} photo={s.me.photo} size={44} />
          </Pressable>
        }
        right={<HeaderButton label="+" onPress={s.create} a11y="New session" />}
      />
      <FlatList
        data={s.cards}
        keyExtractor={(card) => card.id}
        renderItem={({ item }) => <SessionCardView card={item} onOpen={s.open} onMore={more} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Gap}
        ListEmptyComponent={<EmptySessions onCreate={s.create} />}
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
  list: { paddingHorizontal: 16, paddingBottom: TAB_BAR_SPACE + 16 },
  gap: { height: 12 },
  hint: { fontSize: 13, color: colors.faint, textAlign: 'center', marginTop: 20 },
});
