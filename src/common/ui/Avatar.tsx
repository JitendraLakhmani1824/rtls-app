import { Presence } from '@core/models';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, presenceStyle } from './theme';

type Props = {
  initials: string;
  colour: string;
  size?: number;
  presence?: number;
  /** A local photo (file URI); shown instead of the initials. */
  photo?: string | null;
};

/** A person's photo, or their initials in their colour, with a presence dot. Stale and paused friends turn grey. */
export function Avatar({ initials, colour, size = 40, presence, photo }: Props) {
  const grey = presence === Presence.Stale || presence === Presence.Paused;
  const dot = Math.round(size * 0.3);
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={round}>
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={[round, styles.photo, grey && styles.greyed]}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={[
            styles.circle,
            round,
            { backgroundColor: grey ? colors.faint : colour },
            presence === Presence.Recent && styles.faded,
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
        </View>
      )}
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
  photo: { backgroundColor: colors.subtle },
  greyed: { opacity: 0.5 },
  faded: { opacity: 0.7 },
  initials: { color: '#FFFFFF', fontWeight: '600' },
  dot: { position: 'absolute', right: -1, bottom: -1, borderWidth: 2, borderColor: colors.surface },
});
