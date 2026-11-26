import { colors } from '@common/ui';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDetail } from './hooks/useDetail';
import { FriendCard } from './views/FriendCard';

/** The selected friend, in a native sheet over the live map (the map stays visible and touchable). */
export function DetailScreen() {
  const { friend, close, details } = useDetail();
  // iOS sheets already clear the home indicator; on Android, keep content above the navigation bar.
  const bottom = useSafeAreaInsets().bottom;
  const pad = { paddingBottom: Platform.OS === 'ios' ? 16 : bottom + 20 };
  return (
    <View style={[styles.sheet, pad]}>
      {friend && <FriendCard friend={friend} onClose={close} onDetails={details} />}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 24 },
});
