import { Avatar, Chevron, colors, radius } from '@common/ui';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SessionCard } from '../hooks/useSessions';

/** One session: what it is, who's in it. Tap to open its map; ••• for invite and leave. */
export const SessionCardView = memo(function SessionCardView({
  card,
  onOpen,
  onMore,
}: {
  card: SessionCard;
  onOpen: (id: string) => void;
  onMore: (card: SessionCard) => void;
}) {
  return (
    <Pressable
      onPress={() => onOpen(card.id)}
      onLongPress={() => onMore(card)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${card.detail}. Opens the live map.`}
      accessibilityActions={[{ name: 'longpress', label: 'Invite or leave' }]}
      onAccessibilityAction={() => onMore(card)}
    >
      <View style={styles.top}>
        <View style={styles.icon}>
          <Text style={styles.emoji}>{card.icon}</Text>
        </View>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {card.title}
          </Text>
          <Text style={styles.detail}>{card.detail}</Text>
        </View>
        <Pressable
          onPress={() => onMore(card)}
          hitSlop={10}
          style={styles.more}
          accessibilityRole="button"
          accessibilityLabel={`More for ${card.title}`}
        >
          <Text style={styles.moreText}>•••</Text>
        </Pressable>
      </View>
      <View style={styles.bottom}>
        <View style={styles.avatars}>
          {card.avatars.map((a, i) => (
            <View key={a.key} style={[styles.ring, i > 0 && styles.overlap]}>
              <Avatar initials={a.initials} colour={a.colour} size={32} />
            </View>
          ))}
          {card.more > 0 && (
            <View style={[styles.ring, styles.overlap, styles.moreCount]}>
              <Text style={styles.moreCountText}>+{card.more}</Text>
            </View>
          )}
        </View>
        <View style={styles.open}>
          <Text style={styles.openText}>Open map</Text>
          <Chevron color={colors.accentInk} size={7} direction="right" />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 14,
  },
  pressed: { backgroundColor: colors.subtle },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  text: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  detail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  more: { paddingHorizontal: 4, paddingVertical: 6 },
  moreText: { fontSize: 14, color: colors.faint, letterSpacing: 1 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  ring: { borderRadius: 18, borderWidth: 2, borderColor: colors.surface },
  overlap: { marginLeft: -6 },
  moreCount: {
    width: 36,
    height: 36,
    backgroundColor: colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCountText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  open: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  openText: { fontSize: 14, fontWeight: '600', color: colors.accentInk },
});
