import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from './theme';

/** A small label over a value, e.g. "Distance / 350 m". */
export function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        {icon}
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.subtle,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { fontSize: 17, fontWeight: '700', color: colors.ink },
});
