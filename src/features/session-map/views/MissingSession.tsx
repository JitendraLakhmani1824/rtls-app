import { colors, PrimaryButton, ScreenHeader } from '@common/ui';
import { StyleSheet, View } from 'react-native';

/** A link to a session this phone doesn't have (left, or never joined). */
export function MissingSession({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.fill}>
      <ScreenHeader
        title="This session isn’t on this phone"
        subtitle="It may have been left. Ask for a new invite link."
        onBack={onBack}
      />
      <View style={styles.footer}>
        <PrimaryButton label="Back to sessions" onPress={onBack} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
});
