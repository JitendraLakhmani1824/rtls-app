import { colors, radius } from '@common/ui';
import { StyleSheet, Text, View } from 'react-native';

/** The session an invite is for, and who sent it. */
export function InviteCard({
  icon,
  title,
  from,
  detail,
}: {
  icon: string;
  title: string;
  from: string;
  detail: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Text style={styles.emoji}>{icon}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>
          {from} invited you · {detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  text: { flex: 1 },
  title: { fontSize: 19, fontWeight: '700', color: colors.ink },
  detail: { fontSize: 14, color: colors.muted, marginTop: 3 },
});
