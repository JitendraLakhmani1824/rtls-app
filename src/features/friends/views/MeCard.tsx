import { Avatar, Chevron, colors, radius } from '@common/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** You, at the top of Friends: opens your profile. */
export function MeCard({
  me,
  onPress,
}: {
  me: { name: string; initials: string; photo: string | null };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.me, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${me.name}. Edit your profile`}
    >
      <Avatar initials={me.initials} colour={colors.muted} photo={me.photo} size={52} />
      <View style={styles.text}>
        <Text style={styles.name}>{me.name}</Text>
        <Text style={styles.label}>Edit profile</Text>
      </View>
      <Chevron color={colors.faint} size={8} direction="right" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  pressed: { backgroundColor: colors.subtle },
  text: { flex: 1 },
  name: { fontSize: 18, fontWeight: '600', color: colors.ink },
  label: { fontSize: 14, color: colors.muted, marginTop: 2 },
});
