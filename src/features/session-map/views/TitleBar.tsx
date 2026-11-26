import { Chevron, colors, radius, shadow } from '@common/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const CONNECTION_COLORS = {
  live: { color: colors.live, soft: colors.liveSoft },
  reconnecting: { color: colors.recent, soft: colors.recentSoft },
  offline: { color: colors.danger, soft: colors.dangerSoft },
} as const;

/** Over the map: Back, the session's title card with its connection state, and Invite. */
export function TitleBar({
  top,
  icon,
  title,
  summary,
  connection,
  canInvite,
  onBack,
  onInvite,
}: {
  top: number;
  icon: string;
  title: string;
  summary: string;
  connection: { kind: keyof typeof CONNECTION_COLORS; label: string };
  canInvite: boolean;
  onBack: () => void;
  onInvite: () => void;
}) {
  const tone = CONNECTION_COLORS[connection.kind];
  return (
    <View pointerEvents="box-none" style={[styles.top, { top }]}>
      <Pressable
        onPress={onBack}
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
            {icon ? `${icon} ` : ''}
            {title}
          </Text>
          <Text style={styles.summary} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <View
          style={[styles.pill, { backgroundColor: tone.soft }]}
          accessibilityLabel={`Connection: ${connection.label}`}
        >
          <View style={[styles.pillDot, { backgroundColor: tone.color }]} />
          <Text style={[styles.pillText, { color: tone.color }]}>{connection.label}</Text>
        </View>
      </View>
      {canInvite && (
        <Pressable
          onPress={onInvite}
          style={({ pressed }) => [styles.square, shadow, pressed && styles.squarePressed]}
          accessibilityRole="button"
          accessibilityLabel="Invite people to this session"
        >
          <Text style={styles.inviteText}>Invite</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  inviteText: { fontSize: 15, fontWeight: '600', color: colors.accentInk },
});
