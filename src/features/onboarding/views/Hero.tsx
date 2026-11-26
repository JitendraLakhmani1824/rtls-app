import { Avatar, colors } from '@common/ui';
import { PALETTE } from '@core/utils';
import { StyleSheet, Text, View } from 'react-native';

const FRIENDS = [
  { initials: 'R', colour: PALETTE[4], top: 34, left: 52 },
  { initials: 'A', colour: PALETTE[10], top: 40, right: 46 },
  { initials: 'M', colour: PALETTE[2], bottom: 40, left: 74 },
  { initials: 'D', colour: PALETTE[3], bottom: 52, right: 70 },
];

/** A small picture of the idea: you in the middle, friends around you, live. */
export function Hero() {
  return (
    <View style={styles.card} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[styles.ring, styles.ring3]} />
      <View style={[styles.ring, styles.ring2]} />
      <View style={[styles.ring, styles.ring1]} />
      <View style={styles.me} />
      {FRIENDS.map((f) => (
        <View key={f.initials} style={[styles.friend, f]}>
          <Avatar initials={f.initials} colour={f.colour} size={40} presence={0} />
        </View>
      ))}
      <View style={styles.chip}>
        <View style={styles.chipDot} />
        <Text style={styles.chipText}>4 friends live</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 250,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { position: 'absolute', borderRadius: 999, backgroundColor: colors.accentSoft },
  ring3: { width: 300, height: 300, opacity: 0.45 },
  ring2: { width: 200, height: 200, opacity: 0.7 },
  ring1: { width: 110, height: 110 },
  me: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    borderWidth: 5,
    borderColor: colors.surface,
  },
  friend: { position: 'absolute', borderRadius: 24, borderWidth: 3, borderColor: colors.surface },
  chip: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.surface },
});
