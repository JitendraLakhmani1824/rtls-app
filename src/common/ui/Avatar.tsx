import { Presence } from '@core/models';
import { StyleSheet, Text, View } from 'react-native';

import { colors, presenceStyle } from './theme';

type Props = { initials: string; colour: string; size?: number; presence?: number };

/** A friend's initials in their colour, with a presence dot. Stale and paused friends turn grey. */
export function Avatar({ initials, colour, size = 40, presence }: Props) {
  const grey = presence === Presence.Stale || presence === Presence.Paused;
  const dot = Math.round(size * 0.3);
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: grey ? colors.faint : colour,
          },
          presence === Presence.Recent && styles.faded,
        ]}
      >
        <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials}</Text>
      </View>
      {presence !== undefined && (
        <View
          style={[
            styles.dot,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: presenceStyle(presence).color,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  faded: { opacity: 0.7 },
  initials: { color: '#ffffff', fontWeight: '700', letterSpacing: 0.3 },
  dot: { position: 'absolute', right: -1, bottom: -1, borderWidth: 2, borderColor: colors.surface },
});
