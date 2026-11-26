import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius } from './theme';

type Variant = 'primary' | 'accent' | 'secondary';

/**
 * A full-width action. primary: Tricon Black (the main action) · accent: coral with ink text
 * (a highlight, used sparingly) · secondary: white with a border.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text
        style={[styles.text, variant !== 'primary' && styles.textDark, disabled && styles.textOff]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: radius.pill, paddingVertical: 17, alignItems: 'center' },
  primary: { backgroundColor: colors.ink },
  accent: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  disabled: { backgroundColor: colors.line, borderColor: colors.line },
  pressed: { opacity: 0.85 },
  text: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  textDark: { color: colors.ink },
  textOff: { color: colors.muted },
});
