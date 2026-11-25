import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHome } from './useHome';

/** M1: the live map with a connection chip. The friend list panel and Detail sheet arrive in M5. */
export function HomeScreen() {
  const { MapView, connectionLabel, selected, clearSelection } = useHome();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.fill}>
      <MapView />
      <View pointerEvents="box-none" style={[styles.top, { top: insets.top + 8 }]}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{connectionLabel}</Text>
        </View>
        {selected !== null && (
          <Pressable onPress={clearSelection} style={styles.chip}>
            <Text style={styles.chipText}>Friend {selected} · clear</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  chipText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
});
