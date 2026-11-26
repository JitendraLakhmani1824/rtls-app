import { Avatar, Chevron, colors, radius } from '@common/ui';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { FriendItem } from '../hooks/useFriends';

/** One person in a grouped list: rounded corners on the group's first and last rows. */
export const PersonRow = memo(function PersonRow({
  item,
  first,
  last,
  onOpen,
}: {
  item: FriendItem;
  first: boolean;
  last: boolean;
  onOpen: (key: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onOpen(item.key)}
      style={({ pressed }) => [
        styles.row,
        first && styles.rowFirst,
        last && styles.rowLast,
        !last && styles.rowLine,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.detail}`}
    >
      <Avatar initials={item.initials} colour={item.colour} size={40} />
      <View style={styles.rowText}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>{item.detail}</Text>
      </View>
      <Chevron color={colors.faint} size={8} direction="right" />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 64,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  rowFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    marginBottom: 12,
  },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.subtle },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.ink },
  detail: { fontSize: 13, color: colors.muted, marginTop: 1 },
});
