import { colors } from '@common/ui';
import { StyleSheet, View } from 'react-native';

/** Which step of how many: the current one is a coral bar. */
export function StepDots({ step, of }: { step: number; of: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Step ${step + 1} of ${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <View key={i} style={[styles.dot, i === step && styles.on]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  on: { width: 22, backgroundColor: colors.accent },
});
