import { Avatar, colors, DirectionArrow, radius, StatusChip } from '@common/ui';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDetail } from './useDetail';

/** The selected friend, in a native sheet over the live map (the map stays visible and touchable). */
export function DetailScreen() {
  const { friend, close } = useDetail();
  // iOS sheets already clear the home indicator; on Android, keep content above the navigation bar.
  const bottom = useSafeAreaInsets().bottom;
  const pad = { paddingBottom: Platform.OS === 'ios' ? 16 : bottom + 20 };
  if (!friend) return <View style={[styles.sheet, pad]} />;
  return (
    <View
      style={[styles.sheet, pad]}
      accessible
      accessibilityLabel={`${friend.name}, ${friend.status}, ${friend.where}`}
    >
      <View style={styles.header}>
        <Avatar
          initials={friend.initials}
          colour={friend.colour}
          presence={friend.presence}
          size={56}
        />
        <View style={styles.title}>
          <Text style={styles.name} numberOfLines={1}>
            {friend.name}
          </Text>
          <StatusChip presence={friend.presence} text={friend.status} />
        </View>
        <Pressable
          onPress={close}
          hitSlop={12}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.tiles}>
        <Tile label="Distance" value={friend.distance} />
        <Tile
          label="Direction"
          value={friend.direction}
          icon={<DirectionArrow bearingDeg={friend.bearingDeg} size={16} color={colors.ink} />}
        />
        <Tile label="Moving" value={friend.movement} />
      </View>

      <Text style={styles.updated}>{friend.updated}</Text>
    </View>
  );
}

function Tile({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <View style={styles.tileValueRow}>
        {icon}
        <Text style={styles.tileValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 24, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { flex: 1, gap: 6 },
  name: { fontSize: 22, fontWeight: '700', color: colors.ink },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  closeText: { fontSize: 14, fontWeight: '700', color: colors.muted },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: colors.subtle,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  tileLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  tileValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileValue: { fontSize: 17, fontWeight: '700', color: colors.ink },
  updated: { fontSize: 13, color: colors.faint },
});
