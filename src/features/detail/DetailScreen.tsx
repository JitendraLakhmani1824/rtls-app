import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDetail } from './useDetail';

/** The selected friend, in a native sheet over the live map (the map stays visible and touchable). */
export function DetailScreen() {
  const { friend, close } = useDetail();
  // The sheet sits on the bottom edge: keep its content above the home indicator / navigation bar.
  const pad = { paddingBottom: useSafeAreaInsets().bottom + 24 };
  if (!friend) return <View style={[styles.sheet, pad]} />;
  return (
    <View style={[styles.sheet, pad]}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: friend.colour }]}>
          <Text style={styles.initials}>{friend.initials}</Text>
        </View>
        <View style={styles.title}>
          <Text style={styles.name}>{friend.name}</Text>
          <Text style={styles.status}>{friend.status}</Text>
        </View>
        <Pressable
          onPress={close}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.where}>
        {friend.where}
        {friend.movement ? ` · ${friend.movement}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  title: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  status: { fontSize: 14, color: '#64748b', marginTop: 2 },
  close: { fontSize: 18, color: '#64748b' },
  where: { fontSize: 16, color: '#0f172a' },
});
