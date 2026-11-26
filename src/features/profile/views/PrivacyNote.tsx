import { colors, radius } from '@common/ui';
import { StyleSheet, Text, View } from 'react-native';

/** What is shared, with whom, and what stays on the phone. */
export function PrivacyNote() {
  return (
    <View style={styles.note}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.text}>
        Your location is shared only inside a session, with the people in it, and only while it
        lasts. Your photo and name stay on this phone.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  icon: { fontSize: 18 },
  text: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.muted },
});
