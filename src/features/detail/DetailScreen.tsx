import { Avatar, Chevron, colors, DirectionArrow, radius, StatTile, StatusChip } from '@common/ui';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDetail } from './useDetail';

/** The selected friend, in a native sheet over the live map (the map stays visible and touchable). */
export function DetailScreen() {
  const { friend, close, details } = useDetail();
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
        <StatTile label="Distance" value={friend.distance} />
        <StatTile
          label="Direction"
          value={friend.direction}
          icon={<DirectionArrow bearingDeg={friend.bearingDeg} size={16} color={colors.ink} />}
        />
        <StatTile label="Moving" value={friend.movement} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.updated}>{friend.updated}</Text>
        <Pressable
          onPress={details}
          hitSlop={8}
          style={({ pressed }) => [styles.details, pressed && styles.detailsPressed]}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${friend.name}`}
        >
          <Text style={styles.detailsText}>View details</Text>
          <Chevron color={colors.accent} size={8} direction="right" />
        </Pressable>
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
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  updated: { fontSize: 13, color: colors.faint },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  detailsPressed: { opacity: 0.8 },
  detailsText: { fontSize: 14, fontWeight: '700', color: colors.accent },
});
