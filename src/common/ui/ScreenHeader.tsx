import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chevron } from './icons';
import { colors, typeScale } from './theme';

/**
 * A screen's top: a row with back (or `left`, e.g. your avatar) and an action on the right, then a
 * large title and a subtitle.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  left,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <View style={styles.top}>
        {onBack ? <BackButton onPress={onBack} /> : (left ?? <View />)}
        {right}
      </View>
      {title !== '' && (
        <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
          {title}
        </Text>
      )}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.round, styles.back, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      <Chevron color={colors.ink} size={10} />
    </Pressable>
  );
}

/** A round "+" or a short text action for the header's right side. */
export function HeaderButton({
  label,
  onPress,
  a11y,
}: {
  label: string;
  onPress: () => void;
  a11y: string;
}) {
  const round = label.length === 1;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        round ? [styles.round, styles.dark] : styles.pill,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Text style={round ? styles.roundText : styles.pillText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 20, paddingBottom: 14, backgroundColor: colors.page, gap: 4 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: 10,
  },
  title: typeScale.title,
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  dark: { backgroundColor: colors.ink },
  roundText: { fontSize: 24, color: '#FFFFFF', fontWeight: '400', marginTop: -2 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  pillText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
