import { Avatar, colors, DirectionArrow } from '@common/ui';
import type { Session } from '@core/protocols';
import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useFriendList, type FriendItem } from '../useFriendList';

const ROW_HEIGHT = 64;

export function FriendList({ session }: { session: Session }) {
  const { items, select } = useFriendList(session);
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
      renderItem={({ item }) => <Row item={item} onSelect={select} />}
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={<Text style={styles.empty}>Waiting for friends…</Text>}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
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
      accessibilityLabel={`${item.name}, ${item.status}${item.distance ? `, ${item.distance} ${item.direction}` : ''}`}
    >
      <Avatar initials={item.initials} colour={item.colour} presence={item.presence} size={44} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.status} numberOfLines={1}>
          {item.status}
        </Text>
      </View>
      {item.distance ? (
        <View style={styles.where}>
          <Text style={styles.distance}>{item.distance}</Text>
          <View style={styles.direction}>
            <DirectionArrow bearingDeg={item.bearingDeg} size={12} />
            <Text style={styles.compass}>{item.direction}</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  pressed: { backgroundColor: colors.subtle },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 78 },
  text: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.ink },
  status: { fontSize: 13, color: colors.muted, marginTop: 2 },
  where: { alignItems: 'flex-end' },
  distance: { fontSize: 15, fontWeight: '700', color: colors.ink },
  direction: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  compass: { fontSize: 12, fontWeight: '600', color: colors.muted },
  empty: { padding: 20, color: colors.muted },
});
