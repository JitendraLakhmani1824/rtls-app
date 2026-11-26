import { colors, DirectionArrow, PrimaryButton, radius, StatTile, StatusChip } from '@common/ui';
import { StyleSheet, Text, View } from 'react-native';

import type { PersonLive } from '../hooks/usePerson';

/** Where they are now, on the open map: status, distance, direction, speed, distance covered. */
export function LiveCard({ live, onShowOnMap }: { live: PersonLive; onShowOnMap: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.where} numberOfLines={1}>
          Now in {live.where}
        </Text>
        <StatusChip presence={live.presence} text={live.status} />
      </View>
      <View style={styles.tiles}>
        <StatTile label="Distance" value={live.distance} />
        <StatTile
          label="Direction"
          value={live.direction}
          icon={<DirectionArrow bearingDeg={live.bearingDeg} size={16} color={colors.ink} />}
        />
      </View>
      <View style={styles.tiles}>
        <StatTile label={live.movement} value={live.speed} />
        <StatTile label="Covered" value={live.covered} />
      </View>
      <Text style={styles.updated}>{live.updated}</Text>
      <PrimaryButton label="Show on map" onPress={onShowOnMap} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  where: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  tiles: { flexDirection: 'row', gap: 10 },
  updated: { fontSize: 13, color: colors.faint },
});
