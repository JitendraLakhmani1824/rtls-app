import { StyleSheet, Text, View } from 'react-native';

import { presenceStyle, radius } from './theme';

/** A pill with a dot and words: "● Live", "● Last seen 5 min ago". */
export function StatusChip({ presence, text }: { presence: number; text?: string }) {
  const style = presenceStyle(presence);
  return (
    <View style={[styles.chip, { backgroundColor: style.soft }]}>
      <View style={[styles.dot, { backgroundColor: style.color }]} />
      <Text style={[styles.text, { color: style.color }]}>{text ?? style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 13, fontWeight: '600' },
});
