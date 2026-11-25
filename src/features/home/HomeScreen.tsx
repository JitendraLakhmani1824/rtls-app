import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHome } from './useHome';
import { FriendList } from './views/FriendList';

/** The live map, with a connection badge and the friend list panel. */
export function HomeScreen() {
  const { MapView, connection, showPanel, listOpen, toggleList } = useHome();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <View style={styles.fill}>
      <MapView />
      <View pointerEvents="box-none" style={[styles.top, { top: insets.top + 8 }]}>
        <View style={[styles.badge, connection.kind !== 'live' && styles.badgeWarn]}>
          <Text style={styles.badgeText}>{connection.label}</Text>
        </View>
      </View>
      {showPanel && (
        <View style={[styles.panel, { paddingBottom: insets.bottom }]}>
          <Pressable onPress={toggleList} style={styles.handle} accessibilityRole="button">
            <View style={styles.grabber} />
            <Text style={styles.handleText}>{listOpen ? 'Hide friends' : 'Friends'}</Text>
          </Pressable>
          {listOpen && (
            <View style={{ maxHeight: height * 0.4 }}>
              <FriendList />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  badgeWarn: { backgroundColor: 'rgba(180,83,9,0.9)' },
  badgeText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  handle: { alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginBottom: 8 },
  handleText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
});
