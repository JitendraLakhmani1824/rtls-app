import { Avatar, Chevron, colors, HeaderButton, radius, ScreenHeader } from '@common/ui';
import { memo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { useFriends, type FriendItem } from './useFriends';
import { AddPerson } from './views/AddPerson';

/** Everyone you know, in Family and Friends. */
export function FriendsScreen() {
  const f = useFriends();
  return (
    <View style={styles.fill}>
      <ScreenHeader
        title="Friends"
        subtitle={`${f.count} people you share with`}
        right={<HeaderButton label="+" onPress={f.startAdding} a11y="Add a person" />}
      />
      <SectionList
        sections={f.sections}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <View style={styles.me}>
              <Avatar initials="ME" colour={colors.accent} size={44} />
              <View style={styles.meText}>
                <Text style={styles.meLabel}>Your name, as invites show it</Text>
                <TextInput
                  value={f.myName}
                  onChangeText={f.editName}
                  onEndEditing={f.saveName}
                  placeholder="Add your name"
                  placeholderTextColor={colors.faint}
                  style={styles.meInput}
                  maxLength={40}
                  returnKeyType="done"
                  accessibilityLabel="Your name"
                />
              </View>
            </View>
            {f.adding && (
              <AddPerson
                name={f.newName}
                onName={f.setNewName}
                circle={f.newCircle}
                onCircle={f.setNewCircle}
                canAdd={f.canAdd}
                onAdd={f.add}
                onCancel={f.cancelAdding}
              />
            )}
          </>
        }
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item, index, section }) => (
          <Row
            item={item}
            first={index === 0}
            last={index === section.data.length - 1}
            onOpen={f.open}
          />
        )}
      />
    </View>
  );
}

const Row = memo(function Row({
  item,
  first,
  last,
  onOpen,
}: {
  item: FriendItem;
  first: boolean;
  last: boolean;
  onOpen: (key: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onOpen(item.key)}
      style={({ pressed }) => [
        styles.row,
        first && styles.rowFirst,
        last && styles.rowLast,
        !last && styles.rowLine,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.detail}`}
    >
      <Avatar initials={item.initials} colour={item.colour} size={40} />
      <View style={styles.rowText}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>{item.detail}</Text>
      </View>
      <Chevron color={colors.faint} size={8} direction="right" />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  meText: { flex: 1 },
  meLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  meInput: { fontSize: 17, fontWeight: '700', color: colors.ink, paddingVertical: 4 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 64,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  rowFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    marginBottom: 12,
  },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.subtle },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.ink },
  detail: { fontSize: 13, color: colors.muted, marginTop: 1 },
});
