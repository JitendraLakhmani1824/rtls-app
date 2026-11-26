import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chevron } from './icons';
import { colors } from './theme';

/** A screen's top bar: back (if any), a large title, and an action on the right. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + (onBack ? 4 : 12) }]}>
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Chevron color={colors.accent} size={11} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      )}
      {(title !== '' || right) && (
        <View style={styles.row}>
          <View style={styles.titles}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
      )}
    </View>
  );
}

/** A round "+" or short text action for the header. */
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
      style={({ pressed }) => [round ? styles.round : styles.pill, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Text style={round ? styles.roundText : styles.pillText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.page },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 16, color: colors.accent, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1 },
  title: { fontSize: 30, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundText: { fontSize: 24, color: '#ffffff', fontWeight: '500', marginTop: -2 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  pillText: { fontSize: 14, color: '#ffffff', fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
