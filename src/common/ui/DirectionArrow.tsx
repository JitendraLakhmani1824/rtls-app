import { StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

/** An arrow pointing along a compass bearing (0 = north, up on a north-up map). */
export function DirectionArrow({
  bearingDeg,
  size = 14,
  color = colors.muted,
}: {
  bearingDeg: number;
  size?: number;
  color?: string;
}) {
  if (!Number.isFinite(bearingDeg)) return null;
  return (
    <View style={{ transform: [{ rotate: `${Math.round(bearingDeg)}deg` }] }}>
      <Text style={[styles.arrow, { fontSize: size, color }]}>↑</Text>
    </View>
  );
}

const styles = StyleSheet.create({ arrow: { fontWeight: '700' } });
