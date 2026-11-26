import {
  Avatar,
  Chevron,
  colors,
  DirectionArrow,
  PrimaryButton,
  radius,
  ScreenHeader,
  StatTile,
  StatusChip,
} from '@common/ui';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { usePerson } from './usePerson';

/** One person: live numbers when they're on the open map, and the sessions you share. */
export function PersonScreen() {
  const p = usePerson();
  return (
    <View style={styles.fill}>
      <ScreenHeader title="" onBack={p.back} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Avatar initials={p.initials} colour={p.colour} size={84} presence={p.live?.presence} />
          <Text style={styles.name} accessibilityRole="header">
            {p.name}
          </Text>
          {p.circle ? <Text style={styles.circle}>{p.circle}</Text> : null}
        </View>

        {p.live ? (
          <View style={styles.card}>
            <View style={styles.liveHeader}>
              <Text style={styles.liveWhere} numberOfLines={1}>
                Now in {p.live.where}
              </Text>
              <StatusChip presence={p.live.presence} text={p.live.status} />
            </View>
            <View style={styles.tiles}>
              <StatTile label="Distance" value={p.live.distance} />
              <StatTile
                label="Direction"
                value={p.live.direction}
                icon={
                  <DirectionArrow bearingDeg={p.live.bearingDeg} size={16} color={colors.ink} />
                }
              />
            </View>
            <View style={styles.tiles}>
              <StatTile label={p.live.movement} value={p.live.speed} />
              <StatTile label="Covered" value={p.live.covered} />
            </View>
            <Text style={styles.updated}>{p.live.updated}</Text>
            <PrimaryButton label="Show on map" onPress={p.showOnMap} />
          </View>
        ) : (
          <Text style={styles.note}>
            Open a session you share to see where {p.name} is right now.
          </Text>
        )}

        {p.together.length > 0 && (
          <>
            <Text style={styles.section}>Sessions together</Text>
            <View style={styles.list}>
              {p.together.map((s, i) => (
                <Pressable
                  key={s.id}
                  onPress={() => p.openSession(s.id)}
                  style={({ pressed }) => [
                    styles.row,
                    i < p.together.length - 1 && styles.rowLine,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.title}, ${s.detail}. Opens the map.`}
                >
                  <Text style={styles.rowIcon}>{s.icon}</Text>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {s.title}
                    </Text>
                    <Text style={styles.rowDetail}>{s.detail}</Text>
                  </View>
                  <Chevron color={colors.faint} size={8} direction="right" />
                </Pressable>
              ))}
            </View>
          </>
        )}

        {p.canStartWith && (
          <Pressable
            onPress={p.startWith}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Start a session with {p.name}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  hero: { alignItems: 'center', gap: 6, marginBottom: 20 },
  name: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 8, letterSpacing: -0.5 },
  circle: { fontSize: 15, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  liveWhere: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  tiles: { flexDirection: 'row', gap: 10 },
  updated: { fontSize: 13, color: colors.faint },
  note: { fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 12 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 10,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 62, paddingHorizontal: 14 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.subtle },
  rowIcon: { fontSize: 22 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.ink },
  rowDetail: { fontSize: 13, color: colors.muted, marginTop: 1 },
  secondary: {
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  secondaryText: { fontSize: 16, fontWeight: '700', color: colors.ink },
});
