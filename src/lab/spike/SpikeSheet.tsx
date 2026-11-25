// M0 spike: the native form sheet over the live map. Selection lives in one place (spikeStore.selection);
// dismissing the sheet clears it. The counters show whether the map keeps drawing while the sheet is up.
import { useNavigation } from '@react-navigation/native';
import { useEffect, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MOVER_COUNT, colourOf, initialsOf } from './sim';
import { selection, sheetOpen, stats } from './spikeStore';

export function SpikeSheet() {
  const navigation = useNavigation();
  const selected = useSyncExternalStore(selection.subscribe, selection.get);
  const s = useSyncExternalStore(stats.subscribe, stats.get);

  useEffect(() => {
    sheetOpen.set(true);
    return () => {
      sheetOpen.set(false);
      selection.set(null); // swipe-down, back button or Close all end here
    };
  }, []);

  useEffect(() => {
    if (selected === null) navigation.goBack();
  }, [selected, navigation]);

  if (selected === null) return null;

  return (
    <View style={styles.sheet}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colourOf(selected) }]}>
          <Text style={styles.avatarText}>{initialsOf(selected)}</Text>
        </View>
        <View style={styles.grow}>
          <Text style={styles.name}>Friend {selected}</Text>
          <Text style={styles.sub}>{selected < MOVER_COUNT ? 'Moving' : 'Still'} · spike data</Text>
        </View>
        <Pressable onPress={() => selection.set(null)} style={styles.close}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
      <Text style={styles.check}>
        {s
          ? `Map drawing under the sheet: ${s.mapFps} fps · moving updates ${s.movingUpdates}/s\n` +
            `App state: ${s.appState} · Home focused: ${s.homeFocused ? 'yes' : 'no'}`
          : 'measuring…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: 20, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  sub: { fontSize: 13, color: '#475569' },
  close: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  closeText: { color: '#0f172a', fontWeight: '600' },
  check: { fontSize: 12, color: '#334155', fontVariant: ['tabular-nums'] },
});
