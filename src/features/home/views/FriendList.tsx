import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useFriendList, type FriendItem } from '../useFriendList';

const ROW_HEIGHT = 56;

export function FriendList() {
  const { items, select } = useFriendList();
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
      renderItem={({ item }) => <Row item={item} onSelect={select} />}
      ListEmptyComponent={<Text style={styles.empty}>Waiting for friends…</Text>}
    />
  );
}

const Row = memo(function Row({
  item,
  onSelect,
}: {
  item: FriendItem;
  onSelect: (id: number) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelect(item.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.detail}`}
    >
      <View style={[styles.dot, { backgroundColor: item.colour }, item.dimmed && styles.dimmed]}>
        <Text style={styles.initials}>{item.initials}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {item.detail}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  pressed: { backgroundColor: '#f1f5f9' },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.45 },
  initials: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  text: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  detail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  empty: { padding: 16, color: '#64748b' },
});
