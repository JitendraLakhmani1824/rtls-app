import { Avatar, colors, radius, shadow } from '@common/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  open: boolean;
  onToggle: () => void;
  live: number;
  away: number;
  preview: { id: number; initials: string; colour: string; presence: number }[];
  children: ReactNode;
};

/** The bottom panel: a summary with the nearest friends' avatars; tap to open the list. */
export function FriendsPanel({ open, onToggle, live, away, preview, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <View style={[styles.panel, shadow, { paddingBottom: insets.bottom + 8 }]}>
      <Pressable
        onPress={onToggle}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Hide friends' : 'Show friends'}
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.grabber} />
        <View style={styles.row}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Friends</Text>
            <Text style={styles.subtitle}>
              <Text style={styles.live}>{live} live</Text>
              {away > 0 ? `  ·  ${away} away` : ''}
            </Text>
          </View>
          <View style={styles.stack}>
            {preview.map((f, i) => (
              <View key={f.id} style={[styles.stacked, { marginLeft: i === 0 ? 0 : -10 }]}>
                <Avatar initials={f.initials} colour={f.colour} size={32} />
              </View>
            ))}
          </View>
          <Text style={styles.chevron}>{open ? '⌄' : '⌃'}</Text>
        </View>
      </Pressable>
      {open && <View style={{ maxHeight: height * 0.45 }}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleBlock: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  live: { color: colors.live, fontWeight: '600' },
  stack: { flexDirection: 'row' },
  stacked: { borderRadius: 18, borderWidth: 2, borderColor: colors.surface },
  chevron: { fontSize: 20, color: colors.muted, width: 20, textAlign: 'center' },
});
