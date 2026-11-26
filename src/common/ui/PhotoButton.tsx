import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { colors } from './theme';

/** Your photo (or initials, or a dashed placeholder) with a coral "+" badge, and a link under it. */
export function PhotoButton({
  photo,
  initials,
  placeholder,
  onPress,
}: {
  photo: string | null;
  initials: string;
  /** Show the dashed camera placeholder instead of initials (nothing entered yet). */
  placeholder?: boolean;
  onPress: () => void;
}) {
  const label = photo ? 'Change photo' : 'Add a photo';
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        {placeholder && !photo ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>📷</Text>
          </View>
        ) : (
          <Avatar initials={initials} colour={colors.muted} photo={photo} size={120} />
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+</Text>
        </View>
      </Pressable>
      <Text style={styles.link} onPress={onPress} accessibilityElementsHidden>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: { fontSize: 34 },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 20, fontWeight: '600', color: colors.ink, marginTop: -2 },
  link: { marginTop: 12, fontSize: 15, fontWeight: '600', color: colors.accentInk },
});
