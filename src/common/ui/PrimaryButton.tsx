import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, shadow } from './theme';

/** The screen's main action, full width. */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.text, disabled && styles.textDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingVertical: 17,
    alignItems: 'center',
    ...shadow,
  },
  disabled: { backgroundColor: colors.line, shadowOpacity: 0, elevation: 0 },
  pressed: { opacity: 0.9 },
  text: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  textDisabled: { color: colors.faint },
});
