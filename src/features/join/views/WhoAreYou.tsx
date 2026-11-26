import { Avatar, colors, radius, typeScale } from '@common/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { JoinPerson } from '../hooks/useJoin';

/** "Which one are you?": everyone in the invite but its sender, as radio rows. */
export function WhoAreYou({
  people,
  onChoose,
}: {
  people: JoinPerson[];
  onChoose: (index: number) => void;
}) {
  return (
    <View>
      <Text style={styles.section}>Which one are you?</Text>
      <View style={styles.list} accessibilityRole="radiogroup">
        {people.map((p) => (
          <Pressable
            key={p.index}
            onPress={() => onChoose(p.index)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="radio"
            accessibilityState={{ selected: p.chosen }}
            accessibilityLabel={p.name}
          >
            <Avatar initials={p.initials} colour={p.colour} size={36} />
            <Text style={styles.name}>{p.name}</Text>
            <View style={[styles.radio, p.chosen && styles.radioOn]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { ...typeScale.label, marginBottom: 10 },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, paddingHorizontal: 14 },
  pressed: { backgroundColor: colors.subtle },
  name: { flex: 1, fontSize: 16, color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.faint },
  radioOn: { borderColor: colors.ink, borderWidth: 7 },
});
