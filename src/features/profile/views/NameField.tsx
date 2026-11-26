import { colors, radius, typeScale } from '@common/ui';
import { StyleSheet, Text, TextInput, View } from 'react-native';

/** Your name, with what it's used for. Saves when you finish typing. */
export function NameField({
  name,
  onChange,
  onDone,
}: {
  name: string;
  onChange: (name: string) => void;
  onDone: () => void;
}) {
  return (
    <View>
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={onChange}
        onEndEditing={onDone}
        placeholder="Your name"
        placeholderTextColor={colors.faint}
        style={styles.input}
        maxLength={40}
        autoCapitalize="words"
        returnKeyType="done"
        accessibilityLabel="Your name"
      />
      <Text style={styles.hint}>Shown on the map and in the invites you send.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typeScale.label, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: colors.ink,
  },
  hint: { fontSize: 13, color: colors.muted, marginTop: 8 },
});
