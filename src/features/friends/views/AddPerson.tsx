import { colors, PrimaryButton, radius } from '@common/ui';
import type { Circle } from '@core/models';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

/** Name, family or friend, and add. */
export function AddPerson({
  name,
  onName,
  circle,
  onCircle,
  canAdd,
  onAdd,
  onCancel,
}: {
  name: string;
  onName: (name: string) => void;
  circle: Circle;
  onCircle: (circle: Circle) => void;
  canAdd: boolean;
  onAdd: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.card}>
      <TextInput
        value={name}
        onChangeText={onName}
        placeholder="Name"
        placeholderTextColor={colors.faint}
        style={styles.input}
        autoFocus
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={onAdd}
        accessibilityLabel="New person's name"
      />
      <View style={styles.segment} accessibilityRole="radiogroup">
        {(['family', 'friends'] as const).map((c) => (
          <Pressable
            key={c}
            onPress={() => onCircle(c)}
            style={[styles.option, circle === c && styles.optionOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: circle === c }}
          >
            <Text style={[styles.optionText, circle === c && styles.optionTextOn]}>
              {c === 'family' ? 'Family' : 'Friend'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <View style={styles.add}>
          <PrimaryButton label="Add" onPress={onAdd} disabled={!canAdd} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.subtle,
    borderRadius: radius.md,
    padding: 3,
  },
  option: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  optionOn: { backgroundColor: colors.surface },
  optionText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  optionTextOn: { color: colors.ink },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cancel: { paddingHorizontal: 8, paddingVertical: 10 },
  cancelText: { fontSize: 16, color: colors.muted, fontWeight: '600' },
  add: { flex: 1 },
});
