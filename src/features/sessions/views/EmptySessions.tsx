import { colors, PrimaryButton } from '@common/ui';
import { StyleSheet, Text, View } from 'react-native';

/** No sessions yet: what to do. */
export function EmptySessions({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.title}>No sessions yet</Text>
      <Text style={styles.text}>
        Start one for an event and pick who’s coming, or open an invite link.
      </Text>
      <PrimaryButton label="New session" onPress={onCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { paddingTop: 40, paddingHorizontal: 8, gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  text: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 12 },
});
