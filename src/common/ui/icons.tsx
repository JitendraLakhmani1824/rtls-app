import { StyleSheet, View } from 'react-native';

/** Small icons drawn with views (no icon font to load). */

/** A location dot in a ring: sessions. */
export function PinIcon({ color, size = 24 }: { color: string; size?: number }) {
  const ring = size * 0.8;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: 2,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: ring * 0.36,
            height: ring * 0.36,
            borderRadius: ring,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

/** Two heads and shoulders: people. */
export function PeopleIcon({ color, size = 24 }: { color: string; size?: number }) {
  const head = size * 0.34;
  const body = {
    width: size * 0.5,
    height: size * 0.3,
    borderTopLeftRadius: size,
    borderTopRightRadius: size,
  };
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View style={[styles.person, { left: 0, opacity: 0.55 }]}>
        <View style={{ width: head, height: head, borderRadius: head, backgroundColor: color }} />
        <View style={[body, { backgroundColor: color, marginTop: 2 }]} />
      </View>
      <View style={[styles.person, { right: 0 }]}>
        <View style={{ width: head, height: head, borderRadius: head, backgroundColor: color }} />
        <View style={[body, { backgroundColor: color, marginTop: 2 }]} />
      </View>
    </View>
  );
}

/** A chevron pointing left (back) or right (more). */
export function Chevron({
  color,
  size = 12,
  direction = 'left',
}: {
  color: string;
  size?: number;
  direction?: 'left' | 'right';
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderLeftWidth: 2.5,
        borderBottomWidth: 2.5,
        borderColor: color,
        transform: [{ rotate: direction === 'left' ? '45deg' : '-135deg' }],
        marginLeft: direction === 'left' ? size * 0.35 : 0,
        marginRight: direction === 'right' ? size * 0.35 : 0,
      }}
    />
  );
}

/** A tick, for chosen rows. */
export function Check({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: size * 0.55,
        height: size,
        borderRightWidth: 2.5,
        borderBottomWidth: 2.5,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        marginTop: -size * 0.2,
      }}
    />
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  person: { position: 'absolute', bottom: 2, alignItems: 'center' },
});
